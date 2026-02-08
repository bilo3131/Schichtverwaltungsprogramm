# E-Mail Konfiguration für Production

## Schritt-für-Schritt Anleitung

### 1. .env Datei auf dem Server erstellen

Erstellen Sie auf Ihrem Server eine `.env` Datei im Backend-Verzeichnis:

```bash
cd /var/www/html/schichtplan/backend
nano .env
```

### 2. E-Mail Einstellungen eintragen

Fügen Sie folgende Zeilen in die `.env` Datei ein (mit Ihren echten Daten):

```env
# Email Configuration - Netcup Webhosting
EMAIL_HOST=mail.your-server.de
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=info@ihre-domain.de
EMAIL_HOST_PASSWORD=IhrMailboxPasswort
DEFAULT_FROM_EMAIL=info@ihre-domain.de
```

**Wichtige Hinweise:**
- Ersetzen Sie `mail.your-server.de` mit dem echten Server (z.B. `mail.bilal-alac.de`)
- Tragen Sie die vollständige E-Mail-Adresse als `EMAIL_HOST_USER` ein
- Das Passwort ist Ihr Mailbox-Passwort (nicht Ihr Netcup-Login!)

### 3. Port-Optionen

Je nach Ihrer Konfiguration können Sie verschiedene Ports verwenden:

#### Option A: STARTTLS (empfohlen)
```env
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
```

#### Option B: SSL/TLS
```env
EMAIL_PORT=465
EMAIL_USE_TLS=False
EMAIL_USE_SSL=True
```

#### Option C: STARTTLS (alternativer Port)
```env
EMAIL_PORT=25
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
```

### 4. Sichern Sie die .env Datei

```bash
chmod 600 .env
chown www-data:www-data .env
```

### 5. Testen Sie die E-Mail Konfiguration

Erstellen Sie ein Test-Skript:

```bash
nano test_email.py
```

Inhalt:

```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings_production')
django.setup()

from django.core.mail import send_mail

try:
    send_mail(
        subject='Test E-Mail von Schichtplan App',
        message='Dies ist eine Test-E-Mail. Wenn Sie diese erhalten, funktioniert die Konfiguration!',
        from_email=os.environ.get('DEFAULT_FROM_EMAIL'),
        recipient_list=['ihre-test-email@example.com'],  # Ihre Test-E-Mail
        fail_silently=False,
    )
    print("✓ E-Mail wurde erfolgreich versendet!")
except Exception as e:
    print(f"✗ Fehler beim E-Mail-Versand: {e}")
```

Ausführen:

```bash
source env/bin/activate
python test_email.py
```

### 6. Service neu starten

Nach der Konfiguration müssen Sie die Anwendung neu starten:

```bash
sudo systemctl restart schichtplan
```

## Verwendungszwecke

Die E-Mail-Funktion wird verwendet für:
- ✉️ Urlaubsanträge (Benachrichtigung an Vorgesetzte)
- ✉️ Genehmigungs-/Ablehnungs-Bestätigungen
- ✉️ Schichtplan-Änderungen
- ✉️ Passwort-Reset (wenn implementiert)
- ✉️ System-Benachrichtigungen

## Fehlerbehebung

### Fehler: "Connection refused"
- Prüfen Sie, ob der EMAIL_HOST korrekt ist
- Versuchen Sie verschiedene Ports (587, 465, 25)

### Fehler: "Authentication failed"
- Prüfen Sie Benutzernamen und Passwort
- Verwenden Sie die vollständige E-Mail-Adresse als Benutzername
- Stellen Sie sicher, dass das Postfach aktiviert ist

### Fehler: "Timeout"
- Der Port könnte von Ihrer Firewall blockiert sein
- Kontaktieren Sie Ihren Hosting-Provider

### Testen ohne echten Versand (Development)

In der lokalen `settings.py` bleibt das Console-Backend aktiv:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

E-Mails werden dann nur in der Konsole ausgegeben.

## Sicherheitshinweise

⚠️ **WICHTIG:**
- Die `.env` Datei darf **NIEMALS** committed werden (ist in `.gitignore`)
- Verwenden Sie ein starkes Mailbox-Passwort
- Aktivieren Sie 2FA für Ihr Netcup-Konto
- Speichern Sie Zugangsdaten sicher (z.B. in einem Passwort-Manager)

## Support

Bei Problemen mit den E-Mail-Einstellungen:
1. Prüfen Sie die Netcup Webhosting Dokumentation
2. Testen Sie die Anmeldedaten in einem E-Mail-Client (z.B. Thunderbird)
3. Kontaktieren Sie den Netcup Support für Server-spezifische Probleme
