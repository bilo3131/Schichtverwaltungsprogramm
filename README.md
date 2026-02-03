# Schichtplan - Digitale Schichtplanungssoftware

Eine moderne, webbasierte Schichtplanungslösung für Unternehmen mit Angular Frontend und Django Backend.

## 🚀 Features

- **Schichtplanung**: Drag & Drop Schichtplanung mit visueller Wochenansicht
- **Mitarbeiterverwaltung**: Umfassende Verwaltung von Mitarbeitern, Qualifikationen und Abteilungen
- **Urlaubsverwaltung**: Digitale Urlaubsanträge mit Genehmigungsworkflow
- **Abwesenheitstracking**: Verwaltung von Krankmeldungen, Urlaub und anderen Abwesenheiten
- **Dashboard**: Übersichtliche KPIs und Statistiken für Manager
- **Kalender**: Terminverwaltung für Meetings und Events
- **Multi-Tenant**: Organisationsbasierte Trennung der Daten
- **Rollensystem**: Feinabgestufte Berechtigungen (Admin, HR, Department Manager, Team Leader, Employee)
- **Dark Mode**: Vollständige Unterstützung für dunkles Design

## 📋 Voraussetzungen

### Backend
- Python 3.11+
- PostgreSQL 14+ (für Production)
- pip
- virtualenv (empfohlen)

### Frontend
- Node.js 18+
- npm oder yarn
- Angular CLI 18+

## 🛠️ Installation

### Backend Setup

1. **Repository klonen & in Backend wechseln**
   ```bash
   cd backend
   ```

2. **Virtuelle Umgebung erstellen**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   ```

3. **Dependencies installieren**
   ```bash
   pip install -r requirements.txt
   ```

4. **Umgebungsvariablen konfigurieren (Optional für Development)**
   ```bash
   cp .env.example .env
   # Bearbeiten Sie .env mit Ihren Werten
   ```

5. **Datenbank migrieren**
   ```bash
   python manage.py migrate
   ```

6. **Superuser erstellen**
   ```bash
   python manage.py createsuperuser
   ```

7. **Development Server starten**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **In Frontend-Verzeichnis wechseln**
   ```bash
   cd frontend
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Development Server starten**
   ```bash
   ng serve
   ```

4. **Anwendung öffnen**
   ```
   http://localhost:4200
   ```

## 🚢 Production Deployment

### Backend Production

1. **Environment-Variablen setzen**
   - Kopieren Sie `.env.example` zu `.env`
   - Füllen Sie alle Production-Werte aus:
     ```bash
     DJANGO_SECRET_KEY=ihr-sicherer-secret-key
     DJANGO_ALLOWED_HOSTS=ihre-domain.com,www.ihre-domain.com
     DEBUG=False
     DB_NAME=schichtplan
     DB_USER=postgres
     DB_PASSWORD=sicheres-passwort
     DB_HOST=localhost
     DB_PORT=5432
     CORS_ALLOWED_ORIGINS=https://ihre-domain.com
     CSRF_TRUSTED_ORIGINS=https://ihre-domain.com
     ```

2. **PostgreSQL Datenbank einrichten**
   ```bash
   psql -U postgres
   CREATE DATABASE schichtplan;
   CREATE USER schichtplan_user WITH PASSWORD 'sicheres_passwort';
   GRANT ALL PRIVILEGES ON DATABASE schichtplan TO schichtplan_user;
   \q
   ```

3. **Migrationen ausführen**
   ```bash
   python manage.py migrate --settings=schichtplan.settings_prod
   ```

4. **Static Files sammeln**
   ```bash
   python manage.py collectstatic --noinput --settings=schichtplan.settings_prod
   ```

5. **Superuser erstellen**
   ```bash
   python manage.py createsuperuser --settings=schichtplan.settings_prod
   ```

6. **Production Server mit Gunicorn**
   ```bash
   pip install gunicorn
   gunicorn schichtplan.wsgi:application --bind 0.0.0.0:8000 --workers 3 --settings=schichtplan.settings_prod
   ```

### Frontend Production

1. **Production Build erstellen**
   ```bash
   cd frontend
   ng build --configuration production
   ```

2. **Build-Artefakte deployen**
   - Dateien aus `dist/frontend/browser` auf Webserver kopieren
   - Nginx als Reverse Proxy konfigurieren

### Nginx Konfiguration (Beispiel)

```nginx
server {
    listen 80;
    server_name ihre-domain.com;

    # Redirect zu HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ihre-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # Frontend
    location / {
        root /var/www/schichtplan/frontend;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static Files
    location /static/ {
        alias /path/to/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media Files
    location /media/ {
        alias /path/to/backend/mediafiles/;
        expires 30d;
    }
}
```

### Systemd Service (Optional)

Erstellen Sie `/etc/systemd/system/schichtplan.service`:

```ini
[Unit]
Description=Schichtplan Django Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/backend
Environment="DJANGO_SETTINGS_MODULE=schichtplan.settings_prod"
ExecStart=/path/to/venv/bin/gunicorn schichtplan.wsgi:application --bind 127.0.0.1:8000 --workers 3

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:
```bash
sudo systemctl enable schichtplan
sudo systemctl start schichtplan
sudo systemctl status schichtplan
```

## 🔒 Sicherheits-Checkliste vor Go-Live

- [ ] `DEBUG = False` in Production Settings
- [ ] Sichere `SECRET_KEY` generieren (min. 50 Zeichen, zufällig)
- [ ] HTTPS erzwingen (`SECURE_SSL_REDIRECT = True`)
- [ ] `ALLOWED_HOSTS` nur auf Production-Domains beschränken
- [ ] `CORS_ALLOWED_ORIGINS` auf Production-Domain setzen
- [ ] Starkes Datenbank-Passwort (min. 20 Zeichen)
- [ ] PostgreSQL statt SQLite verwenden
- [ ] Firewall konfigurieren (nur Ports 80, 443, 22)
- [ ] SSL-Zertifikat installieren (Let's Encrypt empfohlen)
- [ ] Regelmäßige Backups einrichten (täglich)
- [ ] Logs-Verzeichnis erstellen und überwachen
- [ ] Rate Limiting aktivieren
- [ ] CSRF und XSS Protection aktiv

## 📚 Projektstruktur

```
schichtplan/
├── backend/
│   ├── accounts/              # User & Organization Management
│   ├── shifts/                # Shifts, Vacation, Absences, Events
│   ├── subscriptions/         # Subscription & Billing
│   ├── schichtplan/
│   │   ├── settings.py        # Development Settings
│   │   ├── settings_prod.py   # Production Settings
│   │   └── wsgi.py
│   ├── .env.example           # Environment Template
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Services, Guards, Interceptors, Models
│   │   │   ├── features/      # Feature Modules (Dashboard, Shifts, etc.)
│   │   │   ├── shared/        # Shared Components, Dialogs, Pipes
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   ├── environments/
│   │   │   ├── environment.ts      # Development Config
│   │   │   └── environment.prod.ts # Production Config
│   │   └── styles/
│   ├── angular.json
│   └── package.json
│
└── README.md
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd frontend
npm run e2e
```

## 📝 API Dokumentation

Die REST API ist unter `/api/` erreichbar:

### Authentifizierung
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/register/` - Registrierung
- `POST /api/auth/change-password/` - Passwort ändern

### Mitarbeiter & Organisation
- `GET /api/employees/` - Mitarbeiter-Liste
- `POST /api/employees/` - Mitarbeiter erstellen
- `GET /api/employees/{id}/` - Mitarbeiter-Details
- `PUT /api/employees/{id}/` - Mitarbeiter aktualisieren
- `DELETE /api/employees/{id}/` - Mitarbeiter löschen

### Schichten
- `GET /api/shifts/` - Schichten-Liste (Filter: `?start_date=2026-02-03&end_date=2026-02-09`)
- `POST /api/shifts/` - Schicht erstellen
- `PUT /api/shifts/{id}/` - Schicht aktualisieren
- `DELETE /api/shifts/{id}/` - Schicht löschen
- `POST /api/shifts/publish-week/` - Woche veröffentlichen

### Urlaubsanträge
- `GET /api/vacation-requests/` - Urlaubsanträge
- `POST /api/vacation-requests/` - Antrag erstellen
- `POST /api/vacation-requests/{id}/approve/` - Genehmigen
- `POST /api/vacation-requests/{id}/reject/` - Ablehnen

### Weitere Endpoints
- `/api/shift-types/` - Schichttypen
- `/api/departments/` - Abteilungen
- `/api/qualifications/` - Qualifikationen
- `/api/absences/` - Abwesenheiten
- `/api/events/` - Termine/Events

## 🔄 Backup & Restore

### Datenbank-Backup
```bash
# Backup erstellen
pg_dump -U schichtplan_user -h localhost schichtplan > backup_$(date +%Y%m%d_%H%M%S).sql

# Mit Kompression
pg_dump -U schichtplan_user -h localhost schichtplan | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Datenbank-Restore
```bash
# Restore
psql -U schichtplan_user -h localhost schichtplan < backup_20260203_120000.sql

# Restore mit Kompression
gunzip < backup_20260203_120000.sql.gz | psql -U schichtplan_user -h localhost schichtplan
```

### Automatisches Backup (Crontab)
```bash
# Täglich um 2 Uhr morgens
0 2 * * * /usr/bin/pg_dump -U schichtplan_user schichtplan | gzip > /backups/schichtplan_$(date +\%Y\%m\%d).sql.gz

# Alte Backups löschen (älter als 30 Tage)
0 3 * * * find /backups -name "schichtplan_*.sql.gz" -mtime +30 -delete
```

## 📊 Monitoring & Logs

### Logs überwachen
```bash
# Django Logs
tail -f backend/logs/django.log

# Nginx Access Logs
tail -f /var/log/nginx/access.log

# Nginx Error Logs
tail -f /var/log/nginx/error.log

# Gunicorn Logs
journalctl -u schichtplan -f
```

### Performance Monitoring
- Verwenden Sie Tools wie Sentry für Error Tracking
- New Relic oder DataDog für Performance Monitoring
- PostgreSQL Slow Query Log aktivieren

## 🐛 Troubleshooting

### Häufige Probleme

**Problem: CORS Errors im Browser**
```
Lösung: CORS_ALLOWED_ORIGINS in settings.py oder .env korrekt setzen
```

**Problem: 502 Bad Gateway**
```
Lösung: Gunicorn-Service überprüfen (systemctl status schichtplan)
```

**Problem: Static Files werden nicht geladen**
```
Lösung: python manage.py collectstatic ausführen und Nginx Config prüfen
```

**Problem: Database Connection Error**
```
Lösung: PostgreSQL läuft? Credentials in .env korrekt?
```

## 🤝 Support & Kontakt

Bei Fragen oder Problemen:
- Dokumentation durchlesen
- Logs prüfen
- Support kontaktieren

## 📄 Lizenz

Proprietary - Alle Rechte vorbehalten

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** Februar 2026  
**Entwickelt für:** Moderne Schichtplanungsverwaltung
