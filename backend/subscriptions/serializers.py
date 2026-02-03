from rest_framework import serializers
from .models import Subscription, SubscriptionTier


class SubscriptionSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    current_employee_count = serializers.IntegerField(source='get_current_employee_count', read_only=True)
    current_department_count = serializers.IntegerField(source='get_current_department_count', read_only=True)
    can_add_employee = serializers.BooleanField(read_only=True)
    can_add_department = serializers.BooleanField(read_only=True)
    monthly_cost = serializers.DecimalField(source='calculate_monthly_cost', max_digits=10, decimal_places=2, read_only=True)
    limits_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'company_name', 'tier', 'tier_display',
            'max_departments', 'max_employees',
            'base_price', 'price_per_employee',
            'is_active', 'trial_end_date',
            'subscription_start_date', 'subscription_end_date',
            'current_employee_count', 'current_department_count',
            'can_add_employee', 'can_add_department',
            'monthly_cost', 'limits_info',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'max_departments', 'max_employees',
            'base_price', 'price_per_employee',
            'created_at', 'updated_at'
        ]
    
    def get_limits_info(self, obj):
        return obj.get_limits_info()


class SubscriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ['tier', 'company_name', 'is_active', 'trial_end_date', 'subscription_end_date']
