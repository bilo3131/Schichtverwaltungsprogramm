@echo off
REM ===========================================
REM Quick Update Script für Windows
REM ===========================================
REM Baut Frontend und lädt es auf den Server
REM ===========================================

echo ==========================================
echo   Schichtplan - Update auf Server
echo ==========================================
echo.

REM Variablen - PASSE DIESE AN!
set SERVER_USER=your-user
set SERVER_HOST=bilal-alac.de
set SERVER_PATH=/var/www/schichtplan

echo [1/4] Baue Frontend...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] npm install fehlgeschlagen!
    pause
    exit /b 1
)

call ng build --configuration production
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Frontend Build fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [2/4] Lade Backend-Dateien hoch...
echo HINWEIS: Du musst WinSCP oder FileZilla nutzen für den Upload
echo.
echo Backend-Dateien zu uploaden:
echo   - backend/subscriptions/models.py
echo   - backend/subscriptions/serializers.py
echo.
echo Ziel auf Server: %SERVER_PATH%/backend/subscriptions/
echo.
pause

echo.
echo [3/4] Lade Frontend auf Server...
echo HINWEIS: Nutze WinSCP/FileZilla oder das WSL
echo.
echo Quelle: frontend\dist\frontend\browser\*
echo Ziel: %SERVER_HOST%:%SERVER_PATH%/frontend/
echo.
echo Alternativ mit WSL (wenn installiert):
echo   wsl rsync -avz --delete dist/frontend/browser/ %SERVER_USER%@%SERVER_HOST%:%SERVER_PATH%/frontend/
echo.
pause

echo.
echo [4/4] Server-Services neu starten
echo.
echo Führe auf dem Server aus (via PuTTY/SSH):
echo   cd /var/www/schichtplan
echo   git pull origin main
echo   cd backend
echo   source venv/bin/activate
echo   python manage.py migrate --settings=schichtplan.settings_production
echo   sudo systemctl restart schichtplan
echo   sudo systemctl reload nginx
echo.
echo ==========================================
echo   Update-Vorbereitung abgeschlossen
echo ==========================================
echo.
echo Nächste Schritte:
echo 1. Lade Dateien mit WinSCP/FileZilla hoch
echo 2. Verbinde per SSH und starte Services neu
echo 3. Teste die Anwendung: https://bilal-alac.de
echo.
pause
