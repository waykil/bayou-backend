@echo off
cd /d "%~dp0"
REM Kullanicidan link bilgisini al
echo.
echo ===================================================
echo   YAYINI BASLATMAK ICIN YOUTUBE ID GIRIN
echo   (Sadece yerel test icin hicbir sey yazmadan ENTER'a bas!)
echo ===================================================
echo.
set /p "link=Yayin ID veya Enter: "

REM Hicbir dizin degisikligi yapma (Mevcut dizinde kal)
REM node komutunu calistir, dosya adini dogru kullan.
node server.js "%link%"

REM Kapanmadan once bekle
pause