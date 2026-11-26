--!strict
-- Theme and small UI builders. Every screen is made from these.

local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")
local RunService = game:GetService("RunService")
local TextService = game:GetService("TextService")
local TweenService = game:GetService("TweenService")

local Kit = {}

Kit.colors = {
	bg = Color3.fromRGB(20, 14, 36),
	panel = Color3.fromRGB(32, 24, 56),
	card = Color3.fromRGB(46, 36, 78),
	text = Color3.fromRGB(255, 255, 255),
	dim = Color3.fromRGB(196, 186, 226),
	pink = Color3.fromRGB(255, 70, 160),
	green = Color3.fromRGB(60, 220, 120),
	gold = Color3.fromRGB(255, 200, 60),
	blue = Color3.fromRGB(70, 190, 255),
	purple = Color3.fromRGB(170, 100, 255),
	red = Color3.fromRGB(230, 60, 80),
	stroke = Color3.fromHex("160F2B"), -- LihFolk ink: every outline and text stroke
}

-- Same two faces as the LihFolk UI kit, so the HUD and the menus read as one family.
Kit.FONT = Enum.Font.FredokaOne
Kit.BODY = Enum.Font.BuilderSansBold

function Kit.reduced(): boolean
	return Players.LocalPlayer:GetAttribute("ReducedMotion") == true
end

function Kit.make(class: string, props: { [string]: any }, children: { any }?): any
	local inst = Instance.new(class)
	for k, v in props do
		if k ~= "Parent" then
			(inst :: any)[k] = v
		end
	end
	for _, c in (children or {}) :: { any } do
		c.Parent = inst
	end
	inst.Parent = props.Parent
	return inst
end

function Kit.corner(r: number): any
	return Kit.make("UICorner", { CornerRadius = UDim.new(0, r) })
end

function Kit.stroke(color: Color3, thickness: number): any
	return Kit.make(
		"UIStroke",
		{ Color = color, Thickness = thickness, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }
	)
end

-- Text with a dark outline so it reads on any background.
function Kit.text(props: { [string]: any }): TextLabel
	local t = Kit.make("TextLabel", {
		BackgroundTransparency = 1,
		Font = props.Font or Kit.FONT,
		TextColor3 = props.TextColor3 or Kit.colors.text,
		TextScaled = true,
		TextStrokeTransparency = 1,
		Name = props.Name,
		Text = props.Text or "",
		Size = props.Size,
		Position = props.Position,
		AnchorPoint = props.AnchorPoint,
		TextXAlignment = props.TextXAlignment or Enum.TextXAlignment.Center,
		LayoutOrder = props.LayoutOrder or 0,
		ZIndex = props.ZIndex or 1,
		Parent = props.Parent,
	})
	Kit.make("UIStroke", { Color = Kit.colors.stroke, Thickness = props.strokeSize or 2, Parent = t })
	Kit.make("UITextSizeConstraint", { MaxTextSize = props.max or 40, MinTextSize = 21, Parent = t })
	return t
end

local function sound(id: string, speed: number)
	if Players.LocalPlayer:GetAttribute("Sound") == false then
		return
	end
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = 0.35
	s.PlaybackSpeed = speed
	SoundService:PlayLocalSound(s)
	task.delay(2, s.Destroy, s)
end
-- Built-in client sounds (they ship with every Roblox install, so they always load).
function Kit.click()
	sound("rbxasset://sounds/volume_slider.ogg", 1.25)
end
function Kit.cash()
	sound("rbxasset://sounds/volume_slider.ogg", 1.8)
end
function Kit.big()
	sound("rbxasset://sounds/action_get_up.mp3", 1.2)
end

-- A chunky button with press feedback. Min height is kept at 44 px by the caller's sizes.
function Kit.button(props: { [string]: any }, onClick: () -> ()): (TextButton, TextLabel)
	local b = Kit.make("TextButton", {
		Name = props.Name,
		Size = props.Size,
		Position = props.Position,
		AnchorPoint = props.AnchorPoint,
		BackgroundColor3 = props.color or Kit.colors.pink,
		AutoButtonColor = true,
		Text = "",
		LayoutOrder = props.LayoutOrder or 0,
		ZIndex = props.ZIndex or 1,
		Parent = props.Parent,
	}, { Kit.corner(props.radius or 14), Kit.stroke(Kit.colors.stroke, 3) })
	-- Tactile lip: a darker copy sitting 6 px lower behind the face ("if it has a lip, you can press it").
	local base = props.color or Kit.colors.pink
	Kit.make("Frame", {
		Name = (props.Name or "Button") .. "Lip",
		Size = props.Size,
		Position = (props.Position or UDim2.new()) + UDim2.fromOffset(0, 6),
		AnchorPoint = props.AnchorPoint,
		BackgroundColor3 = base:Lerp(Color3.new(0, 0, 0), 0.45),
		ZIndex = (props.ZIndex or 1) - 1,
		LayoutOrder = props.LayoutOrder or 0,
		Parent = props.Parent,
	}, { Kit.corner(props.radius or 14), Kit.stroke(Kit.colors.stroke, 3) })
	Kit.make("UIGradient", {
		Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(190, 190, 190)),
		Rotation = 90,
		Parent = b,
	})
	local label = Kit.text({
		Name = "Label",
		Text = props.Text or "",
		Size = UDim2.new(1, -12, 1, -8),
		Position = UDim2.fromScale(0.5, 0.5),
		AnchorPoint = Vector2.new(0.5, 0.5),
		max = props.max or 34,
		ZIndex = (props.ZIndex or 1) + 1,
		Parent = b,
	})
	label.Name = "Label"
	local scale = Kit.make("UIScale", { Parent = b })
	b.Activated:Connect(function()
		Kit.click()
		if not Kit.reduced() then
			scale.Scale = 0.9
			TweenService:Create(scale, TweenInfo.new(0.18, Enum.EasingStyle.Back), { Scale = 1 }):Play()
		end
		onClick()
	end)
	return b, label
end

-- A button drawn by an uploaded image (outline, lip and icon are in the art; the label is live text).
-- Same press bounce and click sound as Kit.button; Selectable for gamepad focus.
function Kit.imageButton(
	props: { [string]: any },
	art: { id: string, aspect: number, label: { number }?, mask: string? },
	onClick: () -> ()
): ImageButton
	local b = Kit.make("ImageButton", {
		Name = props.Name,
		Size = props.Size,
		Position = props.Position,
		AnchorPoint = props.AnchorPoint,
		BackgroundTransparency = 1,
		Image = art.id,
		ScaleType = Enum.ScaleType.Fit,
		LayoutOrder = props.LayoutOrder or 0,
		ZIndex = props.ZIndex or 1,
		Parent = props.Parent,
	}, { Kit.make("UIAspectRatioConstraint", { AspectRatio = art.aspect }) })
	-- Live label in the art's label box: white Luckiest Guy, ink outline, ink drop shadow.
	local area = art.label
	if props.Label and area then
		local box = Kit.make("Frame", {
			Name = "LabelBox",
			BackgroundTransparency = 1,
			Position = UDim2.fromScale(area[1], area[2]),
			Size = UDim2.fromScale(area[3] - area[1], area[4] - area[2]),
			ZIndex = (props.ZIndex or 1) + 1,
			Parent = b,
		})
		local labels: { TextLabel } = {}
		for _, shadow in { true, false } do
			local t = Kit.text({
				Name = if shadow then "LabelShadow" else "Label",
				Text = props.Label,
				Font = Enum.Font.LuckiestGuy,
				TextColor3 = if shadow then Kit.colors.stroke else Color3.new(1, 1, 1),
				Size = UDim2.fromScale(1, 1),
				Position = if shadow then UDim2.fromScale(0, 0.09) else UDim2.new(),
				max = props.LabelMax or 60,
				strokeSize = 3,
				ZIndex = (props.ZIndex or 1) + (if shadow then 1 else 2),
				Parent = box,
			})
			t.TextYAlignment = Enum.TextYAlignment.Center
			table.insert(labels, t)
		end
		-- One line, as large as the box allows (never below 21 design px, which is 12 px on a phone).
		-- TextScaled would wrap "GO VIRAL" on phones; with wrapping off it under-sizes on PC.
		-- Sized from the button's design size (its offsets), so hover and press bounces never re-fit it.
		local design: UDim2 = props.Size
		local w = design.X.Offset * (area[3] - area[1])
		local h = math.min(design.Y.Offset, design.X.Offset / art.aspect) * (area[4] - area[2])
		local size = math.min(props.LabelMax or 60, math.floor(h * 0.9))
		while size > 21 do
			local bounds =
				TextService:GetTextSize(props.Label, size, Enum.Font.LuckiestGuy, Vector2.new(1e4, 1e4))

			if bounds.X <= w * 0.96 then
				break
			end
			size -= 1
		end
		for _, t in labels do
			t.TextScaled = false
			t.TextWrapped = false
			t.TextSize = size
			-- The fit above is done in design px. Kit.text's MinTextSize (21) clamps in screen px after the
			-- UIScale, which blew launcher labels up 1.7x on phones and over their icons.
			local constraint = t:FindFirstChildOfClass("UITextSizeConstraint")
			if constraint then
				constraint:Destroy()
			end
		end
	end
	-- Shine: a soft white band sweeps across the face, drawn through a white mask of the plate so
	-- it never spills past the outline. Every `props.Shine` seconds, and on hover. Off under Reduced Motion.
	local sweep: (() -> ())? = nil
	if art.mask then
		local shine = Kit.make("ImageLabel", {
			Name = "Shine",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			Image = art.mask,
			ScaleType = Enum.ScaleType.Fit,
			ImageTransparency = 1,
			ZIndex = (props.ZIndex or 1) + 1,
			Parent = b,
		})
		local grad = Kit.make("UIGradient", {
			Rotation = 20,
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 1),
				NumberSequenceKeypoint.new(0.42, 1),
				NumberSequenceKeypoint.new(0.5, 0.45),
				NumberSequenceKeypoint.new(0.58, 1),
				NumberSequenceKeypoint.new(1, 1),
			}),
			Offset = Vector2.new(-1, 0),
			Parent = shine,
		})
		local running = false
		sweep = function()
			if running or Kit.reduced() then
				return
			end
			running = true
			shine.ImageTransparency = 0
			grad.Offset = Vector2.new(-1, 0)
			local t = TweenService:Create(
				grad,
				TweenInfo.new(0.7, Enum.EasingStyle.Sine),
				{ Offset = Vector2.new(1, 0) }
			)
			t.Completed:Once(function()
				shine.ImageTransparency = 1
				running = false
			end)
			t:Play()
		end
		if props.Shine then
			task.spawn(function()
				while b.Parent do
					task.wait(props.Shine)
					if b.Visible then
						(sweep :: () -> ())()
					end
				end
			end)
		end
	end

	local scale = Kit.make("UIScale", { Parent = b })
	local hovered, pulse = false, nil :: RBXScriptConnection?
	b.Activated:Connect(function()
		Kit.click()
		if not Kit.reduced() then
			scale.Scale = 0.9
			TweenService:Create(scale, TweenInfo.new(0.18, Enum.EasingStyle.Back), { Scale = 1 }):Play()
		end
		onClick()
	end)
	b.MouseEnter:Connect(function()
		hovered = true
		if not Kit.reduced() then
			TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1.05 }):Play()
			if sweep then
				sweep()
			end
		end
	end)
	b.MouseLeave:Connect(function()
		hovered = false
		TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1 }):Play()
	end)
	-- Attribute "Pulse" = true makes the button breathe (used for POST when the drive is full).
	b:GetAttributeChangedSignal("Pulse"):Connect(function()
		local on = b:GetAttribute("Pulse") == true
		if on and not pulse then
			local t0 = os.clock()
			pulse = RunService.RenderStepped:Connect(function()
				if not hovered and not Kit.reduced() then
					scale.Scale = 1 + 0.05 * math.abs(math.sin((os.clock() - t0) * 4))
				end
			end)
		elseif not on and pulse then
			pulse:Disconnect()
			pulse = nil
			scale.Scale = 1
		end
	end)
	return b
end

function Kit.tween(inst: Instance, time: number, goal: { [string]: any })
	if Kit.reduced() then
		for k, v in goal do
			(inst :: any)[k] = v
		end
		return
	end
	TweenService:Create(inst, TweenInfo.new(time, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), goal)
		:Play()
end

return Kit
