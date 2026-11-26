--!strict
-- The HUD: stats on top, menu on the left, CLIP and POST at the bottom, and three panels.
-- Groups are sized in a 1000x560 design space and scaled to the real screen by one UIScale value.
-- Design text is 21+ so it renders at 12 px or more on the smallest phone (iPhone 14 HUD: 749x330, scale 0.59).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local Art = require(script.Parent.Art)
local Kit = require(script.Parent.Kit)
local Panels = require(script.Parent.Panels)

local C = Kit.colors
local Hud = {}

export type Actions = {
	tap: () -> (),
	post: () -> (),
	buy: (id: string) -> (),
	rebirth: () -> (),
	setting: (name: string) -> (),
	skipTutorial: () -> (),
}

function Hud.build(actions: Actions)
	local gui = Kit.make("ScreenGui", {
		Name = "ClipHud",
		ResetOnSpawn = false,
		IgnoreGuiInset = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	local scales: { UIScale } = {}
	local function group(name: string, anchor: Vector2, pos: UDim2, size: Vector2): Frame
		local f = Kit.make("Frame", {
			Name = name,
			AnchorPoint = anchor,
			Position = pos,
			Size = UDim2.fromOffset(size.X, size.Y),
			BackgroundTransparency = 1,
			Parent = gui,
		})
		table.insert(scales, Kit.make("UIScale", { Parent = f }))
		return f
	end
	local toastArea: Frame
	local toastLayout: UIListLayout
	local openName: string? = nil
	local function placeToasts()
		local s = gui:GetAttribute("UiScale") or 1
		-- Below the top stats normally; while a panel is open they wait in a queue (see api.toast).
		toastArea.Position = UDim2.new(0.5, 0, 0, 146 * s)
		toastLayout.VerticalAlignment = Enum.VerticalAlignment.Top
	end
	local revealGroup: Frame? = nil
	local function rescale()
		local v = gui.AbsoluteSize
		local s = math.clamp(math.min(v.X / 1000, v.Y / 560), 0.5, 1.1)
		for _, sc in scales do
			sc.Scale = s
		end
		gui:SetAttribute("UiScale", s)
		if revealGroup then
			revealGroup.Position = UDim2.new(0.5, 0, 1, -(10 + 236 + 8) * s) -- bottom bar is 236 tall, 10 up
		end
		placeToasts()
	end

	-- Top: stat pills, hype banner, zone chip.
	local top = group("Top", Vector2.new(0.5, 0), UDim2.new(0.5, 0, 0, 6), Vector2.new(700, 138))
	local Icons =
		require(game:GetService("ReplicatedStorage"):WaitForChild("LihFolkUI"):WaitForChild("LihFolkUIIcons"))
	-- Antigravity art feeds the kit's icon registry, so pills and kit buttons share one icon set.
	Icons.registerMany({
		cash = Art.coin.id,
		followers = Art.followers.id,
		star = Art.clout.id,
		timer = Art.reel.id,
		motion = Art.reel.id, -- Reduced Motion row: the film reel reads as "motion"
	})
	Icons.registerMany(Art.folkIcons)
	local function pill(
		name: string,
		x: number,
		w: number,
		color: Color3,
		caption: string,
		icon: string
	): TextLabel
		local f = Kit.make("Frame", {
			Name = name,
			Position = UDim2.fromOffset(x, 0),
			Size = UDim2.fromOffset(w, 62),
			BackgroundColor3 = C.bg,
			BackgroundTransparency = 0.1,
			Parent = top,
		}, { Kit.corner(31), Kit.stroke(Kit.colors.stroke, 3) })
		Kit.make("UIStroke", {
			Color = color,
			Thickness = 2,
			Parent = Kit.make("Frame", {
				Size = UDim2.new(1, -6, 1, -6),
				Position = UDim2.fromOffset(3, 3),
				BackgroundTransparency = 1,
				Parent = f,
			}, { Kit.corner(28) }),
		})
		-- Icon art comes from the registry (Antigravity icons once uploaded), else the kit's drawn fallback.
		local glyph = Icons.make(icon, UDim2.fromOffset(44, 44)) -- untinted: the art carries its own colours
		glyph.Position = UDim2.fromOffset(9, 9)
		glyph.Parent = f
		Kit.text({
			Text = caption,
			Size = UDim2.new(1, -72, 0, 22),
			Position = UDim2.fromOffset(60, 3),
			TextXAlignment = Enum.TextXAlignment.Left,
			TextColor3 = color,
			Font = Kit.BODY,
			max = 21,
			Parent = f,
		})
		return Kit.text({
			Name = "Value",
			Text = "0",
			Size = UDim2.new(1, -72, 0, 34),
			Position = UDim2.fromOffset(60, 25),
			TextXAlignment = Enum.TextXAlignment.Left,
			max = 32,
			Parent = f,
		})
	end
	local cashText = pill("Cash", 0, 232, C.green, "CASH", "cash")
	local followersText = pill("Followers", 240, 268, C.blue, "FOLLOWERS", "followers")
	local cloutText = pill("Clout", 516, 184, C.purple, "CLOUT", "star")
	local banner = Kit.make("Frame", {
		Name = "Hype",
		Position = UDim2.fromOffset(40, 70),
		Size = UDim2.fromOffset(620, 32),
		BackgroundColor3 = C.bg,
		BackgroundTransparency = 0.25,
		Parent = top,
	}, { Kit.corner(15) })
	local bannerStroke = Kit.stroke(C.gold, 2)
	bannerStroke.Parent = banner
	local hypeText = Kit.text({
		Text = "",
		Size = UDim2.new(1, -20, 1, -4),
		Position = UDim2.fromOffset(10, 2),
		max = 22,
		Font = Kit.BODY,
		Parent = banner,
	})
	local zoneText = Kit.text({
		Name = "Zone",
		Text = "",
		Size = UDim2.fromOffset(620, 28),
		Position = UDim2.fromOffset(40, 106),
		max = 22,
		Font = Kit.BODY,
		Parent = top,
	})

	-- Menus come from the LihFolk UI kit (Panels.luau); these image launchers open them.
	-- Four launchers, clear of the top pills and the phone thumbstick.
	local left = group("Menu", Vector2.new(0, 0.5), UDim2.new(0, 10, 0.44, 0), Vector2.new(202, 376))
	Kit.make(
		"UIListLayout",
		{ Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder, Parent = left }
	)
	local launchers: { [string]: ImageButton } = {}
	local LAUNCHERS = {
		{ name = "Upgrades", art = Art.upgrades, label = "UPGRADES" },
		{ name = "Rebirth", art = Art.goViral, label = "GO VIRAL" },
		{ name = "Index", art = Art.index, label = "INDEX" },
		{ name = "Settings", art = Art.settings, label = "SETTINGS" },
	}
	for i, spec in LAUNCHERS do
		launchers[spec.name] = Kit.imageButton({
			Name = "Open" .. spec.name,
			Size = UDim2.fromOffset(202, 88), -- 52 px tall on the smallest phone; label fits at 12 px
			Label = spec.label,
			LabelMax = 30,
			LayoutOrder = i,
			Parent = left,
		}, spec.art, function() end) -- the kit's bindOpener does the opening
	end
	local badge = Kit.make("Frame", {
		Name = "Badge",
		Size = UDim2.fromOffset(40, 40),
		Position = UDim2.new(1, -30, 0, -6),
		BackgroundColor3 = C.red,
		Visible = false,
		ZIndex = 5,
		Parent = launchers.Upgrades,
	}, { Kit.corner(20), Kit.stroke(Kit.colors.stroke, 3) })
	Kit.text({ Text = "!", Size = UDim2.fromScale(1, 1), max = 30, ZIndex = 6, Parent = badge })
	local bottom: Frame
	local flushToasts: () -> ()

	-- Bottom: storage bar, CLIP and POST.
	bottom = group("Actions", Vector2.new(0.5, 1), UDim2.new(0.5, 0, 1, -10), Vector2.new(560, 236))
	local objective = Kit.make("Frame", {
		Name = "Objective",
		Size = UDim2.fromOffset(520, 40),
		Position = UDim2.fromOffset(20, 0),
		BackgroundColor3 = C.gold,
		Visible = false,
		Parent = bottom,
	}, { Kit.corner(20), Kit.stroke(Color3.new(1, 1, 1), 2) })
	local objectiveText = Kit.text({
		Text = "",
		Size = UDim2.new(1, -20, 1, -8),
		Position = UDim2.fromOffset(10, 4),
		max = 26,
		Parent = objective,
	})
	local bar = Kit.make("Frame", {
		Name = "Storage",
		Size = UDim2.fromOffset(520, 34),
		Position = UDim2.fromOffset(20, 48),
		BackgroundColor3 = C.bg,
		Parent = bottom,
	}, { Kit.corner(17), Kit.stroke(C.pink, 2) })
	local fill = Kit.make(
		"Frame",
		{ Size = UDim2.fromScale(0, 1), BackgroundColor3 = C.pink, Parent = bar },
		{ Kit.corner(17) }
	)
	local barText = Kit.text({
		Text = "CLIPS 0 / 0",
		Size = UDim2.new(1, -20, 1, -6),
		Position = UDim2.fromOffset(10, 3),
		max = 22,
		ZIndex = 2,
		Parent = bar,
	})
	local clipBtn = Kit.imageButton({
		Name = "Clip",
		Label = "CLIP",
		Shine = 3.5,
		Size = UDim2.fromOffset(270, 104),
		Position = UDim2.fromOffset(5, 96),
		Parent = bottom,
	}, Art.clip, actions.tap)
	local postBtn = Kit.imageButton({
		Name = "Post",
		Label = "POST",
		Shine = 4.5,
		Size = UDim2.fromOffset(270, 104),
		Position = UDim2.fromOffset(285, 96),
		Parent = bottom,
	}, Art.post, actions.post)
	local info = Kit.text({
		Text = "",
		Size = UDim2.fromOffset(560, 24),
		Position = UDim2.fromOffset(0, 210),
		max = 21,
		Font = Kit.BODY,
		TextColor3 = C.dim,
		Parent = bottom,
	})

	local panelUi = Panels.build(actions)
	for name, button in launchers do
		panelUi.bindOpener(button, name)
	end
	-- While a menu is open the action bar hides and toasts wait, so nothing covers the menu.
	local KitController = require(
		game:GetService("ReplicatedStorage"):WaitForChild("LihFolkUI"):WaitForChild("LihFolkUIController")
	)
	KitController.onChanged(function()
		openName = KitController.getCurrent()
		bottom.Visible = openName == nil
		left.Visible = openName == nil -- menus are modal (dimmer, close button, B); on phones they would overlap
		if openName == nil then
			flushToasts()
		end
	end)

	-- Toasts and floating numbers sit above everything except open panels.
	toastArea = group("Toasts", Vector2.new(0.5, 0), UDim2.new(0.5, 0, 0, 146), Vector2.new(600, 150))
	toastLayout = Kit.make("UIListLayout", {
		Padding = UDim.new(0, 6),
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		Parent = toastArea,
	})
	local fx = group("Fx", Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.42), Vector2.new(700, 200))

	local api = {}
	local last: any = nil

	-- Just the storage bar: cheap enough to run on every tap.
	function api.updateClips(s: any)
		local ratio = if s.capacity > 0 then math.clamp(s.clips / s.capacity, 0, 1) else 0
		Kit.tween(fill, 0.15, { Size = UDim2.fromScale(ratio, 1) })
		local full = s.clips >= s.capacity
		postBtn:SetAttribute("Pulse", full) -- a full drive makes POST breathe
		local rare = 0
		for i = 3, #(s.drive or {}) do
			rare += s.drive[i]
		end
		local rareText = if rare >= 1 then `   {Format.short(rare)} RARE+` else ""
		barText.Text = if full
			then `DRIVE FULL {Format.short(s.clips)} / {Format.short(s.capacity)}: POST!`
			else `CLIPS {Format.short(s.clips)} / {Format.short(s.capacity)}{rareText}`
		fill.BackgroundColor3 = if full then C.gold else C.pink
	end

	function api.update(s: any)
		last = s
		cashText.Text = Format.money(s.cash)
		followersText.Text = Format.short(s.followers)
		cloutText.Text = `{s.clout}  ({Format.mult(Config.CLOUT_BASE ^ s.clout)})`
		local zone = Config.ZONES[s.zone]
		zoneText.Text = `{zone.name}: clips pay x{zone.mult}`
		zoneText.TextColor3 = zone.color
		if s.hypeOn then
			hypeText.Text = `TRAILER DROP! x{Config.HYPE_MULT} cash: {Format.duration(s.hypeLeft)} left`
			bannerStroke.Color = C.gold
			banner.BackgroundColor3 = Color3.fromRGB(90, 50, 10)
		else
			hypeText.Text = `Next trailer drop in {Format.duration(s.hypeLeft)}`
			bannerStroke.Color = C.dim
			banner.BackgroundColor3 = C.bg
		end
		api.updateClips(s)
		local per = if s.clipValue < 100
			then string.format("$%.2f", s.clipValue):gsub("%.?0+$", "")
			else Format.money(s.clipValue)
		-- Two spaces between stats, so the line fits the 560 design px on the smallest phone.
		local viral = math.floor(s.viralChance * 1000) / 10
		info.Text =
			`+{Format.short(s.tapPower)}/tap  {string.format("%.1f", s.autoRate)}/s  {per}/clip  {viral}% viral  {Format.mult(
				s.luck
			)} luck`
		-- "!" when an upgrade is affordable; never during the tutorial (first-session rule).
		badge.Visible = panelUi.update(s) and s.tutorialDone == true
	end

	local queued: { { any } } = {}
	function api.toast(text: string, kind: string?)
		if openName then
			-- Toasts never cover a panel; they wait and show when it closes (newest 2 kept).
			table.insert(queued, { text, kind or "info" } :: { any })
			if #queued > 2 then -- the toast area shows two at a time
				table.remove(queued, 1)
			end
			return
		end
		local color = if kind == "hype" then C.gold elseif kind == "error" then C.red else C.blue
		local t = Kit.make(
			"Frame",
			{ Size = UDim2.fromOffset(560, 76), BackgroundColor3 = C.bg, Parent = toastArea },
			{ Kit.corner(23), Kit.stroke(color, 3) }
		)
		Kit.text({
			Text = text,
			Size = UDim2.new(1, -24, 1, -10),
			Position = UDim2.fromOffset(12, 5),
			max = 24,
			Font = Kit.BODY,
			Parent = t,
		})
		local items = toastArea:GetChildren()
		local frames = 0
		for _, c in items do
			if c:IsA("Frame") then
				frames += 1
			end
		end
		if frames > 2 then
			for _, c in items do
				if c:IsA("Frame") and c ~= t then
					c:Destroy()
					break
				end
			end
		end
		task.delay(2.6, function()
			t:Destroy()
		end)
	end

	flushToasts = function()
		local q = queued
		queued = {}
		for _, item in q do
			api.toast(item[1], item[2])
		end
	end

	-- Floating text that rises and fades. Skipped motion keeps the text, without the rise.
	-- `startY` lifts a float above the tap floats (rarity callouts use it so the two never stack).
	function api.float(text: string, color: Color3, size: number, startY: number?)
		if openName then
			return -- effects never sit on top of a panel
		end
		local y = startY or 100
		local t = Kit.text({
			Text = text,
			Size = UDim2.fromOffset(700, size),
			Position = UDim2.fromOffset(0, y),
			TextColor3 = color,
			max = size,
			strokeSize = 3,
			Parent = fx,
		})
		Kit.tween(t, 1.1, { Position = UDim2.fromOffset(0, y - 80) })
		task.delay(1.2, function()
			t:Destroy()
		end)
	end

	-- Rarity reveal, scaled to the tier (docs/rng-and-loop.md): float, callout, banner, or a card with rays.
	-- Sits on top of the bottom bar, so the card never covers the objective on any screen shape
	-- (rescale() keeps it 8 design px above the objective pill).
	local reveal = group("Reveal", Vector2.new(0.5, 1), UDim2.new(0.5, 0, 1, -260), Vector2.new(520, 180))
	revealGroup = reveal
	local revealToken = 0
	-- Removes the shown card only: the group's own UIScale (screen fit) must survive.
	local function clearReveal()
		for _, c in reveal:GetChildren() do
			if c:IsA("GuiObject") then
				c:Destroy()
			end
		end
	end
	function api.reveal(tier: number, isNew: boolean)
		local r = Config.RARITIES[tier]
		if not r then
			return
		end
		local title = r.titles[math.random(#r.titles)]
		local tag = if isNew then "  NEW!" else ""
		if r.reveal == "float" then
			api.float(`{string.upper(r.name)} CLIP{tag}`, r.color, 34, 30)
			return
		elseif r.reveal == "callout" then
			api.float(`{string.upper(r.name)}! {title}{tag}`, r.color, 44, 20)
			return
		end
		if openName then
			api.toast(`{string.upper(r.name)} CLIP: {title}`, "hype") -- waits for the panel to close
			return
		end
		Kit.big()
		revealToken += 1
		local token = revealToken
		clearReveal()
		local isCard = r.reveal == "card"
		local w, h = if isCard then 440 else 400, if isCard then 160 else 104
		local pop = Kit.make("UIScale", { Scale = if Kit.reduced() then 1 else 0.6 })
		local holder = Kit.make("Frame", {
			Name = "Holder",
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromScale(0.5, 0.5),
			Size = UDim2.fromOffset(w, h),
			BackgroundTransparency = 1,
			Parent = reveal,
		}, { pop })
		if isCard then
			-- Light rays spin behind the top tiers (still under Reduced Motion).
			local rays = Kit.make("ImageLabel", {
				Name = "Rays",
				AnchorPoint = Vector2.new(0.5, 0.5),
				Position = UDim2.fromScale(0.5, 0.5),
				Size = UDim2.fromOffset(380, 380), -- stays clear of the top pills
				BackgroundTransparency = 1,
				Image = Art.rays.id,
				ImageColor3 = r.color,
				ImageTransparency = 0.15,
				ZIndex = 0,
				Parent = holder,
			})
			if not Kit.reduced() then
				task.spawn(function()
					while rays.Parent and token == revealToken do
						rays.Rotation += 1.5
						task.wait(1 / 30)
					end
				end)
			end
		end
		-- Hard shadow, then the sticker card: burning tier face, ink outline, studs.
		Kit.make("Frame", {
			Name = "Shadow",
			Position = UDim2.fromOffset(6, 8),
			Size = UDim2.fromScale(1, 1),
			BackgroundColor3 = C.stroke,
			BackgroundTransparency = 0.35,
			Parent = holder,
		}, { Kit.corner(22) })
		local card = Kit.make("Frame", {
			Name = "Card",
			Size = UDim2.fromScale(1, 1),
			BackgroundColor3 = r.color,
			Parent = holder,
		}, { Kit.corner(22), Kit.stroke(C.stroke, 4) })
		Kit.make("UIGradient", {
			Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(205, 205, 205)),
			Rotation = 90,
			Parent = card,
		})
		Kit.make("ImageLabel", {
			Name = "Studs",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			Image = Art.studs.id,
			ScaleType = Enum.ScaleType.Tile,
			TileSize = UDim2.fromOffset(48, 48),
			ImageTransparency = 0.7,
			Parent = card,
		}, { Kit.corner(22) })
		local lines: { { any } } = if isCard
			then {
				{ `{string.upper(r.name)} CLIP!`, 58, 8 },
				{ title, 30, 74 },
				{ `Pays x{r.pays} when posted`, 24, 116 },
			}
			else { { `{string.upper(r.name)}! {title}`, 36, 10 }, { `Pays x{r.pays}`, 24, 60 } }
		for _, line in lines do
			local t = Kit.text({
				Text = line[1],
				Size = UDim2.new(1, -28, 0, line[2]),
				Position = UDim2.fromOffset(14, line[3]),
				max = line[2],
				strokeSize = 3.7,
				ZIndex = 3,
				Parent = card,
			})
			local stroke = t:FindFirstChildOfClass("UIStroke")
			if stroke then
				stroke.LineJoinMode = Enum.LineJoinMode.Bevel -- keeps the holes in O and 0 open
			end
		end
		if isNew then
			local newTag = Kit.make("Frame", {
				Name = "New",
				AnchorPoint = Vector2.new(0.5, 0.5),
				Position = UDim2.new(1, -18, 0, 4),
				Size = UDim2.fromOffset(96, 42),
				Rotation = 10,
				BackgroundColor3 = C.red,
				ZIndex = 4,
				Parent = holder,
			}, { Kit.corner(12), Kit.stroke(C.stroke, 3) })
			Kit.text({
				Text = "NEW!",
				Size = UDim2.new(1, -8, 1, -6),
				Position = UDim2.fromOffset(4, 3),
				max = 28,
				ZIndex = 5,
				Parent = newTag,
			})
		end
		if not Kit.reduced() then
			TweenService:Create(pop, TweenInfo.new(0.35, Enum.EasingStyle.Back), { Scale = 1 }):Play()
		end
		task.delay(if isCard then 2.6 else 1.8, function()
			if token == revealToken then
				clearReveal()
			end
		end)
	end

	-- Tutorial objective and a pulsing pointer on the target button.
	local pointer: ImageLabel? = nil
	local shownObjective = ""
	function api.objective(text: string?, target: string?)
		local key = `{text or ""}|{target or ""}`
		if key == shownObjective then
			return -- unchanged: keep the pointer and its pulse thread
		end
		shownObjective = key
		objective.Visible = text ~= nil
		objectiveText.Text = text or ""
		if pointer then
			pointer:Destroy()
			pointer = nil
		end
		local launcher = target and launchers[target]
		local btn: GuiObject? = if target == "Clip"
			then clipBtn
			elseif target == "Post" then postBtn
			elseif launcher then launcher
			else nil
		if btn then
			-- A gold glow in the button's own shape (its white face mask, scaled up and tinted), drawn
			-- behind the button, so the pointer follows the lean exactly.
			local shine = btn:FindFirstChild("Shine")
			local ring = Kit.make("ImageLabel", {
				Name = "Pointer",
				AnchorPoint = Vector2.new(0.5, 0.5),
				BackgroundTransparency = 1,
				Image = if shine and shine:IsA("ImageLabel") then shine.Image else "",
				ImageColor3 = C.gold,
				ScaleType = Enum.ScaleType.Stretch,
				ZIndex = 0, -- below every HUD group, so it shows only around the button's edge
				Parent = gui,
			})
			pointer = ring
			task.spawn(function()
				while pointer == ring do
					ring.ImageTransparency = if Kit.reduced() then 0 else (math.sin(os.clock() * 6) + 1) / 3
					-- Follow the button on screen (it lives inside a scaled group; this layer does not).
					local size, at = btn.AbsoluteSize, btn.AbsolutePosition
					ring.Visible = btn.Visible and (btn.Parent :: GuiObject).Visible
					ring.Size = UDim2.fromOffset(size.X * 1.1, size.Y * 1.22)
					ring.Position = UDim2.fromOffset(at.X + size.X / 2, at.Y + size.Y * 0.46)
					task.wait(0.05)
				end
			end)
		end
	end

	function api.state(): any
		return last
	end
	api.gui = gui

	gui:GetPropertyChangedSignal("AbsoluteSize"):Connect(rescale)
	rescale()
	return api
end

return Hud
