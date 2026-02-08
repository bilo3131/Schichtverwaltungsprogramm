# 🔧 Lokales Login-Problem lösen

## Häufigste Ursachen & Lösungen

### Problem 1: Backend läuft nicht

**Prüfen:**
```powershell
# Im Terminal cmd
cd "c:\Code\2. Business\Schichtplan\backend"

# Virtual Environment aktivieren
env\Scripts\activate

# Backend starten
python manage.py runserver
```

**Sollte zeigen:**
```
Starting development server at http://127.0.0.1:8000/
```

✅ **Backend muss laufen während du dich einloggst!**

---

### Problem 2: Datenbank nicht initialisiert

**Prüfen ob db.sqlite3 existiert:**
```powershell
dir backend\db.sqlite3
```

**Falls nicht vorhanden - Datenbank erstellen:**
```powershell
cd backend
env\Scripts\activate
python manage.py migrate
```

---

### Problem 3: Kein Test-User vorhanden

**Test-User erstellen:**
```powershell
cd backend
env\Scripts\activate
python create_test_user.py
```

**Sollte ausgeben:**
```
Organisation "Test Firma" wurde erstellt.
Admin-Benutzer "admin" wurde erstellt.
Passwort: admin123

Sie können sich jetzt anmelden mit:
Benutzername: admin
Passwort: admin123
```

---

### Problem 4: Frontend kann Backend nicht erreichen

**Prüfen ob Frontend läuft:**
```powershell
cd frontend
ng serve
```

**Sollte zeigen:**
```
Application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200 **
```

**Prüfen ob API erreichbar:**
- Öffne Browser: http://localhost:8000/api/v1/
- Sollte Django REST Framework Seite zeigen

---

## 🚀 Komplette Neuinstallation (falls nötig)

**Schritt 1: Backend aufräumen**
```powershell
cd "c:\Code\2. Business\Schichtplan\backend"

# Alte Datenbank löschen (falls korrupt)
del db.sqlite3
```

**Schritt 2: Virtual Environment prüfen**
```powershell
# Virtual Environment aktivieren
env\Scripts\activate

# Sollte (env) am Anfang zeigen
```

**Schritt 3: Datenbank neu erstellen**
```powershell
python manage.py migrate
```

**Schritt 4: Test-User erstellen**
```powershell
python create_test_user.py
```

**Schritt 5: Backend starten**
```powershell
python manage.py runserver
```

**Lass dieses Terminal OFFEN!**

---

**Schritt 6: Frontend starten (neues Terminal)**
```powershell
cd "c:\Code\2. Business\Schichtplan\frontend"
ng serve
```

**Lass auch dieses Terminal OFFEN!**

---

**Schritt 7: Im Browser öffnen**
- Gehe zu: http://localhost:4200
- Login mit:
  - **Benutzername:** `admin`
  - **Passwort:** `admin123`

---

## 🔍 Fehlerdiagnose

### Fehler: "Connection refused" oder "Network Error"

**Problem:** Backend läuft nicht

**Lösung:**
```powershell
# Terminal 1: Backend
cd backend
env\Scripts\activate
python manage.py runserver

# Muss laufen bleiben!
```

---

### Fehler: "Invalid credentials" / "Ungültige Anmeldedaten"

**Problem:** User existiert nicht oder falsches Passwort

**Lösung:**
```powershell
cd backend
env\Scripts\activate
python create_test_user.py
```

Probiere dann:
- **Benutzername:** `admin`
- **Passwort:** `admin123`

---

### Fehler: "django.db.utils.OperationalError: no such table"

**Problem:** Datenbank nicht migriert

**Lösung:**
```powershell
cd backend
env\Scripts\activate
python manage.py migrate
python create_test_user.py
python manage.py runserver
```

---

### Fehler: API gibt 500 Internal Server Error

**Problem:** Fehler im Backend-Code

**Lösung - Prüfe Backend Console:**
```powershell
# Im Terminal wo Backend läuft, siehst du Fehler
# Zeige mir den Fehler und ich helfe dir
```

---

## ✅ Checkliste für funktionierendes Login

- [ ] Backend läuft (`python manage.py runserver`)
- [ ] Frontend läuft (`ng serve`)
- [ ] Datenbank existiert (`db.sqlite3` vorhanden)
- [ ] Migrationen ausgeführt (`python manage.py migrate`)
- [ ] Test-User erstellt (`python create_test_user.py`)
- [ ] http://localhost:8000/api/v1/ erreichbar im Browser
- [ ] http://localhost:4200 zeigt Login-Seite
- [ ] Login mit `admin` / `admin123`

---

## 🎯 Schnell-Check Script

Erstelle eine Datei `check-local.bat`:

```batch
@echo off
echo ==========================================
echo   Lokales Setup prüfen
echo ==========================================
echo.

echo [1/5] Prüfe Datenbank...
if exist backend\db.sqlite3 (
    echo ✓ Datenbank vorhanden
) else (
    echo ✗ Datenbank fehlt - Erstelle...
    cd backend
    call env\Scripts\activate
    python manage.py migrate
    python create_test_user.py
    cd ..
)

echo.
echo [2/5] Prüfe ob Backend erreichbar...
curl -s http://localhost:8000/api/v1/ >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Backend läuft
) else (
    echo ✗ Backend läuft NICHT
    echo   Starte mit: cd backend ^&^& env\Scripts\activate ^&^& python manage.py runserver
)

echo.
echo [3/5] Prüfe ob Frontend erreichbar...
curl -s http://localhost:4200 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Frontend läuft
) else (
    echo ✗ Frontend läuft NICHT
    echo   Starte mit: cd frontend ^&^& ng serve
)

echo.
echo [4/5] Test-User Info...
echo   Benutzername: admin
echo   Passwort: admin123

echo.
echo [5/5] URLs...
echo   Backend API: http://localhost:8000/api/v1/
echo   Frontend: http://localhost:4200

echo.
echo ==========================================
pause
```

---

## 💡 Typischer Workflow

**Terminal 1 (Backend):**
```powershell
cd "c:\Code\2. Business\Schichtplan\backend"
env\Scripts\activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```powershell
cd "c:\Code\2. Business\Schichtplan\frontend"
ng serve
```

**Browser:**
- http://localhost:4200
- Login: `admin` / `admin123`

---

## 🆘 Immer noch nicht?

Führe diese Befehle aus und sende mir die Ausgabe:

```powershell
# Test 1: Backend-Status
cd backend
env\Scripts\activate
python manage.py check

# Test 2: User existiert?
python -c "import django; django.setup(); from accounts.models import User; print(User.objects.all())"

# Test 3: Kann einloggen?
python test_login.py
```

Zeige mir die Ausgabe und ich helfe dir!
