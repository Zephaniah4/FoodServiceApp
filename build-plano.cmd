@echo off
cd /d "%~dp0client"
call npm run build:plano
if errorlevel 1 pause
