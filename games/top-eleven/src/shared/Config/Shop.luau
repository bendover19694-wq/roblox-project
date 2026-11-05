--!strict
-- Shop catalogue PROPOSAL. Nothing here is live: productId/passId are 0 until the owner approves AND creates them in the
-- private test place. Policy: research/monetization-policy.md. No paid random items, no coins for Robux, no paid rating/power.
-- Copy is neutral: no countdowns, no "sale", no "limited" unless a true end date is added later. The shop never auto-opens.
-- kind: "pass" = one-time, "product" = repeatable developer product (all fulfilled by the one ProcessReceipt, key R_{UserId}_{PurchaseId}).
-- tab: "Looks" or "Helpers" (max 2 tabs, Shop.tabs). does/doesNot: one plain line each, max 60 chars, no hype.
-- All grants are cosmetic or convenience; indices point into Config/Looks.luau and are set by the ui role.

local Shop = {}

Shop.tabs = { "Looks", "Helpers" }

Shop.items = {
	{
		id = "kitPatterns",
		kind = "pass",
		robux = 199,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Kit Patterns",
		does = "Adds stripe, hoop and sash patterns for your kit.",
		doesNot = "Does not change player ratings or match results.",
		grants = { cosmetic = "kitPatterns" },
	},
	{
		id = "crestFrames",
		kind = "pass",
		robux = 149,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Crest Frames",
		does = "Adds decorative frames around your crest.",
		doesNot = "Does not change anything in matches.",
		grants = { cosmetic = "crestFrames" },
	},
	{
		id = "stadiumColours",
		kind = "pass",
		robux = 149,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Stadium Colours",
		does = "Lets you recolour your stands and pitch stripes.",
		doesNot = "Does not change anything in matches.",
		grants = { cosmetic = "stadiumColours" },
	},
	{
		id = "officeDeluxe",
		kind = "pass",
		robux = 249,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Office Decor",
		does = "Adds a trophy shelf and decor slots to your office.",
		doesNot = "Does not change anything in matches.",
		grants = { cosmetic = "officeDeluxe" },
	},
	{
		id = "autoLineup",
		kind = "pass",
		robux = 99,
		approve = "APPROVE",
		passId = 0,
		tab = "Helpers",
		name = "Auto-Lineup",
		does = "Picks your best eleven in one tap, using the rules you see.",
		doesNot = "Does not raise ratings or change match odds.",
		grants = { convenience = "autoLineup" },
	},
	{
		id = "seasonPass",
		kind = "pass",
		robux = 399,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Season Pass",
		does = "Adds a cosmetic reward track to the season.",
		doesNot = "Does not lock free rewards or change matches.",
		grants = { cosmetic = "seasonTrackPremium" },
		-- Premium track is a superset of the free track, cosmetics only. Needs a true season end date before it can be offered.
	},
	{
		id = "confetti",
		kind = "product",
		robux = 25,
		approve = "APPROVE",
		productId = 0,
		tab = "Looks",
		name = "Goal Confetti",
		does = "Gives 5 confetti bursts to play on your goals.",
		doesNot = "Does not change anything in matches.",
		grants = { cosmeticConsumable = "confetti", count = 5 },
	},
	{
		id = "chantPack",
		kind = "pass",
		robux = 35,
		approve = "APPROVE",
		passId = 0,
		tab = "Looks",
		name = "Chant Pack",
		does = "Adds three crowd chants to your stadium.",
		doesNot = "Does not change anything in matches.",
		grants = { cosmetic = "chantPack" },
	},
}

-- Considered and rejected (do not build):
Shop.rejected = {
	"Player packs, scouting boxes, youth-intake rolls or any paid random item (paid random item policy)",
	"Coins, transfer budget or any currency for Robux",
	"Paid ratings, training boosts, extra squad slots, bigger transfer odds (paid power; decisions.md T-005)",
	"2x sim speed: matches pay out on real time, so faster sim is faster earning. Treat as paid power; NEEDS OWNER if wanted",
	"Fixed-stock or countdown 'limited' items at launch",
}

return Shop
