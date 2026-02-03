from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class Organization(models.Model):
    """Mandant/Unternehmen für Multi-Tenancy"""
    
    # Subscription Plan Choices
    LOW = 'low'
    MID = 'mid'
    HIGH = 'high'
    
    SUBSCRIPTION_CHOICES = [
        (LOW, 'Low Budget - Basis'),
        (MID, 'Mid Budget - Standard'),
        (HIGH, 'High Budget - Premium'),
    ]
    
    name = models.CharField(max_length=255, verbose_name="Unternehmensname")
    address = models.TextField(blank=True, verbose_name="Adresse")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Telefon")
    email = models.EmailField(blank=True, verbose_name="E-Mail")
    subscription_plan = models.CharField(
        max_length=10,
        choices=SUBSCRIPTION_CHOICES,
        default=LOW,
        verbose_name="Abonnement-Plan"
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
    
    class Meta:
        verbose_name = "Benutzer"
        verbose_name_plural = "Benutzer"
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.organization})"
