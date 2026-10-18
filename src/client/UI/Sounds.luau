--!strict
-- UI sounds: one lazily created Sound per name, throttled, and silenced by the player's Sound setting.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local Config = require(ReplicatedStorage.Shared.Config.Sounds)

local Sounds = {}

local made: { [string]: Sound } = {}
local lastPlay: { [string]: number } = {}

function Sounds.enabled(): boolean
	return Players.LocalPlayer:GetAttribute("Sound") ~= false
end

function Sounds.play(name: string)
	local def = Config[name]
	if not def or not Sounds.enabled() then
		return
	end
	local now = os.clock()
	if now - (lastPlay[name] or 0) < 0.05 then
		return
	end
	lastPlay[name] = now
	local snd: Sound = made[name] or Instance.new("Sound")
	if not made[name] then
		snd.Name = "UI_" .. name
		snd.SoundId = def.id
		snd.Volume = def.volume
		snd.PlaybackSpeed = def.speed
		snd.Parent = SoundService
		made[name] = snd
	end
	snd:Play()
end

return Sounds
