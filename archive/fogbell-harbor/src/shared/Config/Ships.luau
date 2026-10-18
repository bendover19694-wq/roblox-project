--!strict
-- Ship attribute space. Adding a value here needs a builder case in ShipService and a label below.

local COLORS = { "red", "blue", "yellow", "green", "white", "black" }

return {
	attrs = {
		flag = COLORS,
		hull = COLORS,
		sail = { "square", "triangle", "round" },
		blinks = { 1, 2, 3, 4 },
		figurehead = { "none", "fish", "bird", "star" },
	} :: { [string]: { any } },

	-- Fixed iteration order (dictionary order is not deterministic).
	order = { "flag", "hull", "sail", "blinks", "figurehead" },

	-- What rules may target, by difficulty tier (tier = tide in the prototype).
	ruleAttrs = {
		{ "flag", "hull", "sail" },
		{ "flag", "hull", "sail", "blinks", "figurehead" },
		{ "flag", "hull", "sail", "blinks", "figurehead" },
	},
	ruleKinds = {
		{ "require", "forbid" },
		{ "require", "forbid" },
		{ "require", "forbid", "pair" },
	},

	-- Colour never carries meaning alone: each colour has a unique flag pattern (colourblind support).
	rgb = {
		red = { 222, 64, 52 },
		blue = { 46, 111, 200 },
		yellow = { 240, 196, 40 },
		green = { 63, 179, 127 },
		white = { 240, 236, 228 },
		black = { 30, 32, 38 },
	},
	pattern = {
		red = "cross",
		blue = "stripe",
		yellow = "dot",
		green = "plain",
		white = "border",
		black = "diagonal",
	},

	-- Player-facing words.
	attrLabel = {
		flag = "flag",
		hull = "hull",
		sail = "sail",
		blinks = "lantern",
		figurehead = "figurehead",
	},
	glyph = {
		square = "■",
		triangle = "▲",
		round = "●",
		none = "∅",
		fish = "🐟",
		bird = "🐦",
		star = "★",
	},
}
