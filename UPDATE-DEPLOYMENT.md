# 🔄 Update Deployment - Subscription Änderungen

Diese Anleitung beschreibt, wie du die neuen Subscription-Änderungen (Trial-Modus, 0€ Starter) auf deinen Server hochlädst.

## 📁 Geänderte Dateien

### Backend
- `backend/subscriptions/models.py` - Trial-Logik für 0€
- `backend/subscriptions/serializers.py` - Trial-Informationen im API Response

### Frontend
- `frontend/src/app/core/services/subscription.service.ts` - Trial-Preise & Disabled-Status
- `frontend/src/app/features/subscription/subscription-management.component.ts` - Disabled Logik
- `frontend/src/app/features/subscription/subscription-management.component.html` - UI Updates
- `frontend/src/app/features/subscription/subscription-management.component.scss` - Styling
- `frontend/src/app/features/subscription/subscription-status.component.html` - Trial-Anzeige
- `frontend/src/app/features/subscription/subscription-status.component.scss` - Trial-Styling

---

## 🚀 Deployment Schritte

### **Option A: Mit Git (Empfohlen)**

#### 1. Code ins Git Repository pushen

```powershell
# Auf deinem lokalen Windows-Rechner
cd "c:\Code\2. Business\Schichtplan"

# Alle Änderungen stagen
git add backend/subscriptions/
git add frontend/src/app/core/services/subscription.service.ts
git add frontend/src/app/features/subscription/

# Commit erstellen
git commit -m "Subscriptions: Trial-Modus mit 0€ Starter, Pro/Business disabled"

# Push zum Repository
git push origin main
```

#### 2. Auf dem Server aktualisieren

```bash
# SSH auf deinen Server
ssh user@bilal-alac.de

# Zum Projekt-Verzeichnis
cd /var/www/schichtplan

# Code aktualisieren
git pull origin main

# Backend: Virtual Environment aktivieren
cd backend
source venv/bin/activate

# Keine neuen Migrationen nötig (nur Code-Änderungen)
# Aber prüfen schadet nicht:
python manage.py migrate --settings=schichtplan.settings_production

# Gunicorn neu starten
sudo systemctl restart schichtplan
sudo systemctl status schichtplan
```

#### 3. Frontend neu bauen und deployen

```bash
# Auf deinem lokalen Windows-Rechner
cd "c:\Code\2. Business\Schichtplan\frontend"

# Production Build erstellen
ng build --configuration production

# Build auf Server hochladen (mit SCP)
scp -r dist/frontend/browser/* user@bilal-alac.de:/var/www/schichtplan/frontend/

# ODER mit dem vorhandenen Script:
# bash build-and-deploy.sh
```

---

### **Option B: Manuelle Datei-Übertragung (ohne Git)**

#### 1. Backend-Dateien hochladen

```powershell
# Mit SCP (auf Windows: nutze WinSCP, FileZilla oder PowerShell)
scp "c:\Code\2. Business\Schichtplan\backend\subscriptions\models.py" user@bilal-alac.de:/var/www/schichtplan/backend/subscriptions/
scp "c:\Code\2. Business\Schichtplan\backend\subscriptions\serializers.py" user@bilal-alac.de:/var/www/schichtplan/backend/subscriptions/
```

#### 2. Backend neu starten

```bash
# SSH auf Server
ssh user@bilal-alac.de

# Gunicorn neu starten
sudo systemctl restart schichtplan
```

#### 3. Frontend neu bauen und hochladen

```powershell
# Auf deinem lokalen Rechner
cd "c:\Code\2. Business\Schichtplan\frontend"

# Production Build
ng build --configuration production

# Hochladen (WinSCP, FileZilla oder SCP)
# Ziel: /var/www/schichtplan/frontend/
```

---

## ✅ Verifizierung

Nach dem Deployment prüfe:

1. **Backend API testen**
   ```bash
   # Auf dem Server
   curl -H "Authorization: Token YOUR_TOKEN" https://bilal-alac.de/api/v1/subscriptions/check_limits/
   ```
   
   Erwartetes Response sollte `"is_trial": true` und `"base_price": 0.00` enthalten.

2. **Frontend öffnen**
   - Gehe zu https://bilal-alac.de/subscription-management
   - **Starter-Plan** sollte anzeigen:
     - Badge: "Testversion"
     - Durchgestrichener Preis: ~~29€~~
     - Grüner Text: **0€** während der Testphase
   - **Pro & Business** sollten anzeigen:
     - Badge: "Bald verfügbar"
     - Button: "Nicht verfügbar" (disabled)
     - Halbtransparentes Overlay

3. **Browser-Cache leeren**
   - Strg + Shift + R (Windows)
   - Cmd + Shift + R (Mac)
   - Falls Änderungen nicht sichtbar sind

---

## 🔧 Wichtige Hinweise

### Settings-Dateien
- ✅ **`settings.py`** → Nur für lokale Entwicklung (DEBUG=True)
- ✅ **`settings_production_template.py`** → Vorlage für Production
- ✅ **Auf dem Server**: Datei sollte `settings_production.py` heißen

### Auf dem Server prüfen
```bash
# Prüfe welche Settings-Datei verwendet wird
cat /etc/systemd/system/schichtplan.service
# Sollte enthalten: --env DJANGO_SETTINGS_MODULE=schichtplan.settings_production
```

### Gunicorn Service
```bash
# Status prüfen
sudo systemctl status schichtplan

# Logs ansehen
sudo journalctl -u schichtplan -f

# Bei Fehlern neu starten
sudo systemctl restart schichtplan
```

### Nginx prüfen
```bash
# Nginx Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx

# Nginx Logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🐛 Troubleshooting

### Problem: "500 Server Error" nach Update

**Lösung:**
```bash
# Logs prüfen
sudo journalctl -u schichtplan -n 50

# Berechtigungen prüfen
sudo chown -R www-data:www-data /var/www/schichtplan

# Gunicorn neu starten
sudo systemctl restart schichtplan
```

### Problem: Frontend zeigt alte Version

**Lösung:**
```bash
# Browser-Cache leeren (Strg + Shift + R)

# Prüfe ob neue Dateien auf Server sind
ssh user@bilal-alac.de "ls -la /var/www/schichtplan/frontend/"

# Nginx Cache leeren (falls vorhanden)
sudo systemctl reload nginx
```

### Problem: API gibt falsche Preise zurück

**Lösung:**
```bash
# Prüfe ob neue models.py auf Server ist
ssh user@bilal-alac.de "cat /var/www/schichtplan/backend/subscriptions/models.py | grep 'is_trial_mode'"

# Gunicorn neu starten
sudo systemctl restart schichtplan
```

---

## 📦 Rollback (Falls etwas schief geht)

```bash
# Auf dem Server
cd /var/www/schichtplan

# Git: Zum vorherigen Commit zurück
git log --oneline  # Finde letzten guten Commit
git checkout <commit-hash>

# Gunicorn neu starten
sudo systemctl restart schichtplan
```

---

## 💡 Empfohlener Workflow

Für zukünftige Updates:

1. **Lokal testen** - Stelle sicher alles funktioniert
2. **Git Commit & Push** - Änderungen ins Repository
3. **Server Backup** - Mache ein Datenbank-Backup
4. **Pull auf Server** - Code aktualisieren
5. **Services neu starten** - Backend/Frontend neu laden
6. **Testen** - Prüfe ob alles funktioniert
7. **Monitoring** - Beobachte Logs für Fehler

---

## 📞 Hilfe

Bei Problemen:
- Logs prüfen: `sudo journalctl -u schichtplan -f`
- Nginx Logs: `sudo tail -f /var/log/nginx/error.log`
- Frontend Console: F12 im Browser → Console Tab
