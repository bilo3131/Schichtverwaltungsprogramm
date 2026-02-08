#!/usr/bin/env python
"""
Script zum Erstellen von Default Subscriptions
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from subscriptions.models import Subscription, SubscriptionTier
from datetime import date, timedelta

def create_default_subscriptions():
    # Erstelle Starter Subscription
    starter, created = Subscription.objects.get_or_create(
        company_name="Standard Starter Plan",
        defaults={
            'tier': SubscriptionTier.STARTER,
            'is_active': True,
            'subscription_end_date': date.today() + timedelta(days=365)
        }
    )
    if created:
        print(f"✓ Erstellt: {starter}")
    else:
        print(f"→ Existiert bereits: {starter}")
    
    # Erstelle Pro Subscription
    pro, created = Subscription.objects.get_or_create(
        company_name="Standard Pro Plan",
        defaults={
            'tier': SubscriptionTier.PRO,
            'is_active': True,
            'subscription_end_date': date.today() + timedelta(days=365)
        }
    )
    if created:
        print(f"✓ Erstellt: {pro}")
    else:
        print(f"→ Existiert bereits: {pro}")
    
    # Erstelle Business Subscription
    business, created = Subscription.objects.get_or_create(
        company_name="Standard Business Plan",
        defaults={
            'tier': SubscriptionTier.BUSINESS,
            'is_active': True,
            'subscription_end_date': date.today() + timedelta(days=365)
        }
    )
    if created:
        print(f"✓ Erstellt: {business}")
    else:
        print(f"→ Existiert bereits: {business}")
    
    print(f"\nGesamt Subscriptions: {Subscription.objects.count()}")

if __name__ == '__main__':
    create_default_subscriptions()
