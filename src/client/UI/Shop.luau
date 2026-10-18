--!strict
-- Full-screen shop (pattern from the airline study: big cards, a concrete example value, "Works/Lasts").
-- Products with id 0 are not live yet (unpublished place) and show "Coming soon".
-- Example values come from the player's own best mission, never from hardcoded numbers.

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Research = require(ReplicatedStorage.Shared.Research)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
local Motion = require(script.Parent.Motion)
local RocketView = require(script.Parent.RocketView)
local Theme = require(script.Parent.Theme)

local Shop = {}

local root: Frame
local prices: { [number]: number } = {}
local tourOn = false -- Nova's strip is showing, so phone cards drop their art to make room

-- Managed/regional pricing means players can see different prices: always show Roblox's live price.
local function livePrice(id: number, isPass: boolean): number?
	if prices[id] then
		return prices[id]
	end
	local ok, info = pcall(
		MarketplaceService.GetProductInfoAsync,
		MarketplaceService,
		id,
		if isPass then Enum.InfoType.GamePass else Enum.InfoType.Product
	)
	if ok and type(info) == "table" and type(info.PriceInRobux) == "number" then
		prices[id] = info.PriceInRobux
		return info.PriceInRobux
	end
	return nil
end

-- The player's most profitable active mission (or a kestrel to Low Earth Orbit before they have one):
-- one trip's profit, and how long a trip takes normally and with the launch-speed pass.
local function exampleTrip(): (number, number, number)
	local v = App.view
	local fx = Research.effects(v and v.research)
	local best: any = nil
	local bestProfit = -math.huge
	for _, m in if v then v.missions else {} do
		for _, r in v.rockets do
			if r.id == m.rocket then
				local profit = Economy.trip(r.model, m.dest, m.fare, m.service, 1, fx).profit
				if profit > bestProfit then
					bestProfit, best = profit, { model = r.model, dest = m.dest }
				end
			end
		end
	end
	if not best then
		best = { model = "kestrel", dest = "leo" }
		bestProfit = Economy.trip("kestrel", "leo", "standard", "comfort", 1, fx).profit
	end
	return bestProfit,
		Economy.tripSeconds(best.model, best.dest, false, fx.speedMult),
		Economy.tripSeconds(best.model, best.dest, true, fx.speedMult)
end

local function card(
	parent: Instance,
	order: number,
	art: Color3,
	title: string,
	blurb: string,
	example: string?,
	note: string?,
	works: string,
	lasts: string,
	price: number,
	id: number,
	isPass: boolean,
	owned: boolean?
)
	local c = Kit.card(
		{ LayoutOrder = order, Size = UDim2.new(0.25, -18, 1, 0), Parent = parent },
		{ Kit.pad(14) }
	)
	-- phones: shorter art so the whole card fits (and none at all while Nova's strip takes the room)
	local heroH = if App.compact then (if tourOn then 24 else 64) else 220
	local hero = Kit.new(
		"Frame",
		{ BackgroundColor3 = art, Size = UDim2.new(1, 0, 0, heroH), Parent = c },
		{ Kit.corner(14), Kit.gradient(art, art:Lerp(Color3.new(0, 0, 0), 0.25), 135) }
	)
	if heroH > 40 then
		RocketView.new(
			"heron",
			Tuning.agencyColors[(App.view and App.view.agency.color) or 1],
			UDim2.fromScale(1, 1),
			{ flame = true, tilt = 16 }
		).Parent =
			hero
	end
	Kit.text(
		title,
		24,
		Theme.heavy,
		Theme.ink,
		{ Position = UDim2.fromOffset(4, heroH + 16), Size = UDim2.new(1, -8, 0, 30), Parent = c }
	)
	Kit.wrap(blurb, 16, Theme.ink).Parent = Kit.new("Frame", {
		BackgroundTransparency = 1,
		Position = UDim2.fromOffset(4, heroH + 50),
		Size = UDim2.new(1, -8, 0, 48),
		Parent = c,
	})
	if example then
		local ex = Kit.new("Frame", {
			Position = UDim2.fromOffset(0, heroH + 100),
			Size = UDim2.new(1, 0, 0, 74),
			BackgroundColor3 = Theme.greenSoft,
			Parent = c,
		}, { Kit.corner(12) })
		Kit.text(example, 16, Theme.heavy, Theme.greenDark, {
			Position = UDim2.fromOffset(12, 6),
			Size = UDim2.new(1, -24, 0, 40),
			TextWrapped = true,
			TextYAlignment = Enum.TextYAlignment.Top,
			Parent = ex,
		})
		Kit.text(note or "", 13, Theme.medium, Theme.greenDark, {
			Position = UDim2.fromOffset(12, 50),
			Size = UDim2.new(1, -24, 0, 18),
			Parent = ex,
		})
	end
	local info = Kit.new("Frame", {
		Position = UDim2.new(0, 0, 1, -146),
		Size = UDim2.new(1, 0, 0, 62),
		BackgroundColor3 = Theme.soft,
		Parent = c,
	}, { Kit.corner(12) })
	Kit.text(
		`<font color="#6B7488">Works</font>\n<b>{works}</b>`,
		15,
		Theme.medium,
		Theme.ink,
		{ Position = UDim2.fromOffset(14, 8), Size = UDim2.new(0.5, -14, 0, 46), Parent = info }
	)
	Kit.text(
		`<font color="#6B7488">Lasts</font>\n<b>{lasts}</b>`,
		15,
		Theme.medium,
		Theme.ink,
		{ Position = UDim2.new(0.5, 4, 0, 8), Size = UDim2.new(0.5, -18, 0, 46), Parent = info }
	)
	local live = id ~= 0
	local b = Kit.button({
		text = if owned then "OWNED" elseif live then `R$ {prices[id] or price}` else "COMING SOON",
		disabled = owned or not live,
		icon = if owned then "check" else nil,
		color = Theme.green,
		shade = Theme.greenDark,
		size = UDim2.new(1, 0, 0, 66),
		onClick = function()
			if isPass then
				MarketplaceService:PromptGamePassPurchase(Players.LocalPlayer, id)
			else
				MarketplaceService:PromptProductPurchase(Players.LocalPlayer, id)
			end
		end,
	})
	b.AnchorPoint = Vector2.new(0, 1)
	b.Position = UDim2.fromScale(0, 1)
	b.Parent = c
	if live and not owned and not prices[id] then
		task.spawn(function()
			local robux = livePrice(id, isPass)
			if robux and b.Parent then
				b.Face.Text = `R$ {robux}`
			end
		end)
	end
end

function Shop.open()
	for _, c in root:GetChildren() do
		if c.Name == "Cards" or c.Name == "Tour" then
			c:Destroy()
		end
	end
	local v = App.view
	local compact = App.compact
	tourOn = v ~= nil and not (v.tips and v.tips.shopTour)
	if tourOn then
		-- Nova's one-time note: nothing here is required
		local m = if compact then 16 else 60
		local tour = Kit.new("Frame", {
			Name = "Tour",
			Position = UDim2.fromOffset(m, if compact then 116 else 148),
			Size = UDim2.new(1, -2 * m, 0, if compact then 48 else 64),
			BackgroundColor3 = Theme.navyCard,
			Parent = root,
		}, { Kit.corner(Theme.radius.readout), Kit.stroke(Theme.cyan, 1.5, 0.5) })
		local avatar = Kit.iconCircle("astronaut", Theme.orange, if compact then 34 else 46)
		avatar.Position = UDim2.new(0, 12, 0.5, if compact then -17 else -23)
		avatar:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
		avatar.Parent = tour
		Kit.text(
			"Nova: Everything here is optional. Passes are yours forever, and a Server Boost helps everyone in this server.",
			if compact then 13 else 16,
			Theme.medium,
			Theme.white,
			{
				Position = UDim2.fromOffset(if compact then 56 else 70, 0),
				Size = UDim2.new(1, if compact then -68 else -84, 1, 0),
				TextWrapped = true,
				TextTruncate = Enum.TextTruncate.None,
				Parent = tour,
			}
		)
		task.spawn(App.act, "seenTip", "shopTour")
	end
	local top = if compact then (if tourOn then 172 else 116) else 230
	local cards = Kit.new("Frame", {
		Name = "Cards",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, top),
		Size = if compact then UDim2.new(1, -32, 1, -top - 12) else UDim2.new(1, -120, 1, -290),
		BackgroundTransparency = 1,
		Parent = root,
	}, { Kit.list(if compact then 12 else 24, true, Enum.HorizontalAlignment.Center) })
	local P, D = Tuning.passes, Tuning.products
	local profit, secs, fastSecs = exampleTrip()
	card(
		cards,
		1,
		Color3.fromHex("19B46B"),
		"2x CASH",
		P.doubleCash.blurb,
		if profit > 0 then `+{Format.money(profit)} to +{Format.money(profit * 2)} per trip` else nil,
		"Your best mission, one trip",
		"While you play",
		"Forever",
		P.doubleCash.price,
		P.doubleCash.id,
		true,
		v and v.passes.doubleCash
	)
	card(
		cards,
		2,
		Color3.fromHex("2F6BFF"),
		"+50% LAUNCH SPEED",
		P.fastLaunch.blurb,
		`{Format.duration(secs)} to {Format.duration(fastSecs)} per trip`,
		"Your best mission, one trip",
		"While you play",
		"Forever",
		P.fastLaunch.price,
		P.fastLaunch.id,
		true,
		v and v.passes.fastLaunch
	)
	card(
		cards,
		3,
		Color3.fromHex("8B5CF6"),
		"SERVER BOOST",
		D.serverBoost.blurb,
		`Everyone here: 2x cash for {D.serverBoost.minutes} min`,
		"Helps the whole server",
		"Whole server",
		`{D.serverBoost.minutes} minutes`,
		D.serverBoost.price,
		D.serverBoost.id,
		false
	)
	card(
		cards,
		4,
		Color3.fromHex("FF6B2C"),
		"STARTER PACK",
		P.starter.blurb,
		nil,
		nil,
		"Once",
		"Cosmetics forever",
		P.starter.price,
		P.starter.id,
		true
	)
	Motion.enter(root, "bottom")
	App.setUi("modal", "shop")
end

function Shop.start(canvas: Frame)
	root = Kit.new("Frame", {
		Name = "Shop",
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		Visible = false,
		ZIndex = 60,
		Parent = canvas,
	})
	-- the backdrop runs past the safe-area canvas so the whole screen is covered
	Kit.new("Frame", {
		Name = "Backdrop",
		Position = UDim2.fromOffset(-2000, -2000),
		Size = UDim2.new(1, 4000, 1, 4000),
		BackgroundColor3 = Theme.navy,
		ZIndex = 0,
		Parent = root,
	}, { Kit.gradient(Theme.navy, Theme.navy2, 35) })
	local hdr = Kit.header("bag", "Shop", "Optional extras. The whole game is free to play.")
	hdr.Parent = root
	local hc = hdr:FindFirstChildOfClass("UICorner") :: UICorner
	hc.CornerRadius = UDim.new(0, 18)
	hc.BottomLeftRadius, hc.BottomRightRadius = UDim.new(0, 18), UDim.new(0, 18)
	local x = Kit.iconButton("close", function()
		App.setUi("modal", nil)
		Motion.exit(root, "bottom")
	end, 56, Theme.navyCard, Theme.white)
	x.AnchorPoint = Vector2.new(1, 0)
	x.ZIndex = 2
	x.Parent = root
	App.onLayout(function(compact)
		local m = if compact then 16 else 60
		hdr.Position = UDim2.fromOffset(m, if compact then 16 else 40)
		hdr.Size = UDim2.new(1, -2 * m, 0, 92)
		x.Position = UDim2.new(1, -m - 18, 0, (if compact then 16 else 40) + 18)
	end)
end

return Shop
