local t0 = os.clock()
while os.clock() - t0 < 55 do
	for _, c in workspace:GetChildren() do
		if c.Name == "Crate" then return "crates ready after " .. math.floor(os.clock() - t0) .. "s" end
	end
	task.wait(0.5)
end
return "no crates (first ships may have been mimics)"
