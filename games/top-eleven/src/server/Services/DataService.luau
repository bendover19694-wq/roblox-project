--!strict
-- Copied from src/server/Services/DataService.luau @ 5c33f2c (store name changed to TopEleven_v1)
-- Player profiles in DataStores with a simple session lock.
-- ponytail: lock-in-record via UpdateAsync (no cross-server lock handoff). If players report
-- "progress not saving" after server hops, upgrade to ProfileStore (D-007).
-- Outage mode: if loading fails, the player still plays, but saving is off and the HUD says so.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileSchema = require(ReplicatedStorage.Shared.ProfileSchema)
local SessionLock = require(ReplicatedStorage.Shared.SessionLock)

type Profile = any

local DataService = {}

local LOCK_TTL = 180 -- seconds; autosave refreshes the lock well before this
local AUTOSAVE = 60
local JOB = if game.JobId ~= "" then game.JobId else "studio"

type Entry = { data: Profile, canSave: boolean, released: boolean? }

local entries: { [Player]: Entry } = {}
local loadedSignal = Instance.new("BindableEvent")

local store: DataStore? = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore("TopEleven_v1")
	end)
	if ok then
		store = result
	else
		warn("[DataService] DataStores unavailable (unpublished place?): ", result)
	end
end

local function key(player: Player): string
	return `Player_{player.UserId}` -- matches the RTBF deletion template
end

-- Studio with API access off: every DataStore call fails with this, so retrying only delays the first screen.
local studioBlocked = false

local function tryLoad(player: Player): Profile?
	if not store then
		return nil
	end
	local blocked = false
	local ok, result = pcall(function()
		return (store :: DataStore):UpdateAsync(key(player), function(old)
			if SessionLock.heldByOther(old, JOB, os.time(), LOCK_TTL) then
				blocked = true
				return nil -- another server still owns this profile
			end
			local data = ProfileSchema.migrate(old)
			do
				local it = data :: any
				it._lock = { job = JOB, at = os.time() }
			end
			return data
		end)
	end)
	if not ok then
		warn("[DataService] load failed: ", result)
		if tostring(result):find("StudioAccessToApisNotAllowed", 1, true) then
			studioBlocked = true
		end
		return nil
	end
	if blocked then
		return nil
	end
	return ProfileSchema.migrate(result)
end

-- Stores `entry`; returns true only when the data is stored. Re-checks `released` inside the transform
-- because UpdateAsync can run it after PlayerRemoving's release save was queued.
local function write(player: Player, entry: Entry, release: boolean): boolean
	if not store or not SessionLock.mayWrite(entry, release) then
		return false
	end
	local written = false
	local ok, err = pcall(function()
		(store :: DataStore):UpdateAsync(key(player), function(old)
			written = false -- the transform can run more than once; only the last run counts
			if not SessionLock.mayWrite(entry, release) then
				return nil -- released while this save was queued; don't write the lock back
			end
			local lock = type(old) == "table" and old._lock
			if lock and lock.job ~= JOB then
				return nil -- lost the lock to another server; don't overwrite its data
			end
			local out = table.clone(entry.data) :: any
			out._lock = if release then nil else { job = JOB, at = os.time() }
			written = true
			return out
		end)
	end)
	if not ok then
		warn("[DataService] save failed: ", err)
	end
	return ok and written
end

function DataService.load(player: Player)
	local data: Profile? = nil
	for _ = 1, 5 do
		data = tryLoad(player)
		if data or not player.Parent or not store or studioBlocked then
			break -- no DataStores at all (unpublished place / outage): play unsaved right away
		end
		task.wait(3)
	end
	if not player.Parent then
		-- Left while loading: PlayerRemoving found no entry. Release the lock we just took, keep no orphan entry.
		if data then
			write(player, { data = data, canSave = true, released = true }, true)
		end
		loadedSignal:Fire(player)
		return
	end
	entries[player] = { data = data or ProfileSchema.default(), canSave = data ~= nil }
	player:SetAttribute("ReducedMotion", entries[player].data.settings.reducedMotion)
	player:SetAttribute("Sound", entries[player].data.settings.sound ~= false)
	player:SetAttribute("CanSave", data ~= nil)
	loadedSignal:Fire(player)
end

-- Saves; `release` drops the session lock (on leave / shutdown). Returns true only when the data is stored.
function DataService.save(player: Player, release: boolean?): boolean
	local entry = entries[player]
	if not entry then
		return false
	end
	if release then
		entry.released = true -- before the yield, so an autosave already in flight can't write the lock back
	end
	return write(player, entry, release == true)
end

-- Returns the live profile (mutate it, then call save at a checkpoint). Waits for load.
function DataService.get(player: Player): Profile?
	while not entries[player] and player.Parent do
		loadedSignal.Event:Wait()
	end
	local entry = entries[player]
	return entry and entry.data
end

function DataService.peek(player: Player): Profile?
	local entry = entries[player]
	return entry and entry.data
end

function DataService.start()
	Players.PlayerAdded:Connect(DataService.load)
	for _, p in Players:GetPlayers() do
		task.spawn(DataService.load, p)
	end
	Players.PlayerRemoving:Connect(function(player)
		DataService.save(player, true)
		entries[player] = nil
	end)
	game:BindToClose(function()
		local pending = 0
		for player in entries do
			pending += 1
			task.spawn(function()
				DataService.save(player, true)
				pending -= 1
			end)
		end
		local t0 = os.clock()
		while pending > 0 and os.clock() - t0 < 25 do
			task.wait(0.1)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(AUTOSAVE)
			for player in entries do
				task.spawn(DataService.save, player)
			end
		end
	end)
end

return DataService
