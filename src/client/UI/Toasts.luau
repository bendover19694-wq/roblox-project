--!strict
-- Toasts: small arrival pills (batched), bigger milestone/goal cards, and error notices.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Kit = require(script.Parent.Kit)
local Theme = require(script.Parent.Theme)

local Toasts = {}

local stack: Frame
local lastArrival = 0
local arrivalPill: Frame? = nil

local STYLE: { [string]: { any } } = {
	milestone = { "🎉", Theme.navyCard, Theme.amber },
	goal = { "🏆", Theme.navyCard, Color3.fromHex("FFD36B") },
	money = { "💰", Theme.navyCard, Theme.green },
	error = { "⚠", Theme.red, Theme.white },
	info = { "ℹ", Theme.navyCard, Theme.white },
}

local function remove(f: Frame, after: number)
	task.delay(after, function()
		if f.Parent then
			Kit.tween(f, 0.2, { BackgroundTransparency = 1 })
			task.wait(0.2)
			f:Destroy()
		end
	end)
end

function Toasts.show(text: string, kind: string?)
	kind = kind or "info"
	if kind == "arrival" then
		-- many rockets land at once: keep one pill and update it
		local now = os.clock()
		if arrivalPill and arrivalPill.Parent and now - lastArrival < 1.5 then
			do
				local it = arrivalPill:FindFirstChild("Text") :: TextLabel
				it.Text = text
			end
		else
			local pill = Kit.new("Frame", {
				LayoutOrder = math.floor(now * 10),
				BackgroundColor3 = Color3.fromHex("0F1530"),
				BackgroundTransparency = 0.1,
				AutomaticSize = Enum.AutomaticSize.X,
				Size = UDim2.fromOffset(0, 40),
				Parent = stack,
			}, { Kit.round(), Kit.pad(16, 0) })
			Kit.text(text, 17, Theme.bold, Color3.fromHex("8FF0B8"), {
				Name = "Text",
				AutomaticSize = Enum.AutomaticSize.X,
				Size = UDim2.fromScale(0, 1),
				TextTruncate = Enum.TextTruncate.None,
				Parent = pill,
			})
			arrivalPill = pill
			remove(pill, 2.2)
		end
		lastArrival = now
		return
	end
	local s = STYLE[kind :: string] or STYLE.info
	local f = Kit.new("Frame", {
		LayoutOrder = math.floor(os.clock() * 10),
		BackgroundColor3 = s[2],
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, 74),
		Parent = stack,
	}, { Kit.corner(20), Kit.pad(18, 0), Kit.list(14, true) })
	local ic = Kit.iconCircle(s[1], s[3], 48, Theme.navyCard)
	ic.LayoutOrder = 1
	ic.Parent = f
	Kit.text(text, 20, Theme.heavy, if kind == "error" then Theme.white else s[3], {
		LayoutOrder = 2,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, 74),
		TextTruncate = Enum.TextTruncate.None,
		Parent = f,
	})
	Kit.popIn(f)
	remove(f, if kind == "error" then 3 else 3.5)
end

function Toasts.start(canvas: Frame)
	stack = Kit.new("Frame", {
		Name = "Toasts",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 124),
		Size = UDim2.fromOffset(560, 400),
		BackgroundTransparency = 1,
		ZIndex = 70,
		Parent = canvas,
	}, { Kit.list(10, false, Enum.HorizontalAlignment.Center) })
	Remotes.Toast.OnClientEvent:Connect(Toasts.show)
end

return Toasts
