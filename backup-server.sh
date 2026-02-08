#!/bin/bash
# ===========================================
# Automatisches Backup Script für Server
# ===========================================
# Erstellt Backups von:
# - Datenbank (PostgreSQL)
# - Backend Code
# - Frontend Code
# - Konfigurationsdateien
# ===========================================

set -e

# Variablen - PASSE DIESE AN!
DB_NAME="schichtplan"
DB_USER="schichtplan_user"
BACKUP_DIR="/var/backups/schichtplan"
PROJECT_DIR="/var/www/schichtplan"
RETENTION_DAYS=7  # Backups älter als X Tage werden gelöscht

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_ONLY=$(date +"%Y%m%d")

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Schichtplan - Backup Script"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Backup-Verzeichnis erstellen falls nicht vorhanden
mkdir -p $BACKUP_DIR/{database,code,configs}

# 1. Datenbank Backup
echo -e "${YELLOW}► Erstelle Datenbank-Backup...${NC}"
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/database/db_${TIMESTAMP}.sql.gz

if [ $? -eq 0 ]; then
    SIZE=$(du -h $BACKUP_DIR/database/db_${TIMESTAMP}.sql.gz | cut -f1)
    echo -e "${GREEN}✓ Datenbank gesichert (${SIZE})${NC}"
else
    echo -e "${RED}✗ Datenbank-Backup fehlgeschlagen!${NC}"
    exit 1
fi

# 2. Backend Code Backup
echo -e "${YELLOW}► Erstelle Backend-Code-Backup...${NC}"
cd $PROJECT_DIR
tar -czf $BACKUP_DIR/code/backend_${DATE_ONLY}.tar.gz \
    --exclude='backend/env' \
    --exclude='backend/venv' \
    --exclude='backend/__pycache__' \
    --exclude='backend/staticfiles' \
    --exclude='backend/logs' \
    --exclude='backend/db.sqlite3' \
    backend/

if [ $? -eq 0 ]; then
    SIZE=$(du -h $BACKUP_DIR/code/backend_${DATE_ONLY}.tar.gz | cut -f1)
    echo -e "${GREEN}✓ Backend Code gesichert (${SIZE})${NC}"
else
    echo -e "${RED}✗ Backend-Backup fehlgeschlagen!${NC}"
fi

# 3. Frontend Code Backup
echo -e "${YELLOW}► Erstelle Frontend-Backup...${NC}"
tar -czf $BACKUP_DIR/code/frontend_${DATE_ONLY}.tar.gz frontend/

if [ $? -eq 0 ]; then
    SIZE=$(du -h $BACKUP_DIR/code/frontend_${DATE_ONLY}.tar.gz | cut -f1)
    echo -e "${GREEN}✓ Frontend gesichert (${SIZE})${NC}"
else
    echo -e "${RED}✗ Frontend-Backup fehlgeschlagen!${NC}"
fi

# 4. Konfigurationsdateien Backup
echo -e "${YELLOW}► Erstelle Config-Backup...${NC}"
tar -czf $BACKUP_DIR/configs/configs_${DATE_ONLY}.tar.gz \
    backend/.env \
    backend/schichtplan/settings_production.py \
    /etc/nginx/sites-available/schichtplan \
    /etc/systemd/system/schichtplan.service 2>/dev/null

if [ $? -eq 0 ]; then
    SIZE=$(du -h $BACKUP_DIR/configs/configs_${DATE_ONLY}.tar.gz | cut -f1)
    echo -e "${GREEN}✓ Konfigs gesichert (${SIZE})${NC}"
else
    echo -e "${YELLOW}⚠ Einige Config-Dateien konnten nicht gesichert werden${NC}"
fi

# 5. Alte Backups löschen
echo -e "${YELLOW}► Lösche alte Backups (älter als ${RETENTION_DAYS} Tage)...${NC}"
find $BACKUP_DIR/database/ -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/code/ -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR/configs/ -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

REMAINING=$(find $BACKUP_DIR -type f | wc -l)
echo -e "${GREEN}✓ Bereinigung abgeschlossen (${REMAINING} Backups verbleibend)${NC}"

# 6. Backup-Übersicht
echo ""
echo "=========================================="
echo "  Backup-Übersicht"
echo "=========================================="
echo "Datenbank-Backups:"
ls -lh $BACKUP_DIR/database/ | tail -n 5

echo ""
echo "Code-Backups:"
ls -lh $BACKUP_DIR/code/ | tail -n 3

echo ""
echo "Config-Backups:"
ls -lh $BACKUP_DIR/configs/ | tail -n 3

echo ""
echo -e "${GREEN}=========================================="
echo "  ✓ Backup erfolgreich abgeschlossen!"
echo "==========================================${NC}"
echo ""
echo "Backup-Speicherort: $BACKUP_DIR"
echo "Gesamtgröße: $(du -sh $BACKUP_DIR | cut -f1)"
echo ""
