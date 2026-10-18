--!strict
-- Secondary HUD pieces: identity strip (rank, coins, Logbook), contextual tip toast, celebration card,
-- settings (reduced motion), and world ping markers.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Motion = require(script.Parent.Motion)
local T = require(script.Parent.Tokens)

local Overlays = {}

local PING_STYLE = {
	Mimic = { text = "⚠ Mimic!", color = T.color.bad },
	Real = { text = "✔ Real", color = T.color.good },
	Look = { text = "👁 Look here", color = T.color.brass },
	Help = { text = "✋ Help!", color = T.color.sea },
	Nice = { text = "★ Nice!", color = T.color.brass },
}

local function corner(parent: Instance, r: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = parent
end

local function label(parent: Instance, props: { [string]: any }): TextLabel
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Text = ""
	t.FontFace = T.bold
	t.TextColor3 = T.color.white
	t.TextSize = T.text.body
	for k, v in props do
		(t :: any)[k] = v
	end
	t.Parent = parent
	return t
end

function Overlays.start(gui: ScreenGui)
	local player = Players.LocalPlayer

	-- Identity strip (bottom left, above harbor integrity).
	local strip = Instance.new("Frame")
	strip.AnchorPoint = Vector2.new(0, 1)
	strip.Position = UDim2.new(0, 16, 1, -64)
	strip.Size = UDim2.fromOffset(220, 46)
	strip.BackgroundColor3 = T.color.ink
	strip.BackgroundTransparency = 0.15
	strip.Parent = gui
	corner(strip, T.radius.chip)
	local identity = label(strip, {
		Position = UDim2.fromOffset(10, 2),
		Size = UDim2.new(1, -20, 0, 22),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = T.text.small,
		Text = "Deckhand · Rank 1",
	})
	local wallet = label(strip, {
		Position = UDim2.fromOffset(10, 22),
		Size = UDim2.new(1, -20, 0, 20),
		TextXAlignment = Enum.TextXAlignment.Left,
		TextSize = T.text.small,
		FontFace = T.font,
		TextColor3 = T.color.brass,
		Text = "",
	})
	local rankBar = Instance.new("Frame")
	rankBar.Position = UDim2.new(0, 0, 1, -3)
	rankBar.Size = UDim2.fromOffset(0, 3)
	rankBar.BackgroundColor3 = T.color.brass
	rankBar.BorderSizePixel = 0
	rankBar.Parent = strip
	Remotes.Profile.OnClientEvent:Connect(function(v)
		identity.Text = `{v.title} · Rank {v.rank}`
		wallet.Text =
			`🪙 {v.coins}   📖 {v.logbook} logged{if v.canSave then "" else "   ⚠ not saving"}`
		rankBar.Size = UDim2.new(v.progress, 0, 0, 3)
	end)

	-- Tip toast (one at a time, above the action area, never blocks input).
	local tipHome = UDim2.new(0.5, 0, 1, -110)
	local tip = Instance.new("CanvasGroup")
	tip.AnchorPoint = Vector2.new(0.5, 1)
	tip.Position = tipHome
	tip.Size = UDim2.new(0.8, 0, 0, 52)
	tip.BackgroundColor3 = T.color.paper
	tip.Visible = false
	tip.Parent = gui
	corner(tip, T.radius.panel)
	local tipLimit = Instance.new("UISizeConstraint")
	tipLimit.MaxSize = Vector2.new(560, 52)
	tipLimit.Parent = tip
	local tipText = label(tip, {
		Position = UDim2.fromOffset(14, 0),
		Size = UDim2.new(1, -28, 1, 0),
		TextColor3 = T.color.ink,
		TextWrapped = true,
		TextScaled = true,
	})
	local tipMax = Instance.new("UITextSizeConstraint")
	tipMax.MaxTextSize = 18
	tipMax.Parent = tipText
	local tips: { string } = {}
	Remotes.Tip.OnClientEvent:Connect(function(text: string)
		table.insert(tips, text)
	end)
	task.spawn(function()
		while true do
			local text = table.remove(tips, 1)
			if text then
				tipText.Text = "💡 " .. text
				Motion.panelIn(tip, tipHome)
				task.wait(6)
				tip.Visible = false
				task.wait(0.3)
			else
				task.wait(0.2)
			end
		end
	end)

	-- Celebration card (rank-ups). Skippable by click/tap; reduced motion = no pop.
	local card = Instance.new("TextButton")
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	card.Position = UDim2.fromScale(0.5, 0.38)
	card.Size = UDim2.fromOffset(320, 110)
	card.BackgroundColor3 = T.color.ink
	card.AutoButtonColor = false
	card.Text = ""
	card.Visible = false
	card.Parent = gui
	corner(card, T.radius.panel)
	local cardStroke = Instance.new("UIStroke")
	cardStroke.Color = T.color.brass
	cardStroke.Thickness = 3
	cardStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	cardStroke.Parent = card
	local cardTitle =
		label(card, { Size = UDim2.fromScale(1, 0.6), TextSize = T.text.big, TextColor3 = T.color.brass })
	local cardSub = label(card, { Position = UDim2.fromScale(0, 0.55), Size = UDim2.fromScale(1, 0.4) })
	card.Activated:Connect(function()
		card.Visible = false
	end)
	Remotes.Celebrate.OnClientEvent:Connect(function(title: string, subtitle: string)
		cardTitle.Text, cardSub.Text = title, subtitle
		card.Visible = true
		Motion.pop(card)
		task.delay(2.5, function()
			card.Visible = false
		end)
	end)

	-- Settings: top-right button toggles reduced motion (saved in the profile by the server).
	local settings = Instance.new("TextButton")
	settings.AnchorPoint = Vector2.new(1, 1)
	settings.Position = UDim2.new(1, -16, 1, -16)
	settings.Size = UDim2.fromOffset(150, 36)
	settings.BackgroundColor3 = T.color.ink
	settings.BackgroundTransparency = 0.15
	settings.FontFace = T.bold
	settings.TextSize = T.text.small
	settings.TextColor3 = T.color.white
	settings.Parent = gui
	corner(settings, T.radius.chip)
	local function refreshSettings()
		local on = player:GetAttribute("ReducedMotion") == true
		settings.Text = `⚙ Reduced motion: {if on then "On" else "Off"}`
	end
	refreshSettings()
	player:GetAttributeChangedSignal("ReducedMotion"):Connect(refreshSettings)
	settings.Activated:Connect(function()
		Remotes.Settings:FireServer("reducedMotion", player:GetAttribute("ReducedMotion") ~= true)
	end)

	-- Ping wheel: G / ButtonY / the 📍 button opens five choices; the ping lands where the camera looks.
	local wheel = Instance.new("Frame")
	wheel.AnchorPoint = Vector2.new(0.5, 0.5)
	wheel.Position = UDim2.fromScale(0.5, 0.62)
	wheel.Size = UDim2.fromOffset(520, 48)
	wheel.BackgroundTransparency = 1
	wheel.Visible = false
	wheel.Parent = gui
	local row = Instance.new("UIListLayout")
	row.FillDirection = Enum.FillDirection.Horizontal
	row.HorizontalAlignment = Enum.HorizontalAlignment.Center
	row.Padding = UDim.new(0, 8)
	row.Parent = wheel
	local function aimPoint(): Vector3
		local camera = workspace.CurrentCamera
		local ray = camera:ViewportPointToRay(camera.ViewportSize.X / 2, camera.ViewportSize.Y / 2)
		local params = RaycastParams.new()
		params.FilterDescendantsInstances = { player.Character :: Instance }
		params.FilterType = Enum.RaycastFilterType.Exclude
		local hit = workspace:Raycast(ray.Origin, ray.Direction * 500, params)
		return if hit then hit.Position else ray.Origin + ray.Direction * 200
	end
	for _, kind in { "Mimic", "Real", "Look", "Help", "Nice" } do
		local style = PING_STYLE[kind]
		local b = Instance.new("TextButton")
		b.Size = UDim2.fromOffset(96, 44)
		b.BackgroundColor3 = T.color.ink
		b.TextColor3 = style.color
		b.FontFace = T.bold
		b.TextSize = T.text.small
		b.Text = style.text
		b.Parent = wheel
		corner(b, T.radius.chip)
		b.Activated:Connect(function()
			wheel.Visible = false
			Remotes.Ping:FireServer(kind, aimPoint())
		end)
	end
	local pingButton = Instance.new("TextButton")
	pingButton.AnchorPoint = Vector2.new(1, 1)
	pingButton.Position = UDim2.new(1, -16, 1, -150)
	pingButton.Size = UDim2.fromOffset(56, 56)
	pingButton.BackgroundColor3 = T.color.ink
	pingButton.Text = "📍"
	pingButton.TextSize = 26
	pingButton.Parent = gui
	corner(pingButton, 28)
	pingButton.Activated:Connect(function()
		wheel.Visible = not wheel.Visible
	end)
	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.G or input.KeyCode == Enum.KeyCode.ButtonY then
			wheel.Visible = not wheel.Visible
		end
	end)

	Remotes.Ping.OnClientEvent:Connect(function(kind: string, pos: Vector3, from: string)
		local style = PING_STYLE[kind]
		if not style then
			return
		end
		local anchor = Instance.new("Part")
		anchor.Anchored, anchor.CanCollide, anchor.CanQuery, anchor.Transparency = true, false, false, 1
		anchor.Size = Vector3.one
		anchor.Position = pos
		anchor.Parent = workspace
		local bb = Instance.new("BillboardGui")
		bb.Size = UDim2.fromOffset(150, 46)
		bb.AlwaysOnTop = true
		bb.StudsOffset = Vector3.new(0, 4, 0)
		bb.Parent = anchor
		local text = label(bb, {
			Size = UDim2.fromScale(1, 1),
			Text = `{style.text}\n{from}`,
			TextColor3 = style.color,
			TextStrokeTransparency = 0.3,
			TextScaled = true,
		})
		Motion.pop(text)
		task.delay(4, function()
			anchor:Destroy()
		end)
	end)
end

return Overlays
