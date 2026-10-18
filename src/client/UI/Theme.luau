--!strict
-- Design tokens. Mission Control look: light cards for readability, navy readout bands, cyan accents,
-- mono numerals, soft shadows and per-corner radii.

local function hex(h: string): Color3
	return Color3.fromHex(h)
end

local function font(weight: Enum.FontWeight): Font
	return Font.new("rbxasset://fonts/families/BuilderSans.json", weight)
end

local function family(name: string, weight: Enum.FontWeight): Font
	return Font.new("rbxasset://fonts/families/" .. name .. ".json", weight)
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
	navy3 = hex("0F1733"), -- readout band
	cyan = hex("2EE6D6"),
	cyanDark = hex("13A89C"),
	cyanSoft = hex("DDFBF8"),
	gridLine = hex("2A3566"),
	shadow = hex("050816"),
	regular = font(Enum.FontWeight.Regular),
	medium = font(Enum.FontWeight.Medium),
	bold = font(Enum.FontWeight.Bold),
	heavy = font(Enum.FontWeight.Heavy),
	display = family("BuilderExtended", Enum.FontWeight.Heavy),
	displayBold = family("BuilderExtended", Enum.FontWeight.Bold),
	mono = family("BuilderMono", Enum.FontWeight.Bold),
	monoRegular = family("BuilderMono", Enum.FontWeight.Regular),
	radius = { card = 18, button = 14, chip = 10, tab = 12, toast = 16, readout = 12 },
}
