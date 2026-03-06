@echo off
setlocal
cd /d "%~dp0"
echo Building Garland...
call npm --prefix client run build:garland
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Deploying to Firebase project fsa-garland...
call firebase deploy --only hosting --project fsa-garland
if errorlevel 1 (
  echo Deploy failed.
  pause
  exit /b 1
)
echo Deploy complete.
pause
