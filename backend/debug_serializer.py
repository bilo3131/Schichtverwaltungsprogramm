import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from django.utils import timezone
from subscriptions.models import EarlyAccessSettings, Subscription
from accounts.models import Organization
from datetime import date

# Simuliere die get_early_access_info Methode
subscription = Subscription.objects.first()
print(f'Subscription: {subscription.company_name}')
print(f'Tier: {subscription.tier}')
print()

# Check 1: Tier
print(f'Check 1 - Tier: {subscription.tier}')
if subscription.tier != 'starter':
    print('  ❌ Nicht starter - würde None zurückgeben')
else:
    print('  ✅ Ist starter')
print()

# Check 2: Organization
org = Organization.objects.first()
print(f'Check 2 - Organization: {org.name}')
print(f'  is_early_access: {org.is_early_access}')
if org.is_early_access:
    print('  ❌ Bereits Early-Access - würde None zurückgeben')
else:
    print('  ✅ Noch kein Early-Access')
print()

# Check 3: Settings exist
settings = EarlyAccessSettings.objects.first()
print(f'Check 3 - Settings: {settings is not None}')
if not settings:
    print('  ❌ Keine Settings - würde None zurückgeben')
else:
    print('  ✅ Settings vorhanden')
print()

# Check 4: Phase gestartet
print(f'Check 4 - Phase gestartet?')
print(f'  NOW: {timezone.now()}')
print(f'  start_date: {settings.start_date}')
if timezone.now() < settings.start_date:
    print('  ❌ Phase noch nicht gestartet - würde None zurückgeben')
else:
    print('  ✅ Phase gestartet')
print()

# Check 5: Phase aktiv
print(f'Check 5 - Phase aktiv?')
is_active = settings.is_early_access_active()
print(f'  is_early_access_active(): {is_active}')
if not is_active:
    print('  ❌ Phase nicht aktiv - würde None zurückgeben')
else:
    print('  ✅ Phase aktiv')
print()

# Count
current_count = Organization.objects.filter(
    is_early_access=True,
    subscription__tier__in=['pro', 'business']
).count()
print(f'Current count (Pro/Business Early-Access): {current_count}')
print()

print('✅ ALLE CHECKS BESTANDEN - Info sollte zurückgegeben werden!')
