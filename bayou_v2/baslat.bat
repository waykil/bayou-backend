@echo off
chcp 65001 >nul
title Bayou v2 - Başlatıcı
cd /d "%~dp0"

set /p vid="YouTube Video ID girin: "
node server.js %vid%
pause
