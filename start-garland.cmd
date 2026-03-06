@echo off
cd /d "%~dp0client"
call npm run start:garland
if errorlevel 1 pause
