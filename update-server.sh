#!/bin/bash
# ===========================================
# Quick Update Script für Server
# ===========================================
# Lädt die neuesten Änderungen auf den Server
# und startet alle Services neu
# ===========================================

set -e  # Bei Fehler abbrechen

echo "=========================================="
echo "  Vardiy - Server Update Script"
echo "=========================================="
echo ""

# Variablen - PASSE DIESE AN!
SERVER_USER="hetzner"
SERVER_HOST="vardiy.de"
SERVER_PATH="/var/www/vardiy"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Prüfe SSH-Verbindung
echo -e "${YELLOW}► Prüfe Server-Verbindung...${NC}"
if ! ssh -q $SERVER_USER@$SERVER_HOST exit; then
    echo -e "${RED}✗ Kann nicht zum Server verbinden!${NC}"
    echo "Prüfe SERVER_USER und SERVER_HOST in diesem Script."
    exit 1
fi
echo -e "${GREEN}✓ Server erreichbar${NC}"
echo ""

# Backend Update
echo -e "${YELLOW}► Aktualisiere Backend auf Server...${NC}"
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd /var/www/vardiy
echo "  - Git Pull..."
git pull origin main

cd backend
echo "  - Virtual Environment aktivieren..."
source venv/bin/activate

echo "  - Migrationen prüfen..."
python manage.py migrate --settings=schichtplan.settings_production --noinput

echo "  - Gunicorn neu starten..."
sudo systemctl restart gunicorn-vardiy

echo "  - Status prüfen..."
sudo systemctl status gunicorn-vardiy --no-pager -l

ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend Update erfolgreich${NC}"
else
    echo -e "${RED}✗ Backend Update fehlgeschlagen!${NC}"
    exit 1
fi

echo ""

# Frontend Build & Deploy
echo -e "${YELLOW}► Baue Frontend lokal...${NC}"
cd frontend
npm install --silent
ng build --configuration production --progress=false

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Frontend Build fehlgeschlagen!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend Build erfolgreich${NC}"
echo ""

echo -e "${YELLOW}► Lade Frontend auf Server hoch...${NC}"
rsync -avz --delete dist/frontend/browser/ $SERVER_USER@$SERVER_HOST:$SERVER_PATH/frontend/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend Upload erfolgreich${NC}"
else
    echo -e "${RED}✗ Frontend Upload fehlgeschlagen!${NC}"
    exit 1
fi

echo ""

# Nginx neu laden
echo -e "${YELLOW}► Nginx neu laden...${NC}"
ssh $SERVER_USER@$SERVER_HOST "sudo systemctl reload nginx"

echo ""
echo -e "${GREEN}=========================================="
echo "  ✓ Update erfolgreich abgeschlossen!"
echo "==========================================${NC}"
echo ""
echo "Deine Anwendung sollte jetzt aktualisiert sein:"
echo "  https://vardiy.de"
echo ""
echo "Prüfe die Logs bei Problemen:"
echo "  ssh $SERVER_USER@$SERVER_HOST 'sudo journalctl -u gunicorn-vardiy -f'"
echo ""
