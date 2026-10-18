--!strict
-- Client state hub: latest server view, UI routing, and the one way to ask the server for things.
-- UI modules require this; Main wires routes. No UI code lives here (avoids require cycles).

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage.Shared.Remotes)

local App = {}

App.view = nil :: any -- latest State from the server
App.changed = Instance.new("BindableEvent") -- fires after every new view
App.uiChanged = Instance.new("BindableEvent") -- fires when panels/modals/pick mode change
App.ui = {
	panel = nil :: string?, -- "missions" | "fleet" | "career" | "more"
	modal = nil :: string?,
	wizard = false,
	picking = false,
}
App.routes = {} :: { [string]: (...any) -> () }
App.compact = false -- phone-sized screen: modules switch to the compact layout (decided by Hud)
App.layoutChanged = Instance.new("BindableEvent")
App.gui = nil :: any -- root ScreenGui (set by Main)

function App.go(route: string, ...: any)
	local fn = App.routes[route]
	if fn then
		fn(...)
	end
end

-- Runs `fn(compact)` now and whenever the screen switches between the normal and compact layout.
function App.onLayout(fn: (compact: boolean) -> ())
	fn(App.compact)
	App.layoutChanged.Event:Connect(function()
		fn(App.compact)
	end)
end

function App.setUi(key: string, value: any)
	(App.ui :: any)[key] = value
	App.uiChanged:Fire()
end

-- Calls the server. On failure shows the reason as a toast. Returns ok.
function App.act(action: string, ...: any): boolean
	local ok, result, message = pcall(Remotes.Act.InvokeServer, Remotes.Act, action, ...)
	if not ok then
		App.go("toast", "Connection hiccup, try again", "error")
		return false
	end
	if not result and message then
		App.go("toast", message, "error")
	end
	return result == true
end

function App.now(): number
	return workspace:GetServerTimeNow()
end

Remotes.State.OnClientEvent:Connect(function(view)
	App.view = view
	App.changed:Fire()
end)

return App
