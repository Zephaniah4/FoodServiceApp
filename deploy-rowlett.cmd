@echo off
setlocal
cd /d "%~dp0"
echo Building Rowlett...
call npm --prefix client run build:rowlett
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Deploying to Firebase project fsa-rowlett...
call firebase deploy --only hosting --project fsa-rowlett
if errorlevel 1 (
  echo Deploy failed.
  pause
  exit /b 1
)
echo Deploy complete.
pause
