--!strict
-- Client entry point: builds the UI and wires routes. The client renders and requests; it never grants value.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")

local App = require(script.Parent.App)
local UI = script.Parent.UI
local Advisor = require(UI.Advisor)
local Hud = require(UI.Hud)
local Juice = require(UI.Juice)
local Map = require(UI.Map)
local Modals = require(UI.Modals)
local Panels = require(UI.Panels)
local Shop = require(UI.Shop)
local Toasts = require(UI.Toasts)
local Wizard = require(UI.Wizard)
require(ReplicatedStorage.Shared.Remotes)

-- A screen game: hide the backpack and player list clutter (chat stays for social play).
pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Backpack, false)
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, false)
end)
-- Chat starts collapsed: its window sits over the map. Players open it from the chat icon.
task.delay(1, function()
	pcall(StarterGui.SetCore, StarterGui, "ChatActive", false)
end)

Map.start()
local canvas = Hud.start()
Panels.start(canvas)
Wizard.start(canvas)
Toasts.start(canvas)
Modals.start(canvas)
Shop.start(canvas)
Juice.start(canvas)

App.routes.toast = Toasts.show
App.routes.openPanel = function(id: string?)
	if id then
		Modals.close()
	end
	App.setUi("panel", id)
end
App.routes.openWizard = Wizard.open
App.routes.pickDestination = function()
	Wizard.pick(nil)
end
App.routes.openCatalog = function()
	App.setUi("panel", nil)
	Modals.catalog()
end
App.routes.openDaily = Modals.daily
App.routes.openShop = Shop.open
App.routes.openSettings = Modals.settings
App.routes.openHelp = Modals.help

-- First state: either found the agency, or start playing.
local started = false
App.changed.Event:Connect(function()
	if started then
		return
	end
	started = true
	if App.view.agency.name == "" then
		Modals.createAgency()
	end
	Advisor.start(canvas)
	Players.LocalPlayer:SetAttribute("ClientReady", true)
end)
