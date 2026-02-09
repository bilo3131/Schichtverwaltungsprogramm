from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'subscription', 'is_early_access', 'get_employee_count', 'get_department_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'subscription', 'is_early_access']
    search_fields = ['name', 'email', 'phone']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at', 'get_subscription_details']
    
    fieldsets = (
        ('Unternehmensdaten', {
            'fields': ('name', 'address', 'phone', 'email')
        }),
        ('Subscription', {
            'fields': ('subscription', 'is_early_access', 'get_subscription_details', 'is_active')
        }),
        ('Zeitstempel', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_employee_count(self, obj):
        """Anzahl Mitarbeiter dieser Organization"""
        if obj.subscription:
            return obj.subscription.get_current_employee_count(obj)
        return 0
    get_employee_count.short_description = 'Mitarbeiter'
    
    def get_department_count(self, obj):
        """Anzahl Abteilungen dieser Organization"""
        if obj.subscription:
            return obj.subscription.get_current_department_count(obj)
        return 0
    get_department_count.short_description = 'Abteilungen'
    
    def get_subscription_details(self, obj):
        """Zeigt Details der Subscription für diese Organization"""
        if not obj.subscription:
            return "Keine Subscription zugewiesen"
        
        sub = obj.subscription
        emp_count = sub.get_current_employee_count(obj)
        dept_count = sub.get_current_department_count(obj)
        cost = sub.calculate_monthly_cost(obj)
        
        details = [
            f"Tier: {sub.get_tier_display()}",
            f"Early-Access: {'Ja' if obj.is_early_access else 'Nein'}",
            f"",
            f"Mitarbeiter: {emp_count} / {sub.max_employees if sub.max_employees != -1 else '∞'}",
            f"Abteilungen: {dept_count} / {sub.max_departments if sub.max_departments != -1 else '∞'}",
            f"",
            f"Kosten: {cost}€/Monat",
        ]
        
        price_per_emp = sub.get_price_per_employee(obj)
        details.append(f"  ({sub.base_price}€ Grundpreis + {emp_count} × {price_per_emp}€)")
        
        price_cap = sub.get_price_cap(obj)
        if price_cap:
            details.append(f"  (Max: {price_cap}€/Monat)")
        
        return "\n".join(details)
    get_subscription_details.short_description = 'Subscription Details'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'organization', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'organization', 'is_staff', 'is_active', 'is_superuser']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email')}),
        ('Organization & Role', {'fields': ('organization', 'role')}),
        ('Tutorial', {'fields': ('tutorial_completed',)}),
        ('Preferences', {'fields': ('theme_preference',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'organization', 'role', 'is_staff', 'is_active')}
        ),
    )

