--!strict
-- The solar-system map: starfield, Earth spaceport, destination bodies with labels and tags,
-- dotted mission arcs with rockets moving along them, and a "pick a destination" mode.
-- Lives in its own ScreenGui behind the HUD; sizes scale with screen height.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Destinations = require(ReplicatedStorage.Shared.Config.Destinations)
local Economy = require(ReplicatedStorage.Shared.Economy)
local Tuning = require(ReplicatedStorage.Shared.Config.Tuning)
local App = require(script.Parent.Parent.App)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Motion = require(script.Parent.Motion)
local Theme = require(script.Parent.Theme)

local Map = {}

local gui: ScreenGui
local layer: Frame -- bodies + labels
local arcs: Frame -- mission arcs (under bodies)
local nodes: { [string]: any } = {}
local markers: { any } = {}
local pickCallback: ((string) -> ())? = nil
local pickable: { [string]: boolean } = {}
local drawn: { [string]: boolean } = {} -- mission ids whose arc has already drawn on

local function S(): number
	return math.clamp(workspace.CurrentCamera.ViewportSize.Y / 1080, 0.45, 1.4)
end

local function screenPos(scalePos: Vector2): Vector2
	local v = workspace.CurrentCamera.ViewportSize
	return Vector2.new(scalePos.X * v.X, scalePos.Y * v.Y)
end

local function agencyColor(): Color3
	local v = App.view
	return Tuning.agencyColors[(v and v.agency.color) or 1]
end

local function body(size: number, a: Color3, b: Color3): Frame
	local f = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromOffset(size, size),
		BackgroundColor3 = Color3.new(1, 1, 1),
	}, { Kit.round(), Kit.gradient(a, b, 45) })
	-- soft shine
	Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.34, 0.32),
		Size = UDim2.fromScale(0.28, 0.28),
		BackgroundColor3 = Color3.new(1, 1, 1),
		BackgroundTransparency = 0.6,
		Parent = f,
	}, { Kit.round() })
	return f
end

local function label(code: string, name: string): TextButton
	return Kit.new("TextButton", {
		AnchorPoint = Vector2.new(0.5, 0),
		AutoButtonColor = false,
		BackgroundColor3 = Theme.white,
		BackgroundTransparency = 0.05,
		AutomaticSize = Enum.AutomaticSize.X,
		Size = UDim2.fromOffset(0, 30),
	}, {
		Kit.corner(15),
		Kit.pad(12, 0),
		Kit.list(6, true),
		Kit.text(`<b>{code}</b> <font color="#6B7488">  |  {name}</font>`, 15, Theme.medium, Theme.ink, {
			Name = "Name",
			AutomaticSize = Enum.AutomaticSize.X,
			Size = UDim2.fromScale(0, 1),
			TextTruncate = Enum.TextTruncate.None,
			LayoutOrder = 1,
		}),
	})
end

local function setTag(node: any, text: string?, fg: Color3?, bg: Color3?, icon: string?)
	local old = node.label:FindFirstChild("Tag")
	if old then
		old:Destroy()
	end
	if text then
		local chip = Kit.chip(text, fg :: Color3, bg :: Color3, 12, icon)
		chip.Name = "Tag"
		chip.LayoutOrder = 2
		chip.Size = UDim2.fromOffset(0, 22)
		chip.Parent = node.label
	end
end

local function layout()
	local s = S()
	for _, node in nodes do
		local p = screenPos(node.pos)
		node.root.Position = UDim2.fromOffset(p.X, p.Y)
		node.root.Size = UDim2.fromOffset(node.size * s, node.size * s)
		node.label.Position = UDim2.new(0.5, 0, 1, 6 * s)
		local scale = node.label:FindFirstChildOfClass("UIScale")
			or Kit.new("UIScale", { Parent = node.label })
		-- phones: the HUD's compact layout; keep planet names readable rather than true-to-scale
		scale.Scale = if App.compact then math.max(s, 0.7) else s
	end
end

local function makeNode(
	id: string,
	pos: Vector2,
	size: number,
	a: Color3,
	b: Color3,
	code: string,
	name: string,
	ring: boolean?
)
	local root = Kit.new("TextButton", {
		Name = id,
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundTransparency = 1,
		AutoButtonColor = false,
		Parent = layer,
	})
	local bodyFrame = body(1, a, b)
	bodyFrame.Size = UDim2.fromScale(1, 1)
	bodyFrame.Parent = root
	if ring then
		local r = Kit.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromScale(0.5, 0.5),
			Size = UDim2.fromScale(1.9, 0.5),
			BackgroundTransparency = 1,
			Rotation = -18,
			Parent = root,
		}, { Kit.round(), Kit.stroke(Color3.fromHex("E8C98A"), 3, 0.15) })
		r.ZIndex = 2
	end
	local pickRing = Kit.new("Frame", {
		Name = "PickRing",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.new(1, 18, 1, 18),
		BackgroundTransparency = 1,
		Visible = false,
		Parent = root,
	}, { Kit.round(), Kit.stroke(Theme.green, 4) })
	local lab = label(code, name)
	lab.Parent = root
	local function onClick()
		if pickCallback and pickable[id] then
			pickCallback(id)
		elseif id ~= "earth" and not pickCallback then
			App.go("openWizard", id)
		end
	end
	root.Activated:Connect(onClick)
	-- the name label sits below the planet; it is clickable too (playtest: players click names)
	lab.Activated:Connect(onClick)
	nodes[id] = { root = root, body = bodyFrame, label = lab, pos = pos, size = size, pickRing = pickRing }
end

local function bezier(a: Vector2, b: Vector2, t: number): (Vector2, Vector2)
	local mid = (a + b) / 2
	local dir = b - a
	local normal = Vector2.new(-dir.Y, dir.X).Unit * math.min(dir.Magnitude * 0.25, 160)
	if normal.Y > 0 then
		normal = -normal -- bow upwards
	end
	local c = mid + normal
	local p = (1 - t) ^ 2 * a + 2 * (1 - t) * t * c + t ^ 2 * b
	local tangent = 2 * (1 - t) * (c - a) + 2 * t * (b - c)
	return p, tangent
end

-- Rebuilds mission arcs (dots) and rocket markers from the current view.
local function drawMissions()
	arcs:ClearAllChildren()
	for _, mk in markers do
		mk.marker:Destroy()
	end
	markers = {}
	local v = App.view
	if not v then
		return
	end
	local color = agencyColor()
	local earth = screenPos(Destinations.hub.pos)
	for _, m in v.missions do
		local d = Destinations.byId[m.dest]
		local target = screenPos(d.pos)
		local reveal = not drawn[m.id] and not Motion.reduced()
		drawn[m.id] = true
		for i = 1, 24 do
			local p = bezier(earth, target, i / 25)
			local dot = Kit.new("Frame", {
				AnchorPoint = Vector2.new(0.5, 0.5),
				Position = UDim2.fromOffset(p.X, p.Y),
				Size = UDim2.fromOffset(4, 4),
				BackgroundColor3 = color,
				BackgroundTransparency = if reveal then 1 else 0.25,
				Parent = arcs,
			}, { Kit.round() })
			if reveal then
				task.delay(0.8 * i / 24, function()
					dot.BackgroundTransparency = 0.25
				end)
			end
		end
		-- the rocket is a tap target: tapping fires its thrusters (a generous 52 px hit area for thumbs)
		local marker = Kit.new("TextButton", {
			Name = "Rocket",
			AnchorPoint = Vector2.new(0.5, 0.5),
			Size = UDim2.fromOffset(52, 52),
			BackgroundTransparency = 1,
			Text = "",
			ZIndex = 5,
			Parent = layer,
		})
		local icon = Icons.make("rocket", 26, Theme.white)
		icon.AnchorPoint = Vector2.new(0.5, 0.5)
		icon.Position = UDim2.fromScale(0.5, 0.5)
		icon.Parent = marker
		local missionId = m.id
		marker.Activated:Connect(function()
			App.go("thrust", missionId, marker.AbsolutePosition + marker.AbsoluteSize / 2)
		end)
		table.insert(markers, { marker = marker, icon = icon, mission = m, a = earth, b = target })
	end
end

local function refreshTags()
	local v = App.view
	if not v then
		return
	end
	local serving = {}
	for _, m in v.missions do
		serving[m.dest] = true
	end
	for _, d in Destinations.list do
		local node = nodes[d.id]
		local locked = v.stage < d.stage
		node.body.BackgroundTransparency = if locked then 0.55 else 0
		if locked then
			setTag(node, `STAGE {d.stage}`, Theme.muted, Theme.soft, "lock")
		elseif serving[d.id] then
			setTag(node, "SERVING", Theme.greenDark, Theme.greenSoft)
		elseif Economy.demandLabel(d.id) == "Very high" then
			setTag(node, "HIGH DEMAND", Theme.greenDark, Theme.greenSoft, "arrowUp")
		elseif d.competition >= 0.25 then
			setTag(node, "COMPETITION", Theme.red, Theme.redSoft, "chart")
		else
			setTag(node, nil)
		end
	end
	local earthLabel = nodes.earth.label:FindFirstChild("Name")
	earthLabel.Text =
		`<b>EARTH</b> <font color="#6B7488">  |  {v.agency.name ~= "" and v.agency.name or "Your spaceport"}</font>`
end

-- Pick mode: highlight `ids` (green rings), dim the rest. Pass nil to exit.
function Map.setPick(ids: { string }?, onPick: ((string) -> ())?)
	pickable = {}
	pickCallback = onPick
	for _, id in (ids or {}) :: { string } do
		pickable[id] = true
	end
	for id, node in nodes do
		node.pickRing.Visible = pickable[id] == true
		if ids and id ~= "earth" then
			node.body.BackgroundTransparency = if pickable[id] then 0 else 0.6
		end
	end
	if not ids then
		refreshTags()
	end
end

function Map.node(id: string): GuiObject?
	local n = nodes[id]
	return n and n.root
end

-- Centre of a node in true screen pixels. The Map ignores the GUI inset, so no offset is needed here;
-- overlays that honour the inset (Juice) subtract GuiService:GetGuiInset() themselves.
function Map.nodeCenter(destId: string): Vector2?
	local n = nodes[destId]
	if not n then
		return nil
	end
	return n.root.AbsolutePosition + n.root.AbsoluteSize / 2
end

-- A cyan ring that grows from 1x to 2.2x the node and fades. Reduced motion: one short highlight.
function Map.ping(destId: string)
	local n = nodes[destId]
	if not n then
		return
	end
	local ring = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.fromScale(1, 1),
		BackgroundTransparency = 1,
		ZIndex = 6,
		Parent = n.root,
	}, { Kit.round() })
	local stroke = Kit.stroke(Theme.cyan, 4, 0)
	stroke.Parent = ring
	if Motion.reduced() then
		ring.Size = UDim2.fromScale(1.3, 1.3)
		Kit.tween(stroke, 0.3, { Transparency = 1 }).Completed:Connect(function()
			ring:Destroy()
		end)
		return
	end
	Kit.tween(ring, 0.6, { Size = UDim2.fromScale(2.2, 2.2) })
	Kit.tween(stroke, 0.6, { Transparency = 1 }).Completed:Connect(function()
		ring:Destroy()
	end)
end

function Map.start()
	gui = Kit.new("ScreenGui", {
		Name = "Map",
		IgnoreGuiInset = true,
		ResetOnSpawn = false,
		DisplayOrder = 0,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	local bg = Kit.new(
		"Frame",
		{ Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), Parent = gui },
		{
			Kit.gradient(Theme.navy, Theme.navy2, 35),
		}
	)
	-- nebula glows
	local nebulae: { { any } } =
		{ { 0.15, 0.2, 0.5, "3B2A8F" }, { 0.8, 0.75, 0.6, "1F4C8F" }, { 0.6, 0.15, 0.35, "6B2A7F" } }
	for _, n in nebulae do
		Kit.new("Frame", {
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromScale(n[1], n[2]),
			Size = UDim2.fromScale(n[3], n[3] * 1.6),
			SizeConstraint = Enum.SizeConstraint.RelativeXX,
			BackgroundColor3 = Color3.fromHex(n[4]),
			BackgroundTransparency = 0.93,
			Parent = bg,
		}, { Kit.round() })
	end
	-- starfield (deterministic)
	local rng = Random.new(42)
	for _ = 1, 160 do
		local sz = rng:NextInteger(1, 3)
		Kit.new("Frame", {
			Position = UDim2.fromScale(rng:NextNumber(), rng:NextNumber()),
			Size = UDim2.fromOffset(sz, sz),
			BackgroundColor3 = Color3.new(1, 1, 1),
			BackgroundTransparency = rng:NextNumber(0.2, 0.75),
			Parent = bg,
		}, { Kit.round() })
	end
	-- orbit rings around Earth
	local hub = Destinations.hub
	for i, k in { 0.14, 0.28, 0.46 } do
		Kit.new("Frame", {
			Name = `Orbit{i}`,
			AnchorPoint = Vector2.new(0.5, 0.5),
			Position = UDim2.fromScale(hub.pos.X, hub.pos.Y),
			Size = UDim2.fromScale(k * 2, k * 2),
			SizeConstraint = Enum.SizeConstraint.RelativeYY,
			BackgroundTransparency = 1,
			Parent = bg,
		}, { Kit.round(), Kit.stroke(Color3.new(1, 1, 1), 1, 0.85) })
	end
	arcs = Kit.new(
		"Frame",
		{ Name = "Arcs", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = gui }
	)
	layer = Kit.new(
		"Frame",
		{ Name = "Bodies", Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Parent = gui }
	)

	makeNode(
		"earth",
		hub.pos,
		hub.size,
		Color3.fromHex("4FA3FF"),
		Color3.fromHex("1E6E4E"),
		"EARTH",
		"Your spaceport"
	)
	local glow = Kit.new("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.new(1, 14, 1, 14),
		BackgroundTransparency = 1,
		Parent = nodes.earth.root,
	}, { Kit.round(), Kit.stroke(Color3.fromHex("7CC4FF"), 6, 0.6) })
	glow.ZIndex = 0
	for _, d in Destinations.list do
		makeNode(d.id, d.pos, d.size, d.color, d.color2, d.code, d.name, d.ring)
	end
	layout()
	App.layoutChanged.Event:Connect(layout)
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(function()
		layout()
		drawMissions()
	end)

	App.changed.Event:Connect(function()
		refreshTags()
		-- redraw arcs only when the set of missions changes
		local key = ""
		for _, m in App.view.missions do
			key ..= m.id .. m.dest
		end
		if key ~= Map._key then
			Map._key = key
			drawMissions()
		else
			for _, mk in markers do -- keep timestamps fresh
				for _, m in App.view.missions do
					if m.id == mk.mission.id then
						mk.mission = m
					end
				end
			end
		end
	end)

	-- move rockets: outbound on even trips, returning on odd trips
	RunService.RenderStepped:Connect(function()
		local now = App.now()
		for _, mk in markers do
			local m = mk.mission
			local span = math.max(m.arriveAt - m.departAt, 1)
			local t = math.clamp((now - m.departAt) / span, 0, 1)
			local back = m.trips % 2 == 1
			local p, tangent = bezier(mk.a, mk.b, if back then 1 - t else t)
			if back then
				tangent = -tangent
			end
			mk.marker.Position = UDim2.fromOffset(p.X, p.Y)
			mk.icon.Rotation = math.deg(math.atan2(tangent.Y, tangent.X)) + 45
			mk.marker.Visible = now < m.arriveAt
		end
	end)
end

Map._key = ""

return Map
