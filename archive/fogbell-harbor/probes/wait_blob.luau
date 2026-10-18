local t0 = os.clock()
while os.clock() - t0 < 58 do
	if workspace:FindFirstChild("MimicBlob") then return "blob loose after " .. math.floor(os.clock() - t0) .. "s" end
	task.wait(0.25)
end
return "no blob yet"
