--!strict
-- Copied from src/shared/Receipts.luau @ 34447e3
-- Handled developer-product receipts, kept in the player's profile so a retried receipt never grants twice.
-- Pure; see tests/Receipts.spec.luau. Keys look like R_{UserId}_{PurchaseId}; values are os.time() when handled.

local Receipts = {}

Receipts.MAX = 100 -- Roblox retries a receipt for days, not forever; the newest 100 are plenty

function Receipts.key(userId: number, purchaseId: string): string
	return `R_{userId}_{purchaseId}`
end

function Receipts.seen(receipts: { [string]: number }, key: string): boolean
	return receipts[key] ~= nil
end

-- Records a key and drops the oldest entries beyond `max`.
function Receipts.record(receipts: { [string]: number }, key: string, at: number, max: number?)
	receipts[key] = at
	local limit = max or Receipts.MAX
	local count = 0
	for _ in receipts do
		count += 1
	end
	while count > limit do
		local oldestKey, oldestAt = nil :: string?, math.huge
		for k, t in receipts do
			if t < oldestAt and k ~= key then
				oldestKey, oldestAt = k, t
			end
		end
		if not oldestKey then
			break
		end
		receipts[oldestKey] = nil
		count -= 1
	end
end

return Receipts
