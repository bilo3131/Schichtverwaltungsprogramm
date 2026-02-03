import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from accounts.models import User

# Teste einen User
try:
    user = User.objects.get(username='furkan.akdogan')
    print(f"User gefunden: {user.username}")
    print(f"Email: {user.email}")
    print(f"Passwort 'Abc123' korrekt: {user.check_password('Abc123')}")
    print(f"User ist aktiv: {user.is_active}")
except User.DoesNotExist:
    print("User nicht gefunden!")

print("\n--- Alle User ---")
for u in User.objects.all():
    print(f"{u.id}: {u.username} ({u.email}) - {u.role} - Aktiv: {u.is_active}")
