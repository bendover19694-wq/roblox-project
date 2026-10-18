--!strict
-- HUD built in code from NightState attributes. Zones follow docs/ui-motion-audit.md §1:
-- top centre = state banner, top left = objective + rules, bottom left = harbor integrity, centre = Harbor Log.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Ships = require(ReplicatedStorage.Shared.Config.Ships)
local Motion = require(script.Parent.Motion)
local T = require(script.Parent.Tokens)

local Hud = {}

local TONE = { good = T.color.good, bad = T.color.bad, phase = T.color.brass, info = T.color.fog }

local function corner(parent: Instance, r: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = parent
end

local function text(parent: Instance, props: { [string]: any }): TextLabel
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Text = ""
	t.FontFace = T.font
	t.TextColor3 = T.color.white
	t.TextSize = T.text.body
	t.TextXAlignment = Enum.TextXAlignment.Left
	for k, v in props do
		(t :: any)[k] = v
	end
	t.Parent = parent
	return t
end

function Hud.start(): ScreenGui
	local player = Players.LocalPlayer
	local state = ReplicatedStorage:WaitForChild("NightState") :: Folder
	local bannerEvent = Remotes.Banner

	local gui = Instance.new("ScreenGui")
	gui.Name = "Hud"
	gui.ResetOnSpawn = false
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
	gui.Parent = player:WaitForChild("PlayerGui")

	-- Banner (single state channel, queued).
	local bannerHome = UDim2.new(0.5, 0, 0, 12)
	local banner = Instance.new("CanvasGroup")
	banner.AnchorPoint = Vector2.new(0.5, 0)
	banner.Position = bannerHome
	banner.Size = UDim2.new(0.9, 0, 0, 56)
	banner.BackgroundColor3 = T.color.ink
	banner.BackgroundTransparency = 0.1
	banner.Visible = false
	banner.Parent = gui
	corner(banner, T.radius.panel)
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize = Vector2.new(640, 56)
	limit.Parent = banner
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 2
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	stroke.Parent = banner
	local bannerText = text(banner, {
		Size = UDim2.new(1, -24, 1, 0),
		Position = UDim2.fromOffset(12, 0),
		FontFace = T.bold,
		TextXAlignment = Enum.TextXAlignment.Center,
		TextWrapped = true,
		TextScaled = true,
	})
	local textLimit = Instance.new("UITextSizeConstraint")
	textLimit.MaxTextSize = 22
	textLimit.Parent = bannerText

	local queue: { { string } } = {}
	bannerEvent.OnClientEvent:Connect(function(msg: string, tone: string)
		table.insert(queue, { msg, tone })
	end)
	task.spawn(function()
		while true do
			local item = table.remove(queue, 1)
			if item then
				bannerText.Text = item[1]
				stroke.Color = TONE[item[2]] or T.color.fog
				Motion.bannerIn(banner, bannerHome)
				task.wait(if #queue > 1 then 1.4 else 2.4)
				Motion.bannerOut(banner)
			else
				task.wait(0.1)
			end
		end
	end)

	-- Objective + rules (top left).
	local objective = Instance.new("Frame")
	objective.BackgroundTransparency = 1
	objective.AnchorPoint = Vector2.new(1, 0)
	objective.Position = UDim2.new(1, -16, 0, 64) -- top right: Roblox chat owns the top left
	objective.Size = UDim2.fromOffset(320, 300)
	objective.Parent = gui
	local list = Instance.new("UIListLayout")
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Padding = UDim.new(0, 6)
	list.Parent = objective
	local title = text(objective, {
		Size = UDim2.new(1, 0, 0, 28),
		FontFace = T.bold,
		TextSize = T.text.title,
		TextStrokeTransparency = 0.6,
	})
	title.LayoutOrder = 1
	local rulesFrame = Instance.new("Frame")
	rulesFrame.LayoutOrder = 2
	rulesFrame.BackgroundTransparency = 1
	rulesFrame.AutomaticSize = Enum.AutomaticSize.Y
	rulesFrame.Size = UDim2.fromScale(1, 0)
	rulesFrame.Parent = objective
	local rulesList = Instance.new("UIListLayout")
	rulesList.SortOrder = Enum.SortOrder.LayoutOrder
	rulesList.Padding = UDim.new(0, 4)
	rulesList.Parent = rulesFrame

	local function renderRules()
		for _, child in rulesFrame:GetChildren() do
			if child:IsA("Frame") then
				child:Destroy()
			end
		end
		local raw = state:GetAttribute("Rules")
		if type(raw) ~= "string" then
			return
		end
		local rows = HttpService:JSONDecode(raw)
		for i, row in rows do
			local chip = Instance.new("Frame")
			chip.LayoutOrder = i
			chip.Size = UDim2.new(1, 0, 0, 34)
			chip.BackgroundColor3 = T.color.ink
			chip.BackgroundTransparency = 0.15
			chip.Parent = rulesFrame
			corner(chip, T.radius.chip)
			local left = 10
			if row.color then
				local c = Ships.rgb[row.color]
				local swatch = Instance.new("Frame")
				swatch.Size = UDim2.fromOffset(18, 18)
				swatch.Position = UDim2.new(0, 10, 0.5, -9)
				swatch.BackgroundColor3 = Color3.fromRGB(c[1], c[2], c[3])
				swatch.Parent = chip
				corner(swatch, 4)
				left = 36
			end
			text(chip, {
				Position = UDim2.fromOffset(left, 0),
				Size = UDim2.new(1, -left - 8, 1, 0),
				Text = `{if row.ok then "✔" else "✖"}  {row.text}`,
				TextColor3 = if row.ok then T.color.good else T.color.bad,
				FontFace = T.bold,
			})
			if i == #rows then
				Motion.pop(chip) -- the newest rule pops in
			end
		end
	end

	-- Harbor integrity (bottom left).
	local integrity = Instance.new("Frame")
	integrity.AnchorPoint = Vector2.new(0, 1)
	integrity.Position = UDim2.new(0, 16, 1, -16)
	integrity.Size = UDim2.fromOffset(220, 40)
	integrity.BackgroundColor3 = T.color.ink
	integrity.BackgroundTransparency = 0.15
	integrity.Parent = gui
	corner(integrity, T.radius.chip)
	local integrityLabel = text(integrity, {
		Position = UDim2.fromOffset(10, 0),
		Size = UDim2.new(1, -20, 0, 24),
		TextSize = T.text.small,
		FontFace = T.bold,
	})
	local bar = Instance.new("Frame")
	bar.Position = UDim2.fromOffset(10, 26)
	bar.Size = UDim2.new(1, -20, 0, 6)
	bar.BackgroundColor3 = T.color.good
	bar.BorderSizePixel = 0
	bar.Parent = integrity

	-- Harbor Log (dawn report).
	local logHome = UDim2.fromScale(0.5, 0.5)
	local logPanel = Instance.new("CanvasGroup")
	logPanel.AnchorPoint = Vector2.new(0.5, 0.5)
	logPanel.Position = logHome
	logPanel.Size = UDim2.fromOffset(340, 300)
	logPanel.BackgroundColor3 = T.color.paper
	logPanel.Visible = false
	logPanel.Parent = gui
	corner(logPanel, T.radius.panel)
	local logText = text(logPanel, {
		Position = UDim2.fromOffset(20, 16),
		Size = UDim2.new(1, -40, 1, -32),
		TextColor3 = T.color.ink,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
		RichText = true,
	})

	local function renderLog()
		local raw = state:GetAttribute("Log")
		if type(raw) ~= "string" then
			return
		end
		local log = HttpService:JSONDecode(raw)
		local headline = if log.failed
			then "The harbor was overrun."
			elseif log.correct == log.checked then "Perfect night!"
			else "Dawn breaks."
		logText.Text = table.concat({
			`<font size="26"><b>HARBOR LOG</b></font>`,
			`<b>{headline}</b>`,
			"",
			`Ships checked: {log.checked}`,
			`Correct calls: {log.correct}`,
			`Mimics stopped: {log.mimicsStopped}`,
			`Mimics that got in: {log.mimicsMissed}`,
			`Real ships turned away: {log.realTurnedAway}`,
			`Harbor integrity: {log.integrity}%`,
			`Supplies left: {log.supplies}`,
			"",
			`<b>{player:GetAttribute("LastPayout") or ""}</b>`,
		}, "\n")
	end

	local function refresh()
		local phase = state:GetAttribute("Phase")
		local endsAt = state:GetAttribute("EndsAt") :: number?
		local left = if endsAt and endsAt > 0
			then math.max(0, math.ceil(endsAt - workspace:GetServerTimeNow()))
			else nil
		if phase == "Tide" then
			local ships = state:GetAttribute("ShipsLeft") or 0
			title.Text =
				`{state:GetAttribute("TideName")} · {ships} ship{if ships == 1 then "" else "s"} left · 📦 {state:GetAttribute(
					"Supplies"
				) or 0}`
		elseif phase == "Break" then
			local votes = state:GetAttribute("Votes")
			title.Text =
				`Vote on the shore pads · {left or ""}s · 📦 {state:GetAttribute("Supplies") or 0}{if votes
					then ` · votes {votes}`
					else ""}`
		elseif phase == "Dawn" or phase == "Cabin" then
			title.Text = `Next night in {left or ""}s`
		else
			title.Text = "Waiting for keepers…"
		end
		local value = (state:GetAttribute("Integrity") or 100) :: number
		integrityLabel.Text = `Harbor  {value}%`
		bar.Size = UDim2.new((1 * value / 100), -20 * value / 100, 0, 6)
		bar.BackgroundColor3 = if value > 50 then T.color.good else T.color.bad
	end

	state:GetAttributeChangedSignal("Rules"):Connect(renderRules)
	state:GetAttributeChangedSignal("Log"):Connect(renderLog)
	state:GetAttributeChangedSignal("Phase"):Connect(function()
		if state:GetAttribute("Phase") == "Dawn" then
			renderLog()
			Motion.panelIn(logPanel, logHome)
		else
			logPanel.Visible = false
		end
	end)
	renderRules()
	task.spawn(function()
		while true do
			refresh()
			task.wait(0.25) -- 4 Hz is enough for a seconds countdown
		end
	end)
	return gui
end

return Hud
