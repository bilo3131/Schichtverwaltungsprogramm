# 🚀 SCHNELLSTART: Backup-Scripts Installation

## In 5 Minuten einsatzbereit!

### 1️⃣ Scripts hochladen (Windows)

**Option A - Mit WinSCP (Empfohlen):**
1. WinSCP herunterladen: https://winscp.net/
2. Verbinden zu: `bilal-alac.de`
3. Diese 3 Dateien nach `/tmp/` ziehen:
   - `backup-server.sh`
   - `rollback-server.sh`
   - `pre-deployment-check.sh`

**Option B - Mit PowerShell:**
```powershell
cd "c:\Code\2. Business\Schichtplan"
scp backup-server.sh rollback-server.sh pre-deployment-check.sh USER@bilal-alac.de:/tmp/
```

---

### 2️⃣ Per SSH verbinden

**Mit PuTTY:**
- Host: `bilal-alac.de`
- Port: `22`
- Login mit deinen Zugangsdaten

**Mit Windows Terminal:**
```powershell
ssh USER@bilal-alac.de
```

---

### 3️⃣ Installation (auf dem Server ausführen)

Kopiere und füge diese Befehle ein:

```bash
# Scripts installieren
sudo mv /tmp/backup-server.sh /usr/local/bin/
sudo mv /tmp/rollback-server.sh /usr/local/bin/
sudo mv /tmp/pre-deployment-check.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/*.sh

# Backup-Verzeichnis erstellen
sudo mkdir -p /var/backups/schichtplan/{database,code,configs}

# Erstes Test-Backup
sudo /usr/local/bin/backup-server.sh
```

---

### 4️⃣ Automatisches Backup einrichten

```bash
# Crontab bearbeiten
sudo crontab -e

# Diese Zeile hinzufügen (täglich um 2 Uhr nachts):
0 2 * * * /usr/local/bin/backup-server.sh >> /var/log/schichtplan-backup.log 2>&1

# Speichern: Ctrl+O, Enter, Ctrl+X
```

---

### 5️⃣ Fertig! ✅

**Teste Rollback-Script:**
```bash
sudo /usr/local/bin/rollback-server.sh
# Wähle 0 zum Abbrechen (nur Test)
```

---

## 📦 Was du jetzt hast:

✅ **Automatische tägliche Backups** um 2 Uhr nachts
✅ **Rollback in 2 Minuten** bei Problemen
✅ **Alle Daten geschützt** (Datenbank, Code, Configs)

---

## 🎯 Verwendung

### Backup erstellen:
```bash
sudo /usr/local/bin/backup-server.sh
```

### Rollback durchführen:
```bash
sudo /usr/local/bin/rollback-server.sh
```

### Backups anzeigen:
```bash
ls -lh /var/backups/schichtplan/database/
ls -lh /var/backups/schichtplan/code/
```

### Backup-Log ansehen:
```bash
tail -f /var/log/schichtplan-backup.log
```

---

## 🆘 Notfall-Rollback

**Wenn nach Update etwas nicht funktioniert:**

```bash
# 1. SSH zum Server
ssh USER@bilal-alac.de

# 2. Rollback starten
sudo /usr/local/bin/rollback-server.sh

# 3. Wähle was wiederherstellen:
#    - Option 1: Datenbank
#    - Option 2: Backend
#    - Option 3: Frontend
#    - Option 5: Alles

# 4. Wähle neuestes Backup
# 5. Bestätige mit "yes"

# Fertig! Läuft wieder
```

**Zeit: 2-5 Minuten** ⏱️

---

## 📚 Mehr Details?

- **Vollständige Anleitung:** `INSTALLATION-SCRIPTS.md`
- **Sicherheit & Rollback:** `SECURITY-ROLLBACK.md`
- **Script-Doku:** `SCRIPTS-README.md`
- **Update durchführen:** `UPDATE-DEPLOYMENT.md`

---

Alles funktioniert? Zeit für dein erstes Update! 🚀

```bash
# Lokal prüfen
bash pre-deployment-check.sh

# Backup auf Server
ssh USER@bilal-alac.de "sudo /usr/local/bin/backup-server.sh"

# Update durchführen (siehe UPDATE-DEPLOYMENT.md)
```
