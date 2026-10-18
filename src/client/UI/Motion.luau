--!strict
-- Motion: the 8 animation patterns every screen uses (enter, exit, pop, press, countUp, flyTo, pulse, shake).
-- Every pattern honours reduced motion by jumping straight to its end state.

local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Motion = {}

Motion.T = { fast = 0.15, base = 0.25, slow = 0.4 }

type Side = "right" | "top" | "bottom"

local SLIDE = 40

-- On if the player asked for it in our settings or in their device / Roblox settings.
function Motion.reduced(): boolean
	return GuiService.ReducedMotionEnabled or Players.LocalPlayer:GetAttribute("ReducedMotion") == true
end

local function tween(
	obj: Instance,
	seconds: number,
	props: { [string]: any },
	style: Enum.EasingStyle?
): Tween
	local t = TweenService:Create(obj, TweenInfo.new(seconds, style or Enum.EasingStyle.Quad), props)
	t:Play()
	return t
end

-- Returns a child UIScale, creating it when missing. Named scales (press, pulse) stay separate from the
-- default-named fit scale that modals already carry.
local function scaleOf(obj: GuiObject, name: string): UIScale
	local found = obj:FindFirstChild(name)
	if found and found:IsA("UIScale") then
		return found
	end
	local s = Instance.new("UIScale")
	s.Name = name
	s.Parent = obj
	return s
end

local function offsetFrom(pos: UDim2, side: Side?): UDim2
	local dx, dy = 0, 0
	if side == "top" then
		dy = -SLIDE
	elseif side == "bottom" then
		dy = SLIDE
	else
		dx = SLIDE
	end
	return UDim2.new(pos.X.Scale, pos.X.Offset + dx, pos.Y.Scale, pos.Y.Offset + dy)
end

-- Where each object rests, and which run is current (so a late finish can't undo a newer one).
local resting: { [GuiObject]: UDim2 } = setmetatable({}, { __mode = "k" }) :: any
local runs: { [GuiObject]: number } = setmetatable({}, { __mode = "k" }) :: any

local function begin(obj: GuiObject): (UDim2, number)
	local rest = resting[obj] or obj.Position
	resting[obj] = rest
	local run = (runs[obj] or 0) + 1
	runs[obj] = run
	return rest, run
end

function Motion.enter(obj: GuiObject, from: Side?, seconds: number?)
	local rest, run = begin(obj)
	obj.Visible = true
	local group: CanvasGroup? = if obj:IsA("CanvasGroup") then obj else nil
	if Motion.reduced() then
		obj.Position = rest
		resting[obj] = nil
		if group then
			group.GroupTransparency = 0
		end
		return
	end
	obj.Position = offsetFrom(rest, from)
	local dur = seconds or Motion.T.base
	if group then
		group.GroupTransparency = 1
		tween(group, dur, { GroupTransparency = 0 })
	end
	tween(obj, dur, { Position = rest }, Enum.EasingStyle.Cubic).Completed:Connect(function()
		if runs[obj] == run then
			resting[obj] = nil
		end
	end)
end

function Motion.exit(obj: GuiObject, to: Side?, onDone: (() -> ())?)
	local rest, run = begin(obj)
	local group: CanvasGroup? = if obj:IsA("CanvasGroup") then obj else nil
	local function finish()
		if runs[obj] ~= run then
			return
		end
		resting[obj] = nil
		obj.Position = rest
		if group then
			group.GroupTransparency = 0
		end
		if onDone then
			onDone()
		else
			obj.Visible = false
		end
	end
	if Motion.reduced() then
		finish()
		return
	end
	if group then
		tween(group, Motion.T.fast, { GroupTransparency = 1 })
	end
	tween(obj, Motion.T.fast, { Position = offsetFrom(rest, to) }, Enum.EasingStyle.Cubic).Completed:Connect(
		finish
	)
end

-- Scale 0.92 to rest with a Back ease. Rest is the FitScale attribute modals use to fit short screens,
-- and the scale is the default-named UIScale they already own.
function Motion.pop(obj: GuiObject)
	local scale = scaleOf(obj, "UIScale")
	local rest: number = (obj:GetAttribute("FitScale") :: number?) or 1
	if Motion.reduced() then
		scale.Scale = rest
		return
	end
	scale.Scale = rest * 0.92
	tween(scale, Motion.T.base, { Scale = rest }, Enum.EasingStyle.Back)
end

function Motion.press(button: GuiButton, target: GuiObject?)
	local scale = scaleOf(target or button, "PressScale")
	local function set(v: number)
		if Motion.reduced() then
			scale.Scale = v
		else
			tween(scale, 0.08, { Scale = v })
		end
	end
	button.MouseButton1Down:Connect(function()
		set(0.94)
	end)
	button.MouseButton1Up:Connect(function()
		set(1)
	end)
	button.MouseLeave:Connect(function()
		set(1)
	end)
	button.MouseEnter:Connect(function()
		set(1.03)
	end)
end

local counters: { [TextLabel]: RBXScriptConnection } = setmetatable({}, { __mode = "k" }) :: any

function Motion.countUp(
	label: TextLabel,
	from: number,
	to: number,
	format: (number) -> string,
	seconds: number?
)
	local old = counters[label]
	if old then
		old:Disconnect()
		counters[label] = nil
	end
	if Motion.reduced() or from == to then
		label.Text = format(to)
		return
	end
	local dur = seconds or 0.6
	local t0 = os.clock()
	counters[label] = RunService.Heartbeat:Connect(function()
		local a = math.min((os.clock() - t0) / dur, 1)
		if a >= 1 or label.Parent == nil then
			label.Text = format(to)
			local c = counters[label]
			if c then
				c:Disconnect()
				counters[label] = nil
			end
			return
		end
		label.Text = format(from + (to - from) * (1 - (1 - a) ^ 3))
	end)
end

-- Product of every UIScale from `inst` upward: screen pixels per local pixel for its children.
local function localScale(inst: Instance?): number
	local s = 1
	while inst do
		local u = inst:FindFirstChildOfClass("UIScale")
		if u then
			s *= u.Scale
		end
		inst = inst.Parent
	end
	return s
end

-- Moves an already parented item along a curve from fromAbs to the centre of target, then destroys it.
function Motion.flyTo(
	item: GuiObject,
	fromAbs: Vector2,
	target: GuiObject,
	seconds: number?,
	onArrive: (() -> ())?
)
	if Motion.reduced() or item.Parent == nil then
		item:Destroy()
		if onArrive then
			onArrive()
		end
		return
	end
	local parent: any = item.Parent
	local dur = seconds or 0.7
	local t0 = os.clock()
	local lastEnd = fromAbs
	item.AnchorPoint = Vector2.new(0.5, 0.5)
	local conn: RBXScriptConnection
	conn = RunService.Heartbeat:Connect(function()
		local a = math.min((os.clock() - t0) / dur, 1)
		if target.Parent then
			lastEnd = target.AbsolutePosition + target.AbsoluteSize / 2
		end
		local mid = (fromAbs + lastEnd) / 2 + Vector2.new(0, -80) -- control point arcs the path upward
		local e = a * a * (3 - 2 * a)
		local p = fromAbs * (1 - e) ^ 2 + mid * (2 * (1 - e) * e) + lastEnd * (e * e)
		local rel = (p - parent.AbsolutePosition) / localScale(parent)
		item.Position = UDim2.fromOffset(rel.X, rel.Y)
		if a >= 1 then
			conn:Disconnect()
			item:Destroy()
			if onArrive then
				onArrive()
			end
		end
	end)
end

function Motion.pulse(obj: GuiObject, amount: number?)
	if Motion.reduced() then
		return
	end
	local scale = scaleOf(obj, "PulseScale")
	tween(scale, 0.12, { Scale = 1 + (amount or 0.08) }).Completed:Connect(function()
		tween(scale, 0.18, { Scale = 1 })
	end)
end

function Motion.shake(obj: GuiObject, px: number?, seconds: number?)
	if Motion.reduced() then
		return
	end
	local rest, run = begin(obj)
	local dur = seconds or 0.3
	local amp = px or 6
	local t0 = os.clock()
	local conn: RBXScriptConnection
	conn = RunService.Heartbeat:Connect(function()
		local a = (os.clock() - t0) / dur
		if a >= 1 or runs[obj] ~= run then
			conn:Disconnect()
			if runs[obj] == run then
				resting[obj] = nil
				obj.Position = rest
			end
			return
		end
		local k = amp * (1 - a)
		obj.Position = UDim2.new(
			rest.X.Scale,
			rest.X.Offset + math.sin(a * 40) * k,
			rest.Y.Scale,
			rest.Y.Offset + math.cos(a * 55) * k
		)
	end)
end

return Motion
