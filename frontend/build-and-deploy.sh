#!/bin/bash

# ===========================================
# Frontend Build & Deploy Script
# ===========================================
# Dieses Script baut das Angular Frontend für
# Production und bereitet es für das Deployment vor
# 
# Ausführen auf deinem lokalen Rechner:
# bash build-and-deploy.sh
# ===========================================

set -e  # Script bei Fehler abbrechen

echo "=========================================="
echo "Frontend Build & Deploy für Schichtplan"
echo "=========================================="
echo ""

# Variablen (passe diese an)
SERVER_USER="your-user"
SERVER_HOST="ihre-domain.com"
SERVER_PATH="/var/www/schichtplan/frontend"

# Farbcodes für Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js ist nicht installiert!${NC}"
    exit 1
fi

# Prüfe ob Angular CLI installiert ist
if ! command -v ng &> /dev/null; then
    echo -e "${YELLOW}⚠ Angular CLI ist nicht installiert. Installiere...${NC}"
    npm install -g @angular/cli
fi

echo -e "${YELLOW}► Schritt 1: Dependencies installieren${NC}"
cd frontend
npm install

echo ""
echo -e "${YELLOW}► Schritt 2: Production Build erstellen${NC}"
echo "Dies kann einige Minuten dauern..."
ng build --configuration production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build erfolgreich!${NC}"
else
    echo -e "${RED}✗ Build fehlgeschlagen!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}► Schritt 3: Build-Informationen${NC}"
BUILD_DIR="dist/frontend/browser"
BUILD_SIZE=$(du -sh $BUILD_DIR | cut -f1)
FILE_COUNT=$(find $BUILD_DIR -type f | wc -l)

echo "  Build-Verzeichnis: $BUILD_DIR"
echo "  Größe: $BUILD_SIZE"
echo "  Anzahl Dateien: $FILE_COUNT"

# Frage nach Deployment
echo ""
read -p "Möchtest du die Build-Dateien auf den Server hochladen? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}► Schritt 4: Upload auf Server${NC}"
    
    # Prüfe SSH-Verbindung
    if ! ssh -q $SERVER_USER@$SERVER_HOST exit; then
        echo -e "${RED}✗ Kann keine Verbindung zum Server herstellen!${NC}"
        echo "Bitte prüfe:"
        echo "  - SERVER_USER und SERVER_HOST in diesem Script"
        echo "  - SSH-Key ist auf dem Server hinterlegt"
        echo "  - Server ist erreichbar"
        exit 1
    fi
    
    # Erstelle Backup auf dem Server
    echo "Erstelle Backup der aktuellen Version..."
    ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH/.. && tar -czf frontend-backup-\$(date +%Y%m%d-%H%M%S).tar.gz frontend/ || true"
    
    # Upload neue Dateien
    echo "Lade neue Dateien hoch..."
    rsync -avz --delete $BUILD_DIR/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Deployment erfolgreich!${NC}"
        echo ""
        echo "Deine Anwendung sollte jetzt live sein:"
        echo "  https://$SERVER_HOST"
    else
        echo -e "${RED}✗ Upload fehlgeschlagen!${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}ℹ Manuelles Deployment:${NC}"
    echo "1. Upload mit SCP:"
    echo "   scp -r $BUILD_DIR/* $SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
    echo ""
    echo "2. Oder mit rsync:"
    echo "   rsync -avz --delete $BUILD_DIR/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Script abgeschlossen!${NC}"
echo "=========================================="
