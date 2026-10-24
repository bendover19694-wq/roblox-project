--!strict
-- Live game telemetry as aggregates. Pure (the clock is injectable); see tests/LiveStats.spec.luau.
--
-- Events (join, leave, robux, error, perf) are folded into counts and histograms. Nothing that leaves this module
-- contains a user id: ids only live in memory, to know who is currently in the server and who was already counted
-- today. Agent HQ reads the stored result (tools/agent-hq/livestats.mjs).
--
-- Two views of the same events:
--   snapshot(agg, now)  everything since this server started (also used for tests)
--   drain(agg, now)     only what happened since the last drain; StatsService merges it into the day record.
--                       If the write fails, requeue(agg, delta) puts it back.
-- Uniques (uniqueNew, uniqueReturning, payers) are per server per day, so a player who hops servers can be counted
-- twice in a day record. That is the price of storing aggregates only.

local Tuning = require(script.Parent.Config.Tuning)

local LiveStats = {}

LiveStats.VERSION = 1

-- Session length buckets, in seconds: under 1 min, 1-3, 3-10, 10-30, 30-60, 60+.
LiveStats.SESSION_LIMITS = { 60, 180, 600, 1800, 3600 }
-- Frame-rate buckets: under 20, 20-30, 30-45, 45-55, 55+.
LiveStats.FPS_LIMITS = { 20, 30, 45, 55 }

local MAX_SESSION = 24 * 3600
local MAX_FPS = 240

export type Hist = { number }
export type Counts = { [string]: number }
export type Session = { count: number, seconds: number, hist: Hist }
export type Source = { joins: number, newJoins: number, d1: number, d7: number }
export type Hour = {
	joins: number,
	leaves: number,
	robux: number,
	errors: number,
	peaks: Counts, -- per server, so servers can be summed without double counting one server's flushes
	products: Counts,
}
export type LastLeave = { lastPlace: string, tutorialStep: number?, seconds: number, at: number }
export type Stats = {
	v: number,
	at: number,
	joins: number,
	leaves: number,
	newJoins: number,
	returningJoins: number,
	uniqueNew: number,
	uniqueReturning: number,
	payers: number,
	bounces: number,
	sessions: { new: Session, returning: Session },
	sources: { [string]: Source },
	returningByAge: Counts, -- returning players whose account was exactly 1 or 7 days old at join: "1", "7"
	devices: Counts,
	countries: Counts,
	languages: Counts,
	versions: Counts,
	lastPlaces: Counts,
	tutorialSteps: Counts,
	lastLeave: LastLeave?,
	robux: { total: number, count: number, byProduct: { [string]: { amount: number, count: number } } },
	errors: { count: number, samples: { { message: string, count: number } } },
	perf: { samples: number, fpsSum: number, fpsHist: Hist, crashes: number, pingMax: number },
	hours: { [string]: Hour },
	playing: number?, -- snapshot only
	peak: number?, -- snapshot only
}

export type JoinEvent = {
	userId: number,
	isNew: boolean,
	source: string?,
	device: string?,
	country: string?,
	language: string?,
	version: string?,
	daysSinceFirst: number?, -- whole days since the player's first join (for D1 / D7)
}
export type LeaveEvent = { userId: number, sessionSeconds: number, lastPlace: string?, tutorialStep: number? }
export type RobuxEvent = { product: string, amount: number, userId: number }
export type ErrorEvent = { message: string }
export type PerfEvent = { fps: number?, crashed: boolean?, ping: number? } -- ping in milliseconds

type Active = { isNew: boolean }
export type Agg = {
	clock: () -> number,
	serverId: string,
	version: string,
	total: Stats,
	pending: Stats,
	active: { [number]: Active },
	activeCount: number,
	peak: number,
	seenDay: { [number]: number },
	payerDay: { [number]: number },
	lastFps: number?,
	lastPing: number?,
}

local function hist(n: number): Hist
	local h = {}
	for i = 1, n do
		h[i] = 0
	end
	return h
end

local function session(): Session
	return { count = 0, seconds = 0, hist = hist(#LiveStats.SESSION_LIMITS + 1) }
end

function LiveStats.emptyStats(): Stats
	return {
		v = LiveStats.VERSION,
		at = 0,
		joins = 0,
		leaves = 0,
		newJoins = 0,
		returningJoins = 0,
		uniqueNew = 0,
		uniqueReturning = 0,
		payers = 0,
		bounces = 0,
		sessions = { new = session(), returning = session() },
		sources = {},
		returningByAge = {},
		devices = {},
		countries = {},
		languages = {},
		versions = {},
		lastPlaces = {},
		tutorialSteps = {},
		lastLeave = nil,
		robux = { total = 0, count = 0, byProduct = {} },
		errors = { count = 0, samples = {} },
		perf = {
			samples = 0,
			fpsSum = 0,
			fpsHist = hist(#LiveStats.FPS_LIMITS + 1),
			crashes = 0,
			pingMax = 0,
		},
		hours = {},
	}
end

function LiveStats.new(clock: (() -> number)?, serverId: string?, version: string?): Agg
	return {
		clock = clock or os.time,
		serverId = serverId or "server",
		version = version or "0",
		total = LiveStats.emptyStats(),
		pending = LiveStats.emptyStats(),
		active = {},
		activeCount = 0,
		peak = 0,
		seenDay = {},
		payerDay = {},
		lastFps = nil,
		lastPing = nil,
	}
end

local function bucket(limits: { number }, value: number): number
	for i, limit in limits do
		if value < limit then
			return i
		end
	end
	return #limits + 1
end

local function bump(map: Counts, key: string, by: number?)
	map[key] = (map[key] or 0) + (by or 1)
end

local function clean(value: string?, fallback: string): string
	if type(value) ~= "string" or value == "" then
		return fallback
	end
	return string.sub(value, 1, 40)
end

local function hourOf(stats: Stats, at: number): Hour
	local key = tostring(math.floor(at / 3600))
	local h = stats.hours[key]
	if not h then
		h = { joins = 0, leaves = 0, robux = 0, errors = 0, peaks = {}, products = {} }
		stats.hours[key] = h
		-- keep the newest hours only
		local keys = {}
		for k in stats.hours do
			table.insert(keys, tonumber(k) or 0)
		end
		if #keys > Tuning.stats.hoursKept then
			table.sort(keys)
			for i = 1, #keys - Tuning.stats.hoursKept do
				stats.hours[tostring(keys[i])] = nil
			end
		end
	end
	return h
end

-- Applies the same change to the since-boot totals and to the not-yet-flushed delta.
local function both(agg: Agg, fn: (Stats) -> ())
	fn(agg.total)
	fn(agg.pending)
end

local function dayOf(at: number): number
	return math.floor(at / 86400)
end

function LiveStats.join(agg: Agg, e: JoinEvent)
	local at = agg.clock()
	local day = dayOf(at)
	local source = clean(e.source, "direct")
	local firstToday = agg.seenDay[e.userId] ~= day
	agg.seenDay[e.userId] = day
	if not agg.active[e.userId] then
		agg.activeCount += 1
	end
	agg.active[e.userId] = { isNew = e.isNew }
	agg.peak = math.max(agg.peak, agg.activeCount)

	local age: string? = nil
	local d = e.daysSinceFirst
	if firstToday and not e.isNew and d ~= nil and (d == 1 or d == 7) then
		age = tostring(d)
	end

	both(agg, function(s)
		s.joins += 1
		if e.isNew then
			s.newJoins += 1
		else
			s.returningJoins += 1
		end
		if firstToday then
			if e.isNew then
				s.uniqueNew += 1
			else
				s.uniqueReturning += 1
			end
		end
		local src = s.sources[source]
		if not src then
			src = { joins = 0, newJoins = 0, d1 = 0, d7 = 0 }
			s.sources[source] = src
		end
		src.joins += 1
		if e.isNew then
			src.newJoins += 1
		end
		if age then
			bump(s.returningByAge, age)
			if age == "1" then
				src.d1 += 1
			else
				src.d7 += 1
			end
		end
		bump(s.devices, clean(e.device, "unknown"))
		bump(s.countries, clean(e.country, "unknown"))
		bump(s.languages, clean(e.language, "unknown"))
		bump(s.versions, clean(e.version, agg.version))
		local h = hourOf(s, at)
		h.joins += 1
		h.peaks[agg.serverId] = math.max(h.peaks[agg.serverId] or 0, agg.activeCount)
	end)
end

function LiveStats.leave(agg: Agg, e: LeaveEvent)
	local who = agg.active[e.userId]
	if not who then
		return -- never counted as joined (left while loading), so there is nothing to close
	end
	agg.active[e.userId] = nil
	agg.activeCount -= 1

	local at = agg.clock()
	local seconds = math.clamp(e.sessionSeconds, 0, MAX_SESSION)
	if seconds ~= seconds then
		seconds = 0 -- NaN
	end
	local place = clean(e.lastPlace, "")
	local step = e.tutorialStep
	both(agg, function(s)
		s.leaves += 1
		local sess = if who.isNew then s.sessions.new else s.sessions.returning
		sess.count += 1
		sess.seconds += seconds
		sess.hist[bucket(LiveStats.SESSION_LIMITS, seconds)] += 1
		if seconds < LiveStats.SESSION_LIMITS[1] then
			s.bounces += 1
		end
		if place ~= "" then
			bump(s.lastPlaces, place)
		end
		if step ~= nil then
			bump(s.tutorialSteps, tostring(math.floor(step)))
		end
		s.lastLeave = {
			lastPlace = if place ~= "" then place else "unknown",
			tutorialStep = step,
			seconds = seconds,
			at = at,
		}
		hourOf(s, at).leaves += 1
	end)
end

function LiveStats.robux(agg: Agg, e: RobuxEvent)
	local amount = math.floor(e.amount)
	if amount ~= amount or amount <= 0 then
		return
	end
	local at = agg.clock()
	local day = dayOf(at)
	local product = clean(e.product, "unknown")
	local firstToday = agg.payerDay[e.userId] ~= day
	agg.payerDay[e.userId] = day
	both(agg, function(s)
		s.robux.total += amount
		s.robux.count += 1
		local p = s.robux.byProduct[product]
		if not p then
			p = { amount = 0, count = 0 }
			s.robux.byProduct[product] = p
		end
		p.amount += amount
		p.count += 1
		if firstToday then
			s.payers += 1
		end
		local h = hourOf(s, at)
		h.robux += amount
		bump(h.products, product, amount)
	end)
end

local function sanitize(message: string): string
	local m = string.gsub(tostring(message), "%d%d%d%d%d%d+", "#") -- long digit runs could be user ids
	m = string.gsub(m, "%s+", " ")
	return string.sub(m, 1, Tuning.stats.maxErrorChars)
end

local function addSample(samples: { { message: string, count: number } }, message: string, count: number)
	for _, s in samples do
		if s.message == message then
			s.count += count
			return
		end
	end
	if #samples < Tuning.stats.maxErrorSamples then
		table.insert(samples, { message = message, count = count })
		return
	end
	-- full: replace the rarest sample when this one is at least as common
	local rarest = 1
	for i, s in samples do
		if s.count < samples[rarest].count then
			rarest = i
		end
	end
	if count >= samples[rarest].count then
		samples[rarest] = { message = message, count = count }
	end
end

function LiveStats.error(agg: Agg, e: ErrorEvent)
	local at = agg.clock()
	local message = sanitize(e.message)
	both(agg, function(s)
		s.errors.count += 1
		addSample(s.errors.samples, message, 1)
		hourOf(s, at).errors += 1
	end)
end

function LiveStats.perf(agg: Agg, e: PerfEvent)
	local fps = e.fps
	local ping = e.ping
	if fps ~= nil and (fps ~= fps or fps < 0) then
		fps = nil
	end
	if ping ~= nil and (ping ~= ping or ping < 0) then
		ping = nil
	end
	if fps ~= nil then
		agg.lastFps = math.min(fps, MAX_FPS)
	end
	if ping ~= nil then
		agg.lastPing = ping
	end
	both(agg, function(s)
		if fps ~= nil then
			s.perf.samples += 1
			s.perf.fpsSum += math.min(fps, MAX_FPS)
			s.perf.fpsHist[bucket(LiveStats.FPS_LIMITS, fps)] += 1
		end
		if e.crashed == true then
			s.perf.crashes += 1
		end
		if ping ~= nil then
			s.perf.pingMax = math.max(s.perf.pingMax, ping)
		end
	end)
end

-- ---- merging (pure; used for the day record and for tests) ----

local function num(v: any): number
	return if type(v) == "number" and v == v then v else 0
end

local function addCounts(into: Counts, from: any)
	if type(from) ~= "table" then
		return
	end
	for k, v in from do
		if type(k) == "string" and type(v) == "number" then
			into[k] = (into[k] or 0) + v
		end
	end
end

local function addHist(into: Hist, from: any)
	if type(from) ~= "table" then
		return
	end
	for i = 1, #into do
		into[i] += num(from[i])
	end
end

local function addSession(into: Session, from: any)
	if type(from) ~= "table" then
		return
	end
	into.count += num(from.count)
	into.seconds += num(from.seconds)
	addHist(into.hist, from.hist)
end

-- Adds `from` into `into` (both Stats shaped; `from` may come from a DataStore and be incomplete). Returns `into`.
function LiveStats.merge(into: Stats, from: any): Stats
	if type(from) ~= "table" then
		return into
	end
	for _, k in
		{
			"joins",
			"leaves",
			"newJoins",
			"returningJoins",
			"uniqueNew",
			"uniqueReturning",
			"payers",
			"bounces",
		}
	do
		(into :: any)[k] = num((into :: any)[k]) + num(from[k])
	end
	into.at = math.max(into.at, num(from.at))
	if type(from.sessions) == "table" then
		addSession(into.sessions.new, from.sessions.new)
		addSession(into.sessions.returning, from.sessions.returning)
	end
	if type(from.sources) == "table" then
		for name, s in from.sources do
			if type(name) == "string" and type(s) == "table" then
				local d = into.sources[name]
				if not d then
					d = { joins = 0, newJoins = 0, d1 = 0, d7 = 0 }
					into.sources[name] = d
				end
				d.joins += num(s.joins)
				d.newJoins += num(s.newJoins)
				d.d1 += num(s.d1)
				d.d7 += num(s.d7)
			end
		end
	end
	for _, k in
		{ "returningByAge", "devices", "countries", "languages", "versions", "lastPlaces", "tutorialSteps" }
	do
		addCounts((into :: any)[k], from[k])
	end
	local ll = from.lastLeave
	if
		type(ll) == "table"
		and num(ll.at) > 0
		and (into.lastLeave == nil or num(ll.at) >= (into.lastLeave :: LastLeave).at)
	then
		into.lastLeave = {
			lastPlace = if type(ll.lastPlace) == "string" then ll.lastPlace else "unknown",
			tutorialStep = if type(ll.tutorialStep) == "number" then ll.tutorialStep else nil,
			seconds = num(ll.seconds),
			at = num(ll.at),
		}
	end
	if type(from.robux) == "table" then
		into.robux.total += num(from.robux.total)
		into.robux.count += num(from.robux.count)
		if type(from.robux.byProduct) == "table" then
			for name, p in from.robux.byProduct do
				if type(name) == "string" and type(p) == "table" then
					local d = into.robux.byProduct[name]
					if not d then
						d = { amount = 0, count = 0 }
						into.robux.byProduct[name] = d
					end
					d.amount += num(p.amount)
					d.count += num(p.count)
				end
			end
		end
	end
	if type(from.errors) == "table" then
		into.errors.count += num(from.errors.count)
		if type(from.errors.samples) == "table" then
			for _, s in from.errors.samples do
				if type(s) == "table" and type(s.message) == "string" then
					addSample(into.errors.samples, s.message, num(s.count))
				end
			end
		end
	end
	if type(from.perf) == "table" then
		into.perf.samples += num(from.perf.samples)
		into.perf.fpsSum += num(from.perf.fpsSum)
		into.perf.crashes += num(from.perf.crashes)
		into.perf.pingMax = math.max(into.perf.pingMax, num(from.perf.pingMax))
		addHist(into.perf.fpsHist, from.perf.fpsHist)
	end
	if type(from.hours) == "table" then
		for key, h in from.hours do
			if type(key) == "string" and type(h) == "table" then
				local d = into.hours[key]
				if not d then
					d = { joins = 0, leaves = 0, robux = 0, errors = 0, peaks = {}, products = {} }
					into.hours[key] = d
				end
				d.joins += num(h.joins)
				d.leaves += num(h.leaves)
				d.robux += num(h.robux)
				d.errors += num(h.errors)
				addCounts(d.products, h.products)
				if type(h.peaks) == "table" then
					for server, p in h.peaks do
						if type(server) == "string" and type(p) == "number" then
							d.peaks[server] = math.max(d.peaks[server] or 0, p) -- the same server's flushes take the max
						end
					end
				end
			end
		end
	end
	return into
end

-- ---- views ----

local function clone(stats: Stats): Stats
	return LiveStats.merge(LiveStats.emptyStats(), stats)
end

-- Everything since this server started, plus who is in the server now. Counts and histograms only.
function LiveStats.snapshot(agg: Agg, now: number): Stats
	local s = clone(agg.total)
	s.at = now
	s.playing = agg.activeCount
	s.peak = agg.peak
	return s
end

-- What happened since the last drain. The next drain starts from zero.
function LiveStats.drain(agg: Agg, now: number): Stats
	local delta = agg.pending
	delta.at = now
	agg.pending = LiveStats.emptyStats()
	return delta
end

-- A delta that could not be stored goes back, to be sent with the next one.
function LiveStats.requeue(agg: Agg, delta: Stats)
	LiveStats.merge(agg.pending, delta)
end

-- One server's line in the shared `live` record.
export type ServerSummary = {
	at: number,
	playing: number,
	peak: number,
	fps: number?,
	ping: number?,
	version: string,
}
export type LiveRecord = { at: number, servers: { [string]: ServerSummary } }

function LiveStats.serverSummary(agg: Agg, now: number): ServerSummary
	return {
		at = now,
		playing = agg.activeCount,
		peak = agg.peak,
		fps = agg.lastFps,
		ping = agg.lastPing,
		version = agg.version,
	}
end

-- Puts this server's summary into the shared record and drops servers that stopped reporting.
function LiveStats.mergeLive(old: any, serverId: string, summary: ServerSummary, now: number): LiveRecord
	local servers: { [string]: ServerSummary } = {}
	if type(old) == "table" and type(old.servers) == "table" then
		for id, s in old.servers do
			if
				type(id) == "string"
				and type(s) == "table"
				and now - num(s.at) <= Tuning.stats.serverStaleSeconds
			then
				servers[id] = s :: any
			end
		end
	end
	servers[serverId] = summary
	return { at = now, servers = servers }
end

return LiveStats
