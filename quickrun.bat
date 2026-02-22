@echo off
cls
echo ============================================
echo    Food Donation App
echo ============================================
echo.
echo 🚀 Starting server...
echo.
echo ✅ Server running at: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo ============================================
echo.

cd /d "%~dp0"
node server.js