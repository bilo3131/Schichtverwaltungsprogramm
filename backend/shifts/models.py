from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from accounts.models import User, Organization


class Department(models.Model):
    """Abteilungen innerhalb einer Organisation"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=100, verbose_name="Abteilungsname")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Abteilung"
        verbose_name_plural = "Abteilungen"
        ordering = ['name']
        unique_together = ['organization', 'name']
    
    def __str__(self):
        return self.name


class Qualification(models.Model):
    """Qualifikationen/Fähigkeiten für Mitarbeiter"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='qualifications'
    )
    name = models.CharField(max_length=100, verbose_name="Qualifikation")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        related_name='qualifications',
        null=True,
        blank=True,
        verbose_name="Abteilung"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Qualifikation"
        verbose_name_plural = "Qualifikationen"
        ordering = ['name']
        unique_together = ['organization', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.organization})"


class Employee(models.Model):
    """Erweiterte Mitarbeiter-Informationen"""
    EMPLOYMENT_TYPE_CHOICES = [
        ('fulltime', 'Vollzeit'),
        ('parttime', 'Teilzeit'),
        ('minijob', 'Minijob'),
        ('werkstudent', 'Werkstudent'),
        ('apprentice', 'Ausbildung'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='employee_profile'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        verbose_name="Abteilung"
    )
    employment_type = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_TYPE_CHOICES,
        verbose_name="Beschäftigungsart"
    )
    qualifications = models.ManyToManyField(
        Qualification,
        related_name='employees',
        blank=True,
        verbose_name="Qualifikationen"
    )
    min_hours_per_week = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Min. Wochenstunden"
    )
    max_hours_per_week = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=40,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(60)],
        verbose_name="Max. Wochenstunden"
    )
    hire_date = models.DateField(verbose_name="Einstellungsdatum")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    overtime_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name="Überstunden-Saldo"
    )
    notes = models.TextField(blank=True, verbose_name="Notizen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Mitarbeiter"
        verbose_name_plural = "Mitarbeiter"
        ordering = ['user__last_name', 'user__first_name']
    
    def __str__(self):
        return str(self.user)


class Availability(models.Model):
    """Verfügbarkeiten von Mitarbeitern"""
    AVAILABILITY_TYPE_CHOICES = [
        ('available', 'Verfügbar'),
        ('unavailable', 'Nicht verfügbar'),
        ('preferred', 'Bevorzugt'),
    ]
    
    WEEKDAY_CHOICES = [
        (0, 'Montag'),
        (1, 'Dienstag'),
        (2, 'Mittwoch'),
        (3, 'Donnerstag'),
        (4, 'Freitag'),
        (5, 'Samstag'),
        (6, 'Sonntag'),
    ]
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='availabilities'
    )
    weekday = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        null=True,
        blank=True,
        verbose_name="Wochentag"
    )
    specific_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Spezifisches Datum"
    )
    start_time = models.TimeField(verbose_name="Von")
    end_time = models.TimeField(verbose_name="Bis")
    availability_type = models.CharField(
        max_length=20,
        choices=AVAILABILITY_TYPE_CHOICES,
        default='available',
        verbose_name="Verfügbarkeitstyp"
    )
    notes = models.TextField(blank=True, verbose_name="Notizen")
    
    class Meta:
        verbose_name = "Verfügbarkeit"
        verbose_name_plural = "Verfügbarkeiten"
        ordering = ['weekday', 'start_time']
    
    def __str__(self):
        if self.specific_date:
            return f"{self.employee} - {self.specific_date}"
        return f"{self.employee} - {self.get_weekday_display()}"


class VacationRequest(models.Model):
    """Urlaubsanträge"""
    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('approved', 'Genehmigt'),
        ('rejected', 'Abgelehnt'),
    ]
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='vacation_requests'
    )
    start_date = models.DateField(verbose_name="Von")
    end_date = models.DateField(verbose_name="Bis")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    notes = models.TextField(blank=True, verbose_name="Notizen")
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_vacations',
        verbose_name="Genehmigt von"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Urlaubsantrag"
        verbose_name_plural = "Urlaubsanträge"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.employee} - {self.start_date} bis {self.end_date}"


class ShiftType(models.Model):
    """Schichttypen (Früh, Spät, Nacht)"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='shift_types'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='shift_types',
        null=True,
        blank=True,
        verbose_name="Abteilung"
    )
    name = models.CharField(max_length=100, verbose_name="Schichttyp")
    start_time = models.TimeField(verbose_name="Startzeit")
    end_time = models.TimeField(verbose_name="Endzeit")
    color = models.CharField(
        max_length=7,
        default='#3498db',
        verbose_name="Farbe (Hex)"
    )
    required_qualifications = models.ManyToManyField(
        Qualification,
        related_name='shift_types',
        blank=True,
        verbose_name="Erforderliche Qualifikationen"
    )
    min_employees = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Mindestbesetzung"
    )
    night_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Nachtarbeitsstunden",
        help_text="Stunden zwischen 23:00-06:00 Uhr (wird automatisch berechnet)"
    )
    break_duration = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Pausendauer (Minuten)",
        help_text="Wird automatisch berechnet, kann aber überschrieben werden"
    )
    works_on_saturday = models.BooleanField(
        default=False,
        verbose_name="Samstags verfügbar",
        help_text="Kann diese Schicht am Samstag geplant werden?"
    )
    works_on_sunday = models.BooleanField(
        default=False,
        verbose_name="Sonntags verfügbar",
        help_text="Kann diese Schicht am Sonntag geplant werden?"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Schichttyp"
        verbose_name_plural = "Schichttypen"
        ordering = ['start_time']
        unique_together = ['organization', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"
    
    def calculate_night_hours(self):
        """Berechnet die Nachtarbeitsstunden (23:00-06:00 Uhr)"""
        from datetime import datetime, timedelta, time
        
        # Definiere Nachtzeit: 23:00-06:00
        night_start = time(23, 0)
        night_end = time(6, 0)
        
        # Konvertiere zu datetime für einfachere Berechnungen
        base_date = datetime.today()
        start = datetime.combine(base_date, self.start_time)
        end = datetime.combine(base_date, self.end_time)
        
        # Wenn Endzeit vor Startzeit liegt, geht die Schicht über Mitternacht
        if self.end_time < self.start_time:
            end += timedelta(days=1)
        
        # Definiere die Nachtzeit-Perioden
        # Abend-Nachtzeit: 23:00 desselben Tages bis Mitternacht
        evening_night_start = datetime.combine(base_date, night_start)
        evening_night_end = datetime.combine(base_date + timedelta(days=1), time(0, 0))
        
        # Morgen-Nachtzeit: Mitternacht bis 06:00 des Folgetages
        morning_night_start = datetime.combine(base_date + timedelta(days=1), time(0, 0))
        morning_night_end = datetime.combine(base_date + timedelta(days=1), night_end)
        
        total_night_hours = 0
        
        # Berechne Überschneidung mit Abend-Nachtzeit (23:00-00:00)
        evening_overlap_start = max(start, evening_night_start)
        evening_overlap_end = min(end, evening_night_end)
        if evening_overlap_start < evening_overlap_end:
            total_night_hours += (evening_overlap_end - evening_overlap_start).total_seconds() / 3600
        
        # Berechne Überschneidung mit Morgen-Nachtzeit (00:00-06:00)
        morning_overlap_start = max(start, morning_night_start)
        morning_overlap_end = min(end, morning_night_end)
        if morning_overlap_start < morning_overlap_end:
            total_night_hours += (morning_overlap_end - morning_overlap_start).total_seconds() / 3600
        
        return round(total_night_hours, 2)
    
    def calculate_break_duration(self):
        """Berechnet automatisch die Pausendauer basierend auf der Arbeitszeit"""
        from datetime import datetime, timedelta
        
        # Berechne die Dauer der Schicht
        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        
        # Wenn Endzeit vor Startzeit liegt, ist es eine Nachtschicht über Mitternacht
        if end < start:
            end += timedelta(days=1)
        
        duration = end - start
        hours = duration.total_seconds() / 3600
        
        # Pausenregelung: 6,1-9h = 30min, >9h = 45min, <=6h = 0min
        if hours > 9:
            return 45
        elif hours > 6:
            return 30
        else:
            return 0
    
    def save(self, *args, **kwargs):
        # Berechne empfohlene Pause
        recommended_break = self.calculate_break_duration()
        
        # Automatische Pausenberechnung nur wenn:
        # 1. Neuer Datensatz (kein pk) ODER
        # 2. Aktueller Wert ist 0 ODER
        # 3. Aktueller Wert ist kleiner als empfohlen
        if not self.pk or self.break_duration < recommended_break:
            self.break_duration = recommended_break
        
        # Automatische Berechnung der Nachtarbeitsstunden
        self.night_hours = self.calculate_night_hours()
        
        super().save(*args, **kwargs)


class Shift(models.Model):
    """Einzelne Schichten"""
    STATUS_CHOICES = [
        ('draft', 'Entwurf'),
        ('published', 'Veröffentlicht'),
        ('completed', 'Abgeschlossen'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='shifts'
    )
    shift_type = models.ForeignKey(
        ShiftType,
        on_delete=models.CASCADE,
        related_name='shifts',
        verbose_name="Schichttyp"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='shifts',
        verbose_name="Mitarbeiter"
    )
    date = models.DateField(verbose_name="Datum")
    start_time = models.TimeField(verbose_name="Startzeit")
    end_time = models.TimeField(verbose_name="Endzeit")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Status"
    )
    notes = models.TextField(blank=True, verbose_name="Notizen")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_shifts',
        verbose_name="Erstellt von"
    )
    
    class Meta:
        verbose_name = "Schicht"
        verbose_name_plural = "Schichten"
        ordering = ['date', 'start_time']
    
    def __str__(self):
        employee_name = self.employee if self.employee else "Unbesetzt"
        return f"{self.shift_type.name} - {self.date} ({employee_name})"
    
    def get_duration_hours(self):
        """Berechnet die Dauer der Schicht in Stunden"""
        from datetime import datetime, timedelta
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        
        # Wenn End-Zeit vor Start-Zeit, dann geht Schicht über Mitternacht
        if end < start:
            end += timedelta(days=1)
        
        duration = end - start
        return duration.total_seconds() / 3600


class ShiftSwapRequest(models.Model):
    """Tauschwünsche zwischen Mitarbeitern"""
    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('approved', 'Genehmigt'),
        ('rejected', 'Abgelehnt'),
    ]
    
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name='swap_requests',
        verbose_name="Schicht"
    )
    requesting_employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='requested_swaps',
        verbose_name="Anfragender Mitarbeiter"
    )
    target_employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='received_swap_requests',
        verbose_name="Ziel-Mitarbeiter"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    message = models.TextField(blank=True, verbose_name="Nachricht")
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_swaps',
        verbose_name="Genehmigt von"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tauschwunsch"
        verbose_name_plural = "Tauschwünsche"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.requesting_employee} → {self.target_employee} ({self.shift})"


class AbsenceRecord(models.Model):
    """Krankheits- und Abwesenheitsverwaltung"""
    ABSENCE_TYPE_CHOICES = [
        ('sick', 'Krank'),
        ('vacation', 'Urlaub'),
        ('vacation_wish', 'Urlaubswunsch'),
        ('kug', 'KUG'),
        ('other', 'Sonstiges'),
    ]
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='absences',
        verbose_name="Mitarbeiter"
    )
    absence_type = models.CharField(
        max_length=20,
        choices=ABSENCE_TYPE_CHOICES,
        verbose_name="Abwesenheitstyp"
    )
    start_date = models.DateField(verbose_name="Von")
    end_date = models.DateField(verbose_name="Bis")
    notes = models.TextField(blank=True, verbose_name="Notizen")
    document = models.FileField(
        upload_to='absence_documents/',
        null=True,
        blank=True,
        verbose_name="Dokument (z.B. Krankmeldung)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Abwesenheit"
        verbose_name_plural = "Abwesenheiten"
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.employee} - {self.get_absence_type_display()} ({self.start_date} - {self.end_date})"


class ShiftTemplate(models.Model):
    """Vorlagen für wiederkehrende Schichtmuster"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='shift_templates'
    )
    name = models.CharField(max_length=100, verbose_name="Vorlagenname")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_templates'
    )
    
    class Meta:
        verbose_name = "Schichtvorlage"
        verbose_name_plural = "Schichtvorlagen"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ShiftTemplateEntry(models.Model):
    """Einzelne Einträge in einer Schichtvorlage"""
    WEEKDAY_CHOICES = [
        (0, 'Montag'),
        (1, 'Dienstag'),
        (2, 'Mittwoch'),
        (3, 'Donnerstag'),
        (4, 'Freitag'),
        (5, 'Samstag'),
        (6, 'Sonntag'),
    ]
    
    template = models.ForeignKey(
        ShiftTemplate,
        on_delete=models.CASCADE,
        related_name='entries'
    )
    weekday = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        verbose_name="Wochentag"
    )
    shift_type = models.ForeignKey(
        ShiftType,
        on_delete=models.CASCADE,
        verbose_name="Schichttyp"
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Mitarbeiter (optional)"
    )
    
    class Meta:
        verbose_name = "Vorlagen-Eintrag"
        verbose_name_plural = "Vorlagen-Einträge"
        ordering = ['weekday', 'shift_type__start_time']
    
    def __str__(self):
        return f"{self.template.name} - {self.get_weekday_display()} - {self.shift_type}"


class Notification(models.Model):
    """Benachrichtigungen für Benutzer"""
    NOTIFICATION_TYPES = [
        ('shift_created', 'Neue Schicht'),
        ('shift_updated', 'Schicht geändert'),
        ('shift_deleted', 'Schicht gelöscht'),
        ('vacation_approved', 'Urlaub genehmigt'),
        ('vacation_rejected', 'Urlaub abgelehnt'),
        ('vacation_request', 'Neue Urlaubsanfrage'),
        ('event_invitation', 'Event-Einladung'),
        ('event_updated', 'Event geändert'),
        ('event_deleted', 'Event abgesagt'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Benutzer"
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        verbose_name="Benachrichtigungstyp"
    )
    title = models.CharField(max_length=200, verbose_name="Titel")
    message = models.TextField(verbose_name="Nachricht")
    is_read = models.BooleanField(default=False, verbose_name="Gelesen")
    is_emailed = models.BooleanField(default=False, verbose_name="E-Mail versendet")
    related_shift = models.ForeignKey(
        'Shift',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Zugehörige Schicht"
    )
    related_vacation = models.ForeignKey(
        'VacationRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Zugehöriger Urlaubsantrag"
    )
    related_event = models.ForeignKey(
        'Event',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Zugehöriges Event"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Erstellt am")
    
    class Meta:
        verbose_name = "Benachrichtigung"
        verbose_name_plural = "Benachrichtigungen"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Holiday(models.Model):
    """Feiertage für bessere Schichtplanung"""
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name="Organisation"
    )
    name = models.CharField(max_length=200, verbose_name="Feiertagsname")
    date = models.DateField(verbose_name="Datum")
    is_recurring = models.BooleanField(
        default=False,
        verbose_name="Jährlich wiederkehrend"
    )
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Feiertag"
        verbose_name_plural = "Feiertage"
        ordering = ['date']
        unique_together = ['organization', 'date', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.date}"


class Event(models.Model):
    """Kalender-Events wie Meetings, Schulungen, etc."""
    EVENT_TYPE_CHOICES = [
        ('meeting', 'Meeting'),
        ('training', 'Schulung'),
        ('project', 'Projekt-Termin'),
        ('company', 'Firmenevent'),
        ('other', 'Sonstiges'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='events',
        verbose_name="Organisation"
    )
    title = models.CharField(max_length=200, verbose_name="Titel")
    description = models.TextField(blank=True, verbose_name="Beschreibung")
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default='other',
        verbose_name="Event-Typ"
    )
    start_datetime = models.DateTimeField(verbose_name="Start")
    end_datetime = models.DateTimeField(verbose_name="Ende")
    location = models.CharField(max_length=200, blank=True, verbose_name="Ort/Raum")
    is_all_day = models.BooleanField(default=False, verbose_name="Ganztägig")
    editable_by_attendees = models.BooleanField(
        default=False,
        verbose_name="Von Teilnehmern bearbeitbar"
    )
    attendees = models.ManyToManyField(
        Employee,
        related_name='events',
        blank=True,
        verbose_name="Teilnehmer"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_events',
        verbose_name="Erstellt von"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Event"
        verbose_name_plural = "Events"
        ordering = ['start_datetime']
    
    def __str__(self):
        return f"{self.title} ({self.start_datetime.strftime('%d.%m.%Y %H:%M')})"
