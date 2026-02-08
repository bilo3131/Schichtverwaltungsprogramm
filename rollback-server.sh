#!/bin/bash
# ===========================================
# Rollback Script für Server
# ===========================================
# Stellt einen vorherigen Zustand wieder her
# ===========================================

set -e

BACKUP_DIR="/var/backups/schichtplan"
PROJECT_DIR="/var/www/schichtplan"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Schichtplan - Rollback Script"
echo "=========================================="
echo ""
echo -e "${RED}WARNUNG: Dieser Vorgang überschreibt den aktuellen Code!${NC}"
echo ""

# Prüfe ob Root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Bitte als Root ausführen (sudo)${NC}"
    exit 1
fi

# Prüfe ob Backup-Verzeichnis existiert
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}Backup-Verzeichnis existiert nicht: $BACKUP_DIR${NC}"
    exit 1
fi

# Funktion: Auswahl aus Liste
select_backup() {
    local BACKUP_TYPE=$1
    local BACKUP_PATH=$2
    
    echo -e "${YELLOW}Verfügbare ${BACKUP_TYPE}-Backups:${NC}"
    echo ""
    
    local FILES=($(ls -t $BACKUP_PATH))
    
    if [ ${#FILES[@]} -eq 0 ]; then
        echo -e "${RED}Keine Backups gefunden!${NC}"
        return 1
    fi
    
    local i=1
    for file in "${FILES[@]}"; do
        local SIZE=$(du -h "$BACKUP_PATH/$file" | cut -f1)
        local DATE=$(stat -c %y "$BACKUP_PATH/$file" | cut -d' ' -f1,2 | cut -d'.' -f1)
        printf "${BLUE}%2d)${NC} %s (${SIZE}, ${DATE})\n" $i "$file"
        ((i++))
    done
    
    echo ""
    read -p "Wähle eine Nummer (oder 0 zum Abbrechen): " choice
    
    if [ "$choice" -eq 0 ]; then
        echo "Abgebrochen."
        exit 0
    fi
    
    if [ "$choice" -gt 0 ] && [ "$choice" -le "${#FILES[@]}" ]; then
        SELECTED_FILE="${FILES[$((choice-1))]}"
        echo "$BACKUP_PATH/$SELECTED_FILE"
    else
        echo -e "${RED}Ungültige Auswahl!${NC}"
        return 1
    fi
}

# Hauptmenü
echo "Was möchtest du wiederherstellen?"
echo ""
echo "1) Datenbank"
echo "2) Backend Code"
echo "3) Frontend Code"
echo "4) Konfigurationsdateien"
echo "5) Alles (Datenbank + Code + Configs)"
echo "0) Abbrechen"
echo ""
read -p "Deine Wahl: " main_choice

case $main_choice in
    1)
        # Datenbank wiederherstellen
        echo ""
        BACKUP_FILE=$(select_backup "Datenbank" "$BACKUP_DIR/database")
        
        if [ -n "$BACKUP_FILE" ]; then
            echo ""
            read -p "Datenbank wirklich wiederherstellen? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}► Stelle Datenbank wieder her...${NC}"
                systemctl stop schichtplan
                
                gunzip -c "$BACKUP_FILE" | sudo -u postgres psql schichtplan
                
                systemctl start schichtplan
                echo -e "${GREEN}✓ Datenbank wiederhergestellt${NC}"
            fi
        fi
        ;;
        
    2)
        # Backend wiederherstellen
        echo ""
        BACKUP_FILE=$(select_backup "Backend" "$BACKUP_DIR/code")
        
        if [ -n "$BACKUP_FILE" ] && [[ "$BACKUP_FILE" == *"backend"* ]]; then
            echo ""
            read -p "Backend wirklich wiederherstellen? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}► Erstelle Backup des aktuellen Zustands...${NC}"
                tar -czf "$BACKUP_DIR/code/backend_before_rollback_$(date +%Y%m%d_%H%M%S).tar.gz" \
                    -C $PROJECT_DIR backend/
                
                echo -e "${YELLOW}► Stoppe Services...${NC}"
                systemctl stop schichtplan
                
                echo -e "${YELLOW}► Stelle Backend wieder her...${NC}"
                cd $PROJECT_DIR
                rm -rf backend_old
                mv backend backend_old
                tar -xzf "$BACKUP_FILE" -C $PROJECT_DIR
                
                echo -e "${YELLOW}► Starte Services...${NC}"
                systemctl start schichtplan
                
                echo -e "${GREEN}✓ Backend wiederhergestellt${NC}"
                echo "Alter Code gesichert in: backend_old/"
            fi
        fi
        ;;
        
    3)
        # Frontend wiederherstellen
        echo ""
        BACKUP_FILE=$(select_backup "Frontend" "$BACKUP_DIR/code")
        
        if [ -n "$BACKUP_FILE" ] && [[ "$BACKUP_FILE" == *"frontend"* ]]; then
            echo ""
            read -p "Frontend wirklich wiederherstellen? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}► Erstelle Backup des aktuellen Zustands...${NC}"
                tar -czf "$BACKUP_DIR/code/frontend_before_rollback_$(date +%Y%m%d_%H%M%S).tar.gz" \
                    -C $PROJECT_DIR frontend/
                
                echo -e "${YELLOW}► Stelle Frontend wieder her...${NC}"
                cd $PROJECT_DIR
                rm -rf frontend_old
                mv frontend frontend_old
                tar -xzf "$BACKUP_FILE" -C $PROJECT_DIR
                
                systemctl reload nginx
                
                echo -e "${GREEN}✓ Frontend wiederhergestellt${NC}"
                echo "Alter Code gesichert in: frontend_old/"
            fi
        fi
        ;;
        
    4)
        # Configs wiederherstellen
        echo ""
        BACKUP_FILE=$(select_backup "Config" "$BACKUP_DIR/configs")
        
        if [ -n "$BACKUP_FILE" ]; then
            echo ""
            read -p "Configs wirklich wiederherstellen? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}► Stelle Konfigurationsdateien wieder her...${NC}"
                tar -xzf "$BACKUP_FILE" -C /
                
                systemctl daemon-reload
                systemctl restart schichtplan
                systemctl reload nginx
                
                echo -e "${GREEN}✓ Configs wiederhergestellt${NC}"
            fi
        fi
        ;;
        
    5)
        # Alles wiederherstellen
        echo ""
        echo -e "${RED}WARNUNG: Kompletter Rollback - alle Änderungen gehen verloren!${NC}"
        read -p "Wirklich fortfahren? (yes/no): " confirm
        
        if [ "$confirm" == "yes" ]; then
            # Database
            BACKUP_FILE=$(select_backup "Datenbank" "$BACKUP_DIR/database")
            if [ -n "$BACKUP_FILE" ]; then
                echo -e "${YELLOW}► Datenbank wird wiederhergestellt...${NC}"
                systemctl stop schichtplan
                gunzip -c "$BACKUP_FILE" | sudo -u postgres psql schichtplan
            fi
            
            # Backend
            BACKUP_FILE=$(select_backup "Backend" "$BACKUP_DIR/code")
            if [ -n "$BACKUP_FILE" ] && [[ "$BACKUP_FILE" == *"backend"* ]]; then
                echo -e "${YELLOW}► Backend wird wiederhergestellt...${NC}"
                cd $PROJECT_DIR
                mv backend backend_old
                tar -xzf "$BACKUP_FILE" -C $PROJECT_DIR
            fi
            
            # Frontend
            BACKUP_FILE=$(select_backup "Frontend" "$BACKUP_DIR/code")
            if [ -n "$BACKUP_FILE" ] && [[ "$BACKUP_FILE" == *"frontend"* ]]; then
                echo -e "${YELLOW}► Frontend wird wiederhergestellt...${NC}"
                cd $PROJECT_DIR
                mv frontend frontend_old
                tar -xzf "$BACKUP_FILE" -C $PROJECT_DIR
            fi
            
            systemctl start schichtplan
            systemctl reload nginx
            
            echo -e "${GREEN}✓ Kompletter Rollback abgeschlossen${NC}"
        fi
        ;;
        
    0)
        echo "Abgebrochen."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Ungültige Auswahl!${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================="
echo "  ✓ Rollback abgeschlossen"
echo "==========================================${NC}"
echo ""
echo "Prüfe die Anwendung: https://bilal-alac.de"
echo ""
