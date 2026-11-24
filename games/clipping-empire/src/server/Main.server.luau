--!strict
-- Server entry point.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

require(ReplicatedStorage.Shared.Remotes) -- creates the remotes
local DataService = require(script.Parent.Services.DataService)
local GameService = require(script.Parent.Services.GameService)
local World = require(script.Parent.World)

World.build()
GameService.start() -- before DataService so PlayerAdded sessions exist first
DataService.start()
