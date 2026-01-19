@echo off
title BAYOU SATIS PANELI
color 0b
cls
echo ==================================================
echo           BAYOU PRO - LISANS YONETIMI
echo ==================================================
echo.
echo [1] 30 GUNLUK (AYLIK)
echo [2] 90 GUNLUK (3 AYLIK)
echo [3] 365 GUNLUK (YILLIK)
echo [4] SINIRSIZ (9999 GUN)
echo.
set /p secim="Lisans Turunu Secin (1-4): "

if "%secim%"=="1" set days=30
if "%secim%"=="2" set days=90
if "%secim%"=="3" set days=365
if "%secim%"=="4" set days=9999

:: JS dosyasini calistir
cd /d "C:\Users\user\Desktop\canlimars"
node lib_generator.js %days%

echo.
echo ==================================================
echo       GITHUB'A YUKLE VE AKTIF ET? (E/H)
echo ==================================================
set /p yukle="Seciminiz: "

if /i "%yukle%"=="E" (
    echo.
    echo Sunucuya yukleniyor...
    "C:\Program Files\Git\bin\git.exe" add .
    "C:\Program Files\Git\bin\git.exe" commit -m "Yeni Lisans Eklendi - %date%"
    "C:\Program Files\Git\bin\git.exe" push origin main
    echo.
    echo ? ISLEM TAMAM! Lisans Render.com'da aktif ediliyor...
) else (
    echo.
    echo [!] Lisans yerel dosyaya eklendi ama sunucuya yuklenmedi.
)

pause
