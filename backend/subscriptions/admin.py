from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'company_name', 'tier', 'is_active',
        'get_current_employee_count', 'max_employees',
        'get_current_department_count', 'max_departments',
        'calculate_monthly_cost', 'subscription_end_date'
    ]
    list_filter = ['tier', 'is_active', 'subscription_start_date']
    search_fields = ['company_name']
    readonly_fields = [
        'max_departments', 'max_employees',
        'base_price', 'price_per_employee',
        'created_at', 'updated_at',
        'get_current_employee_count', 'get_current_department_count',
        'calculate_monthly_cost'
    ]
    
    fieldsets = (
        ('Unternehmen', {
            'fields': ('company_name',)
        }),
        ('Lizenz', {
            'fields': ('tier', 'is_active')
        }),
        ('Limits (automatisch)', {
            'fields': ('max_departments', 'max_employees', 'base_price', 'price_per_employee')
        }),
        ('Aktuelle Nutzung', {
            'fields': ('get_current_department_count', 'get_current_employee_count', 'calculate_monthly_cost')
        }),
        ('Laufzeit', {
            'fields': ('trial_end_date', 'subscription_start_date', 'subscription_end_date')
        }),
        ('Zeitstempel', {
            'fields': ('created_at', 'updated_at')
        }),
    )
