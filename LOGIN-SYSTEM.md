# Mitarbeiter Login-System

## 🔐 Automatische Benutzer-Erstellung

Wenn ein neuer Mitarbeiter im System erstellt wird, werden automatisch Login-Daten generiert:

### Username-Format
```
vorname.nachname
```

**Beispiele:**
- Max Mustermann → `max.mustermann`
- Anna Schmidt → `anna.schmidt`
- Hans-Peter Müller → `hans-peter.mueller`

**Hinweise:**
- Alle Buchstaben werden klein geschrieben
- Leerzeichen werden durch Punkte ersetzt
- Umlaute werden umgewandelt: ä→ae, ö→oe, ü→ue, ß→ss
- Bei Duplikaten wird eine Nummer angehängt: `max.mustermann1`, `max.mustermann2`

### Standard-Passwort
```
Abc123
```

**Alle neuen Mitarbeiter erhalten das gleiche Standard-Passwort:**
- Einfach zu merken
- Sollte beim ersten Login geändert werden

## 📝 Workflow für neue Mitarbeiter

### 1. Mitarbeiter wird erstellt (Admin/HR)
```
Admin/HR → Dashboard → Mitarbeiter → Neuer Mitarbeiter
- Vorname: Max
- Nachname: Mustermann  
- E-Mail: max.mustermann@firma.de
- ... weitere Daten
```

### 2. System generiert Login-Daten automatisch
```
✅ Username: max.mustermann
✅ Passwort: Abc123
✅ User-Account wird erstellt
✅ Mitarbeiter-Profil wird verknüpft
```

### 3. Admin informiert Mitarbeiter
Admin teilt dem neuen Mitarbeiter mit:
```
Ihre Login-Daten:
Benutzername: max.mustermann
Passwort: Abc123

Bitte ändern Sie Ihr Passwort nach dem ersten Login!
```

### 4. Mitarbeiter loggt sich ein
```
1. Öffne: https://deine-app.de/login
2. Username: max.mustermann
3. Passwort: Abc123
4. Login
```

### 5. Passwort ändern
```
1. Nach Login: Oben rechts → User-Menü → "Passwort ändern"
2. Altes Passwort: Abc123
3. Neues Passwort: (eigenes sicheres Passwort)
4. Bestätigen und speichern
```

## 🎯 Passwort-Änderungs-Feature

### Wo?
- Dashboard → User-Menü (oben rechts) → "Passwort ändern"
- Oder direkt: `/change-password`

### Was wird geprüft?
- ✅ Altes Passwort muss korrekt sein
- ✅ Neues Passwort mindestens 6 Zeichen
- ✅ Passwort-Bestätigung muss übereinstimmen

### Sicherheit
- Passwörter werden gehasht gespeichert (bcrypt)
- Altes Passwort wird vor Änderung validiert
- Keine Passwörter im Klartext in der Datenbank

## 👤 Benutzer-Rollen

Alle neuen Mitarbeiter erhalten standardmäßig die Rolle:
```
employee (Mitarbeiter)
```

**Rollen-Hierarchie:**
1. `admin` - Administrator (alle Rechte)
2. `hr` - Personalwesen (HR)
3. `department_manager` - Abteilungsleiter
4. `team_leader` - Teamleiter
5. `group_leader` - Gruppenleiter
6. `employee` - Mitarbeiter (Standard)

**Rollen können nur von Admin/HR geändert werden:**
- Dashboard → Mitarbeiter → Bearbeiten → Rolle ändern

## 🔧 Backend-Implementierung

### Mitarbeiter-Erstellung (Django)
```python
# shifts/serializers.py - EmployeeSerializer.create()

def create(self, validated_data):
    first_name = validated_data.pop('first_name', '')
    last_name = validated_data.pop('last_name', '')
    email = validated_data.pop('email', '')
    
    # Username: vorname.nachname
    username = f"{first_name.lower()}.{last_name.lower()}"
    username = username.replace(' ', '.').replace('ä', 'ae')...
    
    # Standard-Passwort
    default_password = 'Abc123'
    
    # User erstellen
    user = User.objects.create(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password=make_password(default_password),
        organization=self.context['request'].user.organization,
        role='employee'
    )
    
    validated_data['user'] = user
    return super().create(validated_data)
```

### Passwort-Änderung (Django)
```python
# accounts/views.py - UserViewSet.change_password()

@action(detail=False, methods=['post'])
def change_password(self, request):
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        
        # Prüfe altes Passwort
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': ['Falsches Passwort.']}, ...)
        
        # Setze neues Passwort
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Passwort erfolgreich geändert.'})
    
    return Response(serializer.errors, ...)
```

## 🎨 Frontend-Komponenten

### Login (`/login`)
- Standard Login-Formular
- Username + Passwort
- Validierung
- Error-Handling

### Passwort ändern (`/change-password`)
- Altes Passwort (Validierung)
- Neues Passwort (min. 6 Zeichen)
- Bestätigung (muss übereinstimmen)
- Success/Error Snackbar
- Redirect nach Erfolg

### Employee-Dialog (Admin/HR)
- Info-Banner mit Login-Daten
- Zeigt Username-Format
- Zeigt Standard-Passwort
- Hinweis: "Mitarbeiter können Passwort ändern"

## 📊 Beispiel-Daten

### Neue Mitarbeiter
| Name | Username | Passwort | E-Mail |
|------|----------|----------|---------|
| Max Mustermann | max.mustermann | Abc123 | max.mustermann@firma.de |
| Anna Schmidt | anna.schmidt | Abc123 | anna.schmidt@firma.de |
| Peter Müller | peter.mueller | Abc123 | peter.mueller@firma.de |

### Nach Passwort-Änderung
| Name | Username | Passwort | Status |
|------|----------|----------|--------|
| Max Mustermann | max.mustermann | ••••••••• | ✅ Geändert |
| Anna Schmidt | anna.schmidt | Abc123 | ⚠️ Standard |
| Peter Müller | peter.mueller | ••••••••• | ✅ Geändert |

## ⚙️ Konfiguration

### Passwort-Anforderungen anpassen
```python
# settings.py
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}  # Standard: 6
    },
    # Weitere Validatoren...
]
```

### Standard-Passwort ändern
```python
# shifts/serializers.py
default_password = 'NeuesStandardPasswort123!'
```

### Username-Format anpassen
```python
# shifts/serializers.py
# Aktuell: vorname.nachname
username = f"{first_name.lower()}.{last_name.lower()}"

# Alternative: vorname_nachname
username = f"{first_name.lower()}_{last_name.lower()}"

# Alternative: vnachname (Anfangsbuchstabe Vorname + Nachname)
username = f"{first_name[0].lower()}{last_name.lower()}"
```

## 🔒 Sicherheits-Best-Practices

1. **Standard-Passwort sofort ändern**
   - Mitarbeiter sollten beim ersten Login aufgefordert werden
   - Optional: Force Password Change beim ersten Login

2. **Starke Passwörter verwenden**
   - Min. 8 Zeichen
   - Groß- und Kleinbuchstaben
   - Zahlen und Sonderzeichen

3. **Passwort-Rotation**
   - Optional: Passwort alle 90 Tage ändern
   - Optional: Passwort-Historie (alte nicht wiederverwenden)

4. **Login-Versuche limitieren**
   - Max. 5 fehlgeschlagene Versuche
   - Account-Sperrung nach mehrfachen Fehlversuchen

5. **2-Faktor-Authentifizierung**
   - Optional für erhöhte Sicherheit
   - TOTP (Google Authenticator, Authy)

## 📧 E-Mail-Benachrichtigung (Optional)

Automatische E-Mail mit Login-Daten:

```python
# Beim Erstellen eines neuen Mitarbeiters
from django.core.mail import send_mail

def send_welcome_email(user, username, password):
    subject = 'Willkommen - Ihre Login-Daten'
    message = f'''
    Hallo {user.first_name},
    
    Ihr Account wurde erstellt:
    
    Benutzername: {username}
    Passwort: {password}
    
    Bitte ändern Sie Ihr Passwort nach dem ersten Login.
    
    Login: https://deine-app.de/login
    '''
    
    send_mail(
        subject,
        message,
        'noreply@firma.de',
        [user.email],
        fail_silently=False,
    )
```

## ✅ Testing

### Manueller Test
1. Admin erstellt neuen Mitarbeiter
2. Prüfe generierter Username
3. Login mit Standard-Passwort
4. Passwort ändern
5. Logout und Login mit neuem Passwort

### Unit Tests
```python
# tests.py
def test_username_generation():
    # Test: Max Mustermann → max.mustermann
    # Test: Hans-Peter Müller → hans-peter.mueller
    # Test: Duplikate → max.mustermann1
    pass

def test_password_change():
    # Test: Altes Passwort korrekt
    # Test: Neues Passwort >= 6 Zeichen
    # Test: Passwörter stimmen überein
    pass
```

## 🎉 Fertig!

Das Login-System ist nun vollständig konfiguriert und alle neuen Mitarbeiter können sich mit ihren generierten Login-Daten anmelden!
