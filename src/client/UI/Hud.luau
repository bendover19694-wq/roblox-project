--!strict
-- Always-on HUD: agency card (top left), Next-move banner (top centre), shop/daily/settings (top right),
-- playtime gift pill, bottom navigation pill. Everything sits in a 1080p "canvas" scaled to the screen.
-- Small screens (phones) get the compact layout: a bigger scale on a ~1000x520 canvas, so text stays readable.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Contracts = require(ReplicatedStorage.Shared.Contracts)
local Format = require(ReplicatedStorage.Shared.Format)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Motion = require(script.Parent.Motion)
local Sounds = require(script.Parent.Sounds)
local Theme = require(script.Parent.Theme)

local Hud = {}

Hud.canvas = nil :: any
Hud.tabs = {} :: { [string]: any }
Hud.nextButton = nil :: any

-- Returns the canvas scale and whether to use the compact layout.
-- ponytail: tuned for landscape (Roblox's default on phones); portrait phones would need their own layout.
local function layoutFor(size: Vector2): (number, boolean)
	local s = math.min(size.Y / 1000, size.X / 1700)
	if s >= 0.6 then
		return math.min(s, 1.3), false
	end
	return math.max(s, math.min(size.Y / 520, size.X / 1000)), true
end

local function fmtCash(n: number): string
	return `<font color="#19B46B">$</font>{Format.money(n):sub(2)}`
end

-- Seconds until the next playtime gift opens, or nil when today's gifts are all opened.
local function giftLeft(v: any): number?
	local g = v and v.gifts
	if not g or g.next == nil then
		return nil
	end
	return (g.remaining :: number) - (App.now() - (g.at :: number))
end

-- One recommended action, always (research: "Next best move").
function Hud.nextMove(v: any): { title: string, sub: string, button: string, onClick: () -> () }?
	if not v or v.agency.name == "" then
		return nil
	end
	for _, r in v.rockets do
		if not r.mission then
			local spec = Rockets.byId[r.model]
			return {
				title = `Give your {spec.name} a mission`,
				sub = `#{r.tail} is fueled and waiting at the spaceport.`,
				button = "PLAN MISSION",
				onClick = function()
					App.go("openWizard", nil, r.id)
				end,
			}
		end
	end
	if v.daily.ready then
		return {
			title = "Today's operations reward",
			sub = `Day {v.daily.day}  |  +{Format.money(v.daily.reward)}`,
			button = "CLAIM",
			onClick = function()
				App.act("claimDaily")
			end,
		}
	end
	local list: { any } = if v.contracts then v.contracts.list else {}
	for i, c in list do
		if c.progress >= c.target and not c.claimed then
			return {
				title = Contracts.label(c),
				sub = `Today's contracts  |  reward {Format.money(c.reward)}`,
				button = "COLLECT",
				onClick = function()
					App.act("claimContract", i)
				end,
			}
		end
	end
	for _, g in v.goals do
		if not g.done then
			local isFleet = g.jump == "fleet"
			return {
				title = g.label,
				sub = `Career goal  |  reward {Format.money(g.reward)}`,
				button = if isFleet then "BUY ROCKET" else "MISSIONS",
				onClick = function()
					if isFleet then
						App.go("openCatalog")
					else
						App.go("openPanel", "missions")
					end
				end,
			}
		end
	end
	return nil
end

function Hud.start(): any
	local gui = Kit.new("ScreenGui", {
		Name = "Hud",
		ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets, -- clear of the Roblox top bar and phone notches
		ResetOnSpawn = false,
		DisplayOrder = 5,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	local canvas = Kit.new("Frame", { Name = "Canvas", BackgroundTransparency = 1, Parent = gui })
	local scale = Kit.new("UIScale", { Parent = canvas })
	Hud.canvas = canvas
	App.gui = canvas

	-- Agency card --------------------------------------------------------------------------------
	local card = Kit.card({ Size = UDim2.fromOffset(360, 116), Parent = canvas })
	Kit.stroke(Theme.line, 1).Parent = card
	local logo = Kit.iconCircle("rocket", Theme.orange, 64)
	logo.Position = UDim2.fromOffset(18, 18)
	logo.Parent = card
	local name = Kit.text(
		"",
		22,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(96, 14), Size = UDim2.new(1, -112, 0, 26), Parent = card }
	)
	local stage = Kit.text(
		"",
		15,
		Theme.medium,
		Theme.muted,
		{ Position = UDim2.fromOffset(96, 40), Size = UDim2.new(1, -112, 0, 20), Parent = card }
	)
	local cash = Kit.text("", 28, Theme.mono, Theme.ink, {
		Name = "Cash", -- Juice flies coins to this label
		Position = UDim2.fromOffset(96, 60),
		Size = UDim2.new(1, -170, 0, 34),
		Parent = card,
	})
	local ratingRow = Kit.new("Frame", {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -18, 0, 66),
		Size = UDim2.fromOffset(80, 24),
		BackgroundTransparency = 1,
		Parent = card,
	}, { Kit.list(4, true, Enum.HorizontalAlignment.Right) })
	local starIcon = Icons.make("star", 20, Theme.amber)
	starIcon.LayoutOrder = 1
	starIcon.Parent = ratingRow
	local rating = Kit.text("", 18, Theme.mono, Theme.amber, {
		LayoutOrder = 2,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, 24),
		TextTruncate = Enum.TextTruncate.None,
		Parent = ratingRow,
	})
	local progress = Kit.bar(0, Theme.blue, 5)
	progress.Position = UDim2.new(0, 18, 1, -14)
	progress.Size = UDim2.new(1, -36, 0, 5)
	progress.Parent = card
	local boost = Kit.chip("SERVER BOOST  |  2x CASH", Theme.white, Theme.blue, 13, "bolt")
	boost.Visible = false
	boost.Parent = canvas

	-- Next move banner ---------------------------------------------------------------------------
	local banner = Kit.card({ Visible = false, Parent = canvas })
	Kit.stroke(Theme.line, 1).Parent = banner
	local bIcon = Kit.iconCircle("arrowRight", Theme.soft, 48, Theme.orange)
	bIcon.Position = UDim2.fromOffset(16, 18)
	bIcon.Parent = banner
	local bEyebrow = Kit.text("NEXT MOVE", 13, Theme.heavy, Theme.orange, { Parent = banner })
	local bTitle = Kit.text("", 19, Theme.heavy, Theme.ink, { Parent = banner })
	local bSub = Kit.text("", 14, Theme.regular, Theme.muted, { Parent = banner })
	local bButtonHolder = Kit.new("Frame", { BackgroundTransparency = 1, Parent = banner })
	local currentMove: any = nil

	-- Starter chip: shows once from stage 2, a plain pointer to the shop that dismisses itself.
	local starter = Kit.new("TextButton", {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -16, 0, -12),
		AutomaticSize = Enum.AutomaticSize.XY,
		Size = UDim2.fromOffset(0, 0),
		Visible = false,
		Parent = banner,
	})
	Kit.chip("STARTER PACK", Theme.white, Theme.orange, 13, "gift").Parent = starter
	starter.Activated:Connect(function()
		Sounds.play("tap")
		App.act("seenTip", "starterChip")
		App.go("openShop")
	end)

	-- Top right ----------------------------------------------------------------------------------
	local topRight = Kit.new("Frame", {
		AnchorPoint = Vector2.new(1, 0),
		Size = UDim2.fromOffset(400, 68),
		BackgroundTransparency = 1,
		Parent = canvas,
	}, {
		Kit.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			HorizontalAlignment = Enum.HorizontalAlignment.Right,
			Padding = UDim.new(0, 12),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	local shop = Kit.new("TextButton", {
		LayoutOrder = 1,
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.navyCard,
		Size = UDim2.fromOffset(150, 64),
		Parent = topRight,
	}, { Kit.round(), Kit.stroke(Theme.amber, 2, 0.3) })
	local shopRow = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		AutomaticSize = Enum.AutomaticSize.XY,
		Size = UDim2.fromOffset(0, 0),
		BackgroundTransparency = 1,
		Parent = shop,
	}, { Kit.list(8, true) })
	local shopIcon = Icons.make("bag", 30, Theme.amber)
	shopIcon.LayoutOrder = 1
	shopIcon.Parent = shopRow
	local shopLabel = Kit.text("SHOP", 20, Theme.heavy, Theme.white, {
		LayoutOrder = 2,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, 26),
		TextTruncate = Enum.TextTruncate.None,
		Parent = shopRow,
	})
	Motion.press(shop)
	shop.Activated:Connect(function()
		Sounds.play("tap")
		App.go("openShop")
	end)
	local gift = Kit.iconButton("gift", function()
		App.go("openDaily")
	end, 64, Theme.white, Theme.ink)
	gift.LayoutOrder = 2
	gift.Parent = topRight
	local badge = Kit.new("Frame", {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, 2, 0, -2),
		Size = UDim2.fromOffset(22, 22),
		BackgroundColor3 = Theme.red,
		Visible = false,
		Parent = gift,
	}, {
		Kit.round(),
		Kit.text(
			"1",
			13,
			Theme.heavy,
			Theme.white,
			{ Size = UDim2.fromScale(1, 1), TextXAlignment = Enum.TextXAlignment.Center }
		),
	})
	local gear = Kit.iconButton("gear", function()
		App.go("openSettings")
	end, 64, Theme.white, Theme.ink)
	gear.LayoutOrder = 3
	gear.Parent = topRight

	-- Playtime gift pill: a countdown, then an orange button. Gifts are opened in order, four a day.
	local giftPill = Kit.new("TextButton", {
		LayoutOrder = 1,
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.navy3,
		Size = UDim2.fromOffset(230, 52),
		Visible = false,
		Parent = canvas,
	}, { Kit.round(), Kit.stroke(Theme.cyan, 1.5, 0.5) })
	local pillIcon = Icons.make("clock", 24, Theme.cyan)
	pillIcon.AnchorPoint = Vector2.new(0, 0.5)
	pillIcon.Position = UDim2.new(0, 16, 0.5, 0)
	pillIcon.Parent = giftPill
	local pillText = Kit.text("", 16, Theme.mono, Theme.white, {
		Position = UDim2.fromOffset(48, 0),
		Size = UDim2.new(1, -60, 1, 0),
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = giftPill,
	})
	local pillReady = false
	Motion.press(giftPill)
	giftPill.Activated:Connect(function()
		if pillReady then
			Sounds.play("tap")
			App.act("claimGift")
		end
	end)

	-- Right column that holds the gift pill and boost chip on phones.
	local stack = Kit.new("Frame", {
		AnchorPoint = Vector2.new(1, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromOffset(200, 0),
		BackgroundTransparency = 1,
		Parent = canvas,
	}, { Kit.list(8, false, Enum.HorizontalAlignment.Right) })

	-- Bottom navigation --------------------------------------------------------------------------
	local nav = Kit.card({
		Parent = canvas,
	}, { Kit.pad(8) })
	local navCorner = nav:FindFirstChildOfClass("UICorner") :: UICorner
	navCorner.CornerRadius = UDim.new(0, 46)
	local row = Kit.new("Frame", { BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1), Parent = nav })
	local highlight = Kit.new("Frame", {
		BackgroundColor3 = Theme.blueSoft,
		Size = UDim2.new(0.25, -6, 1, 0),
		Visible = false,
		Parent = row,
	}, { Kit.corner(Theme.radius.tab) })
	local tabIds = { "missions", "fleet", "career", "more" }
	for i, tab in
		{
			{ "missions", "satellite", "Missions" },
			{ "fleet", "rocket", "Fleet" },
			{ "career", "trophy", "Career" },
			{ "more", "more", "More" },
		}
	do
		local b = Kit.new("TextButton", {
			BackgroundTransparency = 1,
			Position = UDim2.fromScale((i - 1) / 4, 0),
			Size = UDim2.fromScale(0.25, 1),
			AutoButtonColor = false,
			Parent = row,
		})
		local icon = Icons.make(tab[2], 30, Theme.muted)
		icon.AnchorPoint = Vector2.new(0.5, 0)
		icon.Parent = b
		Kit.text(tab[3], 16, Theme.bold, Theme.muted, {
			Name = "Label",
			Position = UDim2.fromOffset(0, 44),
			Size = UDim2.new(1, 0, 0, 22),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = b,
		})
		b.Activated:Connect(function()
			Sounds.play("tap")
			if App.ui.panel == tab[1] then
				App.go("openPanel", nil)
			else
				App.go("openPanel", tab[1])
			end
		end)
		Hud.tabs[tab[1]] = b
	end

	-- Normal: banner top centre, nav bottom centre. Compact: everything hugs the left column so the
	-- right side is free for panels and the wizard (which become full-height sheets).
	local function place(compact: boolean)
		local m = if compact then 16 else 24
		card.Position = UDim2.fromOffset(m, m)
		topRight.Position = UDim2.new(1, -m, 0, m)
		shop.Size = UDim2.fromOffset(if compact then 64 else 150, 64)
		shopLabel.Visible = not compact
		-- gift pill and boost chip: free-standing on desktop, one right-hand column on phones
		stack.Position = UDim2.new(1, -m, 0, 88)
		giftPill.Parent = if compact then stack else canvas
		boost.Parent = if compact then stack else canvas
		giftPill.Size = if compact then UDim2.fromOffset(200, 46) else UDim2.fromOffset(230, 52)
		pillText.TextSize = if compact then 14 else 16
		giftPill.AnchorPoint = if compact then Vector2.zero else Vector2.new(1, 0)
		giftPill.Position = if compact then UDim2.fromOffset(0, 0) else UDim2.new(1, -m, 0, m + 80)
		boost.LayoutOrder = 2
		boost.AnchorPoint = Vector2.zero
		boost.Position = if compact then UDim2.fromOffset(0, 0) else UDim2.fromOffset(m, 150)
		bIcon.Visible = not compact
		if compact then
			banner.AnchorPoint = Vector2.zero
			banner.Position = UDim2.fromOffset(m, 144)
			banner.Size = UDim2.fromOffset(360, 128)
			bEyebrow.Position = UDim2.fromOffset(16, 12)
			bEyebrow.Size = UDim2.new(1, -32, 0, 18)
			bTitle.Position = UDim2.fromOffset(16, 30)
			bTitle.Size = UDim2.new(1, -32, 0, 24)
			bSub.Position = UDim2.fromOffset(16, 54)
			bSub.Size = UDim2.new(1, -32, 0, 18)
			bButtonHolder.AnchorPoint = Vector2.new(1, 1)
			bButtonHolder.Position = UDim2.new(1, -12, 1, -12)
			bButtonHolder.Size = UDim2.fromOffset(150, 44)
			nav.AnchorPoint = Vector2.new(0, 1)
			nav.Position = UDim2.new(0, m, 1, -m)
			nav.Size = UDim2.fromOffset(400, 80)
		else
			banner.AnchorPoint = Vector2.new(0.5, 0)
			banner.Position = UDim2.new(0.5, 0, 0, m)
			banner.Size = UDim2.fromOffset(560, 84)
			bEyebrow.Position = UDim2.fromOffset(78, 12)
			bEyebrow.Size = UDim2.fromOffset(260, 18)
			bTitle.Position = UDim2.fromOffset(78, 30)
			bTitle.Size = UDim2.new(1, -280, 0, 24)
			bSub.Position = UDim2.fromOffset(78, 54)
			bSub.Size = UDim2.new(1, -280, 0, 18)
			bButtonHolder.AnchorPoint = Vector2.new(1, 0.5)
			bButtonHolder.Position = UDim2.new(1, -16, 0.5, 0)
			bButtonHolder.Size = UDim2.fromOffset(180, 56)
			nav.AnchorPoint = Vector2.new(0.5, 1)
			nav.Position = UDim2.new(0.5, 0, 1, -20)
			nav.Size = UDim2.fromOffset(640, 92)
		end
		for _, b in Hud.tabs do
			b.Icon.Position = UDim2.new(0.5, 0, 0, if compact then 5 else 9)
			b.Label.Position = UDim2.fromOffset(0, if compact then 36 else 44)
		end
	end

	local function rescale()
		local size = gui.AbsoluteSize
		if size.X <= 0 then
			size = workspace.CurrentCamera.ViewportSize
		end
		local s, compact = layoutFor(size)
		scale.Scale = s
		canvas.Size = UDim2.fromScale(1 / s, 1 / s)
		if compact ~= App.compact then
			App.compact = compact
			App.layoutChanged:Fire()
		end
	end
	App.onLayout(place)
	rescale()
	gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(rescale)

	-- One highlight slides to the open tab (snaps under reduced motion, and when it first appears).
	local function paintTabs()
		local active = table.find(tabIds, App.ui.panel :: any)
		for id, b in Hud.tabs do
			local on = App.ui.panel == id
			b.Label.TextColor3 = if on then Theme.blue else Theme.muted
			Icons.tint(b.Icon, if on then Theme.blue else Theme.muted)
		end
		if not active then
			highlight.Visible = false
			return
		end
		local pos = UDim2.new((active - 1) / 4, 3, 0, 0)
		if highlight.Visible and not Motion.reduced() then
			Kit.tween(highlight, 0.2, { Position = pos })
		else
			highlight.Position = pos
		end
		highlight.Visible = true
	end
	App.uiChanged.Event:Connect(paintTabs)
	paintTabs()

	local lastCash: number? = nil
	local function refresh()
		local v = App.view
		if not v then
			return
		end
		local color = Tuning.agencyColors[v.agency.color] or Theme.orange
		logo.BackgroundColor3 = color
		name.Text = if v.agency.name ~= "" then v.agency.name else "New agency"
		stage.Text = `{v.stageName}  |  Stage {v.stage}/{v.stageCount}{if v.canSave
			then ""
			else '<font color="#F5A524">  |  NOT SAVING</font>'}`
		if lastCash ~= nil and lastCash ~= v.cash then
			Motion.countUp(cash, lastCash, v.cash, fmtCash)
		elseif lastCash == nil then
			cash.Text = fmtCash(v.cash)
		end
		lastCash = v.cash
		rating.Text = string.format("%.1f", v.rating)
		local done = 0
		for _, g in v.goals do
			if g.done then
				done += 1
			end
		end
		do
			local it = progress:FindFirstChild("Fill") :: Frame
			it.Size = UDim2.fromScale(done / math.max(#v.goals, 1), 1)
		end
		badge.Visible = v.daily.ready
		boost.Visible = v.boostUntil > App.now()

		local move = Hud.nextMove(v)
		banner.Visible = move ~= nil and not App.ui.wizard and App.ui.modal == nil
		starter.Visible = v.stage >= 2 and not (v.tips and v.tips.starterChip)
		if
			move
			and (not currentMove or currentMove.title ~= move.title or currentMove.button ~= move.button)
		then
			currentMove = move
			bTitle.Text = move.title
			bSub.Text = move.sub
			bButtonHolder:ClearAllChildren()
			local btn = Kit.button({
				text = move.button,
				size = UDim2.fromScale(1, 1),
				textSize = 18,
				onClick = move.onClick,
			})
			btn.Parent = bButtonHolder
			Hud.nextButton = btn
		elseif move then
			bSub.Text = move.sub
		end
	end
	App.changed.Event:Connect(refresh)
	App.uiChanged.Event:Connect(refresh)

	-- Gift pill ticker: 4 Hz, like the panels' live bits.
	local lastPulse = 0
	task.spawn(function()
		while true do
			task.wait(0.25)
			local left = giftLeft(App.view)
			local covered = App.ui.panel ~= nil or App.ui.wizard or App.ui.modal ~= nil
			giftPill.Visible = left ~= nil and not covered
			if left ~= nil then
				pillReady = left <= 0
				giftPill.BackgroundColor3 = if pillReady then Theme.orange else Theme.navy3
				Icons.tint(pillIcon, if pillReady then Theme.white else Theme.cyan)
				pillText.FontFace = if pillReady then Theme.heavy else Theme.mono
				if pillReady then
					pillText.Text = "OPEN GIFT"
					if os.clock() - lastPulse >= 2 then
						lastPulse = os.clock()
						Motion.pulse(giftPill)
					end
				else
					local s = math.ceil(left)
					pillText.Text = string.format("Free gift in %d:%02d", s // 60, s % 60)
				end
			end
		end
	end)
	return canvas
end

return Hud
