--!strict
-- Bootup screen. Runs from ReplicatedFirst before the rest of the client replicates, so it cannot
-- require UI modules. The colours and fonts below duplicate UI/Theme on purpose.

local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local ReplicatedFirst = game:GetService("ReplicatedFirst")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local NAVY = Color3.fromHex("0B1026")
local TRACK = Color3.fromHex("1B2447")
local CYAN = Color3.fromHex("2EE6D6")
local WHITE = Color3.new(1, 1, 1)
local ORANGE = Color3.fromHex("FF7A2F")
local AMBER = Color3.fromHex("FFC24A")
local DISPLAY = Font.new("rbxasset://fonts/families/BuilderExtended.json", Enum.FontWeight.Heavy)
local BODY = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Bold)

local MIN_SECONDS = 3
local FADE_SECONDS = 0.5
local STREAKS = 60
local REDUCED = GuiService.ReducedMotionEnabled

ReplicatedFirst:RemoveDefaultLoadingScreen()

local player = Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "Boot"
gui.DisplayOrder = 100
gui.ScreenInsets = Enum.ScreenInsets.None
gui.IgnoreGuiInset = true
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local function frame(parent: Instance, size: UDim2, pos: UDim2, color: Color3): Frame
	local f = Instance.new("Frame")
	f.AnchorPoint = Vector2.new(0.5, 0.5)
	f.Size = size
	f.Position = pos
	f.BackgroundColor3 = color
	f.BorderSizePixel = 0
	f.Parent = parent
	return f
end

local function round(f: GuiObject, r: UDim)
	local c = Instance.new("UICorner")
	c.CornerRadius = r
	c.Parent = f
end

local function label(
	parent: Instance,
	text: string,
	font: Font,
	size: number,
	pos: UDim2,
	color: Color3
): TextLabel
	local l = Instance.new("TextLabel")
	l.AnchorPoint = Vector2.new(0.5, 0.5)
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(0.9, 0, 0, size + 8)
	l.Position = pos
	l.FontFace = font
	l.Text = text
	l.TextSize = size
	l.TextColor3 = color
	l.TextTransparency = 0
	l.Parent = parent
	return l
end

local root = Instance.new("CanvasGroup")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = NAVY
root.BorderSizePixel = 0
root.Parent = gui
local scale = Instance.new("UIScale")
scale.Parent = root

-- Warp streaks radiate from the centre.
local streakLayer = Instance.new("Frame")
streakLayer.BackgroundTransparency = 1
streakLayer.Size = UDim2.fromScale(1, 1)
streakLayer.Parent = root
local rng = Random.new()
local streaks: { { f: Frame, angle: number, dist: number, speed: number } } = {}
if not REDUCED then
	for _ = 1, STREAKS do
		local f = frame(streakLayer, UDim2.fromOffset(2, 4), UDim2.fromScale(0.5, 0.5), CYAN)
		f.BackgroundTransparency = 0.5
		local a = rng:NextNumber(0, 360)
		f.Rotation = a
		table.insert(
			streaks,
			{ f = f, angle = math.rad(a), dist = rng:NextNumber(0, 600), speed = rng:NextNumber(500, 1100) }
		)
	end
end

-- Title: two lines slide in from opposite sides.
local titleA = label(root, "RUN A SPACE", DISPLAY, 52, UDim2.fromScale(0.5, 0.36), WHITE)
local titleB = label(root, "AGENCY", DISPLAY, 52, UDim2.new(0.5, 0, 0.36, 60), CYAN)
local cap = Instance.new("UITextSizeConstraint")
cap.MaxTextSize = 52
cap.Parent = titleA
titleA.TextScaled = true
titleB.TextScaled = true
cap:Clone().Parent = titleB

-- Primitive rocket: body, rotated-square nose, fins, flame.
local rocket = Instance.new("Frame")
rocket.AnchorPoint = Vector2.new(0.5, 0.5)
rocket.BackgroundTransparency = 1
rocket.Size = UDim2.fromOffset(44, 120)
rocket.Position = UDim2.fromScale(0.5, 1.2)
rocket.Parent = root
local flame = frame(rocket, UDim2.fromOffset(20, 46), UDim2.new(0.5, 0, 1, 18), ORANGE)
round(flame, UDim.new(0.5, 0))
local fg = Instance.new("UIGradient")
fg.Rotation = 90
fg.Color = ColorSequence.new(ORANGE, AMBER)
fg.Parent = flame
for _, sx in { 0.04, 0.96 } do
	local fin = frame(rocket, UDim2.fromOffset(18, 30), UDim2.new(sx, 0, 1, -26), ORANGE)
	fin.Rotation = if sx < 0.5 then -20 else 20
	round(fin, UDim.new(0, 5))
end
local nose = frame(rocket, UDim2.fromOffset(31, 31), UDim2.new(0.5, 0, 0, 18), WHITE)
nose.Rotation = 45
round(nose, UDim.new(0, 6))
local body = frame(rocket, UDim2.fromOffset(44, 84), UDim2.new(0.5, 0, 0, 62), WHITE)
round(body, UDim.new(0, 8))
local win = frame(body, UDim2.fromOffset(18, 18), UDim2.fromScale(0.5, 0.32), CYAN)
round(win, UDim.new(0.5, 0))

-- Progress bar.
local track = frame(root, UDim2.new(0.5, 0, 0, 10), UDim2.fromScale(0.5, 0.85), TRACK)
track.Size = UDim2.new(0.5, 0, 0, 10)
round(track, UDim.new(0.5, 0))
local fill = frame(track, UDim2.fromScale(0, 1), UDim2.fromScale(0, 0.5), CYAN)
fill.AnchorPoint = Vector2.new(0, 0.5)
round(fill, UDim.new(0.5, 0))
local status = label(root, "Contacting ground control", BODY, 16, UDim2.new(0.5, 0, 0.85, -26), CYAN)
status.TextTransparency = 0.2
local skipHint = label(root, "Tap to skip", BODY, 14, UDim2.new(0.5, 0, 0.85, 28), WHITE)
skipHint.TextTransparency = 0.5

local t = 0
local prog = 0
local skipped = REDUCED
local closing = false
local fade = 0
local conn: RBXScriptConnection
local inputConn: RBXScriptConnection

local function ready(): boolean
	return player:GetAttribute("ClientReady") == true
end

local function ease(x: number): number
	x = math.clamp(x, 0, 1)
	return 1 - (1 - x) * (1 - x)
end

local function finish()
	conn:Disconnect()
	inputConn:Disconnect()
	gui:Destroy()
end

inputConn = UserInputService.InputBegan:Connect(function(input)
	if
		input.UserInputType == Enum.UserInputType.MouseButton1
		or input.UserInputType == Enum.UserInputType.Touch
	then
		skipped = true
	end
end)

conn = RunService.Heartbeat:Connect(function(dt)
	t += dt
	local size = root.AbsoluteSize
	local diag = size.Magnitude * 0.55

	-- Title and rocket.
	local a = if skipped then 1 else ease((t - 0.2) / 0.8)
	titleA.Position = UDim2.fromScale(0.5 - (1 - a) * 0.6, 0.36)
	titleB.Position = UDim2.new(0.5 + (1 - a) * 0.6, 0, 0.36, 60)
	titleA.TextTransparency = 1 - a
	titleB.TextTransparency = 1 - a
	local r = (t - 1) / 1.8
	rocket.Visible = not skipped and r > 0 and r < 1
	if rocket.Visible then
		rocket.Position = UDim2.fromScale(0.5, 1.2 - 1.5 * r * r)
		flame.Size = UDim2.fromOffset(20, 40 + math.sin(t * 40) * 8)
	end

	-- Streaks.
	streakLayer.Visible = not skipped
	if not skipped then
		for _, s in streaks do
			s.dist += s.speed * dt * (1 + t * 0.3)
			if s.dist > diag then
				s.dist = rng:NextNumber(0, 40)
			end
			local len = 4 + s.dist * 0.12
			s.f.Size = UDim2.fromOffset(2, len)
			s.f.Position = UDim2.new(0.5, math.sin(s.angle) * s.dist, 0.5, -math.cos(s.angle) * s.dist)
		end
	end

	-- Progress: eases toward 90% while waiting, snaps to 100% once the client is ready.
	local isReady = ready()
	if isReady then
		prog += (1 - prog) * math.min(1, dt * 8)
	else
		prog += (0.9 - prog) * math.min(1, dt * 0.8)
	end
	fill.Size = UDim2.fromScale(prog, 1)

	if t >= 30 and not isReady then
		status.Text = "Still connecting..."
	end

	local minDone = skipped or t >= MIN_SECONDS
	if not closing and ((isReady and prog > 0.98 and minDone) or t >= 45) then
		closing = true
	end
	if closing then
		fade += dt / FADE_SECONDS
		root.GroupTransparency = math.min(1, fade)
		scale.Scale = 1 + 0.12 * math.min(1, fade)
		if fade >= 1 then
			finish()
		end
	end
end)
