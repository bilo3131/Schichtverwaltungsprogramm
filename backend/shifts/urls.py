from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, QualificationViewSet, EmployeeViewSet, AvailabilityViewSet,
    VacationRequestViewSet, ShiftTypeViewSet, ShiftViewSet,
    ShiftSwapRequestViewSet, AbsenceRecordViewSet,
    ShiftTemplateViewSet, ShiftTemplateEntryViewSet,
    NotificationViewSet, HolidayViewSet, EventViewSet
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'qualifications', QualificationViewSet, basename='qualification')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'availabilities', AvailabilityViewSet, basename='availability')
router.register(r'vacation-requests', VacationRequestViewSet, basename='vacation-request')
router.register(r'shift-types', ShiftTypeViewSet, basename='shift-type')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'shift-swap-requests', ShiftSwapRequestViewSet, basename='shift-swap-request')
router.register(r'absences', AbsenceRecordViewSet, basename='absence')
router.register(r'shift-templates', ShiftTemplateViewSet, basename='shift-template')
router.register(r'shift-template-entries', ShiftTemplateEntryViewSet, basename='shift-template-entry')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'holidays', HolidayViewSet, basename='holiday')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
