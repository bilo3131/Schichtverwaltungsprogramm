"""
Management Command: cleanup_expired_data

Löscht oder anonymisiert personenbezogene Daten gemäß den in der Datenschutzerklärung
festgelegten Aufbewahrungsfristen (DSGVO Art. 5 Abs. 1 lit. e – Speicherbegrenzung).

Fristen (konfigurierbar über --dry-run zum sicheren Testen):
  - Benachrichtigungen:        90 Tage  nach Erstellung           → Löschen
  - Schichtdaten:               3 Jahre nach Schichtdatum          → Löschen
  - Urlaubsanträge:             3 Jahre nach Enddatum              → Löschen
  - Schichttauschanfragen:      3 Jahre nach Erstellung            → Löschen
  - Inaktive Organisationen:   30 Tage  nach Deaktivierung        → Anonymisieren + Löschen
    (Proxy: Organization.updated_at wenn is_active=False)

Scheduling (Cron, Linux – täglich um 03:00 Uhr):
  0 3 * * * /path/to/venv/bin/python /path/to/manage.py cleanup_expired_data >> /var/log/cleanup_expired_data.log 2>&1

Scheduling (Windows Task Scheduler):
  schtasks /create /tn "VarDIY_CleanupExpiredData" /tr "C:\\path\\to\\venv\\Scripts\\python.exe C:\\path\\to\\manage.py cleanup_expired_data" /sc DAILY /st 03:00

Testen ohne echte Löschungen:
  python manage.py cleanup_expired_data --dry-run
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction


# ─── Aufbewahrungsfristen ────────────────────────────────────────────────────
NOTIFICATION_RETENTION_DAYS = 90       # 3 Monate
SHIFT_RETENTION_YEARS       = 3        # Arbeitszeitgesetz / Nachweispflichten
VACATION_RETENTION_YEARS    = 3        # Arbeitszeitgesetz / Nachweispflichten
SWAP_RETENTION_YEARS        = 3
INACTIVE_ORG_GRACE_DAYS     = 30       # 30 Tage nach Deaktivierung (is_active=False)
# ─────────────────────────────────────────────────────────────────────────────


class Command(BaseCommand):
    help = (
        "Löscht/anonymisiert abgelaufene personenbezogene Daten gemäß DSGVO-Aufbewahrungsfristen. "
        "Mit --dry-run werden nur die Anzahlen angezeigt, nichts gelöscht."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Zeigt an, wie viele Datensätze betroffen wären, führt aber keine Löschung durch.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()
        today = now.date()

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN aktiv – keine Daten werden gelöscht.\n"))

        self.stdout.write(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Starte DSGVO-Datenlöschung...\n")

        try:
            with transaction.atomic():
                totals = {}

                totals["notifications"]    = self._cleanup_notifications(now, dry_run)
                totals["shifts"]           = self._cleanup_shifts(today, dry_run)
                totals["vacation_requests"]= self._cleanup_vacation_requests(today, dry_run)
                totals["swap_requests"]    = self._cleanup_swap_requests(now, dry_run)
                totals["inactive_orgs"]    = self._cleanup_inactive_organizations(now, dry_run)

                if dry_run:
                    transaction.set_rollback(True)

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Fehler beim Cleanup: {e}"))
            raise

        # Zusammenfassung
        self.stdout.write("\n── Zusammenfassung ──────────────────────────────")
        for key, count in totals.items():
            label = "würde gelöscht/anonymisiert" if dry_run else "gelöscht/anonymisiert"
            self.stdout.write(f"  {key:<25} {count:>6}  Datensätze {label}")
        self.stdout.write("─────────────────────────────────────────────────")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY-RUN: Rollback durchgeführt. Keine Daten verändert."))
        else:
            self.stdout.write(self.style.SUCCESS("\nDSGVO-Datenlöschung erfolgreich abgeschlossen."))

    # ─── Benachrichtigungen ──────────────────────────────────────────────────

    def _cleanup_notifications(self, now, dry_run):
        from shifts.models import Notification

        cutoff = now - timedelta(days=NOTIFICATION_RETENTION_DAYS)
        qs = Notification.objects.filter(created_at__lt=cutoff)
        count = qs.count()

        self._log("Benachrichtigungen", count, cutoff, dry_run)
        if not dry_run and count:
            qs.delete()
        return count

    # ─── Schichtdaten ────────────────────────────────────────────────────────

    def _cleanup_shifts(self, today, dry_run):
        from shifts.models import Shift

        cutoff = today - timedelta(days=SHIFT_RETENTION_YEARS * 365)
        qs = Shift.objects.filter(date__lt=cutoff)
        count = qs.count()

        self._log("Schichten", count, cutoff, dry_run)
        if not dry_run and count:
            qs.delete()
        return count

    # ─── Urlaubsanträge ──────────────────────────────────────────────────────

    def _cleanup_vacation_requests(self, today, dry_run):
        from shifts.models import VacationRequest

        cutoff = today - timedelta(days=VACATION_RETENTION_YEARS * 365)
        qs = VacationRequest.objects.filter(end_date__lt=cutoff)
        count = qs.count()

        self._log("Urlaubsanträge", count, cutoff, dry_run)
        if not dry_run and count:
            qs.delete()
        return count

    # ─── Schichttauschanfragen ───────────────────────────────────────────────

    def _cleanup_swap_requests(self, now, dry_run):
        from shifts.models import ShiftSwapRequest

        cutoff = now - timedelta(days=SWAP_RETENTION_YEARS * 365)
        qs = ShiftSwapRequest.objects.filter(created_at__lt=cutoff)
        count = qs.count()

        self._log("Schichttauschanfragen", count, cutoff, dry_run)
        if not dry_run and count:
            qs.delete()
        return count

    # ─── Inaktive Organisationen ─────────────────────────────────────────────

    def _cleanup_inactive_organizations(self, now, dry_run):
        """
        Anonymisiert Benutzerdaten von Organisationen, die seit mindestens
        INACTIVE_ORG_GRACE_DAYS Tagen deaktiviert sind (is_active=False).
        Proxy für Deaktivierungsdatum: Organization.updated_at.
        Danach werden Schicht-/Planungsdaten der Organisation gelöscht.
        Die Organisation selbst bleibt für die Buchhaltung erhalten (10 Jahre).
        """
        from accounts.models import Organization, User
        from shifts.models import (
            Shift, VacationRequest, ShiftSwapRequest,
            Availability, Notification,
        )

        cutoff = now - timedelta(days=INACTIVE_ORG_GRACE_DAYS)
        orgs = Organization.objects.filter(is_active=False, updated_at__lt=cutoff, is_demo=False)
        count = orgs.count()

        self._log("Inaktive Organisationen (Anonymisierung)", count, cutoff, dry_run)

        if dry_run or not count:
            return count

        for org in orgs:
            org_users = User.objects.filter(organization=org)

            # Planungs- und Prozessdaten löschen
            Notification.objects.filter(user__in=org_users).delete()
            Shift.objects.filter(organization=org).delete()
            VacationRequest.objects.filter(employee__user__organization=org).delete()
            ShiftSwapRequest.objects.filter(
                requesting_employee__user__organization=org
            ).delete()
            Availability.objects.filter(employee__user__organization=org).delete()

            # Benutzerdaten anonymisieren (Name, E-Mail, Telefon entfernen)
            for user in org_users:
                anon_id = f"geloescht_{user.pk}"
                user.first_name  = "Gelöscht"
                user.last_name   = "Gelöscht"
                user.email       = f"{anon_id}@anonymized.invalid"
                user.username    = anon_id
                user.phone       = ""
                user.employee_id = None
                user.is_active   = False
                user.set_unusable_password()
                user.save()

        return count

    # ─── Hilfsmethode ────────────────────────────────────────────────────────

    def _log(self, label, count, cutoff, dry_run):
        action = "Würde löschen/anonymisieren" if dry_run else "Lösche/Anonymisiere"
        cutoff_str = cutoff.strftime("%Y-%m-%d") if hasattr(cutoff, "strftime") else str(cutoff)
        self.stdout.write(
            f"  {action}: {count:>5} × {label}  (älter als {cutoff_str})"
        )
