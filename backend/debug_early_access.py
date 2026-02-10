import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from django.utils import timezone
from subscriptions.models import EarlyAccessSettings, Subscription
from accounts.models import Organization, User

print('Early-Access Settings:')
settings = EarlyAccessSettings.objects.first()
if settings:
    print(f'  is_active: {settings.is_active}')
    print(f'  start_date: {settings.start_date}')
    print(f'  NOW: {timezone.now()}')
    print(f'  Phase gestartet? {timezone.now() >= settings.start_date}')
    print(f'  is_early_access_active(): {settings.is_early_access_active()}')
print()

print('Organization (erste):')
org = Organization.objects.first()
if org:
    print(f'  name: {org.name}')
    print(f'  is_early_access: {org.is_early_access}')
    print(f'  Subscription: {org.subscription}')
    if org.subscription:
        print(f'    tier: {org.subscription.tier}')
        print(f'    company: {org.subscription.company_name}')
print()

print('Alle Organizations:')
for org in Organization.objects.all():
    print(f'  [{org.id}] {org.name}')
    print(f'      is_early_access: {org.is_early_access}')
    print(f'      subscription: {org.subscription.company_name if org.subscription else "None"}')
    print(f'      tier: {org.subscription.tier if org.subscription else "None"}')
