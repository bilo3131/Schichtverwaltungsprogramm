@echo off
REM ===========================================
REM Backup-Scripts Upload Helper für Windows
REM ===========================================

echo ==========================================
echo   Backup-Scripts auf Server installieren
echo ==========================================
echo.

echo Dieses Script bereitet die Upload-Dateien vor.
echo.
echo SCHRITT 1: Mit WinSCP hochladen
echo ----------------------------------------
echo 1. WinSCP herunterladen: https://winscp.net/
echo 2. Verbinden zu: bilal-alac.de
echo 3. Diese Dateien nach /tmp/ hochladen:
echo    - backup-server.sh
echo    - rollback-server.sh
echo    - pre-deployment-check.sh
echo.
pause

echo.
echo SCHRITT 2: Per SSH zum Server verbinden
echo ----------------------------------------
echo Mit PuTTY oder Windows Terminal:
echo   ssh USERNAME@bilal-alac.de
echo.
pause

echo.
echo SCHRITT 3: Auf dem Server ausführen
echo ----------------------------------------
echo Kopiere diese Befehle in deine SSH-Session:
echo.
echo # Scripts installieren
echo sudo mv /tmp/backup-server.sh /usr/local/bin/
echo sudo mv /tmp/rollback-server.sh /usr/local/bin/
echo sudo mv /tmp/pre-deployment-check.sh /usr/local/bin/
echo sudo chmod +x /usr/local/bin/*.sh
echo.
echo # Backup-Verzeichnis erstellen
echo sudo mkdir -p /var/backups/schichtplan/{database,code,configs}
echo.
echo # Erstes Test-Backup
echo sudo /usr/local/bin/backup-server.sh
echo.
pause

echo.
echo SCHRITT 4: Automatisches Backup einrichten
echo ----------------------------------------
echo Auf dem Server ausführen:
echo   sudo crontab -e
echo.
echo Diese Zeile hinzufügen:
echo   0 2 * * * /usr/local/bin/backup-server.sh ^>^> /var/log/schichtplan-backup.log 2^>^&1
echo.
echo Speichern mit: Ctrl+O, Enter, Ctrl+X
echo.
pause

echo.
echo ==========================================
echo   Installation abgeschlossen!
echo ==========================================
echo.
echo Was du jetzt hast:
echo   - Automatische tägliche Backups
echo   - Rollback in 2 Minuten
echo   - Schutz vor Fehlern
echo.
echo Teste das Rollback-Script:
echo   sudo /usr/local/bin/rollback-server.sh
echo   (Wähle 0 zum Abbrechen)
echo.
echo Detaillierte Anleitung: INSTALLATION-SCRIPTS.md
echo Schnellstart: QUICKSTART-BACKUP.md
echo.
pause
