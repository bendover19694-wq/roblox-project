--!strict
-- Server entry point. A screen-based game: no world to build beyond a quiet backdrop.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

require(ReplicatedStorage.Shared.Remotes) -- creates the remotes
local Services = script.Parent.Services
local AgencyService = require(Services.AgencyService)
local DataService = require(Services.DataService)

-- The player never walks around: no character, a calm night sky behind the UI.
Players.CharacterAutoLoads = false
Lighting.ClockTime = 0

DataService.start()
AgencyService.start()
