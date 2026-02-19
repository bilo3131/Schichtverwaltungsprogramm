"""
Management Command: check_trial_expiry

Prüft täglich abgelaufene Trials und deaktiviert die Subscription.
Sendet E-Mail-Benachrichtigungen an Admins.

Scheduling: Cron (Linux): 0 3 * * * python manage.py check_trial_expiry
            Task Scheduler (Windows): schtasks /create /tn "SchichtplanTrialCheck" /tr "python manage.py check_trial_expiry" /sc DAILY /st 03:00
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = "Prüft abgelaufene Trials und deaktiviert entsprechende Subscriptions."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Zeigt betroffene Subscriptions an, ohne Änderungen vorzunehmen.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.now().date()

        from accounts.models import Organization
        from subscriptions.models import Subscription

        # Finde alle Orgs mit abgelaufenem Trial (is_trial=True, trial_end_date < heute)
        expired_trial_orgs = Organization.objects.filter(
            is_trial=True,
            is_demo=False,
            subscription__trial_end_date__lt=today,
            subscription__is_active=True,
        ).select_related("subscription")

        if not expired_trial_orgs.exists():
            self.stdout.write("Keine abgelaufenen Trials gefunden.")
            return

        self.stdout.write(f"{expired_trial_orgs.count()} abgelaufene Trial(s) gefunden.")

        for org in expired_trial_orgs:
            sub = org.subscription
            self.stdout.write(
                f"  - {org.name} (Trial abgelaufen am {sub.trial_end_date})"
            )

            if not dry_run:
                sub.is_active = False
                sub.save(update_fields=["is_active"])
                self._notify_admin(org, sub)

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-Run: Keine Änderungen vorgenommen."))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"{expired_trial_orgs.count()} Subscription(s) deaktiviert."
            ))

        # Finde Orgs deren Trial in 3 Tagen abläuft → Erinnerungs-Mail
        self._send_expiry_reminders(today)

    def _notify_admin(self, org, sub):
        """Benachrichtigt den Admin der Organisation über den Trial-Ablauf."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        admin_users = User.objects.filter(
            organization=org,
            role="admin",
        )

        for admin in admin_users:
            if admin.email:
                try:
                    send_mail(
                        subject="Ihr Testzeitraum ist abgelaufen — Schichtplan",
                        message=(
                            f"Hallo {admin.get_full_name() or admin.username},\n\n"
                            f"der kostenlose Testzeitraum für '{org.name}' ist am "
                            f"{sub.trial_end_date.strftime('%d.%m.%Y')} abgelaufen.\n\n"
                            f"Um weiterhin Schichtplan nutzen zu können, wählen Sie bitte "
                            f"ein passendes Abonnement in den Einstellungen Ihrer Organisation.\n\n"
                            f"Bei Fragen stehen wir Ihnen gerne zur Verfügung.\n\n"
                            f"Mit freundlichen Grüßen\nDas Schichtplan-Team"
                        ),
                        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@schichtplan.de"),
                        recipient_list=[admin.email],
                        fail_silently=True,
                    )
                except Exception as e:
                    self.stderr.write(f"E-Mail an {admin.email} fehlgeschlagen: {e}")

    def _send_expiry_reminders(self, today):
        """Schickt Erinnerungs-Mails 3 Tage vor Trial-Ablauf."""
        from datetime import timedelta
        from accounts.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()

        reminder_date = today + timedelta(days=3)

        reminder_orgs = Organization.objects.filter(
            is_trial=True,
            is_demo=False,
            subscription__trial_end_date=reminder_date,
            subscription__is_active=True,
        ).select_related("subscription")

        for org in reminder_orgs:
            admin_users = User.objects.filter(organization=org, role="admin")
            for admin in admin_users:
                if admin.email:
                    try:
                        send_mail(
                            subject="Ihr Testzeitraum endet in 3 Tagen — Schichtplan",
                            message=(
                                f"Hallo {admin.get_full_name() or admin.username},\n\n"
                                f"Ihr kostenloser Testzeitraum für '{org.name}' endet am "
                                f"{org.subscription.trial_end_date.strftime('%d.%m.%Y')}.\n\n"
                                f"Um den Service fortzusetzen, wählen Sie jetzt ein Abonnement "
                                f"in Ihren Organisationseinstellungen.\n\n"
                                f"Mit freundlichen Grüßen\nDas Schichtplan-Team"
                            ),
                            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@schichtplan.de"),
                            recipient_list=[admin.email],
                            fail_silently=True,
                        )
                        self.stdout.write(f"  Erinnerung gesendet an {admin.email}")
                    except Exception as e:
                        self.stderr.write(f"Erinnerungs-E-Mail an {admin.email} fehlgeschlagen: {e}")
