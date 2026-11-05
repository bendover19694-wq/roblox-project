local SessionLock = shared("SessionLock")

test("a fresh lock from another server blocks, an expired or own lock does not", function()
	local function held(lock)
		return SessionLock.heldByOther({ _lock = lock }, "A", 1000, 180)
	end
	assert(held({ job = "B", at = 900 }), "fresh foreign lock ignored")
	assert(not held({ job = "B", at = 800 }), "expired foreign lock blocks")
	assert(not held({ job = "A", at = 999 }), "own lock blocks")
	assert(not SessionLock.heldByOther(nil, "A", 1000, 180), "empty record blocks")
end)

test("autosave skips a released entry, the release save still writes", function()
	local live = { canSave = true, released = false }
	local gone = { canSave = true, released = true }
	assert(SessionLock.mayWrite(live, false), "autosave blocked on live entry")
	assert(not SessionLock.mayWrite(gone, false), "autosave wrote lock back after release")
	assert(SessionLock.mayWrite(gone, true), "release save blocked")
	assert(not SessionLock.mayWrite({ canSave = false }, true), "outage entry wrote")
end)
