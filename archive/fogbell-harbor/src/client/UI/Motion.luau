--!strict
-- The motion palette (docs/ui-motion-audit.md §4). Only these patterns; reduced motion = fades.

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Motion = {}

local function reduced(): boolean
	return Players.LocalPlayer:GetAttribute("ReducedMotion") == true
end

local function tween(
	obj: Instance,
	seconds: number,
	props: { [string]: any },
	style: Enum.EasingStyle?
): Tween
	local t = TweenService:Create(
		obj,
		TweenInfo.new(seconds, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		props
	)
	t:Play()
	return t
end

-- Banner: slide down 24px + fade in. `home` is the resting position.
function Motion.bannerIn(frame: CanvasGroup, home: UDim2)
	frame.Visible = true
	frame.GroupTransparency = 1
	if reduced() then
		frame.Position = home
	else
		frame.Position = home - UDim2.fromOffset(0, 24)
		tween(frame, 0.2, { Position = home })
	end
	tween(frame, 0.2, { GroupTransparency = 0 })
end

function Motion.bannerOut(frame: CanvasGroup)
	tween(frame, 0.15, { GroupTransparency = 1 }).Completed:Wait()
	frame.Visible = false
end

-- Pop: scale 0 → 1.15 → 1 (needs a UIScale child).
function Motion.pop(obj: GuiObject)
	local scale = obj:FindFirstChildOfClass("UIScale") or Instance.new("UIScale")
	scale.Parent = obj
	if reduced() then
		scale.Scale = 1
		return
	end
	scale.Scale = 0
	tween(scale, 0.3, { Scale = 1 }, Enum.EasingStyle.Back)
end

-- Panel: modal open.
function Motion.panelIn(frame: CanvasGroup, home: UDim2)
	frame.Visible = true
	frame.GroupTransparency = 1
	frame.Position = if reduced() then home else home + UDim2.fromOffset(0, 24)
	tween(frame, 0.18, { Position = home, GroupTransparency = 0 })
end

return Motion
