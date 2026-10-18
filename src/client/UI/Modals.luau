--!strict
-- Centre modals with a dimmed backdrop. One at a time; celebrations queue behind whatever is open.

local GuiService = game:GetService("GuiService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SocialService = game:GetService("SocialService")

local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Format = require(ReplicatedStorage.Shared.Format)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Motion = require(script.Parent.Motion)
local RocketView = require(script.Parent.RocketView)
local Sounds = require(script.Parent.Sounds)
local Theme = require(script.Parent.Theme)

local Modals = {}

local layer: Frame
local canvasSize: () -> Vector2
local queue: { () -> () } = {}
local current: Frame? = nil
Modals.anchors = {} :: { [string]: GuiObject }

local function agencyColor(): Color3
	return Tuning.agencyColors[(App.view and App.view.agency.color) or 1] or Theme.orange
end

-- Slides the card out, then destroys it and starts the next queued modal. Reduced motion skips the slide.
function Modals.close()
	local card = current
	local function finish()
		if current ~= card then
			return -- another modal took over while this one was leaving
		end
		if card then
			card:Destroy()
		end
		current = nil
		layer.Visible = false
		Modals.anchors = {}
		App.setUi("modal", nil)
		local nextModal = table.remove(queue, 1)
		if nextModal then
			nextModal()
		end
	end
	if card then
		Motion.exit(card, "bottom", finish)
	else
		finish()
	end
end

-- Builds the shell. Returns the content frame (vertical list).
local function shell(name: string, width: number, closable: boolean?): Frame
	if current then
		current:Destroy()
	end
	layer.Visible = true
	App.setUi("modal", name)
	local card = Kit.card({
		Name = name,
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromOffset(width, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		Parent = layer,
	}, { Kit.pad(28, 28, 28), Kit.list(14, false, Enum.HorizontalAlignment.Center) })
	local limit = Kit.new("UISizeConstraint", { MaxSize = Vector2.new(width, 940), Parent = card })
	limit.MinSize = Vector2.new(width, 0)
	-- Short screens (phones): shrink the whole card to fit rather than clip it. Re-checked whenever its
	-- size settles (AutomaticSize resolves after layout); the threshold stops a resize feedback loop.
	local fit = Kit.new("UIScale", { Parent = card })
	card:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		local need = card.AbsoluteSize.Y / math.max(fit.Scale, 0.01) / Kit.canvasScale(card)
		local s = math.min(1, (canvasSize().Y - 32) / math.max(need, 1))
		if math.abs(s - ((card:GetAttribute("FitScale") :: number?) or 1)) > 0.02 then
			card:SetAttribute("FitScale", s)
			Kit.popIn(card) -- re-targets the pop animation at the fitted scale
		end
	end)
	Kit.popIn(card)
	if closable ~= false then
		local x = Kit.iconButton("close", Modals.close, 44)
		x.AnchorPoint = Vector2.new(1, 0)
		x.Position = UDim2.new(1, 8, 0, -8)
		local holder = Kit.new(
			"Frame",
			{ BackgroundTransparency = 1, Size = UDim2.fromScale(1, 0), LayoutOrder = -100, Parent = card }
		)
		x.Parent = holder
	end
	current = card
	return card
end

local function show(fn: () -> ())
	if current then
		table.insert(queue, fn)
	else
		fn()
	end
end

local function heading(parent: Instance, eyebrow: string?, title: string, sub: string?, order: number)
	if eyebrow then
		Kit.text(
			eyebrow,
			15,
			Theme.heavy,
			Theme.orange,
			{ LayoutOrder = order, TextXAlignment = Enum.TextXAlignment.Center, Parent = parent }
		)
	end
	Kit.text(title, 32, Theme.heavy, Theme.ink, {
		LayoutOrder = order + 1,
		Size = UDim2.new(1, 0, 0, 40),
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = parent,
	})
	if sub then
		local w = Kit.wrap(sub, 17)
		w.LayoutOrder = order + 2
		w.TextXAlignment = Enum.TextXAlignment.Center
		w.Parent = parent
	end
end

local function buttonsRow(
	parent: Instance,
	order: number,
	secondary: string?,
	onSecondary: (() -> ())?,
	primary: string,
	onPrimary: () -> (),
	green: boolean?,
	icon: string?
)
	local row = Kit.new(
		"Frame",
		{ LayoutOrder = order, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 66), Parent = parent }
	)
	local width = if secondary then UDim2.new(0.62, 0, 0, 66) else UDim2.new(1, 0, 0, 66)
	if secondary and onSecondary then
		Kit.ghost(secondary, onSecondary, UDim2.new(0.36, 0, 0, 62)).Parent = row
	end
	local b = Kit.button({
		text = primary,
		size = width,
		onClick = onPrimary,
		icon = icon,
		color = if green then Theme.green else nil,
		shade = if green then Theme.greenDark else nil,
	})
	b.AnchorPoint = Vector2.new(1, 0)
	b.Position = UDim2.fromScale(1, 0)
	b.Parent = row
	Modals.anchors.primary = b
	return row
end

-- FIRST RUN: found your agency ---------------------------------------------------------------------
function Modals.createAgency()
	local card = shell("create", 640, false)
	local hero = Kit.new(
		"Frame",
		{ LayoutOrder = 1, BackgroundColor3 = Theme.navyCard, Size = UDim2.new(1, 0, 0, 170), Parent = card },
		{ Kit.corner(18), Kit.gradient(Theme.navyCard, Theme.navy2, 120) }
	)
	local view = RocketView.new("sparrow", agencyColor(), UDim2.fromScale(1, 1), { flame = true, tilt = 18 })
	view.Parent = hero
	heading(
		card,
		"WELCOME, DIRECTOR",
		"Found your space agency",
		"Name it, pick your colours, and your first rocket is on the pad.",
		2
	)
	local box = Kit.new("TextBox", {
		LayoutOrder = 10,
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.soft,
		Size = UDim2.new(1, 0, 0, 60),
		PlaceholderText = "Agency name (e.g. Nova Orbital)",
		PlaceholderColor3 = Theme.faint,
		Text = "",
		TextSize = 22,
		FontFace = Theme.bold,
		ClearTextOnFocus = false,
		Parent = card,
	}, { Kit.corner(14), Kit.pad(18, 0), Kit.stroke(Theme.line, 2) })
	local chosen = 1
	local swatches = Kit.new(
		"Frame",
		{ LayoutOrder = 11, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 52), Parent = card },
		{ Kit.list(10, true, Enum.HorizontalAlignment.Center) }
	)
	local function paint()
		for _, s in swatches:GetChildren() do
			if s:IsA("TextButton") then
				local stroke = s:FindFirstChildOfClass("UIStroke") :: UIStroke
				stroke.Transparency = if s.Name == tostring(chosen) then 0 else 1
			end
		end
		view:Destroy()
		view = RocketView.new(
			"sparrow",
			Tuning.agencyColors[chosen],
			UDim2.fromScale(1, 1),
			{ flame = true, tilt = 18 }
		)
		view.Parent = hero
	end
	for i, c in Tuning.agencyColors do
		local s = Kit.new("TextButton", {
			Name = tostring(i),
			LayoutOrder = i,
			BackgroundTransparency = 0,
			BackgroundColor3 = c,
			Size = UDim2.fromOffset(48, 48),
			Parent = swatches,
		}, { Kit.round(), Kit.stroke(Theme.ink, 3, 1) })
		s.Activated:Connect(function()
			chosen = i
			paint()
		end)
	end
	local err = Kit.text(
		"",
		15,
		Theme.bold,
		Theme.red,
		{ LayoutOrder = 12, TextXAlignment = Enum.TextXAlignment.Center, Parent = card }
	)
	buttonsRow(card, 20, nil, nil, "LAUNCH MY AGENCY", function()
		local name = box.Text:gsub("^%s+", ""):gsub("%s+$", "")
		local ok, result, message = pcall(Remotes.Act.InvokeServer, Remotes.Act, "createAgency", name, chosen)
		if ok and result then
			Modals.close()
		else
			err.Text = if ok then (message or "Try another name") else "Connection hiccup, try again"
		end
	end, nil, "rocket")
	paint()
end

-- WELCOME BACK -------------------------------------------------------------------------------------
function Modals.welcome(summary: any)
	if not App.view then
		App.changed.Event:Wait() -- the summary can arrive before the first state
	end
	show(function()
		local v = App.view
		local card = shell("welcome", 620)
		local away = if summary.away > 86400
			then `{math.floor(summary.away / 86400)} days`
			else Format.duration(summary.away)
		heading(
			card,
			"WELCOME BACK",
			v.agency.name,
			`You were away {away}.{if summary.capped then " Your rockets flew for the first 8h." else ""}`,
			1
		)
		local earned = Kit.new("Frame", {
			LayoutOrder = 5,
			BackgroundColor3 = Theme.greenSoft,
			Size = UDim2.new(1, 0, 0, 140),
			Parent = card,
		}, { Kit.corner(18) })
		Kit.text(
			"Earned while you were away",
			17,
			Theme.bold,
			Theme.greenDark,
			{ Position = UDim2.fromOffset(24, 20), Size = UDim2.new(1, -48, 0, 22), Parent = earned }
		)
		Kit.text(
			`+{Format.money(summary.earned)}`,
			48,
			Theme.heavy,
			Theme.greenDark,
			{ Position = UDim2.fromOffset(24, 46), Size = UDim2.new(1, -48, 0, 54), Parent = earned }
		)
		Kit.text(
			`{Format.int(summary.trips)} trips, {Format.int(summary.passengers)} passengers and payloads`,
			16,
			Theme.medium,
			Theme.greenDark,
			{ Position = UDim2.fromOffset(24, 104), Size = UDim2.new(1, -48, 0, 22), Parent = earned }
		)
		if v.daily.ready then
			buttonsRow(
				card,
				10,
				"LATER",
				Modals.close,
				`CLAIM DAY {v.daily.day}, +{Format.money(v.daily.reward)}`,
				function()
					App.act("claimDaily")
					Modals.close()
				end,
				true,
				"gift"
			)
		else
			buttonsRow(card, 10, nil, nil, "BACK TO MISSION CONTROL", Modals.close)
		end
	end)
end

-- DAILY REWARD -------------------------------------------------------------------------------------
function Modals.daily()
	show(function()
		local v = App.view
		local card = shell("daily", 600)
		heading(
			card,
			"DAILY OPERATIONS REWARD",
			if v.daily.ready then `Day {v.daily.day} of 7` else "Claimed for today",
			"Come back every day. The streak grows to a big day-7 payout.",
			1
		)
		local row = Kit.new(
			"Frame",
			{ LayoutOrder = 5, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 104), Parent = card },
			{ Kit.list(8, true, Enum.HorizontalAlignment.Center) }
		)
		for i, amount in Tuning.daily do
			local reached = i < v.daily.day or (i == v.daily.day and not v.daily.ready)
			local today = i == v.daily.day and v.daily.ready
			local cell = Kit.new("Frame", {
				LayoutOrder = i,
				BackgroundColor3 = if today
					then Theme.amberSoft
					elseif reached then Theme.greenSoft
					else Theme.soft,
				Size = UDim2.fromOffset(70, 100),
				Parent = row,
			}, {
				Kit.corner(14),
				Kit.stroke(if today then Theme.amber else Theme.line, if today then 3 else 1),
			})
			Kit.text(`Day {i}`, 13, Theme.bold, Theme.muted, {
				Position = UDim2.fromOffset(0, 10),
				Size = UDim2.new(1, 0, 0, 18),
				TextXAlignment = Enum.TextXAlignment.Center,
				Parent = cell,
			})
			local mark = Icons.make(
				if reached then "check" else "coin",
				30,
				if reached then Theme.greenDark else Theme.amber
			)
			mark.AnchorPoint = Vector2.new(0.5, 0)
			mark.Position = UDim2.fromOffset(35, 32)
			mark.Parent = cell
			Kit.text(Format.money(amount), 14, Theme.heavy, Theme.ink, {
				Position = UDim2.fromOffset(0, 70),
				Size = UDim2.new(1, 0, 0, 20),
				TextXAlignment = Enum.TextXAlignment.Center,
				Parent = cell,
			})
		end
		if v.daily.ready then
			buttonsRow(card, 10, nil, nil, `CLAIM +{Format.money(v.daily.reward)}`, function()
				App.act("claimDaily")
				Modals.close()
			end, true)
		else
			buttonsRow(card, 10, nil, nil, "SEE YOU TOMORROW", Modals.close)
		end
	end)
end

-- CONFIRM ------------------------------------------------------------------------------------------
function Modals.confirm(title: string, body: string, yes: string, onYes: () -> ())
	local card = shell("confirm", 560)
	heading(card, nil, title, body, 1)
	buttonsRow(card, 10, "Cancel", Modals.close, yes, function()
		Modals.close()
		onYes()
	end, true)
end

-- ROCKET CATALOG -----------------------------------------------------------------------------------
function Modals.catalog(classFilter: string?, selectedId: string?)
	local v = App.view
	local class = classFilter or "Light"
	local card = shell("catalog", 1180)
	heading(
		card,
		nil,
		"Buy Rocket",
		`You have {Format.money(v.cash)}. Bigger isn't always better: match seats to demand.`,
		1
	)
	local tabs = Kit.new(
		"Frame",
		{ LayoutOrder = 4, BackgroundColor3 = Theme.soft, Size = UDim2.new(1, 0, 0, 60), Parent = card },
		{ Kit.corner(14), Kit.pad(4), Kit.list(4, true) }
	)
	for i, c in Rockets.classes do
		local on = c == class
		local t = Kit.new("TextButton", {
			LayoutOrder = i,
			BackgroundTransparency = if on then 0 else 1,
			BackgroundColor3 = Theme.white,
			Size = UDim2.new(0.25, -4, 1, 0),
			Text = string.upper(c),
			FontFace = Theme.heavy,
			TextSize = 17,
			TextColor3 = if on then Theme.blue else Theme.muted,
			Parent = tabs,
		}, { Kit.corner(11) })
		t.Activated:Connect(function()
			Modals.catalog(c)
		end)
	end
	local split = Kit.new(
		"Frame",
		{ LayoutOrder = 5, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 560), Parent = card }
	)
	local left = Kit.scroller({ Size = UDim2.fromScale(0.48, 1), Parent = split })
	local right = Kit.card({
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.fromScale(1, 0),
		Size = UDim2.fromScale(0.5, 1),
		BackgroundColor3 = Theme.soft,
		NoShadow = true,
		Parent = split,
	})
	local inClass = {}
	for _, r in Rockets.list do
		if r.class == class then
			table.insert(inClass, r)
		end
	end
	local pick = selectedId or (inClass[1] and inClass[1].id)
	for i, r in inClass do
		local locked = r.stage > v.stage
		local sel = r.id == pick
		local row = Kit.new("TextButton", {
			LayoutOrder = i,
			BackgroundTransparency = 0,
			BackgroundColor3 = if sel then Theme.blueSoft else Theme.white,
			Size = UDim2.new(1, -8, 0, 128),
			AutoButtonColor = false,
			Parent = left,
		}, { Kit.corner(16), Kit.stroke(if sel then Theme.blue else Theme.line, if sel then 3 else 1) })
		local view = RocketView.new(r.id, agencyColor(), UDim2.fromOffset(150, 90))
		view.Position = UDim2.fromOffset(10, 18)
		view.Parent = row
		Kit.text(
			r.name,
			22,
			Theme.heavy,
			Theme.ink,
			{ Position = UDim2.fromOffset(170, 14), Size = UDim2.new(1, -310, 0, 28), Parent = row }
		)
		Kit.text(
			`{r.capacity} seats  |  range {r.range}`,
			15,
			Theme.medium,
			Theme.muted,
			{ Position = UDim2.fromOffset(170, 44), Size = UDim2.new(1, -310, 0, 20), Parent = row }
		)
		Kit.wrap(r.blurb, 14).Parent = Kit.new("Frame", {
			BackgroundTransparency = 1,
			Position = UDim2.fromOffset(170, 68),
			Size = UDim2.new(1, -310, 0, 44),
			Parent = row,
		})
		local price = Kit.button({
			text = if locked then `STAGE {r.stage}` else Format.money(r.price),
			icon = if locked then "lock" else nil,
			disabled = locked or v.cash < r.price,
			color = Theme.green,
			shade = Theme.greenDark,
			size = UDim2.fromOffset(124, 60),
			textSize = 19,
			onClick = function()
				Modals.confirm(
					`Buy a {r.name}?`,
					`It costs {Format.money(r.price)} and is ready right away.`,
					`Buy for {Format.money(r.price)}`,
					function()
						App.act("buyRocket", r.id)
					end
				)
			end,
		})
		price.AnchorPoint = Vector2.new(1, 0.5)
		price.Position = UDim2.new(1, -12, 0.5, 0)
		price.Parent = row
		-- the tutorial points at the recommended second rocket (Kestrel), else the first in the list
		if r.id == "kestrel" or (i == 1 and not Modals.anchors.firstPrice) then
			Modals.anchors.firstPrice = price
		end
		row.Activated:Connect(function()
			Modals.catalog(class, r.id)
		end)
	end
	local r = Rockets.byId[pick]
	if r then
		local hero =
			RocketView.new(r.id, agencyColor(), UDim2.new(1, -24, 0, 230), { flame = true, tilt = 14 })
		hero.Position = UDim2.fromOffset(12, 12)
		hero.Parent = right
		Kit.corner(14).Parent = hero
		Kit.text(
			r.name,
			30,
			Theme.heavy,
			Theme.ink,
			{ Position = UDim2.fromOffset(24, 254), Size = UDim2.new(1, -48, 0, 36), Parent = right }
		)
		Kit.text(
			`{r.class} class`,
			16,
			Theme.medium,
			Theme.muted,
			{ Position = UDim2.fromOffset(24, 290), Size = UDim2.new(1, -48, 0, 20), Parent = right }
		)
		local reach = {}
		for _, d in Destinations.list do
			if d.distance <= r.range then
				table.insert(reach, d.code)
			end
		end
		local lines = {
			{ "seat", `<b>{r.capacity}</b> seats / payload slots` },
			{ "planet", `Range <b>{r.range}</b>: {table.concat(reach, ", ")}` },
			{ "bolt", `Speed <b>x{r.speed}</b>` },
			{ "fuel", `Fuel <b>{Format.money(r.fuel)}</b> per distance unit` },
		}
		for i, line in lines do
			local row = Kit.new("Frame", {
				BackgroundTransparency = 1,
				Position = UDim2.fromOffset(24, 324 + (i - 1) * 34),
				Size = UDim2.new(1, -48, 0, 26),
				Parent = right,
			}, { Kit.list(10, true) })
			Icons.make(line[1], 22, Theme.blue).Parent = row
			Kit.text(line[2], 18, Theme.medium, Theme.ink, { Size = UDim2.new(1, -32, 1, 0), Parent = row })
		end
		Kit.wrap(r.blurb, 16).Parent = Kit.new("Frame", {
			BackgroundTransparency = 1,
			Position = UDim2.fromOffset(24, 466),
			Size = UDim2.new(1, -48, 0, 60),
			Parent = right,
		})
	end
end

-- DELIVERED ----------------------------------------------------------------------------------------
function Modals.delivered(data: any)
	show(function()
		local spec = Rockets.byId[data.model]
		local card = shell("delivered", 640)
		heading(card, "NEW ROCKET DELIVERED", spec.name, nil, 1)
		local hero = Kit.new("Frame", {
			LayoutOrder = 4,
			BackgroundColor3 = Theme.navyCard,
			Size = UDim2.new(1, 0, 0, 260),
			Parent = card,
		}, { Kit.corner(18), Kit.gradient(Theme.navyCard, Theme.navy2, 120) })
		RocketView.new(data.model, agencyColor(), UDim2.fromScale(1, 1), { flame = true, tilt = 20 }).Parent =
			hero
		local chips = Kit.new(
			"Frame",
			{ LayoutOrder = 5, BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 34), Parent = card },
			{ Kit.list(10, true, Enum.HorizontalAlignment.Center) }
		)
		for _, t in { `{spec.capacity} SEATS`, `RANGE {spec.range}`, `SPEED x{spec.speed}` } do
			Kit.chip(t, Theme.blue, Theme.blueSoft, 15).Parent = chips
		end
		buttonsRow(card, 10, "LATER", Modals.close, "PLAN A MISSION", function()
			Modals.close()
			App.go("openWizard", nil, data.rocket)
		end, nil, "satellite")
	end)
end

-- STAGE ACHIEVED -----------------------------------------------------------------------------------
function Modals.stage(data: any)
	show(function()
		local card = shell("stage", 660)
		local trophy = Kit.new("Frame", {
			LayoutOrder = 1,
			BackgroundColor3 = Theme.navyCard,
			Size = UDim2.fromOffset(110, 110),
			Parent = card,
		}, { Kit.round(), Kit.stroke(Theme.amber, 5) })
		local cup = Icons.make("trophy", 64, Theme.amber)
		cup.AnchorPoint = Vector2.new(0.5, 0.5)
		cup.Position = UDim2.fromScale(0.5, 0.5)
		cup.Parent = trophy
		heading(card, nil, string.upper(data.name), nil, 2)
		Kit.text(
			"ACHIEVED",
			17,
			Theme.heavy,
			Color3.fromHex("B7791F"),
			{ LayoutOrder = 4, TextXAlignment = Enum.TextXAlignment.Center, Parent = card }
		)
		local blurb = Kit.wrap(`{App.view.agency.name} is now a {data.name}. {data.blurb}`, 17)
		blurb.LayoutOrder = 5
		blurb.TextXAlignment = Enum.TextXAlignment.Center
		blurb.Parent = card
		if #data.unlocks > 0 then
			local box = Kit.new("Frame", {
				LayoutOrder = 6,
				BackgroundColor3 = Theme.soft,
				AutomaticSize = Enum.AutomaticSize.Y,
				Size = UDim2.fromScale(1, 0),
				Parent = card,
			}, { Kit.corner(16), Kit.pad(20), Kit.list(10) })
			Kit.text("Unlocked", 16, Theme.bold, Theme.muted, { LayoutOrder = 0, Parent = box })
			for i, u in data.unlocks do
				local row = Kit.new("Frame", {
					LayoutOrder = i,
					BackgroundTransparency = 1,
					Size = UDim2.new(1, 0, 0, 28),
					Parent = box,
				}, { Kit.list(10, true) })
				Icons.make(if u.kind == "rocket" then "rocket" else "ringPlanet", 26, Theme.blue).Parent = row
				Kit.text(
					`<b>{u.name}</b>`,
					20,
					Theme.medium,
					Theme.ink,
					{ Size = UDim2.new(1, -36, 1, 0), Parent = row }
				)
			end
		end
		buttonsRow(card, 10, "CAREER", function()
			Modals.close()
			App.go("openPanel", "career")
		end, "CONTINUE", Modals.close)
	end)
end

-- SETTINGS / HELP ----------------------------------------------------------------------------------
function Modals.settings()
	local card = shell("settings", 520)
	heading(card, nil, "Settings", nil, 1)
	local on = App.view and App.view.settings.reducedMotion
	local device = GuiService.ReducedMotionEnabled
	local label = if device then "ON (device setting)" elseif on then "ON" else "OFF"
	buttonsRow(card, 5, nil, nil, `Reduced motion: {label}`, function()
		App.act("setFlag", "reducedMotion", not on)
		Sounds.play("toggle")
		Modals.settings()
	end)
	local soundOn = App.view.settings.sound ~= false
	buttonsRow(card, 6, nil, nil, if soundOn then "Sound: ON" else "Sound: OFF", function()
		App.act("setFlag", "sound", not soundOn)
		Sounds.play("toggle")
		Modals.settings()
	end, nil, if soundOn then "soundOn" else "soundOff")
	-- Roblox Player Support: reports reach Creator Hub with device info and a screenshot.
	buttonsRow(card, 7, "Close", Modals.close, "Report a problem", function()
		Modals.close()
		local ok = pcall(function()
			SocialService:PromptFeedbackSubmissionAsync({ FeedbackType = Enum.FeedbackType.PlayerSupport })
		end)
		if not ok then
			App.go("toast", "Reporting isn't available here yet", "error")
		end
	end)
end

function Modals.help()
	local card = shell("help", 640)
	heading(card, nil, "How to play", nil, 1)
	for i, line in
		{
			{ "satellite", "Plan missions: pick a destination, a free rocket, and your pricing." },
			{
				"rocket",
				"Rockets fly automatically and pay you every trip, even while you're away (up to 8h).",
			},
			{ "seat", "Match rocket size to demand. Empty seats cost fuel and hurt your rating." },
			{ "trophy", "Finish career goals to unlock new rockets and destinations, from orbit to Titan." },
			{ "gift", "Claim the daily operations reward. The streak grows to day 7." },
		}
	do
		local row = Kit.new("Frame", {
			LayoutOrder = 2 + i,
			BackgroundTransparency = 1,
			AutomaticSize = Enum.AutomaticSize.Y,
			Size = UDim2.fromScale(1, 0),
			Parent = card,
		}, { Kit.list(12, true) })
		Icons.make(line[1], 26, Theme.blue).Parent = row
		local w = Kit.wrap(line[2], 18, Theme.ink)
		w.Size = UDim2.new(1, -38, 0, 0)
		w.Parent = row
	end
	buttonsRow(card, 20, nil, nil, "GOT IT", Modals.close)
end

function Modals.start(canvas: Frame)
	canvasSize = function()
		return canvas.AbsoluteSize / Kit.canvasScale(canvas)
	end
	layer = Kit.new("TextButton", {
		Name = "Modals",
		-- extends past the canvas (which sits inside the safe area) so the dim covers the whole screen;
		-- symmetric, so centred cards stay centred on the canvas
		Position = UDim2.fromOffset(-2000, -2000),
		Size = UDim2.new(1, 4000, 1, 4000),
		BackgroundTransparency = 0.45,
		BackgroundColor3 = Color3.fromHex("070A18"),
		AutoButtonColor = false,
		Visible = false,
		ZIndex = 50,
		Parent = canvas,
	})
	layer.ZIndex = 50
	Remotes.Welcome.OnClientEvent:Connect(Modals.welcome)
	Remotes.Celebrate.OnClientEvent:Connect(function(kind, data)
		if kind == "delivered" then
			Modals.delivered(data)
		elseif kind == "stage" then
			Modals.stage(data)
		end
	end)
end

return Modals
