--!strict
-- Launch sequence shown after a mission is planned: countdown, a Perfect Launch timing bar, then liftoff.
-- Cosmetic except IGNITE, which asks the server to judge the tap (server receive time decides, never this clock).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Launch = require(ReplicatedStorage.Shared.Launch)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
local Motion = require(script.Parent.Motion)
local RocketView = require(script.Parent.RocketView)
local Sounds = require(script.Parent.Sounds)
local Theme = require(script.Parent.Theme)

local Liftoff = {}

local SWEEP = 3.4 -- seconds after departAt for the needle to cross the bar
local LIFTOFF_AT = 3
local END_AT = 4.2

type Options = {
	missionId: string,
	model: string,
	color: Color3,
	departAt: number,
	destName: string,
}

function Liftoff.play(o: Options, onDone: () -> ())
	local gui = Kit.new("ScreenGui", {
		Name = "Liftoff",
		DisplayOrder = 25,
		ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets,
		ResetOnSpawn = false,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	-- Shrinks the card on short (phone) screens.
	local fit = math.clamp(workspace.CurrentCamera.ViewportSize.Y / 720, 0.5, 1)
	local card = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromOffset(460, 560),
		BackgroundColor3 = Theme.navy,
		BackgroundTransparency = 0, -- opaque: toasts fired during liftoff must not show through
		Parent = gui,
	}, { Kit.corner(Theme.radius.card), Kit.stroke(Theme.gridLine, 2), Kit.new("UIScale", { Scale = fit }) })
	Kit.text(`Cleared for {o.destName}`, 24, Theme.display, Theme.white, {
		Position = UDim2.fromOffset(20, 16),
		Size = UDim2.new(1, -40, 0, 32),
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = card,
	})
	Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 262),
		Size = UDim2.fromOffset(300, 12),
		BackgroundColor3 = Theme.gridLine,
		Parent = card,
	}, { Kit.round() })
	local rocket = RocketView.new(o.model, o.color, UDim2.fromOffset(220, 220), { flame = true })
	rocket.AnchorPoint = Vector2.new(0.5, 0)
	rocket.Position = UDim2.new(0.5, 0, 0, 50)
	rocket.Parent = card
	local count = Kit.text("3", 64, Theme.display, Theme.white, {
		Position = UDim2.fromOffset(20, 280),
		Size = UDim2.new(1, -40, 0, 76),
		TextXAlignment = Enum.TextXAlignment.Center,
		Parent = card,
	})

	-- Perfect Launch bar: the green zone is the server's window mapped onto the needle's 0..SWEEP range.
	local opens, closes = Launch.window(o.departAt)
	local track = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, 370),
		Size = UDim2.new(1, -60, 0, 18),
		BackgroundColor3 = Theme.navyCard,
		Parent = card,
	}, { Kit.round(), Kit.stroke(Theme.gridLine, 1) })
	Kit.new("Frame", {
		Position = UDim2.fromScale((opens - o.departAt) / SWEEP, 0),
		Size = UDim2.fromScale((closes - opens) / SWEEP, 1),
		BackgroundColor3 = Theme.green,
		Parent = track,
	}, { Kit.corner(4) })
	local needle = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0, 0.5),
		Size = UDim2.fromOffset(6, 30),
		BackgroundColor3 = Theme.white,
		ZIndex = 3,
		Parent = track,
	}, { Kit.corner(3) })

	local resultLabel = Kit.text("", 18, Theme.bold, Theme.white, {
		Position = UDim2.fromOffset(20, 470),
		Size = UDim2.new(1, -40, 0, 50),
		TextXAlignment = Enum.TextXAlignment.Center,
		TextWrapped = true,
		Parent = card,
	})
	local done = false
	local conn: RBXScriptConnection
	local function finish()
		if done then
			return
		end
		done = true
		conn:Disconnect()
		gui:Destroy()
		onDone()
	end

	local ignite: Frame
	local tapped = false
	ignite = Kit.button({
		text = "IGNITE",
		icon = "flame",
		size = UDim2.new(1, -120, 0, 62),
		onClick = function()
			if tapped or done then
				return
			end
			tapped = true
			ignite.Visible = false
			local hit = App.act("perfectLaunch", o.missionId)
			if done then
				return
			end
			if hit then
				resultLabel.Text =
					`PERFECT LAUNCH, +{math.floor(Tuning.perfectLaunch.bonus * 100 + 0.5)}% on the first trip`
				resultLabel.TextColor3 = Theme.green
				Sounds.play("perfect")
				Motion.pulse(resultLabel, 0.12)
			else
				resultLabel.Text = "Missed the window"
				resultLabel.TextColor3 = Theme.amber
			end
		end,
	})
	ignite.AnchorPoint = Vector2.new(0.5, 0)
	ignite.Position = UDim2.new(0.5, 0, 0, 400)
	ignite.Parent = card

	local skip = Kit.ghost("SKIP", finish, UDim2.fromOffset(110, 48))
	skip.AnchorPoint = Vector2.new(1, 0)
	skip.Position = UDim2.new(1, -16, 0, 16)
	skip.Parent = gui

	local function launch()
		Sounds.play("launch")
		if Motion.reduced() then
			return
		end
		Motion.shake(card, 6, 0.5)
		Kit.tween(
			rocket,
			1.2,
			{ Position = UDim2.new(0.5, 0, 0, -520), ImageTransparency = 1 },
			Enum.EasingStyle.Quad,
			Enum.EasingDirection.In
		)
		for i = 1, 8 do
			task.delay(i * 0.08, function()
				if done then
					return
				end
				local puff = Kit.new("Frame", {
					AnchorPoint = Vector2.new(0.5, 0.5),
					Position = UDim2.new(0.5, (i % 2 == 0 and 1 or -1) * 10 * i, 0, 262),
					Size = UDim2.fromOffset(24, 24),
					BackgroundColor3 = Color3.fromHex("C9CEE0"),
					BackgroundTransparency = 0.3,
					Parent = card,
				}, { Kit.round() })
				Kit.tween(puff, 0.9, {
					Size = UDim2.fromOffset(90, 90),
					Position = UDim2.new(0.5, (i % 2 == 0 and 1 or -1) * 28 * i, 0, 235),
					BackgroundTransparency = 1,
				}).Completed
					:Connect(function()
						puff:Destroy()
					end)
			end)
		end
	end

	local lastShown = ""
	local launched = false
	conn = RunService.Heartbeat:Connect(function()
		local t = App.now() - o.departAt
		local shown = if t >= LIFTOFF_AT then "LIFTOFF" elseif t >= 2 then "1" elseif t >= 1 then "2" else "3"
		if shown ~= lastShown then
			lastShown = shown
			count.Text = shown
			count.TextColor3 = if shown == "LIFTOFF" then Theme.orange else Theme.white
			count.TextSize = if shown == "LIFTOFF" then 48 else 64
			Sounds.play("count")
		end
		needle.Position = UDim2.fromScale(math.clamp(t / SWEEP, 0, 1), 0.5)
		if t >= LIFTOFF_AT and not launched then
			launched = true
			launch()
		end
		if t >= END_AT then
			finish()
		end
	end)
end

return Liftoff
