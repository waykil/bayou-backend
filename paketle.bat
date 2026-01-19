@echo off
chcp 65001 >nul
title Bayou Software Packager

cd /d "%~dp0"

echo ---------------------------------------------------
echo [1/3] Obfuscating Source Code (server.js)...
echo ---------------------------------------------------

if not exist server.js (
    echo [HATA] server.js bulunamadi!
    pause
    exit /b
)

:: Obfuscator ayarlarını pkg uyumlu hale getirmek için --reserved-words ekliyoruz
call javascript-obfuscator server.js --output server_locked.js --compact true --self-defending false --string-array true --string-array-encoding base64 --string-array-threshold 1 --reserved-strings "node-machine-id" "express" "ws" "puppeteer" "path" "http" "fs" "crypto"

echo.
echo ---------------------------------------------------
echo [2/3] Compiling to EXE...
echo ---------------------------------------------------

if not exist server_locked.js (
    echo [HATA] Karistirilmis dosya olusturulamadi.
    pause
    exit /b
)

:: package.json daki bin ayarını kullanarak tam paketleme yapar
call pkg . --output "Bayou.exe"

echo.
echo ---------------------------------------------------
echo [3/3] Cleaning up...
echo ---------------------------------------------------
if exist server_locked.js del server_locked.js

echo.
echo ===================================================
echo BUILD COMPLETE!
echo ===================================================
echo "Bayou.exe" is ready for distribution.
echo ===================================================
pause
