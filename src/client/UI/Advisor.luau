--!strict
-- "Nova  |  Mission Control": the first-session guide. One speech bubble plus a pulsing ring on the exact
-- control to press next. Steps are derived from game state, so it can never get stuck out of sync.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local App = require(script.Parent.Parent.App)
local Hud = require(script.Parent.Hud)
local Icons = require(script.Parent.Icons)
local Kit = require(script.Parent.Kit)
local Map = require(script.Parent.Map)
local Modals = require(script.Parent.Modals)
local Panels = require(script.Parent.Panels)
local Theme = require(script.Parent.Theme)
local Wizard = require(script.Parent.Wizard)

local Advisor = {}

local bubble: Frame
local message: TextLabel
local ring: Frame
local arrow: Frame
local target: GuiObject? = nil
local finished = false

local SECOND_ROCKET_PRICE =
	require(game:GetService("ReplicatedStorage").Shared.Config.Rockets).byId.kestrel.price

local function step(): (string?, GuiObject?)
	local v = App.view
	if finished or not v or v.agency.name == "" then
		return nil, nil
	end
	local ui = App.ui
	local missions, rockets = #v.missions, #v.rockets
	if missions >= 2 then
		finished = true
		App.act("seenTip", "tutorial")
		return nil, nil
	end
	if ui.modal == "catalog" then
		return "This one's perfect for short hops. Tap its price.", Modals.anchors.firstPrice
	elseif ui.modal == "confirm" then
		return "Confirm the purchase. It's ready right away!", Modals.anchors.primary
	elseif ui.modal == "delivered" then
		return "A brand new rocket! Where should it fly?", Modals.anchors.primary
	elseif ui.modal then
		return nil, nil
	end
	if missions == 0 then
		if ui.wizard then
			return "Check the numbers, then continue. This route can't lose money!", Wizard.anchors.primary
		elseif ui.picking then
			return "Low Earth Orbit is close and busy. Pick it!", Map.node("leo")
		elseif ui.panel == "missions" then
			return "Tap New Mission to choose where your rocket flies.", Panels.anchors.newMission
		end
		return "Your Sparrow is fueled and on the pad! Let's open your first mission.", Hud.tabs.missions
	end
	if rockets == 1 and v.cash >= SECOND_ROCKET_PRICE and not ui.wizard then
		if ui.panel == "fleet" then
			return "Tap Buy Rocket. Two rockets fly two missions at once.", Panels.anchors.buyRocket
		end
		return "We can afford a second rocket! Let's grow.", Hud.tabs.fleet
	end
	if rockets >= 2 and missions == 1 then
		if ui.wizard then
			return "Pick your settings and launch!", Wizard.anchors.primary
		elseif ui.picking then
			return "Pick any green-ringed destination.", nil
		end
		return "Give your new rocket its own mission!", Hud.nextButton
	end
	return nil, nil
end

local function update()
	local text, t = step()
	bubble.Visible = text ~= nil
	if text and message.Text ~= text then
		message.Text = text
		Kit.popIn(bubble)
	end
	target = t
end

function Advisor.start(canvas: Frame)
	if App.view and App.view.tips.tutorial then
		finished = true
	end
	bubble = Kit.card({
		Name = "Advisor",
		AnchorPoint = Vector2.new(0, 1),
		Visible = false,
		ZIndex = 40,
		Parent = canvas,
	}, { Kit.stroke(Theme.line, 1) })
	local avatar = Kit.iconCircle("astronaut", Theme.orange, 72, Theme.white)
	avatar.Position = UDim2.fromOffset(18, 30)
	avatar.Parent = bubble
	Kit.text(
		"Nova  |  Mission Control",
		16,
		Theme.heavy,
		Theme.blue,
		{ Position = UDim2.fromOffset(106, 16), Size = UDim2.new(1, -124, 0, 20), Parent = bubble }
	)
	message = Kit.text("", 19, Theme.bold, Theme.ink, {
		Position = UDim2.fromOffset(106, 40),
		Size = UDim2.new(1, -124, 0, 80),
		TextWrapped = true,
		TextTruncate = Enum.TextTruncate.None,
		TextYAlignment = Enum.TextYAlignment.Top,
		Parent = bubble,
	})

	App.onLayout(function(compact)
		-- compact: above the left-hand nav, narrow enough to clear the right-hand sheets
		bubble.Position = if compact then UDim2.new(0, 16, 1, -108) else UDim2.new(0, 24, 1, -140)
		bubble.Size = UDim2.fromOffset(if compact then 400 else 470, 132)
	end)

	-- the ring lives in its own unscaled ScreenGui so it can use absolute screen pixels
	local overlay = Kit.new("ScreenGui", {
		Name = "AdvisorRing",
		ScreenInsets = Enum.ScreenInsets.None, -- may point anywhere, including the map
		ResetOnSpawn = false,
		DisplayOrder = 20,
		Parent = Players.LocalPlayer:WaitForChild("PlayerGui"),
	})
	ring = Kit.new(
		"Frame",
		{ BackgroundTransparency = 1, Visible = false, Parent = overlay },
		{ Kit.corner(18), Kit.stroke(Theme.orange, 5) }
	)
	arrow = Icons.make("arrowDown", 40, Theme.orange)
	arrow.AnchorPoint = Vector2.new(0.5, 1)
	arrow.Visible = false
	arrow.Parent = overlay

	App.changed.Event:Connect(update)
	App.uiChanged.Event:Connect(function()
		task.defer(update) -- anchors are rebuilt during the same frame
	end)
	RunService.RenderStepped:Connect(function()
		local t = target
		local visible = t ~= nil and t.Parent ~= nil and t.Visible and bubble.Visible
		ring.Visible = visible
		arrow.Visible = visible
		if visible and t then
			-- relative to the overlay, so it lines up whatever insets the target's ScreenGui uses
			local pos, size = t.AbsolutePosition - overlay.AbsolutePosition, t.AbsoluteSize
			local pulse = if Kit.reducedMotion() then 0 else math.sin(os.clock() * 5) * 3
			ring.Position = UDim2.fromOffset(pos.X - 8 - pulse, pos.Y - 8 - pulse)
			ring.Size = UDim2.fromOffset(size.X + 16 + pulse * 2, size.Y + 16 + pulse * 2)
			arrow.Position = UDim2.fromOffset(pos.X + size.X / 2, pos.Y - 10 + pulse * 2)
		end
	end)
	update()
end

return Advisor
