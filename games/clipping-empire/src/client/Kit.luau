--!strict
-- Theme and small UI builders. Every screen is made from these.

local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")
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

-- A button drawn by an uploaded image (the art already has its outline, lip and text).
-- Same press bounce and click sound as Kit.button; Selectable for gamepad focus.
function Kit.imageButton(
	props: { [string]: any },
	art: { id: string, aspect: number },
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
	local scale = Kit.make("UIScale", { Parent = b })
	b.Activated:Connect(function()
		Kit.click()
		if not Kit.reduced() then
			scale.Scale = 0.9
			TweenService:Create(scale, TweenInfo.new(0.18, Enum.EasingStyle.Back), { Scale = 1 }):Play()
		end
		onClick()
	end)
	b.MouseEnter:Connect(function()
		if not Kit.reduced() then
			TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1.04 }):Play()
		end
	end)
	b.MouseLeave:Connect(function()
		TweenService:Create(scale, TweenInfo.new(0.12), { Scale = 1 }):Play()
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
