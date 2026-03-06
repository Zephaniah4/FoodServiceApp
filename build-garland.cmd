@echo off
cd /d "%~dp0client"
call npm run build:garland
if errorlevel 1 pause
