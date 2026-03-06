@echo off
cd /d "%~dp0client"
call npm run start:plano
if errorlevel 1 pause
