# Backend-Upload Script (ohne settings.py)
# Lädt alle geänderten Backend-Dateien auf den Server

$SERVER = "hetzner-schichtplan"
$REMOTE_PATH = "/var/www/schichtplan/backend"

Write-Host "Backend-Upload gestartet..." -ForegroundColor Green
Write-Host ""

# Requirements.txt
Write-Host "[1/10] requirements.txt..."
scp "backend\requirements.txt" "${SERVER}:${REMOTE_PATH}/"

# accounts/models.py
Write-Host "[2/10] accounts/models.py..."
scp "backend\accounts\models.py" "${SERVER}:${REMOTE_PATH}/accounts/"

# accounts/serializers.py
Write-Host "[3/10] accounts/serializers.py..."
scp "backend\accounts\serializers.py" "${SERVER}:${REMOTE_PATH}/accounts/"

# accounts/views.py
Write-Host "[4/10] accounts/views.py..."
scp "backend\accounts\views.py" "${SERVER}:${REMOTE_PATH}/accounts/"

# accounts/admin.py
Write-Host "[5/10] accounts/admin.py..."
scp "backend\accounts\admin.py" "${SERVER}:${REMOTE_PATH}/accounts/"

# accounts/migrations/0006_*.py
Write-Host "[6/10] accounts/migrations/0006..."
scp "backend\accounts\migrations\0006_remove_organization_subscription_plan_and_more.py" "${SERVER}:${REMOTE_PATH}/accounts/migrations/"

# subscriptions/models.py
Write-Host "[7/10] subscriptions/models.py..."
scp "backend\subscriptions\models.py" "${SERVER}:${REMOTE_PATH}/subscriptions/"

# subscriptions/views.py
Write-Host "[8/10] subscriptions/views.py..."
scp "backend\subscriptions\views.py" "${SERVER}:${REMOTE_PATH}/subscriptions/"

# subscriptions/serializers.py
Write-Host "[9/10] subscriptions/serializers.py..."
scp "backend\subscriptions\serializers.py" "${SERVER}:${REMOTE_PATH}/subscriptions/"

# subscriptions/admin.py
Write-Host "[10/10] subscriptions/admin.py..."
scp "backend\subscriptions\admin.py" "${SERVER}:${REMOTE_PATH}/subscriptions/"

Write-Host ""
Write-Host "Alle Backend-Dateien hochgeladen!" -ForegroundColor Green
Write-Host ""
Write-Host "WICHTIG: settings.py wurde NICHT hochgeladen." -ForegroundColor Yellow
Write-Host "Du musst sie manuell auf dem Server anpassen." -ForegroundColor Yellow
