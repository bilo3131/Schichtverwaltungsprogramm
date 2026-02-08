from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'subscription', 'is_active', 'created_at']
    list_filter = ['is_active', 'subscription']
    search_fields = ['name', 'email', 'phone']
    ordering = ['name']
    
    fieldsets = (
        ('Unternehmensdaten', {
            'fields': ('name', 'address', 'phone', 'email')
        }),
        ('Subscription', {
            'fields': ('subscription', 'is_active')
        }),
        ('Zeitstempel', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']


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

