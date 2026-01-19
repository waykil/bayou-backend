@echo off
chcp 65001 >nul
title Bayou Environment Setup
color 0B

echo =====================================================
echo   Bayou Software - Environment Setup
echo =====================================================
echo.

:: Node.js check
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b
)

echo [1/3] checking package.json...
if not exist package.json (
    call npm init -y >nul
)

echo [2/3] Installing Bayou core dependencies...
call npm install express ws puppeteer path http node-machine-id >nul
echo [2.5/3] Installing browser engine (Internal)...
call npx puppeteer browsers install chrome

echo [3/3] Installation Complete.
echo.
echo [✓] All dependencies are ready.
echo.
pause
