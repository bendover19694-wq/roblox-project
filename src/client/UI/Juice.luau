--!strict
-- Celebration effects: coin bursts to the cash label, map pings, confetti. Cosmetic only; the server has
-- already granted everything. Lives in its own ScreenGui and never blocks clicks.

local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Format = require(ReplicatedStorage.Shared.Format)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Map = require(script.Parent.Map)
local Motion = require(script.Parent.Motion)
local Sounds = require(script.Parent.Sounds)
local Theme = require(script.Parent.Theme)

local Juice = {}

local layer: Frame
local canvasRef: Frame
local lastBurst = 0
local rng = Random.new()

-- Frames inside the Juice gui measure from below the top bar inset; callers pass true screen pixels.
local function toLocal(screen: Vector2): Vector2
	return screen - GuiService:GetGuiInset()
end

local function cashLabel(): GuiObject?
	local c = canvasRef:FindFirstChild("Cash", true)
	return if c and c:IsA("GuiObject") then c else nil
end

-- Coins fly from `fromAbs` (true screen pixels) to the cash label, 0.04 s apart.
function Juice.coins(fromAbs: Vector2, count: number)
	local cash = cashLabel()
	if not cash then
		return
	end
	local from = toLocal(fromAbs)
	for i = 1, count do
		task.delay((i - 1) * 0.04, function()
			if not layer.Parent or not cash.Parent then
				return
			end
			local coin = Icons.make("coin", 22, Theme.amber)
			coin.AnchorPoint = Vector2.new(0.5, 0.5)
			coin.Position =
				UDim2.fromOffset(from.X - layer.AbsolutePosition.X, from.Y - layer.AbsolutePosition.Y)
			coin.Parent = layer
			Motion.flyTo(coin, from, cash, 0.7, function()
				if i == count then
					Motion.pulse(cash, 0.06)
					Sounds.play("coin")
				end
			end)
		end)
	end
end

local COLORS = { Theme.orange, Theme.cyan, Theme.amber, Theme.white }

function Juice.confetti()
	if Motion.reduced() then
		return
	end
	local w = layer.AbsoluteSize.X
	local h = layer.AbsoluteSize.Y
	for _ = 1, 40 do
		local size = rng:NextInteger(6, 11)
		local x = rng:NextNumber(0, w)
		local piece = Kit.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromOffset(x, -20),
			Size = UDim2.fromOffset(size, size * rng:NextNumber(1, 2)),
			Rotation = rng:NextNumber(0, 360),
			BackgroundColor3 = COLORS[rng:NextInteger(1, #COLORS)],
			BorderSizePixel = 0,
			Parent = layer,
		})
		local t = Kit.tween(piece, rng:NextNumber(1.2, 1.6), {
			Position = UDim2.fromOffset(x + rng:NextNumber(-90, 90), h + 20),
			Rotation = piece.Rotation + rng:NextNumber(-540, 540),
		}, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
		t.Completed:Connect(function()
			piece:Destroy()
		end)
	end
end

-- Text that pops at `screen` (true screen pixels), stays `hold` seconds, then rises and fades.
function Juice.float(screen: Vector2, text: string, color: Color3, size: number?, hold: number?)
	local at = toLocal(screen) - layer.AbsolutePosition
	local px = size or 20
	local label = Kit.new("TextLabel", {
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.fromOffset(at.X, at.Y - 10),
		Size = UDim2.fromOffset(320, px + 8),
		BackgroundTransparency = 1,
		Text = text,
		TextColor3 = color,
		TextSize = px,
		FontFace = Theme.mono,
		TextStrokeColor3 = Theme.navy,
		TextStrokeTransparency = 0.2,
		Parent = layer,
	})
	if Motion.reduced() then
		task.delay(0.9 + (hold or 0), function()
			label:Destroy()
		end)
		return
	end
	Motion.pop(label)
	-- `hold` keeps big moments (jackpots) on screen before they drift away
	task.delay(hold or 0, function()
		local rise = Kit.tween(label, 1.1, {
			Position = UDim2.fromOffset(at.X, at.Y - 10 - px * 2.4),
			TextTransparency = 1,
			TextStrokeTransparency = 1,
		}, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
		rise.Completed:Connect(function()
			label:Destroy()
		end)
	end)
end

-- Small smoke puffs that burst out of `screen` and fade.
local function puffs(screen: Vector2, n: number)
	if Motion.reduced() then
		return
	end
	local at = toLocal(screen) - layer.AbsolutePosition
	for _ = 1, n do
		local d = rng:NextInteger(8, 14)
		local puff = Kit.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromOffset(at.X, at.Y),
			Size = UDim2.fromOffset(d, d),
			BackgroundColor3 = Theme.white,
			BackgroundTransparency = 0.2,
			Parent = layer,
		}, { Kit.round() })
		local a = rng:NextNumber(0, math.pi * 2)
		local r = rng:NextNumber(14, 26)
		Kit.tween(puff, 0.45, {
			Position = UDim2.fromOffset(at.X + math.cos(a) * r, at.Y + math.sin(a) * r),
			Size = UDim2.fromOffset(d * 2.2, d * 2.2),
			BackgroundTransparency = 1,
		}).Completed
			:Connect(function()
				puff:Destroy()
			end)
	end
end

-- Thruster tap feedback on a map rocket. `gained` is nil while the server hasn't answered yet,
-- 0 when this trip's thrust cap is reached.
local combo, lastTap = 0, 0
function Juice.thrust(screen: Vector2, gained: number?)
	if gained == nil then
		local t = os.clock()
		combo = if t - lastTap < 1 then combo + 1 else 1
		lastTap = t
		puffs(screen, 3)
		Sounds.play("thrust", 1 + math.min(combo, 12) * 0.05)
		return
	end
	if gained <= 0 then
		Juice.float(screen, "MAX THRUST", Theme.muted, 14)
		return
	end
	if combo >= 3 then
		Juice.float(screen, `THRUST x{combo}`, Theme.orange, 18 + math.min(combo, 10))
	else
		Juice.float(screen, `+{string.format("%.1f", gained)}s`, Theme.cyan, 16)
	end
end

local function screenCentre(): Vector2
	return workspace.CurrentCamera.ViewportSize / 2
end

function Juice.start(canvas: Frame)
	canvasRef = canvas
	local gui = Kit.new("ScreenGui", {
		Name = "Juice",
		DisplayOrder = 30,
		ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets, -- same space as the Hud, so the cash label lines up
		ResetOnSpawn = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	layer = Kit.new("Frame", {
		Name = "Layer",
		Active = false,
		BackgroundTransparency = 1,
		Size = UDim2.fromScale(1, 1),
		Parent = gui,
	})

	Remotes.Celebrate.OnClientEvent:Connect(function(kind: string, data: any)
		if kind == "arrival" and type(data) == "table" then
			Map.ping(data.dest)
			Sounds.play("arrival")
			local from = Map.nodeCenter(data.dest)
			local jackpot = if type(data.jackpot) == "number" then data.jackpot else 0
			local profit = if type(data.profit) == "number" then data.profit else 0
			if from and jackpot > 0 then
				-- the lucky trip: big gold pop, a fat coin burst, a flash of confetti
				Juice.float(from, `JACKPOT +{Format.money(profit + jackpot)}`, Theme.amber, 34, 0.7)
				Juice.coins(from, 14)
				Sounds.play("jackpot")
				Juice.confetti()
			elseif from then
				Juice.float(
					from,
					`{if profit >= 0 then "+" else ""}{Format.money(profit)}`,
					if profit >= 0 then Theme.green else Theme.red,
					18
				)
				if os.clock() - lastBurst >= 0.6 then
					lastBurst = os.clock()
					Juice.coins(from, 5)
				end
			end
		elseif kind == "reward" then
			Juice.coins(screenCentre(), 8)
		elseif kind == "stage" then
			Juice.confetti()
			Sounds.play("stage")
		end
	end)
end

return Juice
