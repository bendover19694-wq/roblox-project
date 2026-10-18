--!strict
-- Full-screen shop (pattern from the airline study: big cards, a concrete example value, "Works/Lasts").
-- Products with id 0 are not live yet (unpublished place) and show "Coming soon".

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Economy = require(ReplicatedStorage.Shared.Economy)
local Format = require(ReplicatedStorage.Shared.Format)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Kit = require(script.Parent.Kit)
local RocketView = require(script.Parent.RocketView)
local Theme = require(script.Parent.Theme)

local Shop = {}

local root: Frame
local prices: { [number]: number } = {}

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

local function exampleTrip(): number
	return Economy.trip("kestrel", "leo", "standard", "comfort").profit
end

local function card(
	parent: Instance,
	order: number,
	art: Color3,
	title: string,
	blurb: string,
	example: string?,
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
	local heroH = if App.compact then 64 else 220 -- phones: shorter art so the whole card fits
	local hero = Kit.new(
		"Frame",
		{ BackgroundColor3 = art, Size = UDim2.new(1, 0, 0, heroH), Parent = c },
		{ Kit.corner(14), Kit.gradient(art, art:Lerp(Color3.new(0, 0, 0), 0.25), 135) }
	)
	RocketView.new(
		"heron",
		Tuning.agencyColors[(App.view and App.view.agency.color) or 1],
		UDim2.fromScale(1, 1),
		{ flame = true, tilt = 16 }
	).Parent =
		hero
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
			Position = UDim2.fromOffset(0, heroH + 104),
			Size = UDim2.new(1, 0, 0, 62),
			BackgroundColor3 = Theme.greenSoft,
			Parent = c,
		}, { Kit.corner(12) })
		Kit.text(
			example,
			18,
			Theme.heavy,
			Theme.greenDark,
			{ Position = UDim2.fromOffset(14, 8), Size = UDim2.new(1, -28, 0, 24), Parent = ex }
		)
		Kit.text(
			"Example: one trip",
			14,
			Theme.medium,
			Theme.greenDark,
			{ Position = UDim2.fromOffset(14, 34), Size = UDim2.new(1, -28, 0, 18), Parent = ex }
		)
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
		text = if owned then "OWNED ✓" elseif live then `R$ {prices[id] or price}` else "COMING SOON",
		disabled = owned or not live,
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
		if c.Name == "Cards" then
			c:Destroy()
		end
	end
	local v = App.view
	local compact = App.compact
	local cards = Kit.new("Frame", {
		Name = "Cards",
		AnchorPoint = Vector2.new(0.5, 0),
		Position = UDim2.new(0.5, 0, 0, if compact then 104 else 230),
		Size = if compact then UDim2.new(1, -32, 1, -120) else UDim2.new(1, -120, 1, -290),
		BackgroundTransparency = 1,
		Parent = root,
	}, { Kit.list(if compact then 12 else 24, true, Enum.HorizontalAlignment.Center) })
	local P, D = Tuning.passes, Tuning.products
	local ex = exampleTrip()
	card(
		cards,
		1,
		Color3.fromHex("19B46B"),
		"2× CASH",
		P.doubleCash.blurb,
		`+{Format.money(ex)} → +{Format.money(ex * 2)}`,
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
		"60s → 40s",
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
		"Everyone here: 2× cash",
		"Whole server",
		"15 minutes",
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
		"Once",
		"Cosmetics forever",
		P.starter.price,
		P.starter.id,
		true
	)
	root.Visible = true
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
	local title =
		Kit.text("Shop", 52, Theme.heavy, Theme.white, { Size = UDim2.fromOffset(600, 60), Parent = root })
	local sub = Kit.text(
		"Optional extras. The whole game is free to play.",
		20,
		Theme.medium,
		Color3.fromHex("C7CBE6"),
		{ Size = UDim2.fromOffset(800, 26), Parent = root }
	)
	local x = Kit.iconButton("×", function()
		root.Visible = false
		App.setUi("modal", nil)
	end, 64, Theme.navyCard, Theme.white)
	x.AnchorPoint = Vector2.new(1, 0)
	x.Parent = root
	App.onLayout(function(compact)
		local m = if compact then 16 else 60
		title.Position = UDim2.fromOffset(m, m)
		sub.Position = UDim2.fromOffset(m, m + 62)
		x.Position = UDim2.new(1, -m, 0, m)
	end)
end

return Shop
