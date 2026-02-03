from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class SubscriptionTier(models.TextChoices):
    STARTER = 'starter', 'Starter'
    PRO = 'pro', 'Pro'
    BUSINESS = 'business', 'Business'


class Subscription(models.Model):
    """Lizenz/Subscription für ein Unternehmen"""
    company_name = models.CharField(max_length=200)
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.STARTER
    )
    
    # Limits je nach Tier
    max_departments = models.IntegerField(default=1)
    max_employees = models.IntegerField(default=20)
    
    # Preisgestaltung
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=29.00)
    price_per_employee = models.DecimalField(max_digits=10, decimal_places=2, default=1.50)
    
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
        # Automatische Zuweisung der Limits basierend auf Tier
        if self.tier == SubscriptionTier.STARTER:
            self.max_departments = 1
            self.max_employees = 20
            self.base_price = 29.00
            self.price_per_employee = 1.50
        elif self.tier == SubscriptionTier.PRO:
            self.max_departments = 10
            self.max_employees = 150
            self.base_price = 59.00
            self.price_per_employee = 1.00
        elif self.tier == SubscriptionTier.BUSINESS:
            self.max_departments = -1  # -1 = unlimited
            self.max_employees = -1    # -1 = unlimited
            self.base_price = 99.00
            self.price_per_employee = 0.80
        
        super().save(*args, **kwargs)
    
    def get_current_employee_count(self):
        """Anzahl der aktuell registrierten Mitarbeiter"""
        from shifts.models import Employee
        return Employee.objects.filter(is_active=True).count()
    
    def get_current_department_count(self):
        """Anzahl der aktuell erstellten Abteilungen"""
        from shifts.models import Department
        return Department.objects.count()
    
    def can_add_employee(self):
        """Prüft, ob noch ein Mitarbeiter hinzugefügt werden kann"""
        if self.max_employees == -1:  # unlimited
            return True
        return self.get_current_employee_count() < self.max_employees
    
    def can_add_department(self):
        """Prüft, ob noch eine Abteilung hinzugefügt werden kann"""
        if self.max_departments == -1:  # unlimited
            return True
        return self.get_current_department_count() < self.max_departments
    
    def calculate_monthly_cost(self):
        """Berechnet die monatlichen Kosten basierend auf aktueller Mitarbeiteranzahl"""
        employee_count = self.get_current_employee_count()
        total = float(self.base_price) + (employee_count * float(self.price_per_employee))
        return round(total, 2)
    
    def get_limits_info(self):
        """Gibt Informationen über aktuelle Nutzung und Limits zurück"""
        return {
            'tier': self.tier,
            'tier_display': self.get_tier_display(),
            'departments': {
                'current': self.get_current_department_count(),
                'max': self.max_departments,
                'unlimited': self.max_departments == -1,
                'can_add': self.can_add_department()
            },
            'employees': {
                'current': self.get_current_employee_count(),
                'max': self.max_employees,
                'unlimited': self.max_employees == -1,
                'can_add': self.can_add_employee()
            },
            'pricing': {
                'base_price': float(self.base_price),
                'price_per_employee': float(self.price_per_employee),
                'monthly_cost': self.calculate_monthly_cost()
            },
            'status': {
                'is_active': self.is_active,
                'trial_end_date': self.trial_end_date,
                'subscription_end_date': self.subscription_end_date
            }
        }
