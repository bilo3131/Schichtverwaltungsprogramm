# 🚀 Installation der Backup & Rollback Scripts

## Schritt-für-Schritt Anleitung

### 📋 Voraussetzungen

- SSH-Zugriff zu deinem Server (bilal-alac.de)
- Root/Sudo-Rechte
- PuTTY oder Windows Terminal (für SSH)
- WinSCP oder FileZilla (für Datei-Upload)

---

## 🔧 Installation

### **Schritt 1: Scripts auf Server hochladen**

#### Option A: Mit SCP (Windows PowerShell oder CMD)

```powershell
# Öffne PowerShell im Projekt-Verzeichnis
cd "c:\Code\2. Business\Schichtplan"

# Scripts hochladen (ersetze USER mit deinem Server-Benutzernamen)
scp backup-server.sh rollback-server.sh pre-deployment-check.sh USER@bilal-alac.de:/tmp/
```

#### Option B: Mit WinSCP (Einfacher für Windows)

1. **WinSCP öffnen:** https://winscp.net/
2. **Verbindung einrichten:**
   - Host: `bilal-alac.de`
   - Port: `22`
   - Username: `dein-username`
   - Passwort: `dein-passwort`
3. **Scripts hochladen:**
   - Links (lokal): `c:\Code\2. Business\Schichtplan\`
   - Rechts (Server): `/tmp/`
   - Ziehe diese Dateien rüber:
     - `backup-server.sh`
     - `rollback-server.sh`
     - `pre-deployment-check.sh`

---

### **Schritt 2: Per SSH auf Server verbinden**

#### Mit PuTTY:
1. PuTTY öffnen
2. Host: `bilal-alac.de`
3. Port: `22`
4. "Open" klicken
5. Mit deinem Benutzer und Passwort anmelden

#### Mit Windows Terminal / PowerShell:
```powershell
ssh USER@bilal-alac.de
```

---

### **Schritt 3: Scripts installieren**

```bash
# Auf dem Server ausführen:

# 1. Scripts nach /usr/local/bin verschieben
sudo mv /tmp/backup-server.sh /usr/local/bin/
sudo mv /tmp/rollback-server.sh /usr/local/bin/
sudo mv /tmp/pre-deployment-check.sh /usr/local/bin/

# 2. Ausführbar machen
sudo chmod +x /usr/local/bin/backup-server.sh
sudo chmod +x /usr/local/bin/rollback-server.sh
sudo chmod +x /usr/local/bin/pre-deployment-check.sh

# 3. Prüfen ob Scripts vorhanden sind
ls -lh /usr/local/bin/*.sh
```

**Erwartete Ausgabe:**
```
-rwxr-xr-x 1 root root 4.2K Feb  8 14:30 /usr/local/bin/backup-server.sh
-rwxr-xr-x 1 root root 6.1K Feb  8 14:30 /usr/local/bin/rollback-server.sh
-rwxr-xr-x 1 root root 2.8K Feb  8 14:30 /usr/local/bin/pre-deployment-check.sh
```

✅ **Scripts sind jetzt installiert!**

---

### **Schritt 4: Backup-Script anpassen**

Die Scripts sollten bereits die richtigen Werte haben, aber lass uns das prüfen:

```bash
# Backup-Script öffnen
sudo nano /usr/local/bin/backup-server.sh
```

Prüfe diese Zeilen (ca. Zeile 12-14):
```bash
DB_NAME="schichtplan"
DB_USER="schichtplan_user"
BACKUP_DIR="/var/backups/schichtplan"
PROJECT_DIR="/var/www/schichtplan"
```

**Passe die Werte an deine Konfiguration an:**
- `DB_NAME`: Name deiner PostgreSQL-Datenbank
- `DB_USER`: PostgreSQL-Benutzer für pg_dump
- `BACKUP_DIR`: Wo Backups gespeichert werden
- `PROJECT_DIR`: Wo dein Projekt liegt

**Speichern:** `Ctrl + O`, Enter, `Ctrl + X`

---

### **Schritt 5: Erstes Test-Backup erstellen**

```bash
# Backup-Verzeichnis erstellen
sudo mkdir -p /var/backups/schichtplan/{database,code,configs}

# Erstes Backup erstellen
sudo /usr/local/bin/backup-server.sh
```

**Erwartete Ausgabe:**
```
==========================================
  Schichtplan - Backup Script
  2026-02-08 14:30:45
==========================================

► Erstelle Datenbank-Backup...
✓ Datenbank gesichert (2.5M)

► Erstelle Backend-Code-Backup...
✓ Backend Code gesichert (12M)

► Erstelle Frontend-Backup...
✓ Frontend gesichert (5.2M)

► Erstelle Config-Backup...
✓ Konfigs gesichert (42K)

► Lösche alte Backups (älter als 7 Tage)...
✓ Bereinigung abgeschlossen (4 Backups verbleibend)

==========================================
  Backup-Übersicht
==========================================
...

==========================================
  ✓ Backup erfolgreich abgeschlossen!
==========================================

Backup-Speicherort: /var/backups/schichtplan
Gesamtgröße: 19.7M
```

✅ **Erstes Backup erfolgreich!**

---

### **Schritt 6: Automatisches tägliches Backup einrichten**

```bash
# Crontab als Root bearbeiten
sudo crontab -e
```

Wenn gefragt wird, welchen Editor: Wähle `nano` (normalerweise Option 1)

**Füge diese Zeile am Ende hinzu:**
```cron
# Schichtplan - Tägliches Backup um 2 Uhr nachts
0 2 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplan-backup.log 2>&1
```

**Speichern:** `Ctrl + O`, Enter, `Ctrl + X`

**Prüfen ob Crontab gesetzt ist:**
```bash
sudo crontab -l
```

✅ **Automatisches Backup eingerichtet!**

---

### **Schritt 7: Backup-Log-Datei erstellen**

```bash
# Log-Datei erstellen
sudo touch /var/log/schichtplan-backup.log
sudo chmod 644 /var/log/schichtplan-backup.log

# Log-Rotation einrichten (optional)
sudo tee /etc/logrotate.d/schichtplan-backup > /dev/null <<EOF
/var/log/schichtplan-backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

---

### **Schritt 8: Rollback-Script testen (ohne Ausführen)**

```bash
# Rollback-Menü anzeigen (Abbrechen mit Option 0)
sudo /usr/local/bin/rollback-server.sh
```

Du solltest das Menü sehen:
```
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

Deine Wahl:
```

**Wähle `0` zum Abbrechen** - Wir testen nur ob es funktioniert!

✅ **Rollback-Script funktioniert!**

---

## ✅ Installations-Checkliste

Prüfe ob alles installiert ist:

```bash
# 1. Scripts vorhanden?
ls -lh /usr/local/bin/{backup,rollback,pre-deployment-check}-server.sh

# 2. Backup-Verzeichnis existiert?
ls -lh /var/backups/schichtplan/

# 3. Erstes Backup vorhanden?
find /var/backups/schichtplan -type f -ls

# 4. Crontab gesetzt?
sudo crontab -l | grep backup-server.sh

# 5. Log-Datei existiert?
ls -lh /var/log/schichtplan-backup.log
```

**Alles zeigt Ausgaben?** ✅ **Installation komplett!**

---

## 🎯 Was du jetzt tun kannst

### Backup erstellen (jederzeit):
```bash
sudo /usr/local/bin/backup-server.sh
```

### Backup-Status prüfen:
```bash
# Alle Backups anzeigen
ls -lh /var/backups/schichtplan/database/
ls -lh /var/backups/schichtplan/code/

# Gesamtgröße
du -sh /var/backups/schichtplan/

# Backup-Log ansehen
tail -f /var/log/schichtplan-backup.log
```

### Rollback durchführen (im Notfall):
```bash
sudo /usr/local/bin/rollback-server.sh
```

### Backup-Frequenz ändern:
```bash
# Crontab bearbeiten
sudo crontab -e

# Beispiele:
# Stündlich:  0 * * * * /usr/local/bin/backup-server.sh
# Alle 6h:    0 */6 * * * /usr/local/bin/backup-server.sh
# Täglich 2h: 0 2 * * * /usr/local/bin/backup-server.sh (Standard)
# Wöchentlich: 0 2 * * 0 /usr/local/bin/backup-server.sh
```

---

## 🧪 Test-Szenerio (Optional)

Möchtest du sicherstellen, dass alles funktioniert? Teste das Rollback:

```bash
# 1. Aktuelles Backup erstellen
sudo /usr/local/bin/backup-server.sh

# 2. Testdatei erstellen
echo "TEST" | sudo tee /var/www/schichtplan/TESTFILE

# 3. Rollback durchführen (Backend)
sudo /usr/local/bin/rollback-server.sh
# Wähle Option 2 (Backend)
# Wähle neuestes Backup
# Bestätige mit "yes"

# 4. Prüfen ob Testdatei weg ist
ls /var/www/schichtplan/TESTFILE
# Sollte Fehler zeigen: "No such file or directory" ✅
```

---

## 🆘 Problemlösung

### Problem: "Permission denied" beim Script ausführen

**Lösung:**
```bash
sudo chmod +x /usr/local/bin/backup-server.sh
sudo chmod +x /usr/local/bin/rollback-server.sh
```

### Problem: pg_dump nicht gefunden

**Lösung:**
```bash
# PostgreSQL Client Tools installieren
sudo apt update
sudo apt install postgresql-client -y
```

### Problem: Backup-Verzeichnis kann nicht erstellt werden

**Lösung:**
```bash
# Manuell erstellen mit korrekten Rechten
sudo mkdir -p /var/backups/schichtplan/{database,code,configs}
sudo chown -R root:root /var/backups/schichtplan
sudo chmod -R 755 /var/backups/schichtplan
```

### Problem: Crontab funktioniert nicht

**Lösung:**
```bash
# Cron-Service status prüfen
sudo systemctl status cron

# Falls gestoppt, starten
sudo systemctl start cron
sudo systemctl enable cron

# Logs ansehen
sudo grep CRON /var/log/syslog | tail -n 20
```

---

## 📱 Benachrichtigungen (Optional)

Möchtest du per E-Mail benachrichtigt werden wenn Backups fehlschlagen?

**Am Ende von `backup-server.sh` hinzufügen:**
```bash
# E-Mail bei Fehlern
if [ $? -ne 0 ]; then
    echo "Backup fehlgeschlagen!" | mail -s "Backup Fehler - Schichtplan" deine-email@example.com
fi
```

---

## 🎉 Fertig!

Du hast jetzt:
- ✅ Automatische tägliche Backups
- ✅ Schnelles Rollback-System
- ✅ Sicheren Deployment-Prozess
- ✅ Schutz vor Fehlern

**Nächster Schritt:** Probiere ein Update mit den neuen Subscription-Änderungen!

```bash
# Auf deinem lokalen Windows-PC
bash pre-deployment-check.sh

# Wenn alles OK, dann deployen
# (Siehe UPDATE-DEPLOYMENT.md)
```

Wenn du Fragen hast, frag einfach! 🚀
