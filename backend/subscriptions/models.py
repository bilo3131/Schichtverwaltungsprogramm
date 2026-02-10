from django.db import models
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()


class SubscriptionTier(models.TextChoices):
    STARTER = 'starter', 'Starter'
    PRO = 'pro', 'Pro'
    BUSINESS = 'business', 'Business'


class EarlyAccessSettings(models.Model):
    """Globale Early-Access Einstellungen (Singleton)"""
    start_date = models.DateTimeField(default=timezone.now, verbose_name="Early-Access Startdatum")
    duration_months = models.IntegerField(default=6, verbose_name="Dauer in Monaten")
    max_customers = models.IntegerField(default=30, verbose_name="Maximale Kundenanzahl")
    is_active = models.BooleanField(default=True, verbose_name="Early-Access aktiv")
    
    class Meta:
        verbose_name = "Early-Access Einstellungen"
        verbose_name_plural = "Early-Access Einstellungen"
    
    def __str__(self):
        return f"Early-Access (aktiv bis {self.get_end_date()} oder {self.max_customers} Kunden)"
    
    def get_end_date(self):
        """Berechnet das End-Datum des Early-Access"""
        return self.start_date + timedelta(days=30 * self.duration_months)
    
    def is_early_access_active(self):
        """Prüft ob Early-Access noch läuft"""
        if not self.is_active:
            return False
        
        # Prüfe ob Early-Access bereits gestartet ist (nicht in der Zukunft)
        if timezone.now() < self.start_date:
            return False
        
        # Prüfe Zeitlimit
        if timezone.now() > self.get_end_date():
            return False
        
        # Prüfe Kundenlimit - zähle nur bezahlte Kunden (Pro/Business), nicht Trial-User
        from accounts.models import Organization
        early_access_count = Organization.objects.filter(
            is_early_access=True,
            subscription__tier__in=['pro', 'business']
        ).count()
        if early_access_count >= self.max_customers:
            return False
        
        return True
    
    def save(self, *args, **kwargs):
        # Singleton Pattern - nur eine Instanz erlaubt
        if not self.pk and EarlyAccessSettings.objects.exists():
            raise ValueError('Es kann nur eine Early-Access Einstellung geben.')
        return super().save(*args, **kwargs)


class Subscription(models.Model):
    """Lizenz/Subscription für ein Unternehmen"""
    company_name = models.CharField(max_length=200)
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.STARTER
    )
    
    # Early-Access Flag (wird beim Erstellen gesetzt und bleibt dauerhaft)
    is_early_access = models.BooleanField(
        default=False,
        verbose_name="Early-Access Kunde",
        help_text="Kunden mit Early-Access bekommen dauerhaft reduzierte Preise"
    )
    
    # Limits je nach Tier
    max_departments = models.IntegerField(default=1)
    max_employees = models.IntegerField(default=20)
    
    # Preisgestaltung (wird automatisch gesetzt basierend auf Tier und Early-Access Status)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=29.00)
    price_per_employee = models.DecimalField(max_digits=10, decimal_places=2, default=1.50)
    price_cap = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Preisobergrenze",
        help_text="Maximaler monatlicher Preis (nur für Business Tier)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    trial_end_date = models.DateField(null=True, blank=True)
    subscription_start_date = models.DateField(auto_now_add=True)
    subscription_end_date = models.DateField(null=True, blank=True)
    
    # Zugeordnete Admin-Benutzer (Owner)
    owner = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='subscription',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subscriptions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.company_name} - {self.get_tier_display()}"
    
    def save(self, *args, **kwargs):
        # Bei neuer Subscription: Automatisch Early-Access Status setzen
        if not self.pk:  # Nur bei Erstellung
            try:
                early_settings = EarlyAccessSettings.objects.first()
                if early_settings and early_settings.is_early_access_active():
                    self.is_early_access = True
            except EarlyAccessSettings.DoesNotExist:
                self.is_early_access = False
        
        # Automatische Zuweisung der Limits und Standard-Preise basierend auf Tier
        if self.tier == SubscriptionTier.STARTER:
            self.max_departments = 1
            self.max_employees = 20
            self.base_price = 29.00
            self.price_per_employee = 2.00  # Standard-Preis
            self.price_cap = None
            
        elif self.tier == SubscriptionTier.PRO:
            self.max_departments = 10
            self.max_employees = 150
            self.base_price = 59.00
            self.price_per_employee = 1.50  # Standard-Preis
            self.price_cap = None
            
        elif self.tier == SubscriptionTier.BUSINESS:
            self.max_departments = -1  # -1 = unlimited
            self.max_employees = -1    # -1 = unlimited
            self.base_price = 99.00
            self.price_per_employee = 1.00  # Standard-Preis
            self.price_cap = 499.00  # Standard Price Cap
        
        super().save(*args, **kwargs)
    
    def get_price_per_employee(self, organization=None):
        """Gibt den Preis pro Mitarbeiter zurück - berücksichtigt Organization's Early-Access Status"""
        # Prüfe ob Organization Early-Access hat
        is_org_early_access = organization and organization.is_early_access
        
        if not is_org_early_access:
            # Standard-Preis (bereits in price_per_employee gespeichert)
            return float(self.price_per_employee)
        
        # Early-Access Preise
        if self.tier == SubscriptionTier.STARTER:
            return 1.50
        elif self.tier == SubscriptionTier.PRO:
            return 1.00
        elif self.tier == SubscriptionTier.BUSINESS:
            return 0.80
        
        return float(self.price_per_employee)
    
    def get_price_cap(self, organization=None):
        """Gibt das Price Cap zurück - berücksichtigt Organization's Early-Access Status"""
        is_org_early_access = organization and organization.is_early_access
        
        if self.tier == SubscriptionTier.BUSINESS:
            if is_org_early_access:
                return 399.00  # Early-Access Cap
            else:
                return 499.00  # Standard Cap
        
        return self.price_cap
    
    def get_current_employee_count(self, organization=None):
        """Anzahl der aktuell registrierten Mitarbeiter für eine Organisation"""
        from shifts.models import Employee
        if organization:
            # Zähle nur Mitarbeiter dieser Organization
            return Employee.objects.filter(
                user__organization=organization,
                is_active=True
            ).count()
        # Fallback: Alle Mitarbeiter (für backwards compatibility)
        return Employee.objects.filter(is_active=True).count()
    
    def get_current_department_count(self, organization=None):
        """Anzahl der aktuell erstellten Abteilungen für eine Organisation"""
        from shifts.models import Department
        if organization:
            # Zähle nur Abteilungen dieser Organization
            return Department.objects.filter(organization=organization).count()
        # Fallback: Alle Abteilungen
        return Department.objects.count()
    
    def can_add_employee(self, organization=None):
        """Prüft, ob noch ein Mitarbeiter hinzugefügt werden kann"""
        if self.max_employees == -1:  # unlimited
            return True
        return self.get_current_employee_count(organization) < self.max_employees
    
    def can_add_department(self, organization=None):
        """Prüft, ob noch eine Abteilung hinzugefügt werden kann"""
        if self.max_departments == -1:  # unlimited
            return True
        return self.get_current_department_count(organization) < self.max_departments
    
    def calculate_monthly_cost(self, organization=None):
        """Berechnet die monatlichen Kosten basierend auf aktueller Mitarbeiteranzahl"""
        # Starter ist kostenlos während der Trial-Phase
        if self.tier == SubscriptionTier.STARTER:
            return 0.00
        
        employee_count = self.get_current_employee_count(organization)
        price_per_emp = self.get_price_per_employee(organization)
        total = float(self.base_price) + (employee_count * price_per_emp)
        
        # Price Cap anwenden
        price_cap = self.get_price_cap(organization)
        if price_cap and total > float(price_cap):
            total = float(self.price_cap)
        
        return round(total, 2)
    
    def get_limits_info(self, organization=None):
        """Gibt Informationen über aktuelle Nutzung und Limits zurück"""
        # Für Trial-Modus: Starter ist kostenlos (0€), Pro und Business sind disabled
        is_trial_mode = self.tier == SubscriptionTier.STARTER
        
        # Prüfe ob Organization Early-Access hat
        is_org_early_access = organization and organization.is_early_access
        
        # Berechne Ersparnis wenn Early-Access
        savings_per_employee = 0
        standard_price_per_employee = 0
        price_per_emp = self.get_price_per_employee(organization)
        
        if is_org_early_access:
            if self.tier == SubscriptionTier.STARTER:
                savings_per_employee = 0.50  # 2.00 - 1.50
                standard_price_per_employee = 2.00
            elif self.tier == SubscriptionTier.PRO:
                savings_per_employee = 0.50  # 1.50 - 1.00
                standard_price_per_employee = 1.50
            elif self.tier == SubscriptionTier.BUSINESS:
                savings_per_employee = 0.20  # 1.00 - 0.80
                standard_price_per_employee = 1.00
        
        employee_count = self.get_current_employee_count(organization)
        monthly_savings = savings_per_employee * employee_count if employee_count > 0 else 0
        
        return {
            'tier': self.tier,
            'tier_display': self.get_tier_display(),
            'is_early_access': is_org_early_access,
            'pricing_type': 'Early-Access' if is_org_early_access else 'Standard',
            'departments': {
                'current': self.get_current_department_count(organization),
                'max': self.max_departments,
                'unlimited': self.max_departments == -1,
                'can_add': self.can_add_department(organization)
            },
            'employees': {
                'current': self.get_current_employee_count(organization),
                'max': self.max_employees,
                'unlimited': self.max_employees == -1,
                'can_add': self.can_add_employee(organization)
            },
            'pricing': {
                'base_price': 0.00 if is_trial_mode else float(self.base_price),
                'price_per_employee': 0.00 if is_trial_mode else price_per_emp,
                'price_cap': self.get_price_cap(organization),
                'monthly_cost': self.calculate_monthly_cost(organization),
                'original_base_price': float(self.base_price),
                'original_price_per_employee': float(self.price_per_employee),
                'is_trial': is_trial_mode
            },
            'early_access_savings': {
                'is_early_access_customer': is_org_early_access,
                'savings_per_employee': round(savings_per_employee, 2),
                'standard_price_per_employee': round(standard_price_per_employee, 2),
                'monthly_savings': round(monthly_savings, 2),
                'message': f'Sie sparen {monthly_savings:.2f}€/Monat' if is_org_early_access and monthly_savings > 0 else None
            },
            'status': {
                'is_active': self.is_active,
                'trial_end_date': self.trial_end_date,
                'subscription_end_date': self.subscription_end_date
            }
        }
