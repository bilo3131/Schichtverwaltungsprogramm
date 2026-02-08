from django.contrib import admin
from .models import (
    Department, Qualification, Employee, Availability, VacationRequest,
    ShiftType, Shift, ShiftSwapRequest, AbsenceRecord, ShiftTemplate, ShiftTemplateEntry,
    Notification, Holiday, Event
)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'created_at']
    list_filter = ['organization']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(Qualification)
class QualificationAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'department']
    list_filter = ['organization', 'department']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_organization', 'department', 'employment_type', 'is_active', 'hire_date']
    list_filter = ['user__organization', 'department', 'employment_type', 'is_active']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name']
    filter_horizontal = ['qualifications']
    ordering = ['user__username']
    
    def get_organization(self, obj):
        """Zeigt die Organisation des Mitarbeiters (über User)"""
        return obj.user.organization if obj.user.organization else '-'
    get_organization.short_description = 'Organization'
    get_organization.admin_order_field = 'user__organization'

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ['employee', 'weekday', 'specific_date', 'start_time', 'end_time', 'availability_type']
    list_filter = ['availability_type', 'weekday']
    search_fields = ['employee__user__username']
    ordering = ['weekday', 'start_time']

@admin.register(VacationRequest)
class VacationRequestAdmin(admin.ModelAdmin):
    list_display = ['employee', 'start_date', 'end_date', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['employee__user__username', 'notes']
    ordering = ['-created_at']

@admin.register(ShiftType)
class ShiftTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'start_time', 'end_time', 'color', 'min_employees']
    list_filter = ['organization', 'department']
    search_fields = ['name']
    filter_horizontal = ['required_qualifications']
    ordering = ['name']

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['employee', 'shift_type', 'date', 'start_time', 'end_time', 'status']
    list_filter = ['status', 'date', 'shift_type']
    search_fields = ['employee__user__username', 'notes']
    ordering = ['-date']

@admin.register(ShiftSwapRequest)
class ShiftSwapRequestAdmin(admin.ModelAdmin):
    list_display = ['requesting_employee', 'target_employee', 'shift', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['requesting_employee__user__username', 'target_employee__user__username']
    ordering = ['-created_at']

@admin.register(AbsenceRecord)
class AbsenceRecordAdmin(admin.ModelAdmin):
    list_display = ['employee', 'absence_type', 'start_date', 'end_date', 'created_at']
    list_filter = ['absence_type']
    search_fields = ['employee__user__username', 'notes']
    ordering = ['-start_date']

@admin.register(ShiftTemplate)
class ShiftTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'is_active', 'created_at']
    list_filter = ['is_active', 'organization']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(ShiftTemplateEntry)
class ShiftTemplateEntryAdmin(admin.ModelAdmin):
    list_display = ['template', 'weekday', 'shift_type', 'employee']
    list_filter = ['weekday', 'shift_type']
    search_fields = ['template__name']
    ordering = ['template', 'weekday']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'is_emailed', 'created_at']
    list_filter = ['notification_type', 'is_read', 'is_emailed', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'organization', 'is_recurring', 'created_at']
    list_filter = ['is_recurring', 'organization', 'date']
    search_fields = ['name', 'description']
    ordering = ['date']
    readonly_fields = ['created_at']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'event_type', 'start_datetime', 'end_datetime', 'location', 'created_by', 'created_at']
    list_filter = ['event_type', 'is_all_day', 'organization', 'start_datetime']
    search_fields = ['title', 'description', 'location']
    filter_horizontal = ['attendees']
    ordering = ['-start_datetime']
    readonly_fields = ['created_at', 'updated_at']

