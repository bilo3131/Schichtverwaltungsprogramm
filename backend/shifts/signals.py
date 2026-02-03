from django.db.models.signals import post_save, post_delete, pre_save, m2m_changed
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Shift, VacationRequest, Notification, Event


def send_notification_email(notification):
    """Hilfsfunktion zum Versenden von E-Mail-Benachrichtigungen"""
    if notification.is_emailed:
        return
    
    try:
        send_mail(
            subject=notification.title,
            message=notification.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.user.email],
            fail_silently=False,
        )
        notification.is_emailed = True
        notification.save(update_fields=['is_emailed'])
    except Exception as e:
        print(f"Fehler beim Versenden der E-Mail: {e}")


@receiver(pre_save, sender=Shift)
def track_shift_changes(sender, instance, **kwargs):
    """Speichere den vorherigen Zustand der Schicht für Änderungserkennung"""
    # Diese Funktion bleibt leer - wird nicht mehr für Benachrichtigungen verwendet
    pass


# Schicht-Benachrichtigungen wurden deaktiviert
# Die Benachrichtigungslogik erfolgt jetzt zentral in der publish_week Action
# um mehrfache Benachrichtigungen während der Planung zu vermeiden


@receiver(post_save, sender=VacationRequest)
def notify_vacation_status_change(sender, instance, created, **kwargs):
    """Benachrichtige bei Urlaubsgenehmigung oder -ablehnung"""
    if created:
        # Benachrichtige Manager über neue Urlaubsanfrage
        # Finde alle Admin und HR Benutzer der Organisation
        from accounts.models import User
        managers = User.objects.filter(
            organization=instance.employee.user.organization,
            role__in=['admin', 'hr']
        )
        
        employee_name = instance.employee.user.get_full_name() or instance.employee.user.username
        
        for manager in managers:
            Notification.objects.create(
                user=manager,
                notification_type='vacation_request',
                title='Neue Urlaubsanfrage',
                message=f'{employee_name} hat Urlaub vom {instance.start_date.strftime("%d.%m.%Y")} bis {instance.end_date.strftime("%d.%m.%Y")} beantragt.',
                related_vacation=instance
            )
    else:
        # Status-Änderung - benachrichtige Mitarbeiter
        user = instance.employee.user
        
        if instance.status == 'approved':
            notification = Notification.objects.create(
                user=user,
                notification_type='vacation_approved',
                title='Urlaub genehmigt',
                message=f'Ihr Urlaubsantrag vom {instance.start_date.strftime("%d.%m.%Y")} bis {instance.end_date.strftime("%d.%m.%Y")} wurde genehmigt.',
                related_vacation=instance
            )
            # E-Mail bei Genehmigung
            send_notification_email(notification)
        
        elif instance.status == 'rejected':
            notification = Notification.objects.create(
                user=user,
                notification_type='vacation_rejected',
                title='Urlaub abgelehnt',
                message=f'Ihr Urlaubsantrag vom {instance.start_date.strftime("%d.%m.%Y")} bis {instance.end_date.strftime("%d.%m.%Y")} wurde abgelehnt.',
                related_vacation=instance
            )
            # E-Mail bei Ablehnung
            send_notification_email(notification)


@receiver(m2m_changed, sender=Event.attendees.through)
def notify_event_attendees(sender, instance, action, pk_set, **kwargs):
    """Benachrichtige Teilnehmer bei Event-Einladungen"""
    if action == 'post_add':
        # Neue Teilnehmer wurden hinzugefügt
        from accounts.models import User
        
        for employee_id in pk_set:
            try:
                from .models import Employee
                employee = Employee.objects.get(id=employee_id)
                user = employee.user
                
                event_date = instance.start_datetime.strftime("%d.%m.%Y")
                event_time = "ganztägig" if instance.is_all_day else f"{instance.start_datetime.strftime('%H:%M')} - {instance.end_datetime.strftime('%H:%M')}"
                
                Notification.objects.create(
                    user=user,
                    notification_type='event_invitation',
                    title=f'Einladung: {instance.title}',
                    message=f'Sie wurden zu "{instance.title}" am {event_date} ({event_time}) eingeladen.{" Ort: " + instance.location if instance.location else ""}',
                    related_event=instance
                )
            except Exception as e:
                print(f"Fehler beim Erstellen der Event-Benachrichtigung: {e}")


@receiver(post_save, sender=Event)
def notify_event_update(sender, instance, created, **kwargs):
    """Benachrichtige Teilnehmer bei Event-Änderungen"""
    if not created and instance.attendees.exists():
        # Event wurde aktualisiert (nicht neu erstellt)
        event_date = instance.start_datetime.strftime("%d.%m.%Y")
        event_time = "ganztägig" if instance.is_all_day else f"{instance.start_datetime.strftime('%H:%M')} - {instance.end_datetime.strftime('%H:%M')}"
        
        for attendee in instance.attendees.all():
            Notification.objects.create(
                user=attendee.user,
                notification_type='event_updated',
                title=f'Event geändert: {instance.title}',
                message=f'Das Event "{instance.title}" am {event_date} ({event_time}) wurde aktualisiert.{" Neuer Ort: " + instance.location if instance.location else ""}',
                related_event=instance
            )


@receiver(post_delete, sender=Event)
def notify_event_cancellation(sender, instance, **kwargs):
    """Benachrichtige Teilnehmer bei Event-Absage"""
    if instance.attendees.exists():
        event_date = instance.start_datetime.strftime("%d.%m.%Y")
        event_time = "ganztägig" if instance.is_all_day else f"{instance.start_datetime.strftime('%H:%M')} - {instance.end_datetime.strftime('%H:%M')}"
        
        for attendee in instance.attendees.all():
            Notification.objects.create(
                user=attendee.user,
                notification_type='event_deleted',
                title=f'Event abgesagt: {instance.title}',
                message=f'Das Event "{instance.title}" am {event_date} ({event_time}) wurde abgesagt.',
            )
