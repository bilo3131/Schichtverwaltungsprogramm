from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from subscriptions.models import Subscription

User = get_user_model()


class Command(BaseCommand):
    help = 'Erstellt Test-Subscriptions für alle Admin-User ohne Subscription'

    def handle(self, *args, **kwargs):
        # Finde alle Admin-User ohne Subscription
        admins_without_sub = User.objects.filter(
            role='admin'
        ).exclude(
            subscription__isnull=False
        )

        if not admins_without_sub.exists():
            self.stdout.write(self.style.WARNING('Keine Admins ohne Subscription gefunden'))
            return

        for admin in admins_without_sub:
            subscription = Subscription.objects.create(
                owner=admin,
                company_name=f"{admin.first_name} {admin.last_name} GmbH",
                tier='pro'  # Pro-Tier als Standard für Tests
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Subscription erstellt für: {admin.email} - Tier: {subscription.get_tier_display()}'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f'\n{admins_without_sub.count()} Subscription(s) erfolgreich erstellt!')
        )
