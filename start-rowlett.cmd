@echo off
cd /d "%~dp0client"
call npm run start:rowlett
if errorlevel 1 pause
