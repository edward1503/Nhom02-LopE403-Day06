@echo off
echo ==============================================
echo   AI Tutor - Local + Public Access Launcher
echo ==============================================

:: Terminal 1: Backend FastAPI
start "Backend (port 8000)" cmd /k "cd /d %~dp0 && .venv\Scripts\activate && set PYTHONPATH=. && python src/api/app.py"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Terminal 2: Frontend Next.js
start "Frontend (port 3000)" cmd /k "cd /d %~dp0\frontend && npm run dev"

:: Wait for frontend to start
timeout /t 5 /nobreak >nul

:: Terminal 3: Cloudflare Tunnel
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo Tat ca dich vu da khoi dong!
echo.
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - Xem cua so "Cloudflare Tunnel" de lay URL public
echo   Vi du: https://abc-xyz.trycloudflare.com
echo.
echo Sau khi co URL tunnel, cap nhat next.config.mjs neu can.
pause
