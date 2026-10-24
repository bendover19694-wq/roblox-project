@echo off
rem Makes Agent HQ always on: starts it hidden at every Windows sign-in and adds an "Agent HQ" desktop shortcut.
rem Undo with uninstall-agent-hq-autostart.bat.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0agent-hq-autostart.ps1"
pause
