--!strict
-- The three menus (Upgrades, Go Viral, Settings) built with the LihFolk UI kit ("Ink and Candy",
-- vendor/LihFolkUI, CC BY 4.0 LihFolk Vault V2). The kit's controller owns fit, the 44 px touch floor,
-- open and close motion, one-menu-at-a-time, gamepad focus and ButtonB close.
-- Every button only asks the server; the numbers shown come from the server state.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Format = require(ReplicatedStorage.Shared.Format)
local UI = ReplicatedStorage:WaitForChild("LihFolkUI")
local Theme = require(UI:WaitForChild("LihFolkUITheme"))
local C = require(UI:WaitForChild("LihFolkUIComponents")) :: any -- kit props tables are invariant under strict mode
local Controller = require(UI:WaitForChild("LihFolkUIController"))

local Panels = {}

local CONFIRM_WINDOW = 3 -- seconds the rebirth "tap to confirm" state lasts

-- What an upgrade gives right now, in the unit its card names.
local function effectNow(id: string, s: any): string
	local lv = s.levels[id] or 0
	if id == "tapPower" then
		return `{Format.short(s.tapPower)}`
	elseif id == "clipSpeed" then
		return string.format("%.1f/s", s.autoRate)
	elseif id == "storage" then
		return Format.short(s.capacity)
	elseif id == "editing" then
		return `x{1 + lv * Config.EDIT_PER_LEVEL}`
	elseif id == "viral" then
		return `{math.floor(s.viralChance * 1000) / 10}%`
	end
	return if lv > 0 then "ON" else "OFF"
end

function Panels.build(actions: any)
	Controller.start()

	-- Upgrades --------------------------------------------------------------
	local upWindow = C.Window({
		name = "Upgrades",
		title = "Upgrades",
		theme = "codes",
		icon = "boost",
		size = Vector2.new(720, 430), -- short enough that the cash pill stays visible above it
	})
	type Row = { effect: TextLabel, level: TextLabel, buy: any }
	local rows: { [string]: Row } = {}
	local order = {}
	for id, up in Config.UPGRADES do
		table.insert(order, { id = id, up = up })
	end
	table.sort(order, function(a, b)
		return a.up.order < b.up.order
	end)
	for i, item in order do
		local id, up = item.id, item.up
		local card = C.Card({
			size = UDim2.new(1, -16, 0, 96),
			layout = "none",
			layoutOrder = i,
			parent = upWindow.body,
		})
		C.Text(
			"title",
			up.name,
			{ align = Enum.TextXAlignment.Left, size = UDim2.new(1, -230, 0, 32), parent = card.content }
		)
		local effect = C.Text("body", up.blurb, {
			align = Enum.TextXAlignment.Left,
			color = Theme.Palette.textMid,
			size = UDim2.new(1, -230, 0, 24),
			position = UDim2.fromOffset(0, 34),
			parent = card.content,
		})
		local level = C.Text("caption", "", {
			align = Enum.TextXAlignment.Left,
			color = Theme.Palette.textLow,
			size = UDim2.new(1, -230, 0, 20),
			position = UDim2.fromOffset(0, 58),
			parent = card.content,
		})
		local buy = C.Button({
			text = "",
			role = "go",
			icon = "cash",
			size = UDim2.fromOffset(210, Theme.Size.buttonH),
			position = UDim2.fromScale(1, 0.5),
			anchor = Vector2.new(1, 0.5),
			name = "Buy_" .. id,
			parent = card.content,
			onActivated = function()
				actions.buy(id)
			end,
		})
		rows[id] = { effect = effect, level = level, buy = buy }
	end
	Controller.register(upWindow)

	-- Go Viral (rebirth) ----------------------------------------------------
	local rbWindow = C.Window({
		name = "Rebirth",
		title = "Go Viral",
		theme = "rebirth",
		icon = "rebirth",
		size = Vector2.new(720, 440),
	})
	local compare = C.TierCompare({
		current = { title = "Clout 0", value = "x1" },
		nextTier = { title = "Clout 1", value = "x1.5" },
		theme = "rebirth",
		height = 120, -- short, so GO VIRAL stays above the fold on a phone
		layoutOrder = 1,
		window = rbWindow,
		parent = rbWindow.body,
	})
	local progress = C.ProgressBar({
		role = "premium",
		size = UDim2.new(1, -16, 0, 34),
		layoutOrder = 3,
		parent = rbWindow.body,
	})
	C.Text("caption", "Resets cash, clips and upgrades. Keeps followers, setups and Auto Poster.", {
		color = Theme.Palette.textMid,
		wrap = true,
		size = UDim2.new(1, -16, 0, 40),
		layoutOrder = 4,
		parent = rbWindow.body,
	})
	local confirming, confirmToken = false, 0
	local last: any = nil
	local rebirthButton: any
	local function refreshRebirth()
		local s = last
		if not s or confirming then
			return
		end
		rebirthButton.setState(if s.cash >= s.rebirthCost then "claim" else "locked")
	end
	rebirthButton = C.StateButton({
		state = "locked",
		texts = { claim = "GO VIRAL", locked = "NEED CASH", pending = "..." },
		size = UDim2.fromOffset(300, Theme.Size.buttonH),
		layoutOrder = 2, -- the one action stays above the fold on phones
		window = rbWindow,
		parent = rbWindow.body,
		onActivated = function(state)
			if state ~= "claim" then
				return
			end
			if not confirming then
				-- Anything that resets progress asks twice and says what resets (vault: Rebirth archetype).
				confirming = true
				confirmToken += 1
				local token = confirmToken
				rebirthButton.button.setRole("danger")
				rebirthButton.button.setText("TAP TO CONFIRM")
				task.delay(CONFIRM_WINDOW, function()
					if confirming and token == confirmToken then
						confirming = false
						rebirthButton.button.setRole("go")
						refreshRebirth()
					end
				end)
				return
			end
			confirming = false
			confirmToken += 1
			rebirthButton.button.setRole("go")
			rebirthButton.setState("pending")
			actions.rebirth()
		end,
	})
	rbWindow.defaultSelection = rebirthButton.button.hit
	Controller.register(rbWindow)

	-- Settings --------------------------------------------------------------
	local setWindow = C.Window({
		name = "Settings",
		title = "Settings",
		theme = "settings",
		icon = "settings",
		size = Vector2.new(640, 430),
	})
	local motionRow = C.SettingRow({
		label = "Reduced Motion",
		description = "Fewer pops and bounces",
		icon = "motion",
		value = false,
		layoutOrder = 1,
		parent = setWindow.body,
		onChanged = function()
			actions.setting("reducedMotion")
		end,
	})
	local soundRow = C.SettingRow({
		label = "Sound Effects",
		description = "Clicks and cash sounds",
		icon = "sound",
		value = true,
		layoutOrder = 2,
		parent = setWindow.body,
		onChanged = function()
			actions.setting("sound")
		end,
	})
	local skip = C.Button({
		text = "SKIP TUTORIAL",
		role = "neutral",
		size = UDim2.fromOffset(300, Theme.Size.buttonH),
		layoutOrder = 3,
		parent = setWindow.body,
		onActivated = actions.skipTutorial,
	})
	local saveText = C.Text("caption", "", {
		color = Theme.Palette.textLow,
		size = UDim2.new(1, -16, 0, 22),
		layoutOrder = 4,
		parent = setWindow.body,
	})
	local keys = C.Text("caption", "Keys: E clip, Q post. Gamepad: R2 clip, X post, B closes menus.", {
		color = Theme.Palette.textLow,
		wrap = true,
		size = UDim2.new(1, -16, 0, 40),
		layoutOrder = 5,
		parent = setWindow.body,
	})
	-- Phones have no keys, and the panel only fits four rows there.
	keys.Visible = game:GetService("UserInputService").KeyboardEnabled
		or game:GetService("UserInputService").GamepadEnabled
	setWindow.defaultSelection = motionRow.hit
	Controller.register(setWindow)

	-- Launchers live in Hud.luau (Antigravity image buttons) and open these windows via bindOpener.

	local api = {}
	api.bindOpener = Controller.bindOpener
	-- Returns true when at least one upgrade is affordable (Hud shows the badge).
	function api.update(s: any): boolean
		last = s
		local anyAffordable = false
		for id, row in rows do
			local up = Config.UPGRADES[id]
			local cost = s.costs[id]
			row.level.Text = `LV {s.levels[id] or 0} / {up.max}`
			row.effect.Text = `{up.blurb}: {effectNow(id, s)}`
			if cost < 0 then
				row.buy.setRole("done")
				row.buy.setText("MAXED")
				row.buy.setEnabled(false)
			elseif s.cash >= cost then
				anyAffordable = true
				row.buy.setRole("go")
				row.buy.setText(`BUY {Format.money(cost)}`)
				row.buy.setEnabled(true)
			else
				row.buy.setRole("locked") -- darker slab plus the word NEED, never hue alone
				row.buy.setText(`NEED {Format.money(cost)}`)
				row.buy.setEnabled(false)
			end
		end

		local function mult(c: number): string
			return "x" .. tostring(1 + Config.CLOUT_MULT * c)
		end
		compare.setTiers(
			{ title = `Clout {s.clout} cash`, value = mult(s.clout) },
			{ title = `Clout {s.clout + 1} cash`, value = mult(s.clout + 1) }
		)
		progress.setValue(math.clamp(s.cash / s.rebirthCost, 0, 1), Controller.isOpen("Rebirth"))
		progress.setText(`{Format.money(s.cash)} / {Format.money(s.rebirthCost)}`)
		refreshRebirth()

		motionRow.toggle.set(s.settings.reducedMotion, true)
		soundRow.toggle.set(s.settings.sound, true)
		Controller.setReducedMotion(s.settings.reducedMotion)
		skip.root.Visible = not s.tutorialDone and not s.tutorialSent
		saveText.Text = if s.canSave
			then "Progress saves automatically."
			else "Saving is off here (test server)."
		return anyAffordable
	end
	return api
end

return Panels
