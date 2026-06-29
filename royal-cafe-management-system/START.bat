@echo off
title Royal Cafe - Starting Server
color 0A
echo.
echo  =========================================
echo   Royal Cafe Management System v3.0
echo   No MySQL needed - Pure JavaScript DB
echo  =========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Cleaning old packages...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo [2/3] Installing packages (this takes 1-2 min)...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo ERROR: npm install failed!
  echo Make sure Node.js is installed: https://nodejs.org
  echo Download the LTS version (not latest)
  pause
  exit
)

echo.
echo [3/3] Starting Royal Cafe server...
echo.
echo  =========================================
echo   Open your browser: http://localhost:5000
echo  =========================================
echo.
echo  LOGIN DETAILS:
echo   Admin:   admin@royalcafe.com   / admin123
echo   Manager: manager@royalcafe.com / admin123
echo   Waiter:  waiter@royalcafe.com  / admin123
echo   Kitchen: kitchen@royalcafe.com / admin123
echo.
echo  NEW FEATURES:
echo   Loyalty and Rewards  - Admin sidebar
echo   Waiter Calls         - Admin sidebar
echo   AI Chatbot           - Customer portal - Chat tab
echo   Call Staff buttons   - Customer portal - Call Staff tab
echo.
echo  Press Ctrl+C to stop
echo.
node server.js
pause
