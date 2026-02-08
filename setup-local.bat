@echo off
REM ===========================================
REM Lokales Setup komplett neu aufsetzen
REM ===========================================

echo ==========================================
echo   Schichtplan - Lokales Setup
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/6] Wechsle ins Backend-Verzeichnis...
cd backend

echo.
echo [2/6] Aktiviere Virtual Environment...
call env\Scripts\activate
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Virtual Environment nicht gefunden!
    echo Erstelle Virtual Environment...
    python -m venv env
    call env\Scripts\activate
    pip install -r requirements.txt
)

echo.
echo [3/6] Lösche alte Datenbank (falls vorhanden)...
if exist db.sqlite3 (
    del db.sqlite3
    echo ✓ Alte Datenbank gelöscht
)

echo.
echo [4/6] Erstelle neue Datenbank...
python manage.py migrate
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Migration fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [5/6] Erstelle Test-User...
python create_test_user.py
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] User-Erstellung fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [6/6] Erstelle Default Subscriptions...
python create_default_subscriptions.py

echo.
echo ==========================================
echo   Setup abgeschlossen!
echo ==========================================
echo.
echo JETZT starte Backend und Frontend:
echo.
echo Terminal 1 (Backend):
echo   cd backend
echo   env\Scripts\activate
echo   python manage.py runserver
echo.
echo Terminal 2 (Frontend):
echo   cd frontend
echo   ng serve
echo.
echo Browser öffnen: http://localhost:4200
echo.
echo Login-Daten:
echo   Benutzername: admin
echo   Passwort: admin123
echo.
pause
