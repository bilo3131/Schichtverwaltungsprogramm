# 🚀 Quick Deployment Guide

Schnellanleitung für das Deployment der Schichtplan-Anwendung auf einem Linux-Server.

## 📋 Voraussetzungen

- Linux Server (Ubuntu 20.04+ / Debian 11+ empfohlen)
- Root/Sudo Zugriff
- Domain-Name (z.B. ihre-domain.com)
- SSH-Zugriff konfiguriert

## 🔧 Deployment in 6 Schritten

### 1️⃣ Server vorbereiten

```bash
# Updates installieren
sudo apt update && sudo apt upgrade -y

# Benötigte Pakete installieren
sudo apt install python3 python3-pip python3-venv postgresql postgresql-contrib nginx git -y

# Verzeichnis erstellen
sudo mkdir -p /var/www/schichtplan
sudo chown $USER:$USER /var/www/schichtplan
```

### 2️⃣ PostgreSQL einrichten

```bash
# Auf dem Server
cd /var/www/schichtplan/backend
sudo bash setup-postgres.sh
```

Das Script führt dich durch die Datenbank-Einrichtung und gibt dir die Zugangsdaten.

### 3️⃣ Backend deployen

```bash
# Code clonen
cd /var/www/schichtplan
git clone git@github.com:bilo3131/Schichtverwaltungsprogramm.git .

# Virtual Environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn psycopg2-binary

# .env Datei erstellen
cp .env.production .env
nano .env  # Werte anpassen (siehe Kommentare in der Datei)

# Django Setup
python manage.py migrate --settings=schichtplan.settings_prod
python manage.py collectstatic --noinput --settings=schichtplan.settings_prod
python manage.py createsuperuser --settings=schichtplan.settings_prod

# Logs-Verzeichnis
mkdir -p logs

# Berechtigungen setzen
sudo chown -R www-data:www-data /var/www/schichtplan
```

### 4️⃣ Gunicorn Service

```bash
# Service-Datei kopieren
sudo cp /var/www/schichtplan/backend/schichtplan.service /etc/systemd/system/

# Passe Pfade in der Service-Datei an falls nötig
sudo nano /etc/systemd/system/schichtplan.service

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable schichtplan
sudo systemctl start schichtplan
sudo systemctl status schichtplan
```

### 5️⃣ Nginx konfigurieren

```bash
# Config kopieren
sudo cp /var/www/schichtplan/backend/nginx-schichtplan.conf /etc/nginx/sites-available/schichtplan

# Domain anpassen
sudo nano /etc/nginx/sites-available/schichtplan
# Ersetze "ihre-domain.com" mit deiner echten Domain

# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/schichtplan /etc/nginx/sites-enabled/

# Nginx testen und neu laden
sudo nginx -t
sudo systemctl reload nginx
```

### 6️⃣ SSL-Zertifikat (Let's Encrypt)

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat beantragen
sudo certbot --nginx -d ihre-domain.com -d www.ihre-domain.com

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

### 7️⃣ Frontend deployen

**Auf deinem lokalen Windows-Rechner:**

```batch
cd frontend
build-production.bat
```

**Upload auf Server (Windows PowerShell):**

```powershell
# Mit SCP (ersetze Werte)
scp -r frontend\dist\frontend\browser\* user@ihre-domain.com:/var/www/schichtplan/frontend/
```

**Oder auf Linux/Mac:**

```bash
cd frontend
bash build-and-deploy.sh
```

## ✅ Verifizierung

Nach dem Deployment überprüfe:

```bash
# Backend läuft?
sudo systemctl status schichtplan

# Nginx läuft?
sudo systemctl status nginx

# Logs prüfen
tail -f /var/www/schichtplan/backend/logs/gunicorn-error.log
tail -f /var/log/nginx/schichtplan-error.log

# Website aufrufen
# https://ihre-domain.com
```

## 🔐 Security Checklist

- [ ] `.env` Datei hat sichere Passwörter (min. 20 Zeichen)
- [ ] `DEBUG=False` in Production
- [ ] SSL-Zertifikat installiert (HTTPS aktiv)
- [ ] Firewall konfiguriert (ufw oder iptables)
- [ ] SSH Key-based Authentication aktiviert
- [ ] PostgreSQL läuft nur auf localhost
- [ ] Regelmäßige Backups eingerichtet

## 🔄 Updates deployen

### Backend-Update:

```bash
cd /var/www/schichtplan
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --settings=schichtplan.settings_prod
python manage.py collectstatic --noinput --settings=schichtplan.settings_prod

sudo systemctl restart schichtplan
```

### Frontend-Update:

```bash
# Lokal builden
cd frontend
ng build --configuration production

# Upload auf Server
scp -r dist/frontend/browser/* user@server:/var/www/schichtplan/frontend/
```

## 💾 Backup erstellen

```bash
# Datenbank-Backup
sudo -u postgres pg_dump schichtplan_prod > backup-$(date +%Y%m%d).sql

# Komprimieren
gzip backup-$(date +%Y%m%d).sql

# Download auf lokalen Rechner (von deinem PC aus)
scp user@server:/pfad/zum/backup-*.sql.gz ./backups/
```

### Automatisches Backup einrichten:

```bash
# Backup-Script erstellen
sudo nano /usr/local/bin/backup-schichtplan.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/schichtplan"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump schichtplan_prod | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Lösche Backups älter als 30 Tage
find $BACKUP_DIR -name "db-*.sql.gz" -mtime +30 -delete
```

```bash
# Ausführbar machen
sudo chmod +x /usr/local/bin/backup-schichtplan.sh

# Cronjob einrichten (täglich um 2 Uhr nachts)
sudo crontab -e
# Füge hinzu:
0 2 * * * /usr/local/bin/backup-schichtplan.sh
```

## 🐛 Troubleshooting

### Backend läuft nicht:

```bash
sudo systemctl status schichtplan
sudo journalctl -u schichtplan -n 50
tail -f /var/www/schichtplan/backend/logs/gunicorn-error.log
```

### Nginx Fehler:

```bash
sudo nginx -t
tail -f /var/log/nginx/schichtplan-error.log
```

### Datenbankverbindung fehlgeschlagen:

```bash
# Prüfe PostgreSQL
sudo systemctl status postgresql

# Teste Verbindung
psql -U schichtplan_user -d schichtplan_prod -h localhost
```

### Static Files werden nicht geladen:

```bash
cd /var/www/schichtplan/backend
source venv/bin/activate
python manage.py collectstatic --noinput --settings=schichtplan.settings_prod

# Berechtigungen prüfen
sudo chown -R www-data:www-data /var/www/schichtplan/backend/staticfiles
```

## 📞 Support

Für detaillierte Informationen siehe:
- `DEPLOYMENT.md` - Ausführliche Deployment-Checkliste
- `README.md` - Allgemeine Dokumentation
- `backend/.env.production` - Production Environment Template

## 📊 Monitoring (Optional)

Erweiterte Überwachung mit:

```bash
# htop für Prozessüberwachung
sudo apt install htop

# netdata für Echtzeit-Monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

---

**Viel Erfolg beim Deployment! 🚀**
