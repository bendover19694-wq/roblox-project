--!strict
-- Generates each night's rules and the ships that are tested against them. Pure: no Roblox APIs.
-- Invariants (tests/RuleGrammar.spec.luau):
--   * every rule set is satisfiable
--   * an attribute is used by at most one rule (no contradictions, easy to read)
--   * real ships pass every rule; mimics break at least one

local Ships = require(script.Parent.Config.Ships)
local Rng = require(script.Parent.Rng)

type Rng = Rng.Rng
export type Ship = { [string]: any }
export type Rule = {
	kind: string, -- "require" | "forbid" | "pair"
	attr: string,
	value: any,
	ifAttr: string?, -- pair only: "if ifAttr is ifValue then attr must be value"
	ifValue: any,
}

local RuleGrammar = {}

function RuleGrammar.passes(ship: Ship, rule: Rule): boolean
	if rule.kind == "require" then
		return ship[rule.attr] == rule.value
	elseif rule.kind == "forbid" then
		return ship[rule.attr] ~= rule.value
	end
	return ship[rule.ifAttr :: string] ~= rule.ifValue or ship[rule.attr] == rule.value
end

function RuleGrammar.brokenRule(ship: Ship, rules: { Rule }): number?
	for i, rule in rules do
		if not RuleGrammar.passes(ship, rule) then
			return i
		end
	end
	return nil
end

function RuleGrammar.isLegal(ship: Ship, rules: { Rule }): boolean
	return RuleGrammar.brokenRule(ship, rules) == nil
end

function RuleGrammar.otherValue(rng: Rng, attr: string, avoid: any): any
	local options = {}
	for _, v in Ships.attrs[attr] do
		if v ~= avoid then
			table.insert(options, v)
		end
	end
	return rng:pick(options)
end

function RuleGrammar.randomShip(rng: Rng): Ship
	local ship = {}
	for _, attr in Ships.order do
		ship[attr] = rng:pick(Ships.attrs[attr])
	end
	return ship
end

-- Nudge a ship until it passes every rule. Each attribute has at most one rule, so this converges.
function RuleGrammar.makeLegal(rng: Rng, ship: Ship, rules: { Rule }): Ship?
	local s = table.clone(ship)
	for _ = 1, 20 do
		local i = RuleGrammar.brokenRule(s, rules)
		if not i then
			return s
		end
		local r = rules[i]
		if r.kind == "forbid" then
			s[r.attr] = RuleGrammar.otherValue(rng, r.attr, r.value)
		elseif r.kind == "pair" and rng:next() < 0.5 then
			-- dodge the pair's condition instead of meeting its consequence
			s[r.ifAttr :: string] = RuleGrammar.otherValue(rng, r.ifAttr :: string, r.ifValue)
		else
			s[r.attr] = r.value
		end
	end
	return nil
end

local function candidate(rng: Rng, tier: number): Rule
	local attrs = Ships.ruleAttrs[tier]
	local kind = rng:pick(Ships.ruleKinds[tier])
	local attr = rng:pick(attrs)
	local value = rng:pick(Ships.attrs[attr])
	if kind ~= "pair" then
		return { kind = kind, attr = attr, value = value }
	end
	local ifAttr = attr
	while ifAttr == attr do
		ifAttr = rng:pick(attrs)
	end
	return {
		kind = kind,
		attr = attr,
		value = value,
		ifAttr = ifAttr,
		ifValue = rng:pick(Ships.attrs[ifAttr]),
	}
end

local function uses(rule: Rule, attr: string?): boolean
	return attr ~= nil and (rule.attr == attr or rule.ifAttr == attr)
end

-- Returns a new list with one more rule, or nil if no compatible rule was found.
function RuleGrammar.addRule(rng: Rng, rules: { Rule }, tier: number): { Rule }?
	for _ = 1, 50 do
		local c = candidate(rng, tier)
		local clash = false
		for _, r in rules do
			if uses(r, c.attr) or uses(r, c.ifAttr) then
				clash = true
				break
			end
		end
		if not clash then
			local nextRules = table.clone(rules)
			table.insert(nextRules, c)
			if RuleGrammar.makeLegal(rng, RuleGrammar.randomShip(rng), nextRules) then
				return nextRules
			end
		end
	end
	return nil
end

-- A real ship passes every rule; a mimic is a real ship with exactly one rule broken (a near miss).
-- SECURITY: `mimic` must never be replicated to clients.
function RuleGrammar.makeShip(rng: Rng, rules: { Rule }, wantMimic: boolean): Ship
	local ship: Ship? = nil
	for _ = 1, 10 do
		ship = RuleGrammar.makeLegal(rng, RuleGrammar.randomShip(rng), rules)
		if ship then
			break
		end
	end
	assert(ship, "rules are unsatisfiable")
	ship.mimic = false
	if not wantMimic or #rules == 0 then
		return ship
	end
	local r = rng:pick(rules)
	if r.kind == "require" then
		ship[r.attr] = RuleGrammar.otherValue(rng, r.attr, r.value)
	elseif r.kind == "forbid" then
		ship[r.attr] = r.value
	else
		ship[r.ifAttr :: string] = r.ifValue
		ship[r.attr] = RuleGrammar.otherValue(rng, r.attr, r.value)
	end
	ship.mimic = true
	return ship
end

local function valueWord(value: any): string
	local word = tostring(value)
	local glyph = Ships.glyph[word]
	word = word:sub(1, 1):upper() .. word:sub(2)
	return if glyph then `{glyph} {word}` else word
end

local function phrase(attr: string, value: any): string
	if value == "none" then
		return `no {Ships.attrLabel[attr]}`
	elseif attr == "blinks" then
		return `{value} lantern blink{if value == 1 then "" else "s"}`
	end
	return `{valueWord(value)} {Ships.attrLabel[attr]}`
end

-- Player-facing text for the Rules Board. `ok` = this is what a real ship looks like.
function RuleGrammar.describe(rule: Rule): { text: string, ok: boolean, color: string? }
	local kind: string = rule.kind
	local color = if rule.attr == "flag" or rule.attr == "hull" then rule.value else nil
	local label = Ships.attrLabel[rule.attr]
	if kind == "require" then
		local text = if rule.value == "none" then `No {label}` else `Only {phrase(rule.attr, rule.value)}`
		return { text = text, ok = true, color = color }
	elseif kind == "forbid" then
		local text = if rule.value == "none"
			then `Must have a {label}`
			else `No {phrase(rule.attr, rule.value)}`
		return { text = text, ok = rule.value == "none", color = color }
	end
	return {
		text = `{phrase(rule.ifAttr :: string, rule.ifValue)} → {phrase(rule.attr, rule.value)}`,
		ok = true,
		color = color,
	}
end

return RuleGrammar
