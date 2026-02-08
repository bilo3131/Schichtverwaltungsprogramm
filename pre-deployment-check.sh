#!/bin/bash
# ===========================================
# Pre-Deployment Check Script
# ===========================================
# Prüft ob alles bereit ist für Deployment
# ===========================================

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "=========================================="
echo "  Pre-Deployment Check"
echo "=========================================="
echo ""

# 1. Prüfe ob settings_production.py im Git ist
echo -e "${YELLOW}► Prüfe Git Status...${NC}"
if git ls-files | grep -q "settings_production.py"; then
    echo -e "${RED}✗ FEHLER: settings_production.py ist im Git Repository!${NC}"
    echo "  Entferne sie mit: git rm --cached backend/schichtplan/settings_production.py"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ Keine Production Settings im Git${NC}"
fi

# 2. Prüfe ob .env im Git ist
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}✗ FEHLER: .env Datei ist im Git Repository!${NC}"
    echo "  Entferne sie mit: git rm --cached **/.env"
    ((ERRORS++))
else
    echo -e "${GREEN}✓ Keine .env Dateien im Git${NC}"
fi

# 3. Prüfe ob Backend Tests durchlaufen
echo ""
echo -e "${YELLOW}► Prüfe Backend Tests...${NC}"
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    python manage.py test --settings=schichtplan.settings 2>&1 | grep -q "OK"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backend Tests erfolgreich${NC}"
    else
        echo -e "${YELLOW}⚠ Backend Tests fehlgeschlagen oder nicht vorhanden${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ Kein Virtual Environment gefunden${NC}"
    ((WARNINGS++))
fi
cd ..

# 4. Prüfe ob Frontend baut
echo ""
echo -e "${YELLOW}► Prüfe Frontend Build...${NC}"
cd frontend
if [ -d "node_modules" ]; then
    ng build --configuration production --progress=false 2>&1 | grep -q "successfully"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend Build erfolgreich${NC}"
    else
        echo -e "${RED}✗ Frontend Build fehlgeschlagen${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠ node_modules nicht gefunden (npm install?)${NC}"
    ((WARNINGS++))
fi
cd ..

# 5. Prüfe auf DEBUG=True in Production Files
echo ""
echo -e "${YELLOW}► Prüfe Production Settings...${NC}"
if [ -f "backend/schichtplan/settings_production_template.py" ]; then
    if grep -q "DEBUG = True" backend/schichtplan/settings_production_template.py; then
        echo -e "${RED}✗ FEHLER: DEBUG=True in settings_production_template.py!${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✓ DEBUG=False in Production Template${NC}"
    fi
fi

# 6. Prüfe auf uncommitted Changes
echo ""
echo -e "${YELLOW}► Prüfe Git Status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠ Es gibt uncommitted Changes:${NC}"
    git status --short
    ((WARNINGS++))
else
    echo -e "${GREEN}✓ Alle Änderungen committed${NC}"
fi

# Zusammenfassung
echo ""
echo "=========================================="
echo "  Zusammenfassung"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Alle Prüfungen bestanden!${NC}"
    echo "Bereit für Deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} Warnung(en) gefunden.${NC}"
    echo "Deployment möglich, aber prüfe die Warnungen."
    exit 0
else
    echo -e "${RED}✗ ${ERRORS} Fehler gefunden!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNINGS} Warnung(en) gefunden.${NC}"
    fi
    echo ""
    echo "Bitte behebe die Fehler vor dem Deployment."
    exit 1
fi
