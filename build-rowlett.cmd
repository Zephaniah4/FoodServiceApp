@echo off
cd /d "%~dp0client"
call npm run build:rowlett
if errorlevel 1 pause
