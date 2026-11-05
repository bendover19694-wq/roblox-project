--!strict
-- Card appearance palettes. Counts are fixed by the schema (indices are saved); the ui role owns the colours.

local Looks = {}

Looks.skins = {
	Color3.fromRGB(255, 224, 189),
	Color3.fromRGB(241, 194, 125),
	Color3.fromRGB(224, 172, 105),
	Color3.fromRGB(198, 134, 66),
	Color3.fromRGB(141, 85, 36),
	Color3.fromRGB(94, 58, 28),
}
Looks.hairs = { "short", "crop", "curly", "long", "bun", "mohawk", "bald", "wavy", "braids", "side" }
Looks.hairColors = {
	Color3.fromRGB(20, 16, 14),
	Color3.fromRGB(60, 40, 28),
	Color3.fromRGB(110, 70, 38),
	Color3.fromRGB(176, 122, 58),
	Color3.fromRGB(222, 190, 110),
	Color3.fromRGB(170, 60, 40),
	Color3.fromRGB(150, 150, 156),
	Color3.fromRGB(60, 90, 170),
}
Looks.faces = { "round", "square", "long", "narrow", "wide", "soft" }
Looks.kits = {
	Color3.fromRGB(214, 48, 49),
	Color3.fromRGB(45, 104, 214),
	Color3.fromRGB(46, 160, 90),
	Color3.fromRGB(240, 190, 40),
	Color3.fromRGB(240, 240, 240),
	Color3.fromRGB(40, 40, 48),
	Color3.fromRGB(150, 60, 190),
	Color3.fromRGB(240, 120, 40),
}
Looks.crests = { "shield", "circle", "diamond", "star", "chevron", "hex" }

return Looks
