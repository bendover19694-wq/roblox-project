@echo off
rem Removes the Agent HQ login autostart and desktop shortcut.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent-hq-autostart.ps1" -Remove
pause
