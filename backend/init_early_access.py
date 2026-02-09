#!/usr/bin/env python
"""
Script zum Initialisieren des Early-Access Systems
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from subscriptions.models import Subscription, EarlyAccessSettings, SubscriptionTier
from django.utils import timezone

def init_early_access():
    print("Early-Access System wird initialisiert...\n")
    
    # 1. Early-Access Einstellungen erstellen
    settings, created = EarlyAccessSettings.objects.get_or_create(
        id=1,
        defaults={
            'start_date': timezone.now(),
            'duration_months': 6,
            'max_customers': 30,
            'is_active': True
        }
    )
    
    if created:
        print("✓ Early-Access Einstellungen erstellt:")
    else:
        print("→ Early-Access Einstellungen existieren bereits:")
    print(f"  - Startdatum: {settings.start_date}")
    print(f"  - Dauer: {settings.duration_months} Monate")
    print(f"  - Max Kunden: {settings.max_customers}")
    print(f"  - End-Datum: {settings.get_end_date()}")
    print(f"  - Status: {'🟢 Aktiv' if settings.is_early_access_active() else '🔴 Inaktiv'}\n")
    
    # 2. Alle bestehenden Subscriptions als Early-Access markieren
    existing_subs = Subscription.objects.filter(is_early_access=False)
    count = existing_subs.count()
    
    if count > 0:
        print(f"Markiere {count} bestehende Subscription(s) als Early-Access Kunden...\n")
        
        for sub in existing_subs:
            old_price = sub.price_per_employee
            sub.is_early_access = True
            sub.save()  # Triggert automatische Preisanpassung
            print(f"✓ {sub.company_name} ({sub.get_tier_display()})")
            print(f"  Preis/Mitarbeiter: {old_price}€ → {sub.price_per_employee}€")
            if sub.price_cap:
                print(f"  Preisobergrenze: {sub.price_cap}€")
    else:
        print("Keine bestehenden Subscriptions gefunden.\n")
    
    # 3. Zusammenfassung
    print("\n" + "="*60)
    print("ZUSAMMENFASSUNG")
    print("="*60)
    
    early_access_count = Subscription.objects.filter(is_early_access=True).count()
    print(f"\nEarly-Access Kunden: {early_access_count} / {settings.max_customers}")
    print(f"Verbleibende Plätze: {settings.max_customers - early_access_count}")
    print(f"Early-Access läuft noch: {'Ja' if settings.is_early_access_active() else 'Nein'}\n")
    
    print("PREISÜBERSICHT:")
    print("-" * 60)
    print("\nSTARTER:")
    print("  Early-Access: 29€ + 1,50€/Mitarbeiter")
    print("  Regulär:      29€ + 2,00€/Mitarbeiter")
    
    print("\nPRO:")
    print("  Early-Access: 59€ + 1,00€/Mitarbeiter")
    print("  Regulär:      59€ + 1,50€/Mitarbeiter")
    
    print("\nBUSINESS:")
    print("  Early-Access: 99€ + 0,80€/Mitarbeiter (max 399€/Monat)")
    print("  Regulär:      99€ + 1,00€/Mitarbeiter (max 499€/Monat)")
    print("\n" + "="*60)

if __name__ == '__main__':
    init_early_access()
