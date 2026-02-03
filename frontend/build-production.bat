@echo off
REM ===========================================
REM Frontend Build Script für Windows
REM ===========================================
REM Dieses Script baut das Angular Frontend
REM für Production (Windows Version)
REM 
REM Ausführen: build-production.bat
REM ===========================================

echo ==========================================
echo Frontend Production Build für Schichtplan
echo ==========================================
echo.

REM Prüfe ob Node.js installiert ist
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Node.js ist nicht installiert!
    pause
    exit /b 1
)

REM Prüfe ob Angular CLI installiert ist
where ng >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNUNG] Angular CLI ist nicht installiert. Installiere...
    npm install -g @angular/cli
)

echo [1/3] Dependencies installieren...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] npm install fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [2/3] Production Build erstellen...
echo Dies kann einige Minuten dauern...
call ng build --configuration production
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [3/3] Build-Informationen
echo Build-Verzeichnis: dist\frontend\browser
dir dist\frontend\browser

echo.
echo ==========================================
echo Build erfolgreich abgeschlossen!
echo ==========================================
echo.
echo Die Build-Dateien befinden sich in:
echo   frontend\dist\frontend\browser\
echo.
echo Naechste Schritte:
echo 1. Kopiere den Inhalt nach /var/www/schichtplan/frontend/ auf dem Server
echo 2. Oder verwende SCP/SFTP zum Upload
echo.
pause
