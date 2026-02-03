"""
Email-Service für Schichtplan-Benachrichtigungen
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_shift_notification(employee, shifts, week_display):
    """
    Sendet eine Email-Benachrichtigung an einen Mitarbeiter über seine Schichten
    
    Args:
        employee: Employee-Objekt
        shifts: Liste von Shift-Objekten für diesen Mitarbeiter
        week_display: String mit der Wochenanzeige (z.B. "KW 4 (27.01. - 02.02.2026)")
    
    Returns:
        bool: True wenn erfolgreich, False bei Fehler
    """
    if not employee.user or not employee.user.email:
        print(f"Keine Email-Adresse für {employee.user.first_name} {employee.user.last_name}")
        return False
    
    # Schichten gruppieren und formatieren
    shift_list = []
    for shift in shifts:
        shift_list.append({
            'date': shift.date.strftime('%A, %d.%m.%Y'),
            'shift_type': shift.shift_type.name,
            'start_time': shift.start_time.strftime('%H:%M'),
            'end_time': shift.end_time.strftime('%H:%M'),
            'notes': shift.notes or ''
        })
    
    # Email-Betreff
    subject = f'Schichtplan {week_display} - {employee.user.organization.name}'
    
    # Email-Nachricht (Text und HTML)
    context = {
        'employee_name': f"{employee.user.first_name} {employee.user.last_name}",
        'week_display': week_display,
        'organization': employee.user.organization.name,
        'shifts': shift_list,
        'shift_count': len(shift_list)
    }
    
    # Einfache Text-Version
    message = f"""
Hallo {context['employee_name']},

Ihr Schichtplan für {week_display} wurde veröffentlicht.

Sie sind für {len(shift_list)} Schicht(en) eingeteilt:

"""
    for shift in shift_list:
        message += f"  • {shift['date']}: {shift['shift_type']} ({shift['start_time']} - {shift['end_time']})\n"
        if shift['notes']:
            message += f"    Hinweis: {shift['notes']}\n"
    
    message += f"""
Mit freundlichen Grüßen
{employee.user.organization.name}

---
Diese Email wurde automatisch generiert.
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[employee.user.email],
            fail_silently=False,
        )
        print(f"Email erfolgreich an {employee.user.email} gesendet")
        return True
    except Exception as e:
        print(f"Fehler beim Senden der Email an {employee.user.email}: {str(e)}")
        return False


def send_bulk_shift_notifications(employees_with_shifts, week_display):
    """
    Sendet Benachrichtigungen an mehrere Mitarbeiter
    
    Args:
        employees_with_shifts: Dict {employee: [shifts]}
        week_display: String mit der Wochenanzeige
    
    Returns:
        dict: {'sent': int, 'failed': int, 'total': int}
    """
    sent = 0
    failed = 0
    
    for employee, shifts in employees_with_shifts.items():
        if send_shift_notification(employee, shifts, week_display):
            sent += 1
        else:
            failed += 1
    
    return {
        'sent': sent,
        'failed': failed,
        'total': sent + failed
    }
