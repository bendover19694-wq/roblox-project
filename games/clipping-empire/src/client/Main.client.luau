--!strict
-- Client entry: renders server state, batches taps, runs the 3-step tutorial, and makes locked
-- gates solid for this player only. It never grants value; the server decides everything.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local Remotes = require(ReplicatedStorage.Shared.Remotes)
local Hud = require(script.Parent.Hud)
local Kit = require(script.Parent.Kit)

local pendingTaps = 0
local tutorialSent = false -- server state can lag one push behind the tutorialDone act
local state: any = nil
local hud

local function act(action: string, arg: any?)
	task.spawn(function()
		local ok, result, why = pcall(function()
			return Remotes.Act:InvokeServer(action, arg)
		end)
		if not ok then
			hud.toast("Connection hiccup. Try again", "error")
		elseif not result and why then
			hud.toast(why, "error")
		end
	end)
end

-- Device-aware wording: the same step reads "Tap" on touch, "Press R2" on a gamepad, "Click" on PC.
-- Follows the input the player is using right now (the kit reads PreferredInput), so one HUD rule for all.
local KitController = require(ReplicatedStorage:WaitForChild("LihFolkUI"):WaitForChild("LihFolkUIController"))
local function device(): string
	local input = KitController.preferredInput()
	return if input == "Touch" then "touch" elseif input == "Gamepad" then "pad" else "pc"
end
local WORDS = {
	clip = {
		touch = "Tap CLIP to record clips",
		pad = "Press R2 to record clips",
		pc = "Click CLIP or press E",
	},
	post = { touch = "Tap POST to sell clips", pad = "Press X to sell clips", pc = "Click POST or press Q" },
	full = { touch = "Drive full! Tap POST", pad = "Drive full! Press X", pc = "Drive full! Click POST" },
}

local lastFullToast = 0
local function tap()
	if not state then
		return
	end
	if state.clips >= state.capacity then
		if os.clock() - lastFullToast > 1.5 then
			lastFullToast = os.clock()
			hud.toast(WORDS.full[device()], "error")
		end
		return
	end
	pendingTaps += 1
	-- Show the clip right away; the next server state corrects any difference.
	state.clips = math.min(state.capacity, state.clips + state.tapPower)
	hud.updateClips(state)
	hud.float(`+{Format.short(state.tapPower)} clip`, Kit.colors.pink, 36)
end

local tutorial: () -> () -- defined below; the skip action calls it

hud = Hud.build({
	tap = tap,
	post = function()
		act("post")
	end,
	buy = function(id)
		act("buy", id)
	end,
	rebirth = function()
		act("rebirth")
	end,
	setting = function(name)
		act("setting", name)
	end,
	skipTutorial = function()
		tutorialSent = true
		act("tutorialDone", "skip")
		if state then
			state.tutorialSent = true
			hud.update(state)
			tutorial()
		end
	end,
})

-- Tutorial: three steps, each one verb and one target. Ends after the first upgrade.
function tutorial()
	if not state or state.tutorialDone or tutorialSent then
		local nextZone = Config.ZONES[(state and state.unlocked or 1) + 1]
		if nextZone and state then
			hud.objective(
				`Next setup: {Format.short(state.followers)} / {Format.short(nextZone.followers)} followers`,
				nil
			)
		else
			hud.objective(nil, nil)
		end
		return
	end
	local goal = math.min(10, state.capacity)
	local cost = state.costs.tapPower
	local d = device()
	if state.levels.tapPower > 0 then
		tutorialSent = true
		act("tutorialDone")
		hud.toast("Nice! Followers open new setups", "info")
		tutorial()
	elseif state.cash >= cost then
		hud.objective("Buy Tap Power in Upgrades", "Upgrades")
	elseif state.clips >= goal or (state.cash > 0 and state.clips > 0) then
		hud.objective(WORDS.post[d], "Post")
	else
		hud.objective(WORDS.clip[d], "Clip")
	end
end

-- Locked gates are solid and lit for this player only.
local world: Instance? = nil -- set once the server has built the street (see end of file)
local function gates()
	if not state or not world then
		return
	end
	for i = 2, #Config.ZONES do
		local g = world:FindFirstChild(`Gate{i}`)
		-- lihfolk-ignore: findfirstchild-chain (nil-checked below)
		local wall = g and g:FindFirstChild("Wall") :: BasePart?
		if wall then
			local locked = i > state.unlocked
			wall.CanCollide = locked
			wall.Transparency = if locked then 0.2 else 1
			-- lihfolk-ignore: findfirstchild-chain (nil-checked below)
			local lock = wall:FindFirstChild("Lock") :: BillboardGui?
			if lock then
				lock.Enabled = locked
			end
		end
	end
end

Remotes.State.OnClientEvent:Connect(function(view)
	local first = state == nil
	state = view
	state.tutorialSent = tutorialSent
	state.clips = math.min(state.capacity, state.clips + pendingTaps * state.tapPower) -- taps not yet sent
	hud.update(state)
	tutorial()
	gates()
	if first then
		hud.toast(`Clip the {Config.HYPE_GAME} hype!`, "info")
	end
end)

Remotes.Toast.OnClientEvent:Connect(function(text, kind)
	hud.toast(text, kind)
end)

Remotes.Celebrate.OnClientEvent:Connect(function(kind, data)
	if kind == "post" then
		Kit.cash()
		if data.viral then
			Kit.big()
			hud.float(`VIRAL! x{Config.VIRAL_MULT}  +{Format.money(data.cash)}`, Kit.colors.gold, 64)
		else
			hud.float(
				if data.followers >= 1
					then `+{Format.money(data.cash)}   +{Format.short(data.followers)} followers`
					else `+{Format.money(data.cash)}`, -- fractional followers still count, just not shown
				Kit.colors.green,
				44
			)
		end
	elseif kind == "clip" then
		-- Server-rolled rarity of the best clip in a batch. Only a known tier index is shown.
		if type(data) == "table" and Config.RARITIES[data.tier] then
			hud.reveal(data.tier, data.isNew == true)
		end
	elseif kind == "zone" then
		Kit.big()
		local z = Config.ZONES[data.index]
		hud.toast(`{z.name} open! Clips pay x{z.mult}`, "hype")
	elseif kind == "rebirth" then
		Kit.big()
		hud.float(`YOU WENT VIRAL! Clout {data.clout}`, Kit.colors.purple, 60)
	end
end)

-- Taps leave in small batches; the server caps the count.
task.spawn(function()
	while true do
		task.wait(0.4)
		if pendingTaps > 0 then
			local n = math.min(pendingTaps, Config.TAP_BATCH_MAX)
			pendingTaps -= n
			Remotes.Tap:FireServer(n)
		end
	end
end)

-- Keyboard and gamepad: E / R2 clip, Q / X post.
UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	local k = input.KeyCode
	if k == Enum.KeyCode.E or k == Enum.KeyCode.ButtonR2 then
		tap()
	elseif k == Enum.KeyCode.Q or k == Enum.KeyCode.ButtonX then
		act("post")
	end
end)

-- Hype countdown ticks locally between server states (the server clock is the truth).
task.spawn(function()
	while true do
		task.wait(1)
		if state and state.hypeLeft > 0 then
			state.hypeLeft -= 1
			hud.update(state)
		end
	end
end)

task.spawn(function()
	world = workspace:WaitForChild("World")
	gates()
end)
