--!strict
-- Plan Mission: pick a destination on the map, then a 3-step wizard (Destination → Rocket → Pricing).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
local Map = require(script.Parent.Map)
local RocketView = require(script.Parent.RocketView)
local Theme = require(script.Parent.Theme)

local Wizard = {}

local root: Frame
local body: Frame
local footer: Frame
local steps: Frame
local pickBar: Frame
local state =
	{ dest = nil :: string?, rocket = nil :: string?, fare = "standard", service = "comfort", step = 1 }
Wizard.anchors = {} :: { [string]: GuiObject }

local KIND_TEXT = {
	Tourists = "Tourists pay for comfort. Good service keeps seats full.",
	Satellites = "Satellite operators book every slot. Reliable steady income.",
	Science = "Research teams pay well for long, careful missions.",
	Cargo = "Bulk cargo: big loads, big fuel bills. Match the rocket size.",
}

local function idleRockets(): { any }
	local out = {}
	for _, r in App.view.rockets do
		if not r.mission then
			table.insert(out, r)
		end
	end
	return out
end

local function rocketOf(id: string?): any
	for _, r in App.view.rockets do
		if r.id == id then
			return r
		end
	end
	return nil
end

local function close()
	root.Visible = false
	App.setUi("wizard", false)
end

local function stat(parent: Instance, order: number, title: string, value: string, color: Color3?)
	local f = Kit.new("Frame", {
		LayoutOrder = order,
		BackgroundColor3 = Theme.white,
		Size = UDim2.new(0.5, -6, 0, 96),
		Parent = parent,
	}, { Kit.corner(16), Kit.stroke(Theme.line, 1) })
	Kit.text(
		title,
		15,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(16, 14), Size = UDim2.new(1, -32, 0, 20), Parent = f }
	)
	if color then
		local chip = Kit.chip(
			value,
			color,
			if color == Theme.greenDark
				then Theme.greenSoft
				elseif color == Theme.red then Theme.redSoft
				else Theme.blueSoft,
			17
		)
		chip.Position = UDim2.fromOffset(16, 46)
		chip.Parent = f
	else
		Kit.text(
			value,
			24,
			Theme.heavy,
			Theme.ink,
			{ Position = UDim2.fromOffset(16, 44), Size = UDim2.new(1, -32, 0, 30), Parent = f }
		)
	end
end

local function paintSteps()
	steps:ClearAllChildren()
	Kit.list(10, true).Parent = steps
	for i, name in { "Destination", "Rocket", "Pricing" } do
		local done, cur = i < state.step, i == state.step
		local dot = Kit.new("Frame", {
			LayoutOrder = i * 2,
			BackgroundColor3 = if done then Theme.green elseif cur then Theme.blue else Theme.soft,
			Size = UDim2.fromOffset(32, 32),
			Parent = steps,
		}, { Kit.round() })
		Kit.text(
			if done then "✓" else tostring(i),
			16,
			Theme.heavy,
			if done or cur then Theme.white else Theme.muted,
			{ Size = UDim2.fromScale(1, 1), TextXAlignment = Enum.TextXAlignment.Center, Parent = dot }
		)
		Kit.text(name, 17, Theme.bold, if cur then Theme.ink else Theme.muted, {
			LayoutOrder = i * 2 + 1,
			AutomaticSize = Enum.AutomaticSize.X,
			Size = UDim2.fromOffset(0, 32),
			TextTruncate = Enum.TextTruncate.None,
			Parent = steps,
		})
	end
end

local render: () -> ()

local function setFooter(
	primary: string,
	enabled: boolean,
	onPrimary: () -> (),
	back: boolean,
	green: boolean?
)
	footer:ClearAllChildren()
	if back then
		local b = Kit.ghost("BACK", function()
			state.step -= 1
			render()
		end, UDim2.new(0.32, -8, 0, 62))
		b.Parent = footer
	end
	local btn = Kit.button({
		text = primary,
		disabled = not enabled,
		color = if green then Theme.green else Theme.orange,
		shade = if green then Theme.greenDark else Theme.orangeDark,
		size = if back then UDim2.new(0.68, 0, 0, 66) else UDim2.new(1, 0, 0, 66),
		onClick = onPrimary,
	})
	btn.AnchorPoint = Vector2.new(1, 0)
	btn.Position = UDim2.fromScale(1, 0)
	btn.Parent = footer
	Wizard.anchors.primary = btn
end

local function stepDestination()
	local d = Destinations.byId[state.dest :: string]
	local wrap = Kit.scroller({ Parent = body })
	local top = Kit.card(
		{ LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 132), Parent = wrap },
		{ Kit.stroke(Theme.line, 1) }
	)
	Kit.text(
		`Earth  →  {d.name}`,
		30,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(20, 16), Size = UDim2.new(1, -40, 0, 36), Parent = top }
	)
	Kit.text(
		`EARTH → {d.code} · {d.kind}`,
		16,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(20, 54), Size = UDim2.new(1, -40, 0, 20), Parent = top }
	)
	local demand = Economy.demandLabel(d.id)
	local chip = Kit.chip(`{string.upper(demand)} DEMAND`, Theme.greenDark, Theme.greenSoft, 14)
	chip.Position = UDim2.fromOffset(20, 86)
	chip.Parent = top
	local grid = Kit.new(
		"Frame",
		{ LayoutOrder = 2, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 204), Parent = wrap },
		{
			Kit.new("UIGridLayout", {
				CellSize = UDim2.new(0.5, -6, 0, 96),
				CellPadding = UDim2.fromOffset(12, 12),
				SortOrder = Enum.SortOrder.LayoutOrder,
			}),
		}
	)
	stat(grid, 1, "Demand", demand, Theme.greenDark)
	local comp = Economy.competitionLabel(d.id)
	stat(grid, 2, "Competition", comp, if comp == "High" then Theme.red else Theme.blue)
	stat(grid, 3, "Distance", `{d.distance} AU-ish`)
	local best = state.rocket and rocketOf(state.rocket)
	local sample = if best then best.model else Rockets.starter
	stat(
		grid,
		4,
		"Trip time",
		if Economy.canReach(sample, d.id)
			then `~{Format.duration(Economy.tripSeconds(sample, d.id, App.view.passes.fastLaunch))}`
			else "Needs bigger rocket"
	)
	local note = Kit.card(
		{ LayoutOrder = 3, AutomaticSize = Enum.AutomaticSize.Y, Size = UDim2.fromScale(1, 0), Parent = wrap },
		{ Kit.stroke(Theme.line, 1), Kit.pad(18), Kit.list(8) }
	)
	Kit.text(`{d.kind}`, 18, Theme.heavy, Theme.ink, { LayoutOrder = 1, Parent = note })
	local kindText = Kit.wrap(KIND_TEXT[d.kind] or "", 16)
	kindText.LayoutOrder = 2
	kindText.Parent = note
	setFooter("CONTINUE", true, function()
		state.step = 2
		render()
	end, false)
end

local function fitTag(model: string, destId: string): (string, Color3, Color3, boolean)
	if not Economy.canReach(model, destId) then
		return "OUT OF RANGE", Theme.muted, Theme.soft, false
	end
	local t = Economy.trip(model, destId, state.fare, state.service)
	if t.profit <= 0 then
		return "LOSES MONEY", Theme.red, Theme.redSoft, true
	elseif t.load >= 0.95 then
		return "↑ SELLS OUT", Theme.blue, Theme.blueSoft, true
	elseif t.load >= 0.6 then
		return "GOOD FIT", Theme.greenDark, Theme.greenSoft, true
	end
	return "TOO BIG · HALF EMPTY", Theme.amber, Theme.amberSoft, true
end

local function stepRocket()
	local d = Destinations.byId[state.dest :: string]
	local list = Kit.scroller({ Parent = body })
	Kit.card(
		{ LayoutOrder = 0, AutomaticSize = Enum.AutomaticSize.Y, Size = UDim2.fromScale(1, 0), Parent = list },
		{
			Kit.stroke(Theme.line, 1),
			Kit.pad(18),
			Kit.list(4),
			Kit.text("Choose a rocket", 24, Theme.heavy, Theme.ink, { LayoutOrder = 1 }),
			(function()
				local w = Kit.wrap(
					`Pick one that reaches {d.name} and suits the demand. Bigger isn't always better.`,
					15
				)
				w.LayoutOrder = 2
				return w
			end)(),
		}
	)
	local idle = idleRockets()
	if #idle == 0 then
		local busy = Kit.wrap(
			"Every rocket is already flying a mission. Buy another rocket, or end a mission first.",
			16
		)
		busy.LayoutOrder = 1
		busy.Parent = list
		setFooter("BUY ROCKET", true, function()
			close()
			App.go("openCatalog")
		end, true, true)
		return
	end
	for i, r in idle do
		local spec = Rockets.byId[r.model]
		local tag, fg, bg, usable = fitTag(r.model, d.id)
		local selected = state.rocket == r.id
		local row = Kit.new("TextButton", {
			LayoutOrder = i,
			BackgroundTransparency = 0,
			BackgroundColor3 = if selected then Theme.blueSoft else Theme.white,
			Size = UDim2.new(1, 0, 0, 128),
			AutoButtonColor = usable,
			Parent = list,
		}, {
			Kit.corner(16),
			Kit.stroke(if selected then Theme.blue else Theme.line, if selected then 3 else 1),
		})
		local view =
			RocketView.new(r.model, Tuning.agencyColors[App.view.agency.color], UDim2.fromOffset(170, 96))
		view.Position = UDim2.fromOffset(12, 16)
		view.Parent = row
		Kit.text(
			`#{r.tail} · {spec.name}`,
			20,
			Theme.heavy,
			Theme.ink,
			{ Position = UDim2.fromOffset(196, 16), Size = UDim2.new(1, -210, 0, 26), Parent = row }
		)
		Kit.text(
			`{spec.capacity} seats · range {spec.range}`,
			15,
			Theme.medium,
			Theme.muted,
			{ Position = UDim2.fromOffset(196, 44), Size = UDim2.new(1, -210, 0, 20), Parent = row }
		)
		local chip = Kit.chip(tag, fg, bg, 13)
		chip.Position = UDim2.fromOffset(196, 76)
		chip.Parent = row
		if usable then
			row.Activated:Connect(function()
				state.rocket = r.id
				render()
			end)
		end
		if i == 1 then
			Wizard.anchors.firstRocket = row
		end
	end
	local pick = rocketOf(state.rocket)
	setFooter("CONTINUE", pick ~= nil and not pick.mission and Economy.canReach(pick.model, d.id), function()
		state.step = 3
		render()
	end, true)
end

local function stepPricing()
	local d = Destinations.byId[state.dest :: string]
	local r = rocketOf(state.rocket)
	local spec = Rockets.byId[r.model]
	local list = Kit.scroller({ Parent = body })
	local function card(
		order: number,
		title: string,
		options: { any },
		selected: string,
		onChange: (string) -> ()
	)
		local c = Kit.card({
			LayoutOrder = order,
			AutomaticSize = Enum.AutomaticSize.Y,
			Size = UDim2.fromScale(1, 0),
			Parent = list,
		}, { Kit.stroke(Theme.line, 1), Kit.pad(18), Kit.list(10) })
		Kit.text(title, 22, Theme.heavy, Theme.ink, { LayoutOrder = 1, Parent = c })
		local seg = Kit.segmented(options, selected, onChange)
		seg.LayoutOrder = 2
		seg.Parent = c
		return c
	end
	local fareOpts = {}
	for _, f in Tuning.fares do
		table.insert(fareOpts, {
			id = f.id,
			title = if f.id == "standard" then "Recommended" else f.name,
			sub = Format.money(d.fare * f.fareMult),
		})
	end
	local fareCard = card(1, "Ticket price", fareOpts, state.fare, function(id)
		state.fare = id
		render()
	end)
	local fareBlurb = Kit.wrap(Economy.fare(state.fare).blurb, 15)
	fareBlurb.LayoutOrder = 3
	fareBlurb.Parent = fareCard
	local serviceOpts = {}
	for _, s in Tuning.services do
		table.insert(serviceOpts, {
			id = s.id,
			title = s.name,
			sub = if s.costShare == 0 then "Free" else `{Format.money(d.fare * s.costShare)} / seat`,
		})
	end
	local serviceCard = card(2, "Onboard service", serviceOpts, state.service, function(id)
		state.service = id
		render()
	end)
	local serviceBlurb = Kit.wrap(Economy.service(state.service).blurb, 15)
	serviceBlurb.LayoutOrder = 3
	serviceBlurb.Parent = serviceCard

	local trip =
		Economy.trip(r.model, d.id, state.fare, state.service, if App.view.passes.doubleCash then 2 else 1)
	local secs = Economy.tripSeconds(r.model, d.id, App.view.passes.fastLaunch)
	local good = trip.profit > 0
	local exp = Kit.new("Frame", {
		LayoutOrder = if App.compact then 0 else 3, -- phones: the result first, above the fold
		BackgroundColor3 = if good then Theme.greenSoft else Theme.redSoft,
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromScale(1, 0),
		Parent = list,
	}, { Kit.corner(16), Kit.pad(18), Kit.list(8) })
	Kit.text("Expected per trip", 16, Theme.medium, Theme.muted, { LayoutOrder = 1, Parent = exp })
	Kit.text(
		`~{trip.filled} {if d.kind == "Satellites" or d.kind == "Cargo" then "payloads" else "passengers"}   <font color="{if trip.load
				>= 0.95
			then "#0E8A4F"
			else "#B7791F"}">{math.floor(trip.load * 100)}% full</font>`,
		22,
		Theme.heavy,
		Theme.ink,
		{ LayoutOrder = 2, Parent = exp }
	)
	local bar = Kit.bar(trip.load, if trip.load >= 0.95 then Theme.green else Theme.amber, 10)
	bar.LayoutOrder = 3
	bar.Parent = exp
	Kit.text(
		`Profit per trip   <font color="{if good then "#0E8A4F" else "#E5484D"}"><b>{if good then "+" else ""}{Format.money(
			trip.profit
		)}</b></font>`,
		18,
		Theme.medium,
		Theme.ink,
		{ LayoutOrder = 4, Parent = exp }
	)
	Kit.text(
		`Trip time   <b>~{Format.duration(secs)}</b>   ·   about <b>{Format.money(
			trip.profit * 60 / (secs + Tuning.turnaroundSeconds)
		)}</b>/min`,
		16,
		Theme.medium,
		Theme.ink,
		{ LayoutOrder = 5, Parent = exp }
	)
	Kit.text(
		`{spec.name} #{r.tail} · fuel {Format.money(trip.fuel)} per trip`,
		14,
		Theme.regular,
		Theme.muted,
		{ LayoutOrder = 6, Parent = exp }
	)
	setFooter("🚀  LAUNCH MISSION", true, function()
		if App.act("planMission", state.dest, state.rocket, state.fare, state.service) then
			close()
			App.go("toast", `Mission to {d.name} launched!`, "milestone")
			App.go("openPanel", "missions")
		end
	end, true, true)
end

function render()
	for _, c in body:GetChildren() do
		c:Destroy()
	end
	Wizard.anchors = {}
	paintSteps()
	if state.step == 1 then
		stepDestination()
	elseif state.step == 2 then
		stepRocket()
	else
		stepPricing()
	end
end

local function openAt(destId: string)
	state.dest = destId
	state.step = 1
	state.fare, state.service = "standard", "comfort"
	local cur = rocketOf(state.rocket)
	if not cur or cur.mission or not Economy.canReach(cur.model, destId) then
		state.rocket = nil
		for _, r in idleRockets() do
			if Economy.canReach(r.model, destId) then
				state.rocket = r.id
				break
			end
		end
	end
	App.go("openPanel", nil)
	root.Visible = true
	Kit.popIn(root)
	App.setUi("wizard", true)
	render()
end

-- Enter "pick a destination" mode on the map (optionally for one rocket).
function Wizard.pick(rocketId: string?)
	local v = App.view
	if not v then
		return
	end
	state.rocket = rocketId
	local ids = {}
	local candidates: { any } = if rocketId then { rocketOf(rocketId) } else idleRockets()
	for _, d in Destinations.list do
		if d.stage <= v.stage then
			for _, r in candidates do
				if r and Economy.canReach(r.model, d.id) then
					table.insert(ids, d.id)
					break
				end
			end
		end
	end
	App.go("openPanel", nil)
	App.setUi("picking", true)
	pickBar.Visible = true
	Map.setPick(ids, function(id)
		Map.setPick(nil)
		pickBar.Visible = false
		App.setUi("picking", false)
		openAt(id)
	end)
end

-- Open the wizard straight at a destination (from map click / suggestions), or start pick mode.
function Wizard.open(destId: string?, rocketId: string?)
	if not App.view or App.view.agency.name == "" then
		return
	end
	if rocketId then
		state.rocket = rocketId
	end
	if not destId then
		Wizard.pick(rocketId)
		return
	end
	local d = Destinations.byId[destId]
	if not d or d.stage > App.view.stage then
		App.go(
			"toast",
			if d then `{d.name} unlocks at career stage {d.stage}` else "Unknown destination",
			"error"
		)
		return
	end
	openAt(destId)
end

function Wizard.start(canvas: Frame)
	root = Kit.card({
		Name = "Wizard",
		AnchorPoint = Vector2.new(1, 0),
		Visible = false,
		Parent = canvas,
	}, { Kit.stroke(Theme.line, 1) })
	local head =
		Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 92), Parent = root })
	local ic = Kit.iconCircle("🛰", Theme.amberSoft, 52, Theme.orange)
	ic.Position = UDim2.fromOffset(20, 20)
	ic.Parent = head
	Kit.text(
		"Plan Mission",
		28,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(88, 18), Size = UDim2.new(1, -170, 0, 32), Parent = head }
	)
	local subtitle = Kit.text(
		"Destination · Rocket · Pricing",
		16,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(88, 50), Size = UDim2.new(1, -170, 0, 22), Parent = head }
	)
	local x = Kit.iconButton("×", close, 44)
	x.AnchorPoint = Vector2.new(1, 0)
	x.Position = UDim2.new(1, -20, 0, 24)
	x.Parent = head
	steps = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Position = UDim2.fromOffset(22, 100),
		Size = UDim2.new(1, -44, 0, 36),
		Parent = root,
	})
	body = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Position = UDim2.fromOffset(18, 148),
		Size = UDim2.new(1, -36, 1, -250),
		Parent = root,
	})
	footer = Kit.new("Frame", {
		BackgroundTransparency = 1,
		AnchorPoint = Vector2.new(0, 1),
		Position = UDim2.new(0, 18, 1, -18),
		Size = UDim2.new(1, -36, 0, 66),
		Parent = root,
	})

	pickBar = Kit.new("Frame", {
		BackgroundColor3 = Theme.navyCard,
		Visible = false,
		Parent = canvas,
	}, { Kit.corner(22) })
	Kit.text(
		"Pick a destination",
		22,
		Theme.heavy,
		Theme.white,
		{ Position = UDim2.fromOffset(24, 16), Size = UDim2.fromOffset(400, 28), Parent = pickBar }
	)
	Kit.text(
		"Green rings are in range of a free rocket",
		16,
		Theme.medium,
		Color3.fromHex("C7CBE6"),
		{ Position = UDim2.fromOffset(24, 48), Size = UDim2.fromOffset(400, 22), Parent = pickBar }
	)
	local cancel = Kit.ghost("Cancel", function()
		Map.setPick(nil)
		pickBar.Visible = false
		App.setUi("picking", false)
	end, UDim2.fromOffset(150, 56))
	cancel.AnchorPoint = Vector2.new(1, 0.5)
	cancel.Position = UDim2.new(1, -18, 0.5, 0)
	cancel.Parent = pickBar

	-- compact (phones): full-height sheet on the right; the pick bar moves bottom-right, clear of the nav
	App.onLayout(function(compact)
		if compact then
			root.Position = UDim2.new(1, -16, 0, 16)
			root.Size = UDim2.new(0, 560, 1, -32)
		else
			root.Position = UDim2.new(1, -24, 0, 112)
			root.Size = UDim2.new(0, 620, 1, -140)
		end
		-- compact: drop the subtitle and pull the steps up to give the body more height
		subtitle.Visible = not compact
		steps.Position = UDim2.fromOffset(22, if compact then 70 else 100)
		body.Position = UDim2.fromOffset(18, if compact then 114 else 148)
		body.Size = UDim2.new(1, -36, 1, if compact then -216 else -250)
		pickBar.AnchorPoint = if compact then Vector2.new(1, 1) else Vector2.new(0.5, 1)
		pickBar.Position = if compact then UDim2.new(1, -16, 1, -16) else UDim2.new(0.5, 0, 1, -128)
		pickBar.Size = UDim2.fromOffset(if compact then 560 else 620, 92)
	end)
end

return Wizard
