import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from accounts.models import Organization, User
from subscriptions.serializers import SubscriptionSerializer

# Hole die erste Organization (Testfirma1)
org = Organization.objects.first()
user = User.objects.filter(organization=org).first()

print(f'User: {user.username if user else "None"}')
print(f'Organization: {org.name}')
print(f'  is_early_access: {org.is_early_access}')
print(f'  subscription: {org.subscription}')
print(f'  subscription.tier: {org.subscription.tier if org.subscription else "None"}')
print()

# Simuliere den Serializer mit Request-Context
class FakeRequest:
    def __init__(self, user):
        self.user = user

fake_request = FakeRequest(user)

# Erstelle Serializer-Instanz
serializer = SubscriptionSerializer(
    instance=org.subscription,
    context={'request': fake_request}
)

# Hole early_access_info
early_access_info = serializer.get_early_access_info()
print('early_access_info Result:')
print(early_access_info)
print()

# Auch limits_info testen
if org.subscription:
    limits_info = serializer.get_limits_info(org.subscription)
    print('limits_info Result:')
    print(f"  early_access_info key exists: {'early_access_info' in limits_info}")
    if 'early_access_info' in limits_info:
        print(f"  early_access_info value: {limits_info['early_access_info']}")
