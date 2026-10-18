--!strict
-- UI sound table. Ids are built-in placeholders; the owner swaps in Creator Store audio ids here later.
-- Each entry: id, volume (0 to 1), speed (PlaybackSpeed). Never use the oof or ouch clips.

local function s(file: string, volume: number, speed: number)
	return { id = "rbxasset://sounds/" .. file, volume = volume, speed = speed }
end

return {
	tap = s("volume_slider.ogg", 0.35, 1.25),
	toggle = s("volume_slider.ogg", 0.35, 0.9),
	open = s("action_swim.mp3", 0.15, 1.6),
	coin = s("volume_slider.ogg", 0.4, 1.8),
	count = s("volume_slider.ogg", 0.3, 1.0),
	launch = s("impact_explosion_03.mp3", 0.25, 0.6),
	perfect = s("action_jump.mp3", 0.4, 1.4),
	arrival = s("action_jump_land.mp3", 0.25, 1.2),
	stage = s("action_get_up.mp3", 0.5, 1.0),
	whoosh = s("action_falling.ogg", 0.15, 1.5),
} :: { [string]: { id: string, volume: number, speed: number } }
