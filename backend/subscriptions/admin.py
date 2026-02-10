from django.contrib import admin
from .models import Subscription, EarlyAccessSettings
from accounts.models import Organization


@admin.register(EarlyAccessSettings)
class EarlyAccessSettingsAdmin(admin.ModelAdmin):
    list_display = ['start_date', 'duration_months', 'max_customers', 'is_active', 'get_current_count', 'early_access_status']
    readonly_fields = ['get_end_date', 'get_current_count', 'early_access_status']
    
    fieldsets = (
        ('Zeitraum', {
            'fields': ('start_date', 'duration_months', 'get_end_date')
        }),
        ('Limits', {
            'fields': ('max_customers', 'get_current_count')
        }),
        ('Status', {
            'fields': ('is_active', 'early_access_status')
        }),
    )
    
    def get_end_date(self, obj):
        return obj.get_end_date()
    get_end_date.short_description = 'End-Datum'
    
    def get_current_count(self, obj):
        # Zähle nur bezahlte Kunden (Pro/Business), nicht Trial-User
        return Organization.objects.filter(
            is_early_access=True,
            subscription__tier__in=['pro', 'business']
        ).count()
    get_current_count.short_description = 'Aktuelle Early-Access Kunden'
    
    def early_access_status(self, obj):
        is_active = obj.is_early_access_active()
        return "🟢 Aktiv" if is_active else "🔴 Beendet"
    early_access_status.short_description = 'Early-Access Status'
    
    def has_add_permission(self, request):
        # Nur eine Instanz erlaubt (Singleton)
        return not EarlyAccessSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Nicht löschen erlauben
        return False


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'company_name', 'tier', 'is_early_access', 'is_active',
        'get_organization_count', 'subscription_end_date'
    ]
    list_filter = ['tier', 'is_early_access', 'is_active', 'subscription_start_date']
    search_fields = ['company_name']
    readonly_fields = [
        'max_departments', 'max_employees',
        'base_price', 'price_per_employee', 'price_cap',
        'created_at', 'updated_at',
        'get_organization_count', 'get_organizations_list'
    ]
    
    fieldsets = (
        ('Unternehmen', {
            'fields': ('company_name',)
        }),
        ('Lizenz', {
            'fields': ('tier', 'is_active', 'is_early_access')
        }),
        ('Limits (automatisch)', {
            'fields': ('max_departments', 'max_employees')
        }),
        ('Preise (automatisch)', {
            'fields': ('base_price', 'price_per_employee', 'price_cap'),
            'description': 'Preise werden automatisch basierend auf Tier und Early-Access Status gesetzt'
        }),
        ('Verwendung', {
            'fields': ('get_organization_count', 'get_organizations_list'),
            'description': 'Organizations die diese Subscription verwenden'
        }),
        ('Laufzeit', {
            'fields': ('trial_end_date', 'subscription_start_date', 'subscription_end_date')
        }),
        ('Zeitstempel', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_organization_count(self, obj):
        """Anzahl der Organizations die diese Subscription verwenden"""
        return obj.organizations.count()
    get_organization_count.short_description = 'Anzahl Organizations'
    
    def get_organizations_list(self, obj):
        """Liste der Organizations die diese Subscription verwenden"""
        orgs = obj.organizations.all()
        if not orgs:
            return "-"
        
        result = []
        for org in orgs:
            emp_count = obj.get_current_employee_count(org)
            dept_count = obj.get_current_department_count(org)
            cost = obj.calculate_monthly_cost(org)
            result.append(
                f"{org.name}: {emp_count} Mitarbeiter, {dept_count} Abteilungen → {cost}€/Monat"
            )
        return "\n".join(result)
    get_organizations_list.short_description = 'Organizations (Details)'
