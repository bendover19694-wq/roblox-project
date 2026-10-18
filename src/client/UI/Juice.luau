--!strict
-- Celebration effects: coin bursts to the cash label, map pings, confetti. Cosmetic only; the server has
-- already granted everything. Lives in its own ScreenGui and never blocks clicks.

local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

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
			if from and os.clock() - lastBurst >= 0.6 then
				lastBurst = os.clock()
				Juice.coins(from, 5)
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
