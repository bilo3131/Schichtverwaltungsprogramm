# PWA-Funktionen - Schichtplan Verwaltung

## ✅ Was wurde hinzugefügt?

Deine Schichtplan-App ist jetzt eine **Progressive Web App (PWA)**!

## 🎯 Features

### 1. **Installierbar wie eine Desktop-App**
- Benutzer sehen einen "Installieren"-Button im User-Menü (oben rechts)
- Alternativ zeigt der Browser automatisch ein Install-Banner
- Nach Installation: Icon auf Desktop/Startbildschirm
- Öffnet sich ohne Browser-Leiste (wie native App)

### 2. **Offline-Fähigkeit**
- **Statische Assets**: HTML, CSS, JS werden gecacht
- **API-Daten**: Intelligentes Caching:
  - `freshness` für Schichten, Mitarbeiter, Urlaube (immer aktuelle Daten versuchen)
  - `performance` für Abteilungen, Qualifikationen, Schichttypen (aus Cache laden)
  - Max. 1h Cache für dynamische Daten
  - Max. 6h Cache für statische Stammdaten

### 3. **Automatische Updates**
- Service Worker prüft automatisch auf neue Versionen
- User wird gefragt: "Neue Version verfügbar. Jetzt aktualisieren?"
- Kein manueller Refresh nötig

### 4. **Optimiert für Mobile & Desktop**
- Responsive Design funktioniert perfekt
- Material Design optimiert für Touch
- Portrait-Modus bevorzugt auf Smartphones

## 📱 Installation testen

### Lokal (Development):
```bash
# 1. Production Build erstellen
ng build --configuration=production

# 2. Lokalen Server mit HTTPS starten (PWA benötigt HTTPS)
npm install -g http-server
http-server dist/frontend/browser -p 8080 --ssl

# 3. Browser öffnen: https://localhost:8080
# Chrome zeigt Install-Button in der Adressleiste
```

### Production:
```bash
# Einfach deployen auf:
- Vercel, Netlify, Firebase Hosting (automatisches HTTPS)
- Eigener Server mit Nginx + Let's Encrypt SSL

# Nach Deploy: Browser zeigt automatisch Install-Prompt
```

## 🔧 Dateien die hinzugefügt wurden

```
frontend/
├── public/
│   ├── manifest.webmanifest        # PWA Konfiguration
│   └── icons/                      # App Icons (72x72 bis 512x512)
├── ngsw-config.json               # Service Worker Konfiguration
└── src/app/core/services/
    └── pwa.service.ts             # PWA Service für Updates & Installation
```

## 🎨 Anpassungen

### App-Name & Farben ändern:
**`public/manifest.webmanifest`**
```json
{
  "name": "Dein App Name",
  "short_name": "Kurzname",
  "theme_color": "#1976d2",      // Browser Theme-Farbe
  "background_color": "#fafafa"   // Splash Screen Hintergrund
}
```

### Eigene Icons verwenden:
1. Ersetze die Bilder in `public/icons/` (72x72 bis 512x512)
2. Am besten: Quadratisches Logo mit transparentem Hintergrund

### Cache-Strategie anpassen:
**`ngsw-config.json`**
```json
"cacheConfig": {
  "maxSize": 100,        // Max. Anzahl gecachte Responses
  "maxAge": "1h",        // Cache-Dauer (1h, 6h, 1d, etc.)
  "strategy": "freshness" // "freshness" oder "performance"
}
```

## 🚀 Deployment-Tipps

### Vercel (empfohlen):
```bash
npm install -g vercel
vercel --prod
# Automatisches HTTPS + PWA funktioniert sofort
```

### Eigener Server (Nginx):
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name deine-domain.de;
    
    ssl_certificate /etc/letsencrypt/live/deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.de/privkey.pem;
    
    root /var/www/schichtplan/dist/frontend/browser;
    
    # Service Worker benötigt korrekte MIME-Types
    location /ngsw-worker.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }
    
    # Cache für Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Fallback für Angular Routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 📊 PWA Testen

### Chrome DevTools:
1. F12 → **Application** Tab
2. **Manifest**: Siehst du App-Name + Icons?
3. **Service Workers**: Ist einer registriert?
4. **Lighthouse**: Audit ausführen (sollte PWA-Score > 90 haben)

### Offline-Test:
1. Öffne App im Browser
2. DevTools → **Network** Tab → **Offline** aktivieren
3. Seite refreshen → Sollte trotzdem laden!

## 🎯 User-Experience

**Mitarbeiter sieht:**
1. Erste Nutzung: "App installieren" im User-Menü
2. Nach Installation: Desktop-Icon
3. Klick auf Icon → App öffnet sich (ohne Browser-Leiste)
4. Sieht aus und fühlt sich an wie native Software
5. Funktioniert auch offline (gecachte Daten)
6. Automatische Updates im Hintergrund

## ⚠️ Wichtig

- **HTTPS ist Pflicht**: PWA funktioniert nur über HTTPS (außer localhost)
- **iOS Safari**: Installation über "Zum Home-Bildschirm" (weniger Features)
- **Production Build**: Service Worker nur im Production-Mode aktiv
- **Cookies/LocalStorage**: Funktioniert weiterhin normal (Auth, etc.)

## 🔄 Updates deployen

```bash
# 1. Neuen Build erstellen
ng build --configuration=production

# 2. Auf Server deployen
# Service Worker erkennt automatisch neue Version
# User wird beim nächsten Besuch gefragt ob Update

# 3. Force-Update (alle User sofort):
# Ändere "version" in ngsw-config.json
```

## 📝 Nächste Schritte (Optional)

- **Push-Notifications**: Benachrichtigungen bei neuen Urlaubsanträgen
- **Background Sync**: Offline-Änderungen später synchronisieren
- **Web Share API**: Schichtpläne teilen
- **Badge API**: Anzahl offener Anträge im App-Icon

## ✨ Fertig!

Deine App ist jetzt PWA-ready. Einfach auf HTTPS-Server deployen und Benutzer können sie wie eine native App installieren! 🎉
