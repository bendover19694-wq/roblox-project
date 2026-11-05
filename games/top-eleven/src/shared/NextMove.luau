--!strict
-- The one suggested move for the hub banner and the result card. Pure.

local Academy = require(script.Parent.Academy)
local AcademyCfg = require(script.Parent.Config.Academy)
local League = require(script.Parent.League)
local Player = require(script.Parent.Player)

export type NextMoveId = "createClub" | "fixLineup" | "claimTraining" | "scout" | "nextSeason" | "playMatch"

local NextMove = {}

function NextMove.of(p: any, now: number): NextMoveId
	if p.club.place == 0 then
		return "createClub"
	end
	if not Player.lineupValid(p.players, p.lineup.slots) then
		return "fixLineup"
	end
	for _, s in p.training.slots do
		if s and now >= s.endsAt then
			return "claimTraining"
		end
	end
	if Academy.available(p.academy, now) >= 1 and #p.academy.prospects < AcademyCfg.maxProspects then
		return "scout"
	end
	if p.league and League.isOver(p.league) and not (p.match and not p.match.rewarded) then
		return "nextSeason"
	end
	return "playMatch"
end

return NextMove
