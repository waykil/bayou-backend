@echo off
title Bayou PRO - V3
cd /d "%~dp0"
if not exist node_modules (
    echo Gerekli kutuphaneler yukleniyor...
    npm install express axios node-machine-id ws puppeteer
)
cls
node server.js
pause
