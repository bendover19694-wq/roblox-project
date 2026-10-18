--!strict
-- Always-on HUD: agency card (top left), Next-move banner (top centre), shop/daily/settings (top right),
-- bottom navigation pill. Everything sits in a 1080p "canvas" scaled to the screen.
-- Small screens (phones) get the compact layout: a bigger scale on a ~1000×520 canvas, so text stays readable.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Format = require(ReplicatedStorage.Shared.Format)
local Rockets = require(ReplicatedStorage.Shared.Config.Rockets)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
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
			sub = `Day {v.daily.day} · +{Format.money(v.daily.reward)}`,
			button = "CLAIM",
			onClick = function()
				App.act("claimDaily")
			end,
		}
	end
	for _, g in v.goals do
		if not g.done then
			local isFleet = g.jump == "fleet"
			return {
				title = g.label,
				sub = `Career goal · reward {Format.money(g.reward)}`,
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
	local logo = Kit.iconCircle("🚀", Theme.orange, 64)
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
	local cash = Kit.text(
		"",
		28,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(96, 60), Size = UDim2.new(1, -170, 0, 34), Parent = card }
	)
	local rating = Kit.text("", 18, Theme.bold, Theme.amber, {
		AnchorPoint = Vector2.new(1, 0),
		Position = UDim2.new(1, -18, 0, 66),
		Size = UDim2.fromOffset(70, 24),
		TextXAlignment = Enum.TextXAlignment.Right,
		Parent = card,
	})
	local progress = Kit.bar(0, Theme.blue, 5)
	progress.Position = UDim2.new(0, 18, 1, -14)
	progress.Size = UDim2.new(1, -36, 0, 5)
	progress.Parent = card
	local boost = Kit.chip("⚡ SERVER BOOST · 2× CASH", Theme.white, Theme.blue, 13)
	boost.Visible = false
	boost.Parent = canvas

	-- Next move banner ---------------------------------------------------------------------------
	local banner = Kit.card({ Visible = false, Parent = canvas })
	Kit.stroke(Theme.line, 1).Parent = banner
	local bIcon = Kit.iconCircle("→", Theme.soft, 48, Theme.orange)
	bIcon.Position = UDim2.fromOffset(16, 18)
	bIcon.Parent = banner
	local bEyebrow = Kit.text("NEXT MOVE", 13, Theme.heavy, Theme.orange, { Parent = banner })
	local bTitle = Kit.text("", 19, Theme.heavy, Theme.ink, { Parent = banner })
	local bSub = Kit.text("", 14, Theme.regular, Theme.muted, { Parent = banner })
	local bButtonHolder = Kit.new("Frame", { BackgroundTransparency = 1, Parent = banner })
	local currentMove: any = nil

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
		Text = "🛍  SHOP",
		FontFace = Theme.heavy,
		TextSize = 20,
		TextColor3 = Theme.white,
		Parent = topRight,
	}, { Kit.round(), Kit.stroke(Theme.amber, 2, 0.3) })
	shop.Activated:Connect(function()
		App.go("openShop")
	end)
	local gift = Kit.iconButton("🎁", function()
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
	local gear = Kit.iconButton("⚙", function()
		App.go("openSettings")
	end, 64, Theme.white, Theme.ink)
	gear.LayoutOrder = 3
	gear.Parent = topRight

	-- Bottom navigation --------------------------------------------------------------------------
	local nav = Kit.card({
		Parent = canvas,
	}, {
		Kit.pad(8),
		Kit.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 8),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),
	})
	local navCorner = nav:FindFirstChildOfClass("UICorner") :: UICorner
	navCorner.CornerRadius = UDim.new(0, 46)
	for i, tab in
		{
			{ "missions", "🛰", "Missions" },
			{ "fleet", "🚀", "Fleet" },
			{ "career", "🏆", "Career" },
			{ "more", "•••", "More" },
		}
	do
		local b = Kit.new("TextButton", {
			LayoutOrder = i,
			BackgroundTransparency = 1,
			BackgroundColor3 = Theme.blueSoft,
			Size = UDim2.new(0.25, -6, 1, 0),
			AutoButtonColor = false,
			Parent = nav,
		}, { Kit.corner(38) })
		Kit.text(tab[2], 26, Theme.bold, Theme.muted, {
			Name = "Icon",
			Position = UDim2.fromOffset(0, 8),
			Size = UDim2.new(1, 0, 0, 32),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = b,
		})
		Kit.text(tab[3], 16, Theme.bold, Theme.muted, {
			Name = "Label",
			Position = UDim2.fromOffset(0, 44),
			Size = UDim2.new(1, 0, 0, 22),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = b,
		})
		b.Activated:Connect(function()
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
		shop.Text = if compact then "🛍" else "🛍  SHOP"
		boost.AnchorPoint = if compact then Vector2.new(1, 0) else Vector2.zero
		boost.Position = if compact then UDim2.new(1, -m, 0, 92) else UDim2.fromOffset(m, 150)
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
			b.Icon.Position = UDim2.fromOffset(0, if compact then 4 else 8)
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

	local function paintTabs()
		for id, b in Hud.tabs do
			local on = App.ui.panel == id
			b.BackgroundTransparency = if on then 0 else 1
			b.Label.TextColor3 = if on then Theme.blue else Theme.muted
			b.Icon.TextColor3 = if on then Theme.blue else Theme.muted
		end
	end
	App.uiChanged.Event:Connect(paintTabs)
	paintTabs()

	local function refresh()
		local v = App.view
		if not v then
			return
		end
		local color = Tuning.agencyColors[v.agency.color] or Theme.orange
		logo.BackgroundColor3 = color
		name.Text = if v.agency.name ~= "" then v.agency.name else "New agency"
		stage.Text = `{v.stageName} · Stage {v.stage}/{v.stageCount}{if v.canSave
			then ""
			else "  ·  ⚠ not saving"}`
		cash.Text = `<font color="#19B46B">$</font>{Format.money(v.cash):sub(2)}`
		rating.Text = string.format("★ %.1f", v.rating)
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
		if
			move and (not currentMove or currentMove.title ~= move.title or currentMove.button ~= move.button)
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
	return canvas
end

return Hud
