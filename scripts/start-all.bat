@echo off
REM ============================================================
REM College Staff Daily Activity Recording System
REM Windows startup script — starts both backend and frontend
REM ============================================================

echo.
echo  ====================================================
echo   College Staff Diary System — Starting Services...
echo  ====================================================
echo.

REM Start backend
echo [1/2] Starting Backend (port 5000)...
start "Staff Diary - Backend" cmd /k "cd /d %~dp0 && node backend\server.js"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend dev server
echo [2/2] Starting Frontend (port 3000)...
start "Staff Diary - Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo  ====================================================
echo   Both services are starting in separate windows.
echo   
echo   Backend API:  http://localhost:5000
echo   Frontend App: http://localhost:3000
echo   
echo   For LAN access, replace localhost with your
echo   server's IP (run: ipconfig to find it)
echo  ====================================================
echo.
pause
