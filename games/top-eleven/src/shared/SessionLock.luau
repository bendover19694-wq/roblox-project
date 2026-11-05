--!strict
-- Pure session-lock rules for DataService (no Roblox services, so tests/SessionLock.spec.luau covers them).

local SessionLock = {}

-- Another live server owns the stored profile.
function SessionLock.heldByOther(old: any, job: string, now: number, ttl: number): boolean
	local lock = type(old) == "table" and old._lock
	return lock and lock.job ~= job and now - lock.at < ttl or false
end

-- A save must not touch the store after the entry was released, unless it is the release save itself.
function SessionLock.mayWrite(entry: { canSave: boolean, released: boolean? }, release: boolean): boolean
	return entry.canSave and (release or not entry.released)
end

return SessionLock
