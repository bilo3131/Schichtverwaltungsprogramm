# Deployment Checklist

## Pre-Deployment

### Backend
- [ ] `.env` Datei mit Production-Werten erstellt
- [ ] `DEBUG = False` in Production Settings
- [ ] Sichere `SECRET_KEY` generiert (min. 50 Zeichen)
- [ ] PostgreSQL Datenbank erstellt und konfiguriert
- [ ] `ALLOWED_HOSTS` auf Production-Domain gesetzt
- [ ] `CORS_ALLOWED_ORIGINS` konfiguriert
- [ ] `CSRF_TRUSTED_ORIGINS` konfiguriert
- [ ] SSL-Zertifikat installiert (HTTPS)
- [ ] Static Files gesammelt (`collectstatic`)
- [ ] Migrationen ausgeführt
- [ ] Superuser erstellt
- [ ] Email-Konfiguration getestet
- [ ] Logs-Verzeichnis erstellt (`mkdir -p logs`)

### Frontend
- [ ] Production Build erstellt (`ng build --configuration production`)
- [ ] API URL auf Production-Backend gesetzt
- [ ] Build-Artefakte auf Server kopiert

### Server & Infrastructure
- [ ] Nginx installiert und konfiguriert
- [ ] Gunicorn installiert
- [ ] Systemd Service erstellt (optional)
- [ ] Firewall konfiguriert (Ports 80, 443, 22)
- [ ] SSL/TLS-Zertifikat installiert (Let's Encrypt)
- [ ] Backup-Strategie implementiert
- [ ] Monitoring eingerichtet (optional)

### Security
- [ ] Alle Passwörter sind sicher (min. 20 Zeichen)
- [ ] SSH Key-based Authentication aktiviert
- [ ] Root-Login deaktiviert
- [ ] Fail2ban installiert (optional)
- [ ] PostgreSQL läuft nicht auf 0.0.0.0
- [ ] `.env` Datei ist in `.gitignore`
- [ ] Sensible Daten nicht im Git Repository

## Deployment Steps

### 1. Server vorbereiten
```bash
# Updates installieren
sudo apt update && sudo apt upgrade -y

# Python & Dependencies
sudo apt install python3 python3-pip python3-venv postgresql postgresql-contrib nginx -y
```

### 2. Backend deployen
```bash
# Code auf Server kopieren
cd /var/www
git clone <repository>
cd schichtplan/backend

# Virtual Environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Environment konfigurieren
cp .env.example .env
nano .env  # Werte anpassen

# Datenbank Setup
python manage.py migrate --settings=schichtplan.settings_prod
python manage.py collectstatic --noinput --settings=schichtplan.settings_prod
python manage.py createsuperuser --settings=schichtplan.settings_prod

# Logs-Verzeichnis
mkdir -p logs
```

### 3. Gunicorn Service
```bash
# Service-Datei erstellen
sudo nano /etc/systemd/system/schichtplan.service

# Service aktivieren
sudo systemctl enable schichtplan
sudo systemctl start schichtplan
sudo systemctl status schichtplan
```

### 4. Nginx konfigurieren
```bash
# Nginx Config erstellen
sudo nano /etc/nginx/sites-available/schichtplan

# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/schichtplan /etc/nginx/sites-enabled/

# Nginx testen und neu laden
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL-Zertifikat (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ihre-domain.com -d www.ihre-domain.com
```

### 6. Frontend deployen
```bash
# Build auf lokalem Rechner
cd frontend
ng build --configuration production

# Build-Dateien auf Server kopieren
scp -r dist/frontend/browser/* user@server:/var/www/schichtplan/frontend/
```

### 7. Automatisches Backup einrichten
```bash
# Backup-Script erstellen
sudo nano /usr/local/bin/backup-schichtplan.sh

# Ausführbar machen
sudo chmod +x /usr/local/bin/backup-schichtplan.sh

# Crontab
crontab -e
# Füge hinzu:
# 0 2 * * * /usr/local/bin/backup-schichtplan.sh
# 0 3 * * * /var/www/schichtplan/env/bin/python /var/www/schichtplan/manage.py cleanup_expired_data >> /var/log/cleanup_expired_data.log 2>&1
```

### DSGVO-Datenlöschung testen (vor erstem Produktiveinsatz)
```bash
# Dry-run: zeigt betroffene Datensätze, löscht nichts
python manage.py cleanup_expired_data --dry-run

# Echte Ausführung
python manage.py cleanup_expired_data
```

## Post-Deployment

### Verification
- [ ] Website erreichbar über HTTPS
- [ ] Login funktioniert
- [ ] API-Endpunkte erreichbar
- [ ] Static Files werden geladen
- [ ] Email-Versand funktioniert
- [ ] Logs werden geschrieben
- [ ] Backup läuft automatisch

### Testing
- [ ] Login/Logout testen
- [ ] Schichten erstellen/bearbeiten
- [ ] Urlaubsanträge testen
- [ ] Dashboard-Daten korrekt
- [ ] Dark Mode funktioniert
- [ ] Mobile Ansicht prüfen

### Monitoring
- [ ] Logs überwachen (erste 24h engmaschig)
- [ ] Performance prüfen
- [ ] Error Rate überwachen
- [ ] Backup verifizieren

## Rollback Plan

Falls Probleme auftreten:

1. **Service stoppen**
   ```bash
   sudo systemctl stop schichtplan
   ```

2. **Datenbank Backup wiederherstellen**
   ```bash
   psql -U schichtplan_user schichtplan < backup_latest.sql
   ```

3. **Alte Version deployen**
   ```bash
   git checkout <previous-commit>
   # Backend neu starten
   ```

4. **Service neu starten**
   ```bash
   sudo systemctl start schichtplan
   ```

## Maintenance

### Wöchentlich
- Logs überprüfen
- Performance monitoren
- Backup-Status prüfen

### Monatlich
- Security Updates installieren
- Datenbank optimieren (`VACUUM ANALYZE`)
- Alte Backups löschen (>30 Tage)

### Bei Updates
- Backup erstellen
- Code aktualisieren
- Migrationen ausführen
- Static Files sammeln
- Service neu starten
- Tests durchführen
