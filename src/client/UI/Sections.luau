--!strict
-- Panel sections for the retention systems: Today's contracts, Research lab, Mission patches.
-- Each builder adds one container Frame to `parent` at LayoutOrder `order`. Contracts also returns a live tick
-- (Panels runs it 4x a second) for its countdown.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Contracts = require(ReplicatedStorage.Shared.Contracts)
local Format = require(ReplicatedStorage.Shared.Format)
local Patches = require(ReplicatedStorage.Shared.Patches)
local Research = require(ReplicatedStorage.Shared.Research)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Theme = require(script.Parent.Theme)

local Sections = {}

local function container(parent: Instance, order: number): Frame
	return Kit.new("Frame", {
		LayoutOrder = order,
		BackgroundTransparency = 1,
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromScale(1, 0),
		Parent = parent,
	}, { Kit.list(10) })
end

local function title(box: Instance, text: string)
	Kit.text(
		text,
		15,
		Theme.bold,
		Theme.muted,
		{ LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 22), Parent = box }
	)
end

-- Two lines of fixed-size content on a card: a row with a left icon, used by the locked and contract rows.
local function row(box: Instance, order: number, height: number): Frame
	return Kit.card(
		{ LayoutOrder = order, Size = UDim2.new(1, 0, 0, height), Parent = box },
		{ Kit.stroke(Theme.line, 1) }
	)
end

-- TODAY'S CONTRACTS ---------------------------------------------------------------------------------
local function progressText(c: any): string
	if c.kind == "earned" then
		return `{Format.money(c.progress)} / {Format.money(c.target)}`
	end
	return `{c.progress} / {c.target}`
end

function Sections.contracts(parent: Instance, order: number, v: any): (() -> ())?
	local data = v.contracts
	if not data then
		return nil
	end
	local box = container(parent, order)
	title(box, "Today's contracts")
	for i, c in data.list do
		local done = c.progress >= c.target
		local r = row(box, 1 + i, 96)
		local ic = Kit.iconCircle(
			"clipboard",
			if c.claimed then Theme.greenSoft else Theme.blueSoft,
			44,
			if c.claimed then Theme.greenDark else Theme.blue
		)
		ic.Position = UDim2.fromOffset(16, 26)
		ic.Parent = r
		Kit.text(Contracts.label(c), 17, Theme.bold, Theme.ink, {
			Position = UDim2.fromOffset(72, 12),
			Size = UDim2.new(1, -72 - 150, 0, 24),
			Parent = r,
		})
		local bar = Kit.bar(c.progress / math.max(c.target, 1), if done then Theme.green else Theme.cyan, 8)
		bar.Position = UDim2.fromOffset(72, 46)
		bar.Size = UDim2.new(1, -72 - 150, 0, 8)
		bar.Parent = r
		Kit.text(progressText(c), 14, Theme.mono, Theme.muted, {
			Position = UDim2.fromOffset(72, 62),
			Size = UDim2.new(1, -72 - 150, 0, 20),
			Parent = r,
		})
		local reward = Kit.chip(`+{Format.money(c.reward)}`, Theme.greenDark, Theme.greenSoft, 13, "coin")
		reward.AnchorPoint = Vector2.new(1, 0)
		reward.Position = UDim2.new(1, -14, 0, 12)
		reward.Parent = r
		if c.claimed then
			local d = Kit.chip("Done", Theme.greenDark, Theme.greenSoft, 13, "check")
			d.AnchorPoint = Vector2.new(1, 1)
			d.Position = UDim2.new(1, -14, 1, -14)
			d.Parent = r
		elseif done then
			local b = Kit.button({
				text = "COLLECT",
				color = Theme.green,
				shade = Theme.greenDark,
				size = UDim2.fromOffset(120, 40),
				textSize = 16,
				onClick = function()
					App.act("claimContract", i)
				end,
			})
			b.AnchorPoint = Vector2.new(1, 1)
			b.Position = UDim2.new(1, -14, 1, -12)
			b.Parent = r
		end
	end
	local foot = Kit.text(
		"",
		14,
		Theme.monoRegular,
		Theme.muted,
		{ LayoutOrder = 10, Size = UDim2.new(1, 0, 0, 20), Parent = box }
	)
	return function()
		local s = math.max(0, math.floor(data.resetsAt - App.now()))
		foot.Text = `New contracts in {s // 3600}h {s % 3600 // 60}m`
	end
end

-- RESEARCH LAB --------------------------------------------------------------------------------------
local TRACK_ICON = { engines = "flame", efficiency = "fuel", comfort = "seat" }

-- "+12% speed" style line for the bonus a track gives at `level`.
local function effectText(id: string, level: number): string
	local step = (Research.track(id) :: any).step * level
	local pct = math.floor(step * 100 + 0.5)
	if level == 0 then
		return "No bonus yet"
	elseif id == "engines" then
		return `+{pct}% speed`
	elseif id == "efficiency" then
		return `{pct}% less fuel`
	end
	return `+{pct}% demand`
end

function Sections.research(parent: Instance, order: number, v: any)
	local box = container(parent, order)
	title(box, "Research lab")
	local need = Tuning.research.unlockStage
	if v.stage < need then
		local r = row(box, 2, 76)
		local ic = Icons.make("lock", 32, Theme.faint)
		ic.AnchorPoint = Vector2.new(0, 0.5)
		ic.Position = UDim2.new(0, 22, 0.5, 0)
		ic.Parent = r
		Kit.text(`Unlocks at stage {need}`, 18, Theme.bold, Theme.muted, {
			Position = UDim2.fromOffset(72, 0),
			Size = UDim2.new(1, -90, 1, 0),
			Parent = r,
		})
		return
	end
	local levels = v.research or {}
	local max = Tuning.research.maxLevel
	for i, t in Tuning.research.tracks do
		local level: number = levels[t.id] or 0
		local r = row(box, 1 + i, 128)
		local ic = Kit.iconCircle(TRACK_ICON[t.id] or "bolt", Theme.cyanSoft, 52, Theme.cyanDark)
		ic.Position = UDim2.fromOffset(16, 16)
		ic.Parent = r
		Kit.text(t.name, 19, Theme.bold, Theme.ink, {
			Position = UDim2.fromOffset(80, 12),
			Size = UDim2.new(1, -80 - 150, 0, 24),
			Parent = r,
		})
		Kit.text(t.blurb, 14, Theme.regular, Theme.muted, {
			Position = UDim2.fromOffset(80, 38),
			Size = UDim2.new(1, -80 - 150, 0, 36),
			TextWrapped = true,
			TextYAlignment = Enum.TextYAlignment.Top,
			TextTruncate = Enum.TextTruncate.AtEnd,
			Parent = r,
		})
		local pips = Kit.new("Frame", {
			Position = UDim2.fromOffset(80, 82),
			Size = UDim2.fromOffset(max * 28, 8),
			BackgroundTransparency = 1,
			Parent = r,
		}, { Kit.list(6, true) })
		for p = 1, max do
			Kit.new("Frame", {
				LayoutOrder = p,
				BackgroundColor3 = if p <= level then Theme.cyan else Theme.line,
				Size = UDim2.fromOffset(22, 8),
				Parent = pips,
			}, { Kit.round() })
		end
		Kit.text(effectText(t.id, level), 14, Theme.mono, Theme.cyanDark, {
			Position = UDim2.fromOffset(80, 98),
			Size = UDim2.new(1, -80 - 150, 0, 20),
			Parent = r,
		})
		local cost = if level < max then Research.cost(t.id, level) else nil
		local b = Kit.button({
			text = if cost then `UPGRADE  {Format.money(cost)}` else "MAX",
			color = Theme.cyanDark,
			shade = Theme.navy3,
			size = UDim2.fromOffset(136, 46),
			textSize = 15,
			disabled = cost == nil or v.cash < cost,
			onClick = function()
				App.act("buyResearch", t.id)
			end,
		})
		b.AnchorPoint = Vector2.new(1, 1)
		b.Position = UDim2.new(1, -14, 1, -14)
		b.Parent = r
	end
end

-- MISSION PATCHES -----------------------------------------------------------------------------------
-- Enamel-pin style badges drawn from frames: earned ones glow on a dark tile, the rest wait greyed out.
local function patchCell(box: Instance, i: number, p: any, w: number, h: number)
	local d = math.floor(w * 0.72)
	local cell = Kit.new("Frame", {
		LayoutOrder = i,
		BackgroundColor3 = if p.earned then Theme.navyCard else Theme.soft,
	}, { Kit.corner(16), Kit.stroke(if p.earned then Theme.gridLine else Theme.line, 1) })
	local disc = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 12),
		Size = UDim2.fromOffset(d, d),
		BackgroundColor3 = if p.earned then p.color else Theme.line,
		Parent = cell,
	}, { Kit.round() })
	if p.earned then
		Kit.new("UIGradient", {
			Color = ColorSequence.new(p.color, p.color2 or p.color:Lerp(Color3.new(0, 0, 0), 0.3)),
			Rotation = 135,
			Parent = disc,
		})
		Kit.stroke(Theme.white, 3).Parent = disc
		Kit.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromScale(0.5, 0.5),
			Size = UDim2.new(1, -14, 1, -14),
			BackgroundTransparency = 1,
			Parent = disc,
		}, { Kit.round(), Kit.stroke(Theme.white, 1.5, 0.5) })
		if p.kind == "stage" then
			local star = Icons.make("star", math.floor(d * 0.22), Theme.white)
			star.AnchorPoint = Vector2.new(0.5, 0)
			star.Position = UDim2.new(0.5, 0, 0, math.floor(d * 0.16))
			star.Parent = disc
			Kit.text(p.code:sub(2), math.floor(d * 0.38), Theme.display, Theme.white, {
				AnchorPoint = Vector2.new(0.5, 0),
				Position = UDim2.fromScale(0.5, 0.36),
				Size = UDim2.new(1, 0, 0, math.floor(d * 0.38) + 6),
				TextXAlignment = Enum.TextXAlignment.Center,
				Parent = disc,
			})
		else
			Kit.text(p.code, math.floor(d * 0.3), Theme.display, Theme.white, {
				Size = UDim2.fromScale(1, 1),
				TextXAlignment = Enum.TextXAlignment.Center,
				Parent = disc,
			})
		end
	else
		Kit.stroke(Theme.faint, 2, 0.6).Parent = disc
		local lock = Icons.make("lock", math.floor(d * 0.4), Theme.faint)
		lock.AnchorPoint = Vector2.new(0.5, 0.5)
		lock.Position = UDim2.fromScale(0.5, 0.5)
		lock.Parent = disc
	end
	Kit.text(
		if p.earned then p.name else "???",
		14,
		Theme.bold,
		if p.earned then Theme.white else Theme.muted,
		{
			Position = UDim2.fromOffset(4, 12 + d + 6),
			Size = UDim2.new(1, -8, 0, h - d - 22),
			TextXAlignment = Enum.TextXAlignment.Center,
			TextYAlignment = Enum.TextYAlignment.Top,
			TextWrapped = true,
			Parent = cell,
		}
	)
	cell.Parent = box
end

function Sections.patches(parent: Instance, order: number, v: any)
	local w, h = 128, 156
	if App.compact then
		w, h = 160, 170
	end
	local box = Kit.new("Frame", {
		LayoutOrder = order,
		BackgroundTransparency = 1,
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromScale(1, 0),
		Parent = parent,
	}, {
		Kit.new("UIGridLayout", {
			CellSize = UDim2.fromOffset(w, h),
			CellPadding = UDim2.fromOffset(12, 12),
			SortOrder = Enum.SortOrder.LayoutOrder,
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
		}),
	})
	for i, p in Patches.list(v.stats.visited, v.stage) do
		patchCell(box, i, p, w, h)
	end
end

return Sections
