from subscriptions.models import Subscription
from accounts.models import Organization
from datetime import timedelta
from django.utils import timezone

today = timezone.now().date()
orgs = Organization.objects.all()

print(f'Organisationen gefunden: {orgs.count()}\n')

for org in orgs:
    print(f'{org.name}:')
    print(f'  is_trial: {org.is_trial}')
    
    if org.subscription:
        sub = org.subscription
        print(f'  Tier: {sub.tier}')
        print(f'  Start: {sub.subscription_start_date}')
        print(f'  End (vorher): {sub.subscription_end_date}')
        
        if org.is_trial:
            # Trial: 14 Tage ab Start
            new_trial_end = sub.subscription_start_date + timedelta(days=14)
            new_sub_end = new_trial_end
        else:
            # Kein Trial: 30 Tage ab heute
            new_trial_end = None
            new_sub_end = today + timedelta(days=30)
        
        # Update direkt in der Datenbank
        Subscription.objects.filter(pk=sub.pk).update(
            trial_end_date=new_trial_end,
            subscription_end_date=new_sub_end
        )
        
        print(f'  End (nachher): {new_sub_end}')
        print(f'  Trial End: {new_trial_end}')
    else:
        print(f'  Keine Subscription zugewiesen')
    
    print()

print('Fertig! Alle Subscription-Daten aktualisiert.')
