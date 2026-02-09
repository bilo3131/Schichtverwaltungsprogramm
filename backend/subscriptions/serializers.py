from rest_framework import serializers
from .models import Subscription, SubscriptionTier, EarlyAccessSettings
from datetime import date


class EarlyAccessInfoSerializer(serializers.Serializer):
    """Serializer für Early-Access Status-Informationen"""
    is_active = serializers.BooleanField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    max_customers = serializers.IntegerField()
    current_customers = serializers.IntegerField()
    remaining_slots = serializers.IntegerField()
    days_remaining = serializers.IntegerField()
    duration_months = serializers.IntegerField()


class SubscriptionTierInfoSerializer(serializers.Serializer):
    """Serializer für Tier-Informationen mit Early-Access und Standard-Preisen"""
    tier = serializers.CharField()
    tier_display = serializers.CharField()
    early_access_price_per_employee = serializers.DecimalField(max_digits=10, decimal_places=2)
    standard_price_per_employee = serializers.DecimalField(max_digits=10, decimal_places=2)
    early_access_price_cap = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    standard_price_cap = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    max_departments = serializers.IntegerField()
    max_employees = serializers.IntegerField()


class SubscriptionSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    current_employee_count = serializers.SerializerMethodField()
    current_department_count = serializers.SerializerMethodField()
    can_add_employee = serializers.SerializerMethodField()
    can_add_department = serializers.SerializerMethodField()
    monthly_cost = serializers.SerializerMethodField()
    limits_info = serializers.SerializerMethodField()
    pricing_type = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'company_name', 'tier', 'tier_display',
            'is_early_access', 'pricing_type',
            'max_departments', 'max_employees',
            'base_price', 'price_per_employee', 'price_cap',
            'is_active', 'trial_end_date',
            'subscription_start_date', 'subscription_end_date',
            'current_employee_count', 'current_department_count',
            'can_add_employee', 'can_add_department',
            'monthly_cost', 'limits_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'is_early_access', 'pricing_type',
            'max_departments', 'max_employees',
            'base_price', 'price_per_employee', 'price_cap',
            'created_at', 'updated_at'
        ]
    
    def get_organization(self):
        """Holt die Organization aus dem Context (vom Request)"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'organization'):
            return request.user.organization
        return None
    
    def get_pricing_type(self, obj):
        """Gibt den Preis-Typ zurück (Early-Access oder Standard)"""
        organization = self.get_organization()
        if organization and organization.is_early_access:
            return "Early-Access"
        return "Standard"
    
    def get_current_employee_count(self, obj):
        return obj.get_current_employee_count(self.get_organization())
    
    def get_current_department_count(self, obj):
        return obj.get_current_department_count(self.get_organization())
    
    def get_can_add_employee(self, obj):
        return obj.can_add_employee(self.get_organization())
    
    def get_can_add_department(self, obj):
        return obj.can_add_department(self.get_organization())
    
    def get_monthly_cost(self, obj):
        return obj.calculate_monthly_cost(self.get_organization())
    
    def get_limits_info(self, obj):
        organization = self.get_organization()
        info = obj.get_limits_info(organization)
        
        # Füge Tier-Optionen hinzu
        info['tier_options'] = self.get_tier_options()
        
        # Füge Early-Access Status hinzu
        info['early_access_info'] = self.get_early_access_info()
        
        return info
    
    def get_early_access_info(self):
        """Gibt den aktuellen Early-Access Status zurück"""
        try:
            settings = EarlyAccessSettings.objects.first()
            if not settings:
                return None
            
            is_active = settings.is_early_access_active()
            current_count = Subscription.objects.filter(is_early_access=True).count()
            end_date = settings.get_end_date()
            days_remaining = (end_date - date.today()).days if end_date > date.today() else 0
            
            return {
                'is_active': is_active,
                'start_date': settings.start_date,
                'end_date': end_date,
                'max_customers': settings.max_customers,
                'current_customers': current_count,
                'remaining_slots': max(0, settings.max_customers - current_count),
                'days_remaining': days_remaining,
                'duration_months': settings.duration_months
            }
        except Exception:
            return None
    
    def get_tier_options(self):
        """Gibt alle verfügbaren Tier-Optionen mit Preisen zurück"""
        return [
            {
                'tier': SubscriptionTier.STARTER,
                'tier_display': 'Starter',
                'base_price': 29.00,
                'max_departments': 1,
                'max_employees': 20,
                'early_access': {
                    'price_per_employee': 1.50,
                    'price_cap': None
                },
                'standard': {
                    'price_per_employee': 2.00,
                    'price_cap': None
                }
            },
            {
                'tier': SubscriptionTier.PRO,
                'tier_display': 'Pro',
                'base_price': 59.00,
                'max_departments': 10,
                'max_employees': 150,
                'early_access': {
                    'price_per_employee': 1.00,
                    'price_cap': None
                },
                'standard': {
                    'price_per_employee': 1.50,
                    'price_cap': None
                }
            },
            {
                'tier': SubscriptionTier.BUSINESS,
                'tier_display': 'Business',
                'base_price': 99.00,
                'max_departments': -1,  # unlimited
                'max_employees': -1,    # unlimited
                'early_access': {
                    'price_per_employee': 0.80,
                    'price_cap': 399.00
                },
                'standard': {
                    'price_per_employee': 1.00,
                    'price_cap': 499.00
                }
            }
        ]


class SubscriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['tier', 'company_name', 'is_active', 'trial_end_date', 'subscription_end_date']
