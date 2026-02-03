import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from accounts.models import User

# Setze Passwort für alle Employee-User auf Abc123
users_to_update = User.objects.filter(role='employee')

for user in users_to_update:
    user.set_password('Abc123')
    user.save()
    print(f"✓ Passwort für {user.username} auf 'Abc123' gesetzt")

print("\n--- Teste Login ---")
test_user = User.objects.get(username='furkan.akdogan')
print(f"User: {test_user.username}")
print(f"Passwort 'Abc123' korrekt: {test_user.check_password('Abc123')}")
print(f"\nJetzt kannst du dich anmelden mit:")
print(f"Username: {test_user.username}")
print(f"Passwort: Abc123")
