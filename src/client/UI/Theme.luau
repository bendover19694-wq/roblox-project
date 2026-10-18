--!strict
-- Design tokens: light cards over a deep-space map (research/run-an-airline-study.md → our own palette).

local function hex(h: string): Color3
	return Color3.fromHex(h)
end

local function font(weight: Enum.FontWeight): Font
	return Font.new("rbxasset://fonts/families/BuilderSans.json", weight)
end

return {
	ink = hex("1B2333"),
	muted = hex("6B7488"),
	faint = hex("A3AABB"),
	line = hex("E6E9F0"),
	soft = hex("F3F5FA"),
	white = Color3.new(1, 1, 1),
	orange = hex("FF6B2C"),
	orangeDark = hex("D44E14"),
	green = hex("19B46B"),
	greenDark = hex("0E8A4F"),
	greenSoft = hex("E3F7EC"),
	blue = hex("2F6BFF"),
	blueDark = hex("1D4ED8"),
	blueSoft = hex("E8EFFF"),
	amber = hex("F5A524"),
	amberSoft = hex("FFF4DC"),
	red = hex("E5484D"),
	redSoft = hex("FDECEC"),
	navy = hex("0B1026"),
	navy2 = hex("1E1650"),
	navyCard = hex("141A3A"),
	regular = font(Enum.FontWeight.Regular),
	medium = font(Enum.FontWeight.Medium),
	bold = font(Enum.FontWeight.Bold),
	heavy = font(Enum.FontWeight.Heavy),
	radius = { card = 18, button = 14, chip = 10 },
}
