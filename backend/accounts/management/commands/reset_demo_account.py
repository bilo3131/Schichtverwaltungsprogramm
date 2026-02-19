"""
Management Command: reset_demo_account

Setzt das Demo-Konto täglich zurück und befüllt es mit Beispieldaten.
Scheduling: Cron (Linux): 0 2 * * * python manage.py reset_demo_account
            Task Scheduler (Windows): schtasks /create /tn "SchichtplanDemoReset" /tr "python manage.py reset_demo_account" /sc DAILY /st 02:00
"""
import random
from datetime import date, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

DEMO_ORG_NAME = "Musterbetrieb GmbH (Demo)"
DEMO_MASTER_USERNAME = "demo_master"
DEMO_MASTER_PASSWORD = "Demo2024!"

DEPARTMENTS = [
    {"name": "Küche", "description": "Küchenteam und Köche"},
    {"name": "Service", "description": "Restaurant-Service und Kellner"},
    {"name": "Bar", "description": "Bar und Getränkebereich"},
]

SHIFT_TYPES = [
    {"name": "Frühschicht", "start_time": time(7, 0), "end_time": time(15, 0), "color": "#4CAF50"},
    {"name": "Spätschicht", "start_time": time(14, 0), "end_time": time(22, 0), "color": "#2196F3"},
    {"name": "Nachtschicht", "start_time": time(22, 0), "end_time": time(6, 0), "color": "#9C27B0"},
]

EMPLOYEES_DATA = [
    {"first_name": "Anna", "last_name": "Müller", "role": "department_manager", "dept_idx": 0, "emp_type": "fulltime"},
    {"first_name": "Bernd", "last_name": "Schmidt", "role": "team_leader", "dept_idx": 0, "emp_type": "fulltime"},
    {"first_name": "Clara", "last_name": "Fischer", "role": "employee", "dept_idx": 0, "emp_type": "parttime"},
    {"first_name": "David", "last_name": "Weber", "role": "department_manager", "dept_idx": 1, "emp_type": "fulltime"},
    {"first_name": "Eva", "last_name": "Wagner", "role": "team_leader", "dept_idx": 1, "emp_type": "fulltime"},
    {"first_name": "Felix", "last_name": "Becker", "role": "employee", "dept_idx": 1, "emp_type": "minijob"},
    {"first_name": "Greta", "last_name": "Hoffmann", "role": "employee", "dept_idx": 2, "emp_type": "fulltime"},
    {"first_name": "Hans", "last_name": "Schäfer", "role": "employee", "dept_idx": 2, "emp_type": "parttime"},
]


class Command(BaseCommand):
    help = "Setzt das Demo-Konto zurück und befüllt es mit frischen Beispieldaten."

    def add_arguments(self, parser):
        parser.add_argument(
            "--setup",
            action="store_true",
            help="Erstellt die Demo-Organisation neu, falls sie nicht existiert.",
        )

    def handle(self, *args, **options):
        self.stdout.write("Starte Demo-Reset...")

        try:
            with transaction.atomic():
                demo_org = self._get_or_create_demo_org(options["setup"])
                if demo_org is None:
                    return

                self._clear_demo_data(demo_org)
                departments = self._create_departments(demo_org)
                shift_types = self._create_shift_types(demo_org, departments)
                employees = self._create_employees(demo_org, departments)
                self._create_shifts(demo_org, employees, shift_types, departments)
                self._reset_subscription(demo_org)

            self.stdout.write(self.style.SUCCESS(
                f"Demo-Reset erfolgreich. Organisation: '{demo_org.name}'"
            ))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Demo-Reset fehlgeschlagen: {e}"))
            raise

    def _get_or_create_demo_org(self, setup_mode):
        from accounts.models import Organization
        from subscriptions.models import Subscription, SubscriptionTier

        try:
            demo_org = Organization.objects.get(is_demo=True)
            self.stdout.write(f"Demo-Organisation gefunden: {demo_org.name}")
            return demo_org
        except Organization.DoesNotExist:
            if not setup_mode:
                self.stderr.write(
                    self.style.ERROR(
                        "Keine Demo-Organisation gefunden. "
                        "Führe 'python manage.py reset_demo_account --setup' aus, um sie zu erstellen."
                    )
                )
                return None

            # Erstelle Demo-Subscription
            subscription = Subscription.objects.create(
                company_name=DEMO_ORG_NAME,
                tier=SubscriptionTier.PRO,
                max_departments=10,
                max_employees=150,
                is_active=True,
            )

            # Erstelle Demo-Organisation
            demo_org = Organization.objects.create(
                name=DEMO_ORG_NAME,
                subscription=subscription,
                is_demo=True,
                is_trial=True,
                is_active=True,
            )
            subscription.company_name = DEMO_ORG_NAME
            subscription.save()

            # Erstelle Master-Demo-Admin-User
            master_user = User.objects.create_user(
                username=DEMO_MASTER_USERNAME,
                password=DEMO_MASTER_PASSWORD,
                first_name="Demo",
                last_name="Admin",
                email="demo@schichtplan.de",
                role="admin",
                organization=demo_org,
            )

            self.stdout.write(self.style.SUCCESS(
                f"Demo-Organisation erstellt: {demo_org.name}\n"
                f"Master-Login: {DEMO_MASTER_USERNAME} / {DEMO_MASTER_PASSWORD}"
            ))
            return demo_org

    def _clear_demo_data(self, demo_org):
        """Löscht alle Demo-Daten außer dem Master-Admin-User"""
        from shifts.models import Shift, ShiftType, Department, Employee, VacationRequest

        # Shifts löschen
        Shift.objects.filter(organization=demo_org).delete()

        # Urlaubsanträge löschen (über Employee -> Organization)
        VacationRequest.objects.filter(employee__user__organization=demo_org).delete()

        # Demo-User löschen (außer dem Master-Admin)
        demo_users = User.objects.filter(
            organization=demo_org
        ).exclude(username=DEMO_MASTER_USERNAME)
        # Employee-Profile werden kaskadiert gelöscht
        demo_users.delete()

        # Schichttypen löschen
        ShiftType.objects.filter(organization=demo_org).delete()

        # Abteilungen löschen
        Department.objects.filter(organization=demo_org).delete()

        self.stdout.write("Demo-Daten bereinigt.")

    def _create_departments(self, demo_org):
        from shifts.models import Department
        departments = []
        for dept_data in DEPARTMENTS:
            dept = Department.objects.create(
                organization=demo_org,
                name=dept_data["name"],
                description=dept_data["description"],
            )
            departments.append(dept)
        self.stdout.write(f"{len(departments)} Abteilungen erstellt.")
        return departments

    def _create_shift_types(self, demo_org, departments):
        from shifts.models import ShiftType
        shift_types = []
        for i, st_data in enumerate(SHIFT_TYPES):
            dept = departments[i % len(departments)]
            st = ShiftType.objects.create(
                organization=demo_org,
                department=dept,
                name=st_data["name"],
                start_time=st_data["start_time"],
                end_time=st_data["end_time"],
                color=st_data["color"],
                min_employees=2,
                works_on_saturday=True,
                works_on_sunday=i == 0,  # Nur Frühschicht auch sonntags
            )
            shift_types.append(st)
        self.stdout.write(f"{len(shift_types)} Schichttypen erstellt.")
        return shift_types

    def _create_employees(self, demo_org, departments):
        from shifts.models import Employee
        employees = []
        for i, emp_data in enumerate(EMPLOYEES_DATA):
            username = f"demo_{emp_data['first_name'].lower()}_{emp_data['last_name'].lower()}"
            user = User.objects.create_user(
                username=username,
                password=DEMO_MASTER_PASSWORD,
                first_name=emp_data["first_name"],
                last_name=emp_data["last_name"],
                email=f"{username}@schichtplan.de",
                role=emp_data["role"],
                organization=demo_org,
            )
            dept = departments[emp_data["dept_idx"]]
            employee = Employee.objects.create(
                user=user,
                department=dept,
                employment_type=emp_data["emp_type"],
                hire_date=date(2023, 1, 1),
                min_hours_per_week=20 if emp_data["emp_type"] != "minijob" else 8,
                max_hours_per_week=40 if emp_data["emp_type"] == "fulltime" else 20,
                is_active=True,
            )
            employees.append(employee)
        self.stdout.write(f"{len(employees)} Mitarbeiter erstellt.")
        return employees

    def _create_shifts(self, demo_org, employees, shift_types, departments):
        from shifts.models import Shift
        from shifts.constants import ShiftStatus

        today = timezone.now().date()
        master_user = User.objects.get(username=DEMO_MASTER_USERNAME)

        # Schichten für die letzten 7 Tage und nächsten 14 Tage erstellen
        start_date = today - timedelta(days=7)
        end_date = today + timedelta(days=14)

        shifts_created = 0
        current_date = start_date

        while current_date <= end_date:
            weekday = current_date.weekday()  # 0=Montag, 6=Sonntag

            # An Sonntagen nur Frühschicht
            applicable_shift_types = (
                [shift_types[0]] if weekday == 6 else shift_types
            )

            for shift_type in applicable_shift_types:
                # Mitarbeiter der passenden Abteilung wählen
                dept_employees = [
                    e for e in employees
                    if e.department == shift_type.department
                ]
                if not dept_employees:
                    dept_employees = employees[:2]

                # 1-3 Mitarbeiter zufällig zuweisen
                assigned = random.sample(
                    dept_employees, min(len(dept_employees), random.randint(1, 3))
                )
                status = ShiftStatus.PUBLISHED if current_date < today else ShiftStatus.DRAFT

                for employee in assigned:
                    Shift.objects.create(
                        organization=demo_org,
                        shift_type=shift_type,
                        employee=employee,
                        date=current_date,
                        start_time=shift_type.start_time,
                        end_time=shift_type.end_time,
                        status=status,
                        created_by=master_user,
                    )
                    shifts_created += 1

            current_date += timedelta(days=1)

        self.stdout.write(f"{shifts_created} Schichten erstellt.")

    def _reset_subscription(self, demo_org):
        """Setzt Trial-Datum zurück auf heute + 14 Tage"""
        from subscriptions.models import SubscriptionConstants

        if demo_org.subscription:
            today = timezone.now().date()
            sub = demo_org.subscription
            sub.trial_end_date = today + timedelta(days=SubscriptionConstants.TRIAL_DAYS)
            sub.subscription_end_date = sub.trial_end_date
            sub.is_active = True
            sub.save(update_fields=["trial_end_date", "subscription_end_date", "is_active"])

        demo_org.is_trial = True
        demo_org.save(update_fields=["is_trial"])
        self.stdout.write("Subscription zurückgesetzt.")
