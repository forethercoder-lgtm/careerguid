@echo off
set ROOT=%~dp0

echo Stopping old server if running...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

start "SERVER" cmd /k "cd /d "%ROOT%server" && node index.js"
timeout /t 3 /nobreak >nul
start "CLIENT" cmd /k "cd /d "%ROOT%client" && npx vite --port 3000"
timeout /t 5 /nobreak >nul
start http://localhost:3000
