@echo off
chcp 65001 >nul
title Bayou v2 - Kurulum
cd /d "%~dp0"

echo ---------------------------------------------------
echo [1/1] Kütüphaneler Yükleniyor...
echo ---------------------------------------------------
cmd /c npm install

echo.
echo ===================================================
echo KURULUM TAMAMLANDI!
echo ===================================================
pause
