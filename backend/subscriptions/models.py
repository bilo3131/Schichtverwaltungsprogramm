from django.db import models
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


# Constants for subscription management
class SubscriptionConstants:
    """Central configuration for subscription tiers and pricing"""
    TRIAL_DAYS = 14
    MONTHLY_SUBSCRIPTION_DAYS = 30
    EARLY_ACCESS_DURATION_MONTHS = 6
    EARLY_ACCESS_MAX_CUSTOMERS = 30
    UNLIMITED_VALUE = -1
    
    # Tier configurations: (max_departments, max_employees, base_price, price_per_employee, price_cap)
    TIER_CONFIG = {
        'starter': (1, 20, Decimal('29.00'), Decimal('2.00'), None),
        'pro': (10, 150, Decimal('59.00'), Decimal('1.50'), None),
        'business': (UNLIMITED_VALUE, UNLIMITED_VALUE, Decimal('99.00'), Decimal('1.00'), Decimal('499.00')),
    }
    
    # Early-Access pricing: (price_per_employee, price_cap)
    EARLY_ACCESS_PRICING = {
        'starter': (Decimal('1.50'), None),
        'pro': (Decimal('1.00'), None),
        'business': (Decimal('0.80'), Decimal('399.00')),
    }


class SubscriptionTier(models.TextChoices):
    STARTER = 'starter', 'Starter'
    PRO = 'pro', 'Pro'
    BUSINESS = 'business', 'Business'


class EarlyAccessSettings(models.Model):
    """Singleton configuration for early access program"""
    start_date = models.DateTimeField(
        default=timezone.now,
        verbose_name="Early-Access Startdatum"
    )
    duration_months = models.IntegerField(
        default=SubscriptionConstants.EARLY_ACCESS_DURATION_MONTHS,
        verbose_name="Dauer in Monaten"
    )
    max_customers = models.IntegerField(
        default=SubscriptionConstants.EARLY_ACCESS_MAX_CUSTOMERS,
        verbose_name="Maximale Kundenanzahl"
    )
    is_active = models.BooleanField(default=True, verbose_name="Early-Access aktiv")
    
    class Meta:
        verbose_name = "Early-Access Einstellungen"
        verbose_name_plural = "Early-Access Einstellungen"
    
    def __str__(self):
        return f"Early-Access (aktiv bis {self.get_end_date()} oder {self.max_customers} Kunden)"
    
    def get_end_date(self):
        """Calculate the end date of the early access program"""
        return self.start_date + timedelta(days=30 * self.duration_months)
    
    def _is_within_time_limit(self):
        """Check if early access is within time constraints"""
        if timezone.now() < self.start_date:
            return False
        return timezone.now() <= self.get_end_date()
    
    def _is_within_customer_limit(self):
        """Check if early access customer limit hasn't been reached"""
        from accounts.models import Organization
        early_access_count = Organization.objects.filter(is_early_access=True).count()
        return early_access_count < self.max_customers
    
    def is_early_access_active(self):
        """Check if early access program is currently accepting new customers"""
        if not self.is_active:
            return False
        return self._is_within_time_limit() and self._is_within_customer_limit()
    
    def save(self, *args, **kwargs):
        """Enforce singleton pattern - only one instance allowed"""
        if not self.pk and EarlyAccessSettings.objects.exists():
            raise ValueError('Es kann nur eine Early-Access Einstellung geben.')
        return super().save(*args, **kwargs)


class Subscription(models.Model):
    """Subscription/License model for companies"""
    company_name = models.CharField(max_length=200)
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.STARTER
    )
    
    is_early_access = models.BooleanField(
        default=False,
        verbose_name="Early-Access Kunde",
        help_text="Kunden mit Early-Access bekommen dauerhaft reduzierte Preise"
    )
    
    # Tier-specific limits
    max_departments = models.IntegerField(default=1)
    max_employees = models.IntegerField(default=20)
    
    # Pricing configuration
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('29.00'))
    price_per_employee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('2.00'))
    price_cap = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Preisobergrenze",
        help_text="Maximaler monatlicher Preis (nur für Business Tier)"
    )
    
    # Status and dates
    is_active = models.BooleanField(default=True)
    trial_end_date = models.DateField(null=True, blank=True)
    subscription_start_date = models.DateField(auto_now_add=True)
    subscription_end_date = models.DateField(null=True, blank=True)
    
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
    
    def _set_early_access_on_creation(self):
        """Set early access status for new subscriptions"""
        try:
            early_settings = EarlyAccessSettings.objects.first()
            if early_settings and early_settings.is_early_access_active():
                self.is_early_access = True
        except EarlyAccessSettings.DoesNotExist:
            self.is_early_access = False
    
    def _apply_tier_configuration(self):
        """Apply tier-specific limits and pricing"""
        config = SubscriptionConstants.TIER_CONFIG.get(self.tier)
        if config:
            (
                self.max_departments,
                self.max_employees,
                self.base_price,
                self.price_per_employee,
                self.price_cap
            ) = config
    
    def _update_trial_dates(self, organization):
        """Update trial and subscription end dates based on organization trial status"""
        needs_update = False
        
        if organization.is_trial:
            new_trial_end = self.subscription_start_date + timedelta(
                days=SubscriptionConstants.TRIAL_DAYS
            )
            if self.trial_end_date != new_trial_end or self.subscription_end_date != new_trial_end:
                self.trial_end_date = new_trial_end
                self.subscription_end_date = new_trial_end
                needs_update = True
        else:
            if self.trial_end_date is not None:
                self.trial_end_date = None
                needs_update = True
            
            today = timezone.now().date()
            reference_date = max(self.subscription_start_date, today)
            expected_end_date = reference_date + timedelta(
                days=SubscriptionConstants.MONTHLY_SUBSCRIPTION_DAYS
            )
            
            if not self.subscription_end_date or self.subscription_end_date < reference_date:
                self.subscription_end_date = expected_end_date
                needs_update = True
        
        return needs_update
    
    def _update_dates_for_organizations(self):
        """Update dates for all linked organizations"""
        from accounts.models import Organization
        organizations = Organization.objects.filter(subscription=self)
        
        if organizations.exists():
            organization = organizations.first()
            if self._update_trial_dates(organization):
                Subscription.objects.filter(pk=self.pk).update(
                    trial_end_date=self.trial_end_date,
                    subscription_end_date=self.subscription_end_date
                )
    
    def save(self, *args, **kwargs):
        """
        Save method combines all initialization and update logic:
        - Set early access status for new subscriptions
        - Apply tier-specific configuration
        - Update trial/subscription dates
        """
        # For new subscriptions only
        if not self.pk:
            self._set_early_access_on_creation()
        
        # Apply tier configuration
        self._apply_tier_configuration()
        
        # Save first to ensure pk exists
        super().save(*args, **kwargs)
        
        # Update dates after save (requires pk to exist)
        self._update_dates_for_organizations()
    
    def _has_early_access(self, organization):
        """Check if organization has early access pricing"""
        return organization and organization.is_early_access
    
    def get_price_per_employee(self, organization=None):
        """Get price per employee considering organization's early access status"""
        if not self._has_early_access(organization):
            return float(self.price_per_employee)
        
        early_pricing = SubscriptionConstants.EARLY_ACCESS_PRICING.get(self.tier)
        if early_pricing:
            return float(early_pricing[0])
        
        return float(self.price_per_employee)
    
    def get_price_cap(self, organization=None):
        """Get price cap considering organization's early access status"""
        if self.tier == SubscriptionTier.BUSINESS:
            early_pricing = SubscriptionConstants.EARLY_ACCESS_PRICING.get(self.tier)
            if self._has_early_access(organization) and early_pricing:
                return float(early_pricing[1]) if early_pricing[1] else None
        
        return float(self.price_cap) if self.price_cap else None
    
    def get_current_employee_count(self, organization=None):
        """Count active employees for an organization"""
        from shifts.models import Employee
        queryset = Employee.objects.filter(is_active=True)
        
        if organization:
            queryset = queryset.filter(user__organization=organization)
        
        return queryset.count()
    
    def get_current_department_count(self, organization=None):
        """Count departments for an organization"""
        from shifts.models import Department
        queryset = Department.objects.all()
        
        if organization:
            queryset = queryset.filter(organization=organization)
        
        return queryset.count()
    
    def _is_unlimited(self, value):
        """Check if value represents unlimited"""
        return value == SubscriptionConstants.UNLIMITED_VALUE
    
    def can_add_employee(self, organization=None):
        """Check if another employee can be added"""
        if self._is_unlimited(self.max_employees):
            return True
        return self.get_current_employee_count(organization) < self.max_employees
    
    def can_add_department(self, organization=None):
        """Check if another department can be added"""
        if self._is_unlimited(self.max_departments):
            return True
        return self.get_current_department_count(organization) < self.max_departments
    
    def calculate_monthly_cost(self, organization=None):
        """Calculate monthly cost based on current employee count"""
        if self.tier == SubscriptionTier.STARTER:
            return 0.00
        
        employee_count = self.get_current_employee_count(organization)
        price_per_emp = self.get_price_per_employee(organization)
        total = float(self.base_price) + (employee_count * price_per_emp)
        
        price_cap = self.get_price_cap(organization)
        if price_cap and total > price_cap:
            total = price_cap
        
        return round(total, 2)
    
    def _calculate_savings_info(self, organization):
        """Calculate early access savings information"""
        if not self._has_early_access(organization):
            return {
                'is_early_access_customer': False,
                'savings_per_employee': 0,
                'standard_price_per_employee': 0,
                'monthly_savings': 0,
                'message': None
            }
        
        standard_config = SubscriptionConstants.TIER_CONFIG.get(self.tier)
        early_pricing = SubscriptionConstants.EARLY_ACCESS_PRICING.get(self.tier)
        
        if not standard_config or not early_pricing:
            return {}
        
        standard_price = float(standard_config[3])
        early_price = float(early_pricing[0])
        savings_per_employee = standard_price - early_price
        
        employee_count = self.get_current_employee_count(organization)
        monthly_savings = savings_per_employee * employee_count if employee_count > 0 else 0
        
        return {
            'is_early_access_customer': True,
            'savings_per_employee': round(savings_per_employee, 2),
            'standard_price_per_employee': round(standard_price, 2),
            'monthly_savings': round(monthly_savings, 2),
            'message': f'Sie sparen {monthly_savings:.2f}€/Monat' if monthly_savings > 0 else None
        }
    
    def _get_pricing_info(self, organization, is_trial):
        """Get pricing information considering trial status"""
        price_per_emp = self.get_price_per_employee(organization)
        
        return {
            'base_price': 0.00 if is_trial else float(self.base_price),
            'price_per_employee': 0.00 if is_trial else price_per_emp,
            'price_cap': self.get_price_cap(organization),
            'monthly_cost': self.calculate_monthly_cost(organization),
            'original_base_price': float(self.base_price),
            'original_price_per_employee': float(self.price_per_employee),
            'is_trial': is_trial
        }
    
    def is_expired(self, organization=None):
        """Check if trial or subscription has expired"""
        from django.utils import timezone
        today = timezone.now().date()
        is_trial = organization and organization.is_trial if organization else False

        if is_trial and self.trial_end_date:
            return today > self.trial_end_date
        if self.subscription_end_date:
            return today > self.subscription_end_date
        return False

    def get_limits_info(self, organization=None):
        """Get comprehensive information about subscription limits, usage, and pricing"""
        is_trial = organization and organization.is_trial if organization else False
        is_org_early_access = self._has_early_access(organization)
        
        return {
            'tier': self.tier,
            'tier_display': self.get_tier_display(),
            'is_early_access': is_org_early_access,
            'pricing_type': 'Early-Access' if is_org_early_access else 'Standard',
            'departments': {
                'current': self.get_current_department_count(organization),
                'max': self.max_departments,
                'unlimited': self._is_unlimited(self.max_departments),
                'can_add': self.can_add_department(organization)
            },
            'employees': {
                'current': self.get_current_employee_count(organization),
                'max': self.max_employees,
                'unlimited': self._is_unlimited(self.max_employees),
                'can_add': self.can_add_employee(organization)
            },
            'pricing': self._get_pricing_info(organization, is_trial),
            'early_access_savings': self._calculate_savings_info(organization),
            'status': {
                'is_active': self.is_active,
                'is_expired': self.is_expired(organization),
                'trial_end_date': self.trial_end_date,
                'subscription_end_date': self.subscription_end_date
            }
        }


class PaymentRecord(models.Model):
    """Aufzeichnung von Stripe-Zahlungen"""
    STATUS_CHOICES = [
        ('pending', 'Ausstehend'),
        ('succeeded', 'Erfolgreich'),
        ('failed', 'Fehlgeschlagen'),
        ('canceled', 'Storniert'),
        ('refunded', 'Erstattet'),
    ]

    organization = models.ForeignKey(
        'accounts.Organization',
        on_delete=models.CASCADE,
        related_name='payment_records',
        verbose_name="Organisation"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_records',
        verbose_name="Subscription"
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255,
        verbose_name="Stripe Payment Intent ID"
    )
    stripe_checkout_session_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Stripe Checkout Session ID"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Betrag"
    )
    currency = models.CharField(
        max_length=3,
        default='eur',
        verbose_name="Währung"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )
    tier = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Abonniertes Tier"
    )
    billing_period_start = models.DateField(
        verbose_name="Abrechnungsbeginn"
    )
    billing_period_end = models.DateField(
        null=True,
        blank=True,
        verbose_name="Abrechnungsende"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Zahlungsaufzeichnung"
        verbose_name_plural = "Zahlungsaufzeichnungen"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.organization} - {self.amount}€ ({self.get_status_display()})"
