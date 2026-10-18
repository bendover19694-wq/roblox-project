-- Unit test runner for pure shared modules. Run from the repo root:  lune run tests/run
-- Modules use Roblox-style require(script.Parent.X); we fake `script` with path proxies.

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local process = require("@lune/process")
local roblox = require("@lune/roblox")

-- Roblox datatypes used by config modules.
local DATATYPES = { Color3 = roblox.Color3, Vector2 = roblox.Vector2, Vector3 = roblox.Vector3 }

local cache = {}
local node

local function load(path: string)
	if cache[path] == nil then
		local chunk = luau.load(fs.readFile(path .. ".luau"), {
			debugName = path,
			environment = {
				Color3 = DATATYPES.Color3,
				Vector2 = DATATYPES.Vector2,
				Vector3 = DATATYPES.Vector3,
				script = node(path),
				require = function(n)
					return load(rawget(n, "__path"))
				end,
			},
		})
		cache[path] = chunk()
	end
	return cache[path]
end

function node(path: string)
	return setmetatable({ __path = path }, {
		__index = function(_, key)
			if key == "Parent" then
				return node((path:match("^(.*)/[^/]+$")))
			end
			return node(path .. "/" .. key)
		end,
	})
end

local passed, failed = 0, 0
local function test(name: string, fn: () -> ())
	local ok, err = pcall(fn)
	if ok then
		passed += 1
	else
		failed += 1
		print(`FAIL  {name}\n      {err}`)
	end
end

for _, file in fs.readDir("tests") do
	if file:match("%.spec%.luau$") then
		luau.load(fs.readFile("tests/" .. file), {
			debugName = file,
			environment = {
				test = test,
				shared = function(name: string)
					return load("src/shared/" .. name)
				end,
			},
		})()
	end
end

print(`{passed} passed, {failed} failed`)
process.exit(if failed > 0 then 1 else 0)
