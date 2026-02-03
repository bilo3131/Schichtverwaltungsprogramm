import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from accounts.models import Organization, User

# Erstelle Organisation
org, created = Organization.objects.get_or_create(
    name='Test Firma',
    defaults={'email': 'test@firma.de'}
)

if created:
    print(f'Organisation "{org.name}" wurde erstellt.')
else:
    print(f'Organisation "{org.name}" existiert bereits.')

# Erstelle Admin-Benutzer
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@test.de',
        'first_name': 'Admin',
        'last_name': 'User',
        'role': 'admin',
        'organization': org,
        'is_staff': True,
        'is_superuser': True
    }
)

if created:
    admin_user.set_password('admin123')
    admin_user.save()
    print(f'Admin-Benutzer "{admin_user.username}" wurde erstellt.')
    print('Passwort: admin123')
else:
    # Update password auch wenn Benutzer existiert
    admin_user.set_password('admin123')
    admin_user.save()
    print(f'Admin-Benutzer "{admin_user.username}" existiert bereits. Passwort wurde auf "admin123" gesetzt.')

print('\nSie können sich jetzt anmelden mit:')
print('Benutzername: admin')
print('Passwort: admin123')
