from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class Organization(models.Model):
    """Mandant/Unternehmen für Multi-Tenancy"""
    
    name = models.CharField(max_length=255, verbose_name="Unternehmensname")
    address = models.TextField(blank=True, verbose_name="Adresse")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Telefon")
    email = models.EmailField(blank=True, verbose_name="E-Mail")
    subscription = models.ForeignKey(
        'subscriptions.Subscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organizations',
        verbose_name="Subscription"
    )
    is_early_access = models.BooleanField(
        default=False,
        verbose_name="Early-Access Kunde",
        help_text="Wenn aktiviert, erhält diese Organization dauerhaft die vergünstigten Early-Access Preise"
    )
    is_trial = models.BooleanField(
        default=True,
        verbose_name="Ist Trial",
        help_text="Wenn aktiviert, wird der Starter-Plan als kostenlose Testversion angezeigt"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name="Aktiv")
    
    class Meta:
        verbose_name = "Organisation"
        verbose_name_plural = "Organisationen"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Aktualisiere Subscription-Daten wenn is_trial geändert wird"""
        # Prüfe ob is_trial geändert wurde (nur bei existierenden Objekten)
        if self.pk:
            try:
                old_instance = Organization.objects.get(pk=self.pk)
                is_trial_changed = old_instance.is_trial != self.is_trial
            except Organization.DoesNotExist:
                is_trial_changed = False
        else:
            is_trial_changed = False
        
        super().save(*args, **kwargs)
        
        # Wenn is_trial geändert wurde und eine Subscription existiert, aktualisiere diese
        if is_trial_changed and self.subscription:
            self.subscription.save()  # Trigger die Subscription save() Methode


class User(AbstractUser):
    """Erweitertes User-Model"""
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('hr', 'Personalwesen'),
        ('department_manager', 'Abteilungsleiter'),
        ('team_leader', 'Teamleiter'),
        ('group_leader', 'Gruppenleiter'),
        ('employee', 'Mitarbeiter'),
    ]
    
    THEME_CHOICES = [
        ('light', 'Light Mode'),
        ('dark', 'Dark Mode'),
    ]
    
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='users',
        null=True,
        blank=True,
        verbose_name="Organisation"
    )
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='employee',
        verbose_name="Rolle"
    )
    phone = models.CharField(max_length=50, blank=True, verbose_name="Telefon")
    employee_id = models.CharField(
        max_length=50, 
        blank=True, 
        unique=True, 
        null=True,
        verbose_name="Mitarbeiter-ID"
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='light',
        verbose_name="Theme Präferenz"
    )
    tutorial_completed = models.BooleanField(
        default=False,
        verbose_name="Tutorial abgeschlossen"
    )
    
    class Meta:
        verbose_name = "Benutzer"
        verbose_name_plural = "Benutzer"
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.organization})"
