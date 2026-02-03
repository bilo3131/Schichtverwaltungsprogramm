"""
Skript zum Importieren deutscher Feiertage für 2026
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from shifts.models import Holiday
from accounts.models import Organization

def import_holidays_2026():
    """Importiert deutsche Feiertage für 2026"""
    
    # Deutsche Feiertage 2026 (Bundesweit)
    holidays_2026 = [
        {'name': 'Neujahr', 'date': '2026-01-01', 'is_recurring': True},
        {'name': 'Karfreitag', 'date': '2026-04-03', 'is_recurring': False},
        {'name': 'Ostermontag', 'date': '2026-04-06', 'is_recurring': False},
        {'name': 'Tag der Arbeit', 'date': '2026-05-01', 'is_recurring': True},
        {'name': 'Christi Himmelfahrt', 'date': '2026-05-14', 'is_recurring': False},
        {'name': 'Pfingstmontag', 'date': '2026-05-25', 'is_recurring': False},
        {'name': 'Tag der Deutschen Einheit', 'date': '2026-10-03', 'is_recurring': True},
        {'name': '1. Weihnachtsfeiertag', 'date': '2026-12-25', 'is_recurring': True},
        {'name': '2. Weihnachtsfeiertag', 'date': '2026-12-26', 'is_recurring': True},
    ]
    
    organizations = Organization.objects.all()
    
    if not organizations.exists():
        print("❌ Keine Organisationen gefunden!")
        return
    
    total_created = 0
    
    for org in organizations:
        print(f"\n📅 Importiere Feiertage für Organisation: {org.name}")
        
        for holiday_data in holidays_2026:
            holiday, created = Holiday.objects.get_or_create(
                organization=org,
                name=holiday_data['name'],
                date=holiday_data['date'],
                defaults={
                    'is_recurring': holiday_data['is_recurring'],
                    'description': f"Gesetzlicher Feiertag in Deutschland"
                }
            )
            
            if created:
                print(f"  ✅ {holiday.name} - {holiday.date}")
                total_created += 1
            else:
                print(f"  ⏭️  {holiday.name} - {holiday.date} (existiert bereits)")
    
    print(f"\n✨ Import abgeschlossen! {total_created} neue Feiertage erstellt.")


if __name__ == '__main__':
    import_holidays_2026()
