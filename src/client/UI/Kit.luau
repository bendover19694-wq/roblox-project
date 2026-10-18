--!strict
-- Small component kit. Every screen is built from these so the game looks like one system.

local GuiService = game:GetService("GuiService")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Theme = require(script.Parent.Theme)

local Kit = {}

-- Generic constructor: Kit.new("Frame", { props }, { children })
function Kit.new(class: string, props: { [string]: any }?, children: { any }?): any
	local inst: any = Instance.new(class)
	if inst:IsA("GuiObject") then
		inst.BorderSizePixel = 0
	end
	if inst:IsA("TextLabel") or inst:IsA("TextButton") or inst:IsA("TextBox") then
		inst.FontFace = Theme.medium
		inst.TextColor3 = Theme.ink
		inst.TextSize = 18
		inst.BackgroundTransparency = 1
		inst.Text = ""
	end
	local parent = nil
	for k, v in (props or {}) :: { [string]: any } do
		if k == "Parent" then
			parent = v
		else
			inst[k] = v
		end
	end
	for _, c in (children or {}) :: { any } do
		c.Parent = inst
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end

function Kit.corner(r: number?): any
	return Kit.new("UICorner", { CornerRadius = UDim.new(0, r or Theme.radius.card) })
end

function Kit.round(): any
	return Kit.new("UICorner", { CornerRadius = UDim.new(1, 0) })
end

function Kit.stroke(color: Color3, thickness: number?, transparency: number?): any
	return Kit.new("UIStroke", {
		Color = color,
		Thickness = thickness or 1,
		Transparency = transparency or 0,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function Kit.pad(all: number, top: number?, bottom: number?): any
	return Kit.new("UIPadding", {
		PaddingLeft = UDim.new(0, all),
		PaddingRight = UDim.new(0, all),
		PaddingTop = UDim.new(0, top or all),
		PaddingBottom = UDim.new(0, bottom or top or all),
	})
end

function Kit.list(gap: number?, horizontal: boolean?, align: Enum.HorizontalAlignment?): any
	return Kit.new("UIListLayout", {
		Padding = UDim.new(0, gap or 8),
		FillDirection = if horizontal then Enum.FillDirection.Horizontal else Enum.FillDirection.Vertical,
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = align or Enum.HorizontalAlignment.Left,
		VerticalAlignment = if horizontal then Enum.VerticalAlignment.Center else Enum.VerticalAlignment.Top,
	})
end

function Kit.gradient(a: Color3, b: Color3, rotation: number?): any
	return Kit.new("UIGradient", { Color = ColorSequence.new(a, b), Rotation = rotation or 90 })
end

-- Text label with sensible defaults. size = font size; auto = automatic Y size for wrapped text.
function Kit.text(text: string, size: number?, font: Font?, color: Color3?, props: { [string]: any }?): any
	local t = Kit.new("TextLabel", {
		Text = text,
		TextSize = size or 18,
		FontFace = font or Theme.medium,
		TextColor3 = color or Theme.ink,
		TextXAlignment = Enum.TextXAlignment.Left,
		Size = UDim2.new(1, 0, 0, (size or 18) + 6),
		TextTruncate = Enum.TextTruncate.AtEnd,
		RichText = true,
	})
	for k, v in (props or {}) :: { [string]: any } do
		(t :: any)[k] = v
	end
	return t
end

function Kit.wrap(text: string, size: number?, color: Color3?): any
	return Kit.text(text, size, Theme.regular, color or Theme.muted, {
		TextWrapped = true,
		TextTruncate = Enum.TextTruncate.None,
		AutomaticSize = Enum.AutomaticSize.Y,
		Size = UDim2.fromScale(1, 0),
	})
end

-- White rounded card.
function Kit.card(props: { [string]: any }?, children: { any }?): any
	local f = Kit.new("Frame", { BackgroundColor3 = Theme.white }, children)
	Kit.corner().Parent = f
	for k, v in (props or {}) :: { [string]: any } do
		(f :: any)[k] = v
	end
	return f
end

function Kit.chip(text: string, fg: Color3, bg: Color3, size: number?): any
	local f = Kit.new("Frame", {
		BackgroundColor3 = bg,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, (size or 14) + 12),
	}, {
		Kit.corner(8),
		Kit.pad(8, 0),
		Kit.text(text, size or 14, Theme.bold, fg, {
			AutomaticSize = Enum.AutomaticSize.X,
			Size = UDim2.fromScale(0, 1),
			TextTruncate = Enum.TextTruncate.None,
		}),
	})
	return f
end

function Kit.bar(fraction: number, color: Color3, height: number?): any
	local f = Kit.new(
		"Frame",
		{ BackgroundColor3 = Theme.line, Size = UDim2.new(1, 0, 0, height or 8) },
		{ Kit.round() }
	)
	Kit.new("Frame", {
		Name = "Fill",
		BackgroundColor3 = color,
		Size = UDim2.fromScale(math.clamp(fraction, 0, 1), 1),
		Parent = f,
	}, { Kit.round() })
	return f
end

-- Chunky button with a darker base that the face presses into.
export type ButtonOpts = {
	text: string,
	color: Color3?,
	shade: Color3?,
	textColor: Color3?,
	size: UDim2?,
	textSize: number?,
	onClick: (() -> ())?,
	disabled: boolean?,
}
function Kit.button(o: ButtonOpts): any
	local color = o.color or Theme.orange
	local shade = o.shade or Theme.orangeDark
	if o.disabled then
		color, shade = Theme.line, Theme.faint
	end
	local base = Kit.new(
		"Frame",
		{ BackgroundColor3 = shade, Size = o.size or UDim2.new(1, 0, 0, 56) },
		{ Kit.corner(Theme.radius.button) }
	)
	local face = Kit.new("TextButton", {
		Name = "Face",
		BackgroundTransparency = 0,
		BackgroundColor3 = color,
		Size = UDim2.new(1, 0, 1, -4),
		Text = o.text,
		TextSize = o.textSize or 20,
		FontFace = Theme.heavy,
		TextColor3 = o.textColor or (if o.disabled then Theme.faint else Theme.white),
		AutoButtonColor = false,
		Parent = base,
	}, { Kit.corner(Theme.radius.button) })
	-- subtle top highlight
	Kit.new("UIGradient", {
		Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.fromRGB(225, 225, 225)),
		Rotation = 90,
		Parent = face,
	})
	if not o.disabled then
		face.MouseButton1Down:Connect(function()
			face.Position = UDim2.fromOffset(0, 3)
		end)
		face.MouseButton1Up:Connect(function()
			face.Position = UDim2.fromOffset(0, 0)
		end)
		face.MouseLeave:Connect(function()
			face.Position = UDim2.fromOffset(0, 0)
		end)
		face.Activated:Connect(function()
			if o.onClick then
				o.onClick()
			end
		end)
	end
	return base
end

-- Flat outline button (secondary actions).
function Kit.ghost(text: string, onClick: () -> (), size: UDim2?): TextButton
	local b = Kit.new("TextButton", {
		BackgroundTransparency = 0,
		BackgroundColor3 = Theme.white,
		Size = size or UDim2.new(1, 0, 0, 52),
		Text = text,
		FontFace = Theme.heavy,
		TextSize = 18,
		AutoButtonColor = true,
	}, { Kit.corner(Theme.radius.button), Kit.stroke(Theme.line, 2) })
	b.Activated:Connect(onClick)
	return b
end

-- Small round icon button (close, settings…).
function Kit.iconButton(glyph: string, onClick: () -> (), size: number?, bg: Color3?, fg: Color3?): TextButton
	local b = Kit.new("TextButton", {
		BackgroundTransparency = 0,
		BackgroundColor3 = bg or Theme.soft,
		Size = UDim2.fromOffset(size or 44, size or 44),
		Text = glyph,
		TextSize = math.floor((size or 44) * 0.45),
		FontFace = Theme.bold,
		TextColor3 = fg or Theme.muted,
	}, { Kit.round() })
	b.Activated:Connect(onClick)
	return b
end

function Kit.iconCircle(glyph: string, bg: Color3, size: number?, fg: Color3?): any
	return Kit.new("Frame", { BackgroundColor3 = bg, Size = UDim2.fromOffset(size or 48, size or 48) }, {
		Kit.corner(14),
		Kit.text(glyph, math.floor((size or 48) * 0.5), Theme.bold, fg or Theme.white, {
			Size = UDim2.fromScale(1, 1),
			TextXAlignment = Enum.TextXAlignment.Center,
		}),
	})
end

-- Segmented control: options = { {id, title, sub} }. Returns frame and a setter.
function Kit.segmented(options: { any }, selected: string, onChange: (string) -> ()): Frame
	local f = Kit.new("Frame", { BackgroundColor3 = Theme.soft, Size = UDim2.new(1, 0, 0, 64) }, {
		Kit.corner(14),
		Kit.pad(4),
		Kit.new("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			SortOrder = Enum.SortOrder.LayoutOrder,
			Padding = UDim.new(0, 4),
		}),
	})
	local buttons: { [string]: TextButton } = {}
	local function paint(id: string)
		for oid, b in buttons do
			local on = oid == id
			b.BackgroundTransparency = if on then 0 else 1
			do
				local it = b:FindFirstChild("Title") :: TextLabel
				it.TextColor3 = if on then Theme.blue else Theme.muted
			end
		end
	end
	for i, opt in options do
		local b = Kit.new("TextButton", {
			LayoutOrder = i,
			BackgroundColor3 = Theme.white,
			BackgroundTransparency = 1,
			Size = UDim2.new(1 / #options, -4, 1, 0),
			AutoButtonColor = false,
			Parent = f,
		}, { Kit.corner(11) })
		Kit.text(opt.title, 18, Theme.bold, Theme.muted, {
			Name = "Title",
			Size = UDim2.fromScale(1, 0.55),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = b,
		})
		if opt.sub then
			Kit.text(opt.sub, 14, Theme.medium, Theme.muted, {
				Position = UDim2.fromScale(0, 0.5),
				Size = UDim2.fromScale(1, 0.45),
				TextXAlignment = Enum.TextXAlignment.Center,
				Parent = b,
			})
		end
		buttons[opt.id] = b
		b.Activated:Connect(function()
			paint(opt.id)
			onChange(opt.id)
		end)
	end
	paint(selected)
	return f
end

-- Scrolling list body for panels and modals.
function Kit.scroller(props: { [string]: any }?): any
	local s = Kit.new("ScrollingFrame", {
		BackgroundTransparency = 1,
		Size = UDim2.fromScale(1, 1),
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollBarThickness = 6,
		ScrollBarImageColor3 = Theme.faint,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}, { Kit.list(12), Kit.pad(4, 4, 16) })
	for k, v in (props or {}) :: { [string]: any } do
		(s :: any)[k] = v
	end
	return s
end

-- Screen pixels per design pixel for anything inside the HUD canvas (its UIScale).
function Kit.canvasScale(obj: Instance): number
	local canvas = obj:FindFirstAncestor("Canvas") or obj
	local s = canvas:FindFirstChildOfClass("UIScale")
	return if s then s.Scale else 1
end

-- On if the player asked for it in our settings or in their device / Roblox settings.
function Kit.reducedMotion(): boolean
	return GuiService.ReducedMotionEnabled or Players.LocalPlayer:GetAttribute("ReducedMotion") == true
end

function Kit.tween(
	obj: Instance,
	seconds: number,
	props: { [string]: any },
	style: Enum.EasingStyle?,
	dir: Enum.EasingDirection?
): Tween
	local t = TweenService:Create(
		obj,
		TweenInfo.new(seconds, style or Enum.EasingStyle.Quad, dir or Enum.EasingDirection.Out),
		props
	)
	t:Play()
	return t
end

-- Pop-in for modals/cards (scale 0.9→1 + fade). Needs a UIScale; reduced motion = instant.
function Kit.popIn(obj: GuiObject)
	local scale = obj:FindFirstChildOfClass("UIScale") or Kit.new("UIScale", { Parent = obj })
	local rest: number = (obj:GetAttribute("FitScale") :: number?) or 1 -- modals shrink to fit short screens
	if Kit.reducedMotion() then
		scale.Scale = rest
		return
	end
	scale.Scale = rest * 0.92
	Kit.tween(scale, 0.25, { Scale = rest }, Enum.EasingStyle.Back)
end

return Kit
