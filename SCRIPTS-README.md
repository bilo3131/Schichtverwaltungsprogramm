# 📦 Backup & Rollback Scripts

Sammlung von Scripts für sicheres Deployment und schnelle Wiederherstellung.

## 📋 Übersicht

| Script | Verwendung | Wo ausführen? |
|--------|-----------|---------------|
| `backup-server.sh` | Erstellt komplettes Backup | Server |
| `rollback-server.sh` | Interaktives Rollback | Server |
| `pre-deployment-check.sh` | Prüft vor Deployment | Lokal |
| `update-server.sh` | Automatisches Update | Lokal oder Server |

---

## 🚀 Schnellstart

### 1️⃣ Vor dem ersten Deployment

**Backup-Script auf Server installieren:**
```bash
# Lokal: Scripts auf Server kopieren
scp backup-server.sh rollback-server.sh user@bilal-alac.de:/tmp/

# Auf Server: Scripts installieren
ssh user@bilal-alac.de
sudo mv /tmp/backup-server.sh /usr/local/bin/
sudo mv /tmp/rollback-server.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/*.sh

# Automatisches Backup einrichten (täglich 2 Uhr nachts)
sudo crontab -e
# Füge hinzu:
# 0 2 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplan-backup.log 2>&1
```

### 2️⃣ Vor jedem Update

**Prüfung und Backup:**
```bash
# Lokal: Pre-Deployment Check
bash pre-deployment-check.sh

# Auf Server: Backup erstellen
ssh user@bilal-alac.de "sudo /usr/local/bin/backup-server.sh"
```

### 3️⃣ Wenn etwas schief geht

**Rollback durchführen:**
```bash
# Auf Server
ssh user@bilal-alac.de
sudo /usr/local/bin/rollback-server.sh
```

---

## 📖 Detaillierte Anleitungen

### `backup-server.sh` - Backup erstellen

**Was wird gesichert:**
- PostgreSQL Datenbank
- Backend Code
- Frontend Code
- Konfigurationsdateien (.env, nginx, systemd)

**Ausführen:**
```bash
# Auf dem Server
sudo bash backup-server.sh
```

**Backup-Speicherort:**
```
/var/backups/schichtplan/
├── database/
│   └── db_20260208_140530.sql.gz
├── code/
│   ├── backend_20260208.tar.gz
│   └── frontend_20260208.tar.gz
└── configs/
    └── configs_20260208.tar.gz
```

**Automatisierung:**
```bash
# Täglich um 2 Uhr nachts
sudo crontab -e
0 2 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplan-backup.log 2>&1

# Logs anschauen
tail -f /var/log/schichtplan-backup.log
```

---

### `rollback-server.sh` - Wiederherstellung

**Interaktives Rollback-Menü:**

```bash
sudo bash rollback-server.sh
```

**Optionen:**
1. **Nur Datenbank** - Bei Datenverlust oder -korruption
2. **Nur Backend** - Bei Code-Problemen im Backend
3. **Nur Frontend** - Bei Frontend-Problemen
4. **Nur Configs** - Bei Settings-Problemen
5. **Komplettes Rollback** - Alles zurücksetzen

**Ablauf:**
1. Script zeigt verfügbare Backups mit Datum und Größe
2. Du wählst das gewünschte Backup
3. Bestätigung erforderlich (`yes` eingeben)
4. Automatische Wiederherstellung
5. Services werden neu gestartet

**Beispiel:**
```bash
$ sudo bash rollback-server.sh

==========================================
  Schichtplan - Rollback Script
==========================================

WARNUNG: Dieser Vorgang überschreibt den aktuellen Code!

Was möchtest du wiederherstellen?

1) Datenbank
2) Backend Code
3) Frontend Code
4) Konfigurationsdateien
5) Alles (Datenbank + Code + Configs)
0) Abbrechen

Deine Wahl: 2

Verfügbare Backend-Backups:

 1) backend_20260208.tar.gz (12M, 2026-02-08 14:30)
 2) backend_20260207.tar.gz (12M, 2026-02-07 14:30)
 3) backend_20260206.tar.gz (11M, 2026-02-06 14:30)

Wähle eine Nummer (oder 0 zum Abbrechen): 1
Backend wirklich wiederherstellen? (yes/no): yes

► Erstelle Backup des aktuellen Zustands...
► Stoppe Services...
► Stelle Backend wieder her...
► Starte Services...
✓ Backend wiederhergestellt
```

---

### `pre-deployment-check.sh` - Vor Deployment prüfen

**Was wird geprüft:**
- ✅ Keine settings_production.py im Git
- ✅ Keine .env Dateien im Git
- ✅ Backend Tests durchlaufen
- ✅ Frontend baut erfolgreich
- ✅ DEBUG=False in Production Settings
- ✅ Keine uncommitted Changes

**Ausführen:**
```bash
# Lokal, vor jedem Deployment
bash pre-deployment-check.sh
```

**Beispiel-Output:**
```
==========================================
  Pre-Deployment Check
==========================================

► Prüfe Git Status...
✓ Keine Production Settings im Git
✓ Keine .env Dateien im Git

► Prüfe Backend Tests...
✓ Backend Tests erfolgreich

► Prüfe Frontend Build...
✓ Frontend Build erfolgreich

► Prüfe Production Settings...
✓ DEBUG=False in Production Template

► Prüfe Git Status...
✓ Alle Änderungen committed

==========================================
  Zusammenfassung
==========================================
✓ Alle Prüfungen bestanden!
Bereit für Deployment.
```

---

## 🆘 Notfall-Szenarien

### Szenario 1: Falsche Settings hochgeladen

**Problem:** `settings.py` (Development) statt `settings_production.py` hochgeladen

**Lösung:**
```bash
ssh user@bilal-alac.de
sudo systemctl stop schichtplan
sudo /usr/local/bin/rollback-server.sh
# Wähle Option 2 (Backend Code)
# Wähle neuestes Backup
```

**Zeit:** ~2 Minuten

---

### Szenario 2: Datenbank beschädigt

**Problem:** Nach Migrations-Fehler ist Datenbank inkonsistent

**Lösung:**
```bash
ssh user@bilal-alac.de
sudo /usr/local/bin/rollback-server.sh
# Wähle Option 1 (Datenbank)
# Wähle letztes funktionierendes Backup
```

**Zeit:** ~1 Minute

---

### Szenario 3: Update schief gelaufen

**Problem:** Nach Update funktioniert nichts mehr

**Lösung:**
```bash
ssh user@bilal-alac.de
sudo /usr/local/bin/rollback-server.sh
# Wähle Option 5 (Alles)
# Wähle jeweils neuestes Backup für DB, Backend, Frontend
```

**Zeit:** ~5 Minuten

---

### Szenario 4: Kompletter Server-Crash

**Problem:** Server neu gestartet, Services laufen nicht

**Lösung:**
```bash
ssh user@bilal-alac.de

# Services manuell starten
sudo systemctl start postgresql
sudo systemctl start schichtplan
sudo systemctl start nginx

# Status prüfen
sudo systemctl status schichtplan
sudo systemctl status nginx

# Falls immer noch Probleme
sudo journalctl -u schichtplan -n 100
```

---

## 🔄 Workflow-Empfehlung

### Standard-Update-Prozess

```bash
# 1. LOKAL: Pre-Check
bash pre-deployment-check.sh

# 2. LOKAL: Git Push
git add .
git commit -m "Deine Änderungen"
git push origin main

# 3. SERVER: Backup
ssh user@bilal-alac.de "sudo /usr/local/bin/backup-server.sh"

# 4. SERVER: Update
ssh user@bilal-alac.de
cd /var/www/schichtplan
git pull origin main
cd backend && source venv/bin/activate
python manage.py migrate --settings=schichtplan.settings_production
sudo systemctl restart schichtplan

# 5. LOKAL: Frontend Update
cd frontend
ng build --configuration production
scp -r dist/frontend/browser/* user@bilal-alac.de:/var/www/schichtplan/frontend/

# 6. SERVER: Nginx reload
ssh user@bilal-alac.de "sudo systemctl reload nginx"

# 7. TESTEN
curl https://bilal-alac.de
```

**Bei Problemen:**
```bash
# Sofort Rollback
ssh user@bilal-alac.de
sudo /usr/local/bin/rollback-server.sh
```

---

## 📊 Backup-Überwachung

### Backup-Status prüfen

```bash
# Auf Server
ssh user@bilal-alac.de

# Verfügbare Backups anzeigen
ls -lh /var/backups/schichtplan/database/
ls -lh /var/backups/schichtplan/code/

# Gesamtgröße
du -sh /var/backups/schichtplan/

# Ältestes Backup
find /var/backups/schichtplan -type f -printf '%T+ %p\n' | sort | head -1

# Neuestes Backup
find /var/backups/schichtplan -type f -printf '%T+ %p\n' | sort | tail -1

# Backup-Log ansehen
tail -f /var/log/schichtplan-backup.log
```

### Backup-Integrität prüfen

```bash
# Datenbank-Backup testen
gunzip -c /var/backups/schichtplan/database/db_latest.sql.gz | head -n 20

# Code-Backup testen
tar -tzf /var/backups/schichtplan/code/backend_latest.tar.gz | head -n 10
```

---

## 🔧 Konfiguration

### Backup-Retention anpassen

**In `backup-server.sh` Zeile 11:**
```bash
RETENTION_DAYS=7  # Ändere auf gewünschte Anzahl Tage
```

Empfehlungen:
- **7 Tage** - Für kleine Projekte
- **30 Tage** - Für Production
- **90 Tage** - Für kritische Anwendungen

### Backup-Speicherort ändern

**In `backup-server.sh` Zeile 10:**
```bash
BACKUP_DIR="/var/backups/schichtplan"  # Eigener Pfad
```

---

## 📞 Support

**Bei Fragen oder Problemen:**

1. **Logs prüfen:**
   ```bash
   sudo journalctl -u schichtplan -n 100
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Backup-Status:**
   ```bash
   ls -lh /var/backups/schichtplan/
   ```

3. **Rollback durchführen:**
   ```bash
   sudo /usr/local/bin/rollback-server.sh
   ```

---

## ✅ Checkliste

- [ ] Backup-Script auf Server installiert
- [ ] Rollback-Script auf Server installiert
- [ ] Automatisches Backup eingerichtet (Crontab)
- [ ] Pre-Deployment Check getestet
- [ ] Erstes manuelles Backup erstellt
- [ ] Rollback-Prozess geübt (auf Test-Umgebung)
- [ ] Backup-Logs überwacht
- [ ] Team über Rollback-Prozess informiert

**Jetzt bist du geschützt!** 🛡️
