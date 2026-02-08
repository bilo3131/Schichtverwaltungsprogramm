# 🛡️ Sicherheitsleitfaden - Fehler vermeiden & beheben

## ⚠️ Was passiert wenn die falsche Settings-Datei hochgeladen wird?

### Wenn `settings.py` (Development) auf Production läuft:

#### **Kritische Probleme:**
1. ❌ **DEBUG=True** → Zeigt Stack Traces und sensible Daten öffentlich
2. ❌ **SQLite statt PostgreSQL** → Verwendet falsche Datenbank
3. ❌ **ALLOWED_HOSTS=[]** → Server nicht erreichbar
4. ❌ **Keine HTTPS-Erzwingung** → Unsichere Verbindungen möglich
5. ❌ **CORS offen** → Sicherheitsrisiko

#### **Symptome:**
- 🔴 Server gibt 400 Bad Request zurück
- 🔴 Website zeigt Fehlerseiten mit allen Details
- 🔴 Datenbank-Änderungen gehen in SQLite statt PostgreSQL
- 🔴 API nicht erreichbar

**Gute Nachricht:** Deine PostgreSQL-Datenbank bleibt unberührt! Die falschen Settings würden nur SQLite verwenden.

---

## 🛡️ Präventive Maßnahmen

### 1. **Git Config: Production Settings nie committen**

Die `settings_production.py` sollte NIEMALS ins Git Repository!

Lass mich die `.gitignore` erweitern:

```gitignore
# Production Settings (niemals committen!)
backend/schichtplan/settings_production.py
backend/schichtplan/settings_prod.py
```

### 2. **Check-Script vor Deployment**

Auf dem Server sollte geprüft werden, welche Settings aktiv sind:

```bash
# Prüfe aktuelle Settings
cat /etc/systemd/system/schichtplan.service | grep DJANGO_SETTINGS_MODULE
```

Sollte zeigen: `DJANGO_SETTINGS_MODULE=schichtplan.settings_production`

### 3. **Automatisches Backup vor jedem Update**

Vor jedem Deployment automatisch Backup erstellen.

---

## 💾 Backup-Strategie

### **Option 1: Manuelles Backup**

```bash
# Auf dem Server ausführen
sudo bash backup-server.sh
```

Erstellt Backups von:
- ✅ Datenbank (PostgreSQL)
- ✅ Backend Code
- ✅ Frontend Code
- ✅ Alle Config-Dateien (nginx, systemd, .env)

### **Option 2: Automatisches tägliches Backup**

```bash
# Auf dem Server
sudo cp backup-server.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-server.sh

# Crontab einrichten
sudo crontab -e

# Füge hinzu (täglich um 2 Uhr nachts):
0 2 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplan-backup.log 2>&1
```

### **Backup-Speicherort:**
- `/var/backups/schichtplan/database/` - Datenbank-Dumps
- `/var/backups/schichtplan/code/` - Code-Backups
- `/var/backups/schichtplan/configs/` - Config-Dateien

---

## 🔄 Rollback durchführen

### **Schnell-Rollback (wenn falsche Datei hochgeladen)**

#### 1. **Sofort: Services stoppen**
```bash
ssh user@bilal-alac.de
sudo systemctl stop schichtplan
```

#### 2. **Rollback ausführen**
```bash
# Interaktives Rollback-Script
sudo bash rollback-server.sh
```

Das Script zeigt dir alle verfügbaren Backups und lässt dich wählen:
1. Nur Datenbank wiederherstellen
2. Nur Backend Code wiederherstellen
3. Nur Frontend wiederherstellen
4. Nur Config-Dateien wiederherstellen
5. Kompletter Rollback

#### 3. **Manuelle Wiederherstellung (falls nötig)**

**Backend wiederherstellen:**
```bash
# Neuestes Backup finden
ls -lh /var/backups/schichtplan/code/

# Wiederherstellen
cd /var/www/schichtplan
sudo systemctl stop schichtplan
sudo mv backend backend_broken
sudo tar -xzf /var/backups/schichtplan/code/backend_DATUMZEIT.tar.gz
sudo systemctl start schichtplan
```

**Datenbank wiederherstellen:**
```bash
# Neuestes Backup finden
ls -lh /var/backups/schichtplan/database/

# Wiederherstellen
sudo systemctl stop schichtplan
gunzip -c /var/backups/schichtplan/database/db_TIMESTAMP.sql.gz | sudo -u postgres psql schichtplan
sudo systemctl start schichtplan
```

**Configs wiederherstellen:**
```bash
sudo tar -xzf /var/backups/schichtplan/configs/configs_DATE.tar.gz -C /
sudo systemctl daemon-reload
sudo systemctl restart schichtplan
sudo systemctl reload nginx
```

---

## 🚨 Notfall-Prozedur

### Wenn alles schief geht:

#### **Schritt 1: Schadensbegrenzung**
```bash
# Services stoppen
sudo systemctl stop schichtplan
sudo systemctl stop nginx

# Prüfe Logs
sudo journalctl -u schichtplan -n 100
sudo tail -f /var/log/nginx/error.log
```

#### **Schritt 2: Backup verifizieren**
```bash
# Zeige alle Backups
ls -lh /var/backups/schichtplan/database/
ls -lh /var/backups/schichtplan/code/

# Prüfe letztes Backup
gunzip -c /var/backups/schichtplan/database/db_*.sql.gz | head -n 20
```

#### **Schritt 3: Schritt-für-Schritt Rollback**
```bash
# 1. Datenbank zurücksetzen
sudo -u postgres psql -c "DROP DATABASE IF EXISTS schichtplan;"
sudo -u postgres psql -c "CREATE DATABASE schichtplan OWNER schichtplan_user;"
gunzip -c /var/backups/schichtplan/database/db_LATEST.sql.gz | sudo -u postgres psql schichtplan

# 2. Code wiederherstellen
cd /var/www/schichtplan
sudo rm -rf backend_broken
sudo tar -xzf /var/backups/schichtplan/code/backend_LATEST.tar.gz

# 3. Services neu starten
sudo systemctl start schichtplan
sudo systemctl start nginx

# 4. Testen
curl https://bilal-alac.de/api/v1/health/
```

---

## 🔍 Prüfung nach Rollback

```bash
# 1. Service Status
sudo systemctl status schichtplan
sudo systemctl status nginx

# 2. Welche Settings sind aktiv?
ps aux | grep gunicorn
# Sollte zeigen: --env DJANGO_SETTINGS_MODULE=schichtplan.settings_production

# 3. Datenbank Verbindung
cd /var/www/schichtplan/backend
source venv/bin/activate
python manage.py dbshell --settings=schichtplan.settings_production
\l  # Liste Datenbanken
\q  # Beenden

# 4. API Test
curl https://bilal-alac.de/api/v1/subscriptions/check_limits/ \
  -H "Authorization: Token YOUR_TOKEN"
```

---

## 📝 Checkliste: Vor jedem Update

- [ ] Backup erstellen: `sudo bash backup-server.sh`
- [ ] Verifizieren dass Backup erfolgreich: `ls /var/backups/schichtplan/database/`
- [ ] Git Status prüfen: `git status`
- [ ] Keine settings_production.py im Commit: `git diff`
- [ ] Update durchführen
- [ ] Services neu starten
- [ ] Funktionalität testen
- [ ] Bei Fehler: Rollback mit `sudo bash rollback-server.sh`

---

## 🎯 Best Practices

### **1. Niemals direkt editieren**
❌ `settings_production.py` niemals direkt auf dem Server editieren
✅ Änderungen in `settings_production_template.py` lokal testen, dann als neue Datei hochladen

### **2. .env für Secrets**
✅ Alle sensiblen Daten in `.env` Datei
✅ `.env` ist in `.gitignore`
✅ `.env` wird regelmäßig gesichert

### **3. Test-Environment**
✅ Änderungen erst lokal testen
✅ Dann auf Test-Server (wenn vorhanden)
✅ Erst dann auf Production

### **4. Dokumentation**
✅ Jede Änderung dokumentieren
✅ Backup vor jeder Änderung
✅ Rollback-Plan bereithalten

---

## 💡 Quick Reference

| Problem | Lösung |
|---------|--------|
| Falsche Settings hochgeladen | `sudo bash rollback-server.sh` → Backend wählen |
| Datenbank korrupt | `sudo bash rollback-server.sh` → Datenbank wählen |
| Frontend zeigt Fehler | `sudo bash rollback-server.sh` → Frontend wählen |
| Kompletter Ausfall | `sudo bash rollback-server.sh` → Alles wiederherstellen |
| Service startet nicht | `sudo journalctl -u schichtplan -n 100` |
| Nginx Fehler | `sudo tail -f /var/log/nginx/error.log` |

---

## 📞 Eskalation

Wenn Rollback nicht hilft:

1. **Logs sammeln:**
   ```bash
   sudo journalctl -u schichtplan > /tmp/schichtplan.log
   sudo cat /var/log/nginx/error.log > /tmp/nginx.log
   ```

2. **Backup-Status prüfen:**
   ```bash
   du -sh /var/backups/schichtplan/
   find /var/backups/schichtplan -type f -ls
   ```

3. **System-Neustart (letzter Ausweg):**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart postgresql
   sudo systemctl restart schichtplan
   sudo systemctl restart nginx
   ```

---

## ✅ Zusammenfassung

- ✅ **Backups laufen automatisch** (täglich um 2 Uhr)
- ✅ **Rollback-Script vorhanden** (`rollback-server.sh`)
- ✅ **Manuelle Wiederherstellung dokumentiert**
- ✅ **Präventive Maßnahmen implementiert**
- ✅ **Notfall-Prozedur definiert**

**Du bist geschützt!** Selbst wenn die falsche Datei hochgeladen wird, kannst du innerhalb von Minuten den vorherigen Zustand wiederherstellen.
