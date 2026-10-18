--!strict
-- Client entry point. The client only renders state and plays local effects; it never grants value.

local Hud = require(script.Parent.UI.Hud)
local Overlays = require(script.Parent.UI.Overlays)
local Tools = require(script.Parent.Tools)

local gui = Hud.start()
Overlays.start(gui)
Tools.start()
