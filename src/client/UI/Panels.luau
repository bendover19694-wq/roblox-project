--!strict
-- Right-hand slide-in panels: Missions, Fleet, Career, More. Rebuilt from the view; live bits tick at 4 Hz.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
local RocketView = require(script.Parent.RocketView)
local Theme = require(script.Parent.Theme)

local Panels = {}

local root: Frame
local body: ScrollingFrame
local titleLabel: TextLabel
local subLabel: TextLabel
local iconHolder: Frame
local live: { () -> () } = {}
Panels.anchors = {} :: { [string]: GuiObject } -- named controls the advisor can point at

local function color(): Color3
	return Tuning.agencyColors[App.view.agency.color] or Theme.orange
end

local function rocketById(v: any, id: string): any
	for _, r in v.rockets do
		if r.id == id then
			return r
		end
	end
	return nil
end

local function missionById(v: any, id: string): any
	for _, m in v.missions do
		if m.id == id then
			return m
		end
	end
	return nil
end

-- "IN FLIGHT 42%" / "TURNING AROUND" for a mission at time `now`.
function Panels.status(m: any, now: number): (string, number)
	if now < m.departAt then
		return "TURNING AROUND", 0
	end
	local t = math.clamp((now - m.departAt) / math.max(m.arriveAt - m.departAt, 1), 0, 1)
	local d = Destinations.byId[m.dest]
	local leg = if m.trips % 2 == 1 then `RETURNING FROM {d.code}` else `FLYING TO {d.code}`
	return `{leg} {math.floor(t * 100)}%`, t
end

local function header(icon: string, title: string, sub: string)
	iconHolder:ClearAllChildren()
	local ic = Kit.iconCircle(icon, Theme.soft, 52, Theme.blue)
	ic.Parent = iconHolder
	titleLabel.Text = title
	subLabel.Text = sub
end

local function section(text: string, order: number)
	Kit.text(
		text,
		15,
		Theme.bold,
		Theme.muted,
		{ LayoutOrder = order, Size = UDim2.new(1, 0, 0, 22), Parent = body }
	)
end

-- MISSIONS -----------------------------------------------------------------------------------------
local function missionCard(m: any, order: number)
	local v = App.view
	local d = Destinations.byId[m.dest]
	local rocket = rocketById(v, m.rocket)
	local spec = rocket and Rockets.byId[rocket.model]
	local card = Kit.card(
		{ LayoutOrder = order, Size = UDim2.new(1, 0, 0, 158), Parent = body },
		{ Kit.stroke(Theme.line, 1) }
	)
	Kit.new("Frame", {
		BackgroundColor3 = Theme.green,
		Size = UDim2.new(0, 5, 1, -36),
		Position = UDim2.fromOffset(0, 18),
		Parent = card,
	}, { Kit.round() })
	Kit.text(
		`EARTH  →  {d.code}`,
		24,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(22, 14), Size = UDim2.new(1, -170, 0, 30), Parent = card }
	)
	local fare, service = Economy.fare(m.fare), Economy.service(m.service)
	Kit.text(
		`{d.name} · {fare.name} fare · {service.name}`,
		15,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(22, 46), Size = UDim2.new(1, -40, 0, 20), Parent = card }
	)
	local quality: { any } = if (m.lastLoad or 1) >= 0.9
		then { "★ GREAT", Theme.greenDark, Theme.greenSoft }
		elseif (m.lastLoad or 1) >= 0.6 then { "OK", Theme.amber, Theme.amberSoft }
		else { "HALF EMPTY", Theme.red, Theme.redSoft }
	local chip = Kit.chip(quality[1], quality[2], quality[3], 13)
	chip.AnchorPoint = Vector2.new(1, 0)
	chip.Position = UDim2.new(1, -16, 0, 16)
	chip.Parent = card
	Kit.text(
		`<b>{math.floor((m.lastLoad or 1) * 100)}% full</b> · <b>{if m.trips > 0
			then Format.money(m.lastProfit or 0)
			else "—"}</b> last trip · {m.trips} trips · {spec and spec.name or "?"} #{rocket and rocket.tail or ""}`,
		15,
		Theme.medium,
		Theme.ink,
		{ Position = UDim2.fromOffset(22, 72), Size = UDim2.new(1, -40, 0, 20), Parent = card }
	)
	local status = Kit.text(
		"",
		13,
		Theme.heavy,
		Theme.blue,
		{ Position = UDim2.fromOffset(22, 100), Size = UDim2.new(1, -140, 0, 18), Parent = card }
	)
	local bar = Kit.bar(0, Theme.blue, 6)
	bar.Position = UDim2.fromOffset(22, 124)
	bar.Size = UDim2.new(1, -150, 0, 6)
	bar.Parent = card
	local endBtn = Kit.ghost("End", function()
		App.act("closeMission", m.id)
	end, UDim2.fromOffset(96, 40))
	endBtn.AnchorPoint = Vector2.new(1, 1)
	endBtn.Position = UDim2.new(1, -16, 1, -14)
	endBtn.TextSize = 16
	endBtn.Parent = card
	table.insert(live, function()
		local cur = missionById(App.view, m.id) or m
		local text, t = Panels.status(cur, App.now())
		status.Text = text
		do
			local it = bar:FindFirstChild("Fill") :: Frame
			it.Size = UDim2.fromScale(t, 1)
		end
	end)
end

local function suggestions(order: number)
	local v = App.view
	local serving = {}
	for _, m in v.missions do
		serving[m.dest] = true
	end
	local list = {}
	for _, d in Destinations.list do
		if d.stage <= v.stage and not serving[d.id] then
			table.insert(list, d)
		end
	end
	table.sort(list, function(a, b)
		return a.demand * (1 - a.competition) > b.demand * (1 - b.competition)
	end)
	if #list == 0 then
		return
	end
	local box = Kit.card({
		LayoutOrder = order,
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromScale(1, 0),
		Parent = body,
	}, { Kit.stroke(Theme.line, 1), Kit.pad(18), Kit.list(10) })
	Kit.text(
		if #v.missions == 0 then "Open your first mission" else "Open another mission",
		22,
		Theme.heavy,
		Theme.ink,
		{ LayoutOrder = 1, Parent = box }
	)
	local wrapped =
		Kit.wrap("Each free rocket can fly one mission. These destinations have the most demand.", 15)
	wrapped.LayoutOrder = 2
	wrapped.Parent = box
	for i = 1, math.min(3, #list) do
		local d = list[i]
		local row = Kit.new("TextButton", {
			LayoutOrder = 2 + i,
			BackgroundTransparency = 0,
			BackgroundColor3 = Theme.soft,
			Size = UDim2.new(1, 0, 0, 68),
			AutoButtonColor = true,
			Parent = box,
		}, { Kit.corner(14) })
		local ic = Kit.iconCircle("🛰", Theme.greenSoft, 44, Theme.greenDark)
		ic.Position = UDim2.fromOffset(12, 12)
		ic.Parent = row
		Kit.text(
			d.name,
			18,
			Theme.bold,
			Theme.ink,
			{ Position = UDim2.fromOffset(68, 12), Size = UDim2.new(1, -110, 0, 22), Parent = row }
		)
		Kit.text(
			`{Economy.demandLabel(d.id)} demand · {d.kind} · distance {d.distance}`,
			14,
			Theme.regular,
			Theme.muted,
			{ Position = UDim2.fromOffset(68, 36), Size = UDim2.new(1, -110, 0, 18), Parent = row }
		)
		Kit.text("›", 30, Theme.bold, Theme.faint, {
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -16, 0.5, 0),
			Size = UDim2.fromOffset(20, 30),
			Parent = row,
		})
		row.Activated:Connect(function()
			App.go("openWizard", d.id)
		end)
		if i == 1 then
			Panels.anchors.suggestion = row
		end
	end
end

local function buildMissions()
	local v = App.view
	local idle = 0
	for _, r in v.rockets do
		if not r.mission then
			idle += 1
		end
	end
	header("🛰", "Missions", `{#v.missions} active · {idle} rocket{if idle == 1 then "" else "s"} free`)
	local row = Kit.new(
		"Frame",
		{ LayoutOrder = 1, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 60), Parent = body }
	)
	local newBtn = Kit.button({
		text = "＋  NEW MISSION",
		size = UDim2.fromScale(1, 1),
		onClick = function()
			App.go("pickDestination")
		end,
	})
	newBtn.Parent = row
	Panels.anchors.newMission = newBtn
	for i, m in v.missions do
		missionCard(m, 10 + i)
	end
	suggestions(100)
end

-- FLEET --------------------------------------------------------------------------------------------
local function rocketCard(r: any, order: number)
	local spec = Rockets.byId[r.model]
	local card = Kit.card(
		{ LayoutOrder = order, Size = UDim2.new(1, 0, 0, 170), Parent = body },
		{ Kit.stroke(Theme.line, 1) }
	)
	local view =
		RocketView.new(r.model, color(), UDim2.fromOffset(200, 120), { bg = Color3.fromHex("DCE7FA") })
	view.Position = UDim2.fromOffset(14, 14)
	Kit.corner(14).Parent = view
	Kit.gradient(Color3.fromHex("CFE0FF"), Color3.fromHex("F2F6FF"), 90).Parent = view
	view.Parent = card
	Kit.text(
		spec.name,
		24,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(230, 16), Size = UDim2.new(1, -250, 0, 28), Parent = card }
	)
	Kit.text(
		`#{r.tail} · {spec.class} · {spec.capacity} seats · range {spec.range}`,
		15,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(230, 46), Size = UDim2.new(1, -250, 0, 20), Parent = card }
	)
	Kit.text(
		`{r.trips} trips · <font color="#0E8A4F"><b>+{Format.money(r.earned)}</b></font> lifetime`,
		15,
		Theme.medium,
		Theme.ink,
		{ Position = UDim2.fromOffset(230, 70), Size = UDim2.new(1, -250, 0, 20), Parent = card }
	)
	if r.mission then
		local status = Kit.chip("", Theme.blue, Theme.blueSoft, 13)
		status.Position = UDim2.fromOffset(230, 104)
		status.Parent = card
		local label = status:FindFirstChildWhichIsA("TextLabel") :: TextLabel
		table.insert(live, function()
			local m = missionById(App.view, r.mission)
			if m then
				label.Text = "✈ " .. (Panels.status(m, App.now()))
			end
		end)
	else
		local ready = Kit.chip("✓ READY FOR MISSION", Theme.greenDark, Theme.greenSoft, 13)
		ready.Position = UDim2.fromOffset(230, 104)
		ready.Parent = card
		local plan = Kit.button({
			text = "PLAN",
			color = Theme.green,
			shade = Theme.greenDark,
			size = UDim2.fromOffset(110, 46),
			textSize = 18,
			onClick = function()
				App.go("openWizard", nil, r.id)
			end,
		})
		plan.AnchorPoint = Vector2.new(1, 1)
		plan.Position = UDim2.new(1, -16, 1, -14)
		plan.Parent = card
	end
end

local function buildFleet()
	local v = App.view
	local flown = {}
	local idle = 0
	for _, r in v.rockets do
		flown[r.model] = true
		if not r.mission then
			idle += 1
		end
	end
	local nFlown = 0
	for _ in flown do
		nFlown += 1
	end
	header("🚀", "Fleet", `{#v.rockets} rocket{if #v.rockets == 1 then "" else "s"} · {idle} free`)
	local row = Kit.new(
		"Frame",
		{ LayoutOrder = 1, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 60), Parent = body }
	)
	local catalog = Kit.new("Frame", { BackgroundColor3 = Theme.soft, Size = UDim2.new(0.34, -8, 1, -4) }, {
		Kit.corner(14),
		Kit.text("Catalog", 17, Theme.bold, Theme.ink, {
			Position = UDim2.fromOffset(0, 8),
			Size = UDim2.new(1, 0, 0, 22),
			TextXAlignment = Enum.TextXAlignment.Center,
		}),
		Kit.text(`{nFlown} of {#Rockets.list} flown`, 13, Theme.medium, Theme.muted, {
			Position = UDim2.fromOffset(0, 30),
			Size = UDim2.new(1, 0, 0, 18),
			TextXAlignment = Enum.TextXAlignment.Center,
		}),
	})
	catalog.Parent = row
	local buy = Kit.button({
		text = "＋  BUY ROCKET",
		color = Theme.green,
		shade = Theme.greenDark,
		size = UDim2.fromScale(0.66, 1),
		onClick = function()
			App.go("openCatalog")
		end,
	})
	buy.Position = UDim2.fromScale(0.34, 0)
	buy.Parent = row
	Panels.anchors.buyRocket = buy
	for i, r in v.rockets do
		rocketCard(r, 10 + i)
	end
end

-- CAREER -------------------------------------------------------------------------------------------
local function buildCareer()
	local v = App.view
	header("🏆", "Career", `{v.stageName} · stage {v.stage} of {v.stageCount}`)
	local hero = Kit.new(
		"Frame",
		{ LayoutOrder = 1, BackgroundColor3 = Theme.navyCard, Size = UDim2.new(1, 0, 0, 236), Parent = body },
		{ Kit.corner(18), Kit.gradient(Theme.navyCard, Theme.navy2, 120) }
	)
	local segs = Kit.new("Frame", {
		Position = UDim2.fromOffset(20, 20),
		Size = UDim2.new(1, -40, 0, 8),
		BackgroundTransparency = 1,
		Parent = hero,
	}, {
		Kit.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 6),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	for i = 1, v.stageCount do
		Kit.new("Frame", {
			LayoutOrder = i,
			BackgroundColor3 = if i < v.stage
				then Theme.amber
				elseif i == v.stage then Color3.fromHex("FFD36B")
				else Color3.fromHex("2C3466"),
			Size = UDim2.new(1 / v.stageCount, -6, 1, 0),
			Parent = segs,
		}, { Kit.round() })
	end
	Kit.text(
		`Stage {v.stage} of {v.stageCount}`,
		16,
		Theme.bold,
		Color3.fromHex("C7CBE6"),
		{ Position = UDim2.fromOffset(20, 44), Size = UDim2.fromOffset(300, 20), Parent = hero }
	)
	Kit.text(
		v.stageName,
		32,
		Theme.heavy,
		Theme.white,
		{ Position = UDim2.fromOffset(20, 70), Size = UDim2.new(1, -40, 0, 38), Parent = hero }
	)
	Kit.text(
		v.stageBlurb,
		16,
		Theme.regular,
		Color3.fromHex("C7CBE6"),
		{ Position = UDim2.fromOffset(20, 110), Size = UDim2.new(1, -40, 0, 20), Parent = hero }
	)
	local done = 0
	for _, g in v.goals do
		if g.done then
			done += 1
		end
	end
	Kit.text(
		`{done} of {#v.goals} done`,
		18,
		Theme.bold,
		Theme.white,
		{ Position = UDim2.fromOffset(20, 144), Size = UDim2.fromOffset(300, 22), Parent = hero }
	)
	local unlockNext = {}
	for _, r in Rockets.list do
		if r.stage == v.stage + 1 then
			table.insert(unlockNext, r.name)
		end
	end
	for _, d in Destinations.list do
		if d.stage == v.stage + 1 then
			table.insert(unlockNext, d.name)
		end
	end
	if #unlockNext > 0 then
		local next = Kit.new("Frame", {
			Position = UDim2.fromOffset(20, 176),
			Size = UDim2.new(1, -40, 0, 44),
			BackgroundColor3 = Color3.fromHex("222A5C"),
			Parent = hero,
		}, { Kit.corner(12) })
		Kit.text(
			`<font color="#FFD36B"><b>Next stage unlocks:</b></font> {table.concat(unlockNext, ", ")}`,
			15,
			Theme.medium,
			Theme.white,
			{ Position = UDim2.fromOffset(14, 0), Size = UDim2.new(1, -28, 1, 0), Parent = next }
		)
	end
	section("Goals for this stage", 2)
	for i, g in v.goals do
		local row = Kit.card(
			{ LayoutOrder = 10 + i, Size = UDim2.new(1, 0, 0, 104), Parent = body },
			{ Kit.stroke(Theme.line, 1) }
		)
		local check = Kit.new("Frame", {
			Position = UDim2.fromOffset(16, 34),
			Size = UDim2.fromOffset(34, 34),
			BackgroundColor3 = if g.done then Theme.green else Theme.white,
			Parent = row,
		}, { Kit.round(), Kit.stroke(if g.done then Theme.green else Theme.line, 2) })
		if g.done then
			Kit.text(
				"✓",
				20,
				Theme.heavy,
				Theme.white,
				{ Size = UDim2.fromScale(1, 1), TextXAlignment = Enum.TextXAlignment.Center, Parent = check }
			)
		end
		Kit.text(
			g.label,
			19,
			Theme.bold,
			Theme.ink,
			{ Position = UDim2.fromOffset(66, 14), Size = UDim2.new(1, -200, 0, 24), Parent = row }
		)
		local valueText = if g.kind == "earned"
			then `{Format.money(math.min(g.value, g.target))} / {Format.money(g.target)}`
			elseif g.kind == "rating" then string.format("%.1f / %.1f★", g.value, g.target)
			else `{math.min(g.value, g.target)} / {g.target}`
		Kit.text(
			`{valueText} · Reward <font color="#0E8A4F"><b>{Format.money(g.reward)}</b></font>`,
			15,
			Theme.medium,
			Theme.muted,
			{ Position = UDim2.fromOffset(66, 40), Size = UDim2.new(1, -200, 0, 20), Parent = row }
		)
		local bar = Kit.bar(math.min(g.value / g.target, 1), if g.done then Theme.green else Theme.orange, 6)
		bar.Position = UDim2.fromOffset(66, 70)
		bar.Size = UDim2.new(1, -200, 0, 6)
		bar.Parent = row
		if not g.done then
			local jump = Kit.ghost(if g.jump == "fleet" then "FLEET" else "PLAN", function()
				if g.jump == "fleet" then
					App.go("openCatalog")
				else
					App.go("openPanel", "missions")
				end
			end, UDim2.fromOffset(110, 46))
			jump.AnchorPoint = Vector2.new(1, 0.5)
			jump.Position = UDim2.new(1, -16, 0.5, 0)
			jump.Parent = row
		end
	end
end

-- MORE ---------------------------------------------------------------------------------------------
local function moreRow(
	order: number,
	icon: string,
	iconBg: Color3,
	title: string,
	sub: string,
	onClick: () -> ()
)
	local row = Kit.new("TextButton", {
		LayoutOrder = order,
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.white,
		Size = UDim2.new(1, 0, 0, 84),
		AutoButtonColor = true,
		Parent = body,
	}, { Kit.corner(16), Kit.stroke(Theme.line, 1) })
	local ic = Kit.iconCircle(icon, iconBg, 52, Theme.ink)
	ic.Position = UDim2.fromOffset(16, 16)
	ic.Parent = row
	Kit.text(
		title,
		19,
		Theme.bold,
		Theme.ink,
		{ Position = UDim2.fromOffset(84, 16), Size = UDim2.new(1, -130, 0, 24), Parent = row }
	)
	Kit.text(
		sub,
		15,
		Theme.regular,
		Theme.muted,
		{ Position = UDim2.fromOffset(84, 42), Size = UDim2.new(1, -130, 0, 20), Parent = row }
	)
	Kit.text("›", 30, Theme.bold, Theme.faint, {
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -18, 0.5, 0),
		Size = UDim2.fromOffset(20, 30),
		Parent = row,
	})
	row.Activated:Connect(onClick)
end

local function buildMore()
	local v = App.view
	header("•••", "More", v.agency.name)
	section("Progress", 1)
	moreRow(2, "🏆", Theme.amberSoft, "Career", `{v.stageName}: what's next`, function()
		App.go("openPanel", "career")
	end)
	moreRow(
		3,
		"🎁",
		Theme.greenSoft,
		"Daily operations reward",
		if v.daily.ready then `Ready to claim · +{Format.money(v.daily.reward)}` else "Come back tomorrow",
		function()
			App.go("openDaily")
		end
	)
	section("Shop", 10)
	moreRow(11, "🛍", Theme.amberSoft, "Shop", "Game passes and server boosts", function()
		App.go("openShop")
	end)
	section("Help", 20)
	moreRow(21, "⚙", Theme.soft, "Settings", "Reduced motion", function()
		App.go("openSettings")
	end)
	moreRow(22, "?", Theme.blueSoft, "How to play", "A quick refresher", function()
		App.go("openHelp")
	end)
end

local builders = { missions = buildMissions, fleet = buildFleet, career = buildCareer, more = buildMore }

function Panels.render()
	live = {}
	Panels.anchors = {}
	local id = App.ui.panel
	root.Visible = id ~= nil and App.view ~= nil
	if not root.Visible then
		return
	end
	for _, c in body:GetChildren() do
		if c:IsA("GuiObject") then
			c:Destroy()
		end
	end
	builders[id :: string]()
	for _, fn in live do
		fn()
	end
end

function Panels.start(canvas: Frame)
	root = Kit.card({
		Name = "Panel",
		AnchorPoint = Vector2.new(1, 0),
		Visible = false,
		Parent = canvas,
	}, { Kit.stroke(Theme.line, 1) })
	-- compact (phones): a full-height sheet on the right, clear of the left-hand HUD column
	App.onLayout(function(compact)
		if compact then
			root.Position = UDim2.new(1, -16, 0, 16)
			root.Size = UDim2.new(0, 560, 1, -32)
		else
			root.Position = UDim2.new(1, -24, 0, 112)
			root.Size = UDim2.new(0, 600, 1, -250)
		end
	end)
	local head =
		Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 92), Parent = root })
	iconHolder = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Position = UDim2.fromOffset(20, 20),
		Size = UDim2.fromOffset(52, 52),
		Parent = head,
	})
	titleLabel = Kit.text(
		"",
		28,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(88, 18), Size = UDim2.new(1, -170, 0, 32), Parent = head }
	)
	subLabel = Kit.text(
		"",
		16,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(88, 50), Size = UDim2.new(1, -170, 0, 22), Parent = head }
	)
	local close = Kit.iconButton("×", function()
		App.go("openPanel", nil)
	end, 44)
	close.AnchorPoint = Vector2.new(1, 0)
	close.Position = UDim2.new(1, -20, 0, 24)
	close.Parent = head
	Kit.new("Frame", {
		BackgroundColor3 = Theme.line,
		Position = UDim2.fromOffset(0, 92),
		Size = UDim2.new(1, 0, 0, 1),
		Parent = root,
	})
	body = Kit.scroller({
		Position = UDim2.fromOffset(18, 106),
		Size = UDim2.new(1, -36, 1, -116),
		Parent = root,
	})

	-- server updates arrive often (every arrival); re-render at most twice a second
	local pending = false
	App.changed.Event:Connect(function()
		if App.ui.panel and not pending then
			pending = true
			task.delay(0.5, function()
				pending = false
				local pos = body.CanvasPosition
				Panels.render()
				body.CanvasPosition = pos
			end)
		end
	end)
	App.uiChanged.Event:Connect(Panels.render)
	task.spawn(function()
		while true do
			task.wait(0.25)
			for _, fn in live do
				fn()
			end
		end
	end)
end

return Panels
