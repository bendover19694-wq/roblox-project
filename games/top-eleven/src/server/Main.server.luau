--!strict
-- Server entry point. A screen-based game: no world to build beyond a quiet backdrop.

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

require(ReplicatedStorage.Shared.Remotes) -- creates the remotes
local Services = script.Parent.Services
local ClubService = require(Services.ClubService)
local DataService = require(Services.DataService)
local MatchService = require(Services.MatchService)

-- The player never walks around: no character.
Players.CharacterAutoLoads = false
Lighting.ClockTime = 14

DataService.start()
ClubService.start()
MatchService.start(ClubService.push, ClubService.isReady)
