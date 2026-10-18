--!strict
-- Design tokens (docs/ui-motion-audit.md §3).

return {
	color = {
		ink = Color3.fromHex("0F1B2A"),
		paper = Color3.fromHex("F3EBDD"),
		brass = Color3.fromHex("C9A54A"),
		sea = Color3.fromHex("2E6F8E"),
		good = Color3.fromHex("3FB37F"),
		bad = Color3.fromHex("E0533D"),
		fog = Color3.fromHex("B8C4CC"),
		white = Color3.new(1, 1, 1),
	},
	font = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Regular),
	bold = Font.new("rbxasset://fonts/families/BuilderSans.json", Enum.FontWeight.Bold),
	text = { small = 14, body = 18, title = 24, big = 32 },
	space = { 4, 8, 12, 16, 24, 32, 48 },
	radius = { chip = 8, panel = 12 },
}
