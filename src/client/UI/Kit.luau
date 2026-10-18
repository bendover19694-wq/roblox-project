--!strict
-- Small component kit. Every screen is built from these so the game looks like one system.

local TweenService = game:GetService("TweenService")

local Icons = require(script.Parent.Icons)
local Motion = require(script.Parent.Motion)
local Sounds = require(script.Parent.Sounds)
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

-- Rounded corners. With `corners`, each side gets its own radius (a missing side uses r, or 0 when r is nil).
function Kit.corner(r: number?, corners: { tl: number?, tr: number?, br: number?, bl: number? }?): any
	local u = Kit.new("UICorner", { CornerRadius = UDim.new(0, r or Theme.radius.card) })
	if corners then
		local base = r or 0
		u.TopLeftRadius = UDim.new(0, corners.tl or base)
		u.TopRightRadius = UDim.new(0, corners.tr or base)
		u.BottomRightRadius = UDim.new(0, corners.br or base)
		u.BottomLeftRadius = UDim.new(0, corners.bl or base)
	end
	return u
end

-- Soft drop shadow behind a rounded GuiObject.
function Kit.shadow(parent: Instance, depth: number?): any
	return Kit.new("UIShadow", {
		Color = Theme.shadow,
		Transparency = 0.6,
		Offset = UDim2.fromOffset(0, depth or 6),
		BlurRadius = UDim.new(0, 14),
		Mode = Enum.ApplyShadowMode.Shape,
		ShowBehindParent = true,
		Parent = parent,
	})
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

-- White rounded card with a soft shadow. Pass props.NoShadow = true to skip the shadow.
function Kit.card(props: { [string]: any }?, children: { any }?): any
	local f = Kit.new("Frame", { BackgroundColor3 = Theme.white }, children)
	Kit.corner().Parent = f
	local shadow = true
	for k, v in (props or {}) :: { [string]: any } do
		if k == "NoShadow" then
			shadow = not v
		else
			(f :: any)[k] = v
		end
	end
	if shadow then
		Kit.shadow(f)
	end
	return f
end

-- Small pill with optional leading icon.
function Kit.chip(text: string, fg: Color3, bg: Color3, size: number?, icon: string?): any
	local f = Kit.new("Frame", {
		BackgroundColor3 = bg,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, (size or 14) + 12),
	}, {
		Kit.corner(8),
		Kit.pad(8, 0),
		Kit.text(text, size or 14, Theme.bold, fg, {
			LayoutOrder = 2,
			AutomaticSize = Enum.AutomaticSize.X,
			Size = UDim2.fromScale(0, 1),
			TextTruncate = Enum.TextTruncate.None,
		}),
	})
	if icon then
		Kit.list(5, true).Parent = f
		local ic = Icons.make(icon, size or 14, fg)
		ic.LayoutOrder = 1
		ic.Parent = f
	end
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
	icon: string?,
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
	if o.icon then
		-- icon sits just left of the centred text; padding keeps the pair centred
		local isz = math.floor((o.textSize or 20) * 1.1)
		local pad = isz + 8
		Kit.new("UIPadding", { PaddingLeft = UDim.new(0, pad), Parent = face })
		local ic = Icons.make(o.icon, isz, face.TextColor3)
		ic.AnchorPoint = Vector2.new(0, 0.5)
		ic.Parent = face
		local function place()
			-- The padding moves the child origin too: the text's left edge sits at 0.5 + pad / 2 - tb / 2 of the
			-- face, which is (0.5, -tb / 2) in the padded box, so the icon goes one `pad` further left.
			-- TextBounds comes back in screen pixels (after every UIScale above); offsets are design pixels.
			local tb = face.TextBounds.X / Kit.totalScale(face)
			ic.Position = UDim2.new(0.5, -(tb / 2 + pad), 0.5, 0)
		end
		face:GetPropertyChangedSignal("TextBounds"):Connect(place)
		place()
	end
	if not o.disabled then
		Motion.press(face, base)
		face.Activated:Connect(function()
			Sounds.play("tap")
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
	Motion.press(b)
	b.Activated:Connect(function()
		Sounds.play("tap")
		onClick()
	end)
	return b
end

-- Draws `glyph` centred in `parent`: a drawn icon when the name is one, else the text itself (old callers).
local function centreGlyph(parent: GuiObject, glyph: string, size: number, color: Color3, textScale: number)
	if Icons.has(glyph) then
		local ic = Icons.make(glyph, math.floor(size * 0.55), color)
		ic.AnchorPoint = Vector2.new(0.5, 0.5)
		ic.Position = UDim2.fromScale(0.5, 0.5)
		ic.Parent = parent
	else
		Kit.text(glyph, math.floor(size * textScale), Theme.bold, color, {
			Size = UDim2.fromScale(1, 1),
			TextXAlignment = Enum.TextXAlignment.Center,
			Parent = parent,
		})
	end
end

-- Small round icon button (close, settings...). `glyph` is an Icons name.
function Kit.iconButton(glyph: string, onClick: () -> (), size: number?, bg: Color3?, fg: Color3?): TextButton
	local sz = size or 44
	local b = Kit.new("TextButton", {
		BackgroundTransparency = 0,
		BackgroundColor3 = bg or Theme.soft,
		Size = UDim2.fromOffset(sz, sz),
		Text = if Icons.has(glyph) then "" else glyph,
		TextSize = math.floor(sz * 0.45),
		FontFace = Theme.bold,
		TextColor3 = fg or Theme.muted,
	}, { Kit.round() })
	if Icons.has(glyph) then
		centreGlyph(b, glyph, sz, fg or Theme.muted, 0.45)
	end
	Motion.press(b)
	b.Activated:Connect(function()
		Sounds.play("tap")
		onClick()
	end)
	return b
end

function Kit.iconCircle(glyph: string, bg: Color3, size: number?, fg: Color3?): any
	local sz = size or 48
	local f = Kit.new("Frame", { BackgroundColor3 = bg, Size = UDim2.fromOffset(sz, sz) }, { Kit.corner(14) })
	centreGlyph(f, glyph, sz, fg or Theme.white, 0.5)
	return f
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

-- Product of every UIScale on `obj` and its ancestors: screen pixels per design pixel.
function Kit.totalScale(obj: Instance): number
	local total = 1
	local node: Instance? = obj
	while node do
		local sc = node:FindFirstChildOfClass("UIScale")
		if sc then
			total *= sc.Scale
		end
		node = node.Parent
	end
	return math.max(total, 0.01)
end

-- Screen pixels per design pixel for anything inside the HUD canvas (its UIScale).
function Kit.canvasScale(obj: Instance): number
	local canvas = obj:FindFirstAncestor("Canvas") or obj
	local s = canvas:FindFirstChildOfClass("UIScale")
	return if s then s.Scale else 1
end

-- Aliases kept so older callers compile; the real versions live in Motion.
function Kit.reducedMotion(): boolean
	return Motion.reduced()
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

function Kit.popIn(obj: GuiObject)
	Motion.pop(obj)
end

-- Faint horizontal scanlines over `parent` (a console readout texture). Call it before adding the parent's
-- content so the lines sit underneath it.
function Kit.grid(parent: GuiObject): Frame
	local pts = { NumberSequenceKeypoint.new(0, 1) }
	local lines = 6
	for i = 1, lines do
		local t = (i - 0.5) / lines
		table.insert(pts, NumberSequenceKeypoint.new(t - 0.012, 1))
		table.insert(pts, NumberSequenceKeypoint.new(t, 0.8))
		table.insert(pts, NumberSequenceKeypoint.new(t + 0.012, 1))
	end
	table.insert(pts, NumberSequenceKeypoint.new(1, 1))
	local g = Kit.new("Frame", {
		Name = "Grid",
		Active = false,
		BackgroundColor3 = Theme.gridLine,
		Size = UDim2.fromScale(1, 1),
		ZIndex = parent.ZIndex,
		Parent = parent,
	}, { Kit.new("UIGradient", { Rotation = 90, Transparency = NumberSequence.new(pts) }) })
	local pc = parent:FindFirstChildOfClass("UICorner")
	if pc then
		pc:Clone().Parent = g
	end
	return g
end

-- Console readout band for the top of a card or panel: cyan icon, white display title, mono subtitle.
function Kit.header(icon: string, title: string, sub: string?): Frame
	local f = Kit.new("Frame", {
		Name = "Header",
		BackgroundColor3 = Theme.navy3,
		Size = UDim2.new(1, 0, 0, 92),
	}, { Kit.corner(nil, { tl = 18, tr = 18 }) })
	Kit.grid(f)
	local ic = Icons.make(icon, 44, Theme.cyan)
	ic.AnchorPoint = Vector2.new(0, 0.5)
	ic.Position = UDim2.fromOffset(24, 46)
	ic.Parent = f
	Kit.text(title, 26, Theme.display, Theme.white, {
		Position = UDim2.fromOffset(84, if sub then 16 else 29),
		Size = UDim2.new(1, -150, 0, 34),
		Parent = f,
	})
	if sub then
		Kit.text(sub, 14, Theme.monoRegular, Theme.cyanSoft, {
			Position = UDim2.fromOffset(84, 52),
			Size = UDim2.new(1, -150, 0, 22),
			Parent = f,
		})
	end
	return f
end

return Kit
