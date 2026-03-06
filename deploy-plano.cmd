@echo off
setlocal
cd /d "%~dp0"
echo Building Plano/Dallas...
call npm --prefix client run build:plano
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Deploying to Firebase project food-service-app-slc...
call firebase deploy --only hosting --project food-service-app-slc
if errorlevel 1 (
  echo Deploy failed.
  pause
  exit /b 1
)
echo Deploy complete.
pause
