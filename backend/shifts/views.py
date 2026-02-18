from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from collections import defaultdict
from .models import (
    Department, Qualification, Employee, Availability, VacationRequest,
    ShiftType, Shift, ShiftSwapRequest, AbsenceRecord,
    ShiftTemplate, ShiftTemplateEntry, Notification, Holiday, Event
)
from .serializers import (
    DepartmentSerializer, QualificationSerializer, EmployeeSerializer, AvailabilitySerializer,
    VacationRequestSerializer, ShiftTypeSerializer, ShiftSerializer,
    ShiftSwapRequestSerializer, AbsenceRecordSerializer,
    ShiftTemplateSerializer, ShiftTemplateEntrySerializer, NotificationSerializer, HolidaySerializer, EventSerializer
)
from .utils import PermissionHelpers
from .email_service import send_bulk_shift_notifications
from .constants import (
    UserRoles, VacationRequestStatus, ShiftStatus, ShiftSwapRequestStatus,
    WorkingTimeRules, SystemDefaults, ValidationMessages
)


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet für Abteilungen"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            return Department.objects.filter(organization=user.organization)
        return Department.objects.none()
    
    def perform_create(self, serializer):
        user = self.request.user
        organization = PermissionHelpers.require_organization(user)
        
        # Subscription Limit prüfen
        if organization.subscription:
            PermissionHelpers.check_subscription_limit(
                organization.subscription,
                organization,
                organization.subscription.can_add_department,
                'Abteilungen'
            )
        
        serializer.save(organization=organization)


class QualificationViewSet(viewsets.ModelViewSet):
    """ViewSet für Qualifikationen"""
    queryset = Qualification.objects.all()
    serializer_class = QualificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            return Qualification.objects.filter(organization=user.organization)
        return Qualification.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for employee management with role-based permissions"""
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['user__last_name', 'hire_date', 'employment_type']
    
    def _apply_query_filters(self, queryset):
        """Apply query parameter filters to queryset"""
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        employment_type = self.request.query_params.get('employment_type')
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def get_queryset(self):
        """Get filtered employee queryset for current user's organization"""
        user = self.request.user
        if not user.organization:
            return Employee.objects.none()
        
        queryset = Employee.objects.filter(user__organization=user.organization)
        return self._apply_query_filters(queryset)
    
    def _check_field_permission(self, field_name, error_message):
        """Check if user has permission to modify specific field"""
        if field_name in self.request.data and not PermissionHelpers.is_admin_or_hr(self.request.user):
            return Response(
                {'error': error_message},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def _validate_update_permissions(self):
        """Validate permissions for update operations"""
        # Check is_active permission
        response = self._check_field_permission(
            'is_active',
            'Nur Administratoren und Personalwesen dürfen den Mitarbeiterstatus ändern'
        )
        if response:
            return response
        
        # Check role permission
        response = self._check_field_permission(
            'role',
            'Nur Administratoren und Personalwesen dürfen Rollen zuweisen'
        )
        return response
    
    def update(self, request, *args, **kwargs):
        """Update employee with permission checks"""
        permission_error = self._validate_update_permissions()
        if permission_error:
            return permission_error
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update employee with permission checks"""
        permission_error = self._validate_update_permissions()
        if permission_error:
            return permission_error
        return super().partial_update(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Create employee with subscription limit validation"""
        user = self.request.user
        organization = PermissionHelpers.require_organization(user)
        
        if organization.subscription:
            PermissionHelpers.check_subscription_limit(
                organization.subscription,
                organization,
                organization.subscription.can_add_employee,
                'Mitarbeiter'
            )
        
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def hours_summary(self, request, pk=None):
        """Get work hours summary for an employee within a date range"""
        employee = self.get_object()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date und end_date sind erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shifts = Shift.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date,
            status=ShiftStatus.PUBLISHED
        )
        
        total_hours = sum(shift.get_duration_hours() for shift in shifts)
        
        return Response({
            'employee': EmployeeSerializer(employee).data,
            'period': {'start': start_date, 'end': end_date},
            'total_hours': round(total_hours, 2),
            'total_shifts': shifts.count()
        })
    
    def _generate_random_password(self, length=None):
        """Generate a random password"""
        import random
        import string
        if length is None:
            length = SystemDefaults.DEFAULT_PASSWORD_LENGTH
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset password for an employee (admin/HR only)"""
        if not PermissionHelpers.is_admin_or_hr(request.user):
            return Response(
                {'error': ValidationMessages.ADMIN_HR_ONLY},
                status=status.HTTP_403_FORBIDDEN
            )
        
        employee = self.get_object()
        user = employee.user
        
        new_password = self._generate_random_password()
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Passwort erfolgreich zurückgesetzt',
            'username': user.username,
            'new_password': new_password,
            'employee_name': user.get_full_name()
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete an employee and their associated user account (admin/HR only)"""
        if not PermissionHelpers.is_admin_or_hr(request.user):
            return Response(
                {'error': ValidationMessages.ADMIN_HR_ONLY},
                status=status.HTTP_403_FORBIDDEN
            )
        
        employee = self.get_object()
        user = employee.user
        employee_name = user.get_full_name()
        
        # Delete employee and user account
        employee.delete()
        user.delete()
        
        return Response(
            {'message': f'Mitarbeiter {employee_name} und zugehöriger User-Account wurden erfolgreich gelöscht'},
            status=status.HTTP_204_NO_CONTENT
        )


class AvailabilityViewSet(viewsets.ModelViewSet):
    """ViewSet für Verfügbarkeiten"""
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = Availability.objects.filter(
                employee__user__organization=user.organization
            )
            
            # Filter nach Mitarbeiter
            employee_id = self.request.query_params.get('employee')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            
            return queryset
        return Availability.objects.none()


class VacationRequestViewSet(viewsets.ModelViewSet):
    """ViewSet für Urlaubsanträge"""
    queryset = VacationRequest.objects.all()
    serializer_class = VacationRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = VacationRequest.objects.filter(
                employee__user__organization=user.organization
            )
            
            # Mitarbeiter sehen nur ihre eigenen Anträge
            if user.role == 'employee':
                queryset = queryset.filter(employee__user=user)
            # Team Leader und Group Leader sehen:
            # 1. Ihre eigenen Anträge
            # 2. Anträge von Mitarbeitern (nicht von Führungskräften) ihrer Abteilung
            elif user.role in ['team_leader', 'group_leader']:
                try:
                    manager_department = user.employee_profile.department
                    if manager_department:
                        # Eigene Anträge ODER Anträge von employees der Abteilung
                        queryset = queryset.filter(
                            Q(employee__user=user) | 
                            Q(employee__department=manager_department, employee__user__role='employee')
                        )
                    else:
                        # Keine Abteilung -> nur eigene Anträge
                        queryset = queryset.filter(employee__user=user)
                except Employee.DoesNotExist:
                    # Kein Employee-Profil -> nur eigene Anträge (falls vorhanden)
                    queryset = queryset.filter(employee__user=user)
            # Department Manager sehen eigene Anträge + alle Anträge ihrer Abteilung
            elif user.role == 'department_manager':
                try:
                    manager_department = user.employee_profile.department
                    if manager_department:
                        queryset = queryset.filter(
                            Q(employee__user=user) | 
                            Q(employee__department=manager_department)
                        )
                    else:
                        queryset = queryset.filter(employee__user=user)
                except Employee.DoesNotExist:
                    queryset = queryset.filter(employee__user=user)
            # Admin und HR sehen alle
            
            # Filter nach Abteilung (für Admin)
            department_id = self.request.query_params.get('department')
            if department_id and user.role == 'admin':
                queryset = queryset.filter(employee__department_id=department_id)
            
            # Filter nach Status
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            return queryset
        return VacationRequest.objects.none()
    
    def perform_create(self, serializer):
        """Admin/Manager können employee angeben, normale User bekommen automatisch ihr eigenes Profil"""
        user = self.request.user
        
        # Wenn employee nicht im Request ist oder User kein Admin/Manager ist
        if 'employee' not in serializer.validated_data or user.role == 'employee':
            try:
                employee = user.employee_profile
                serializer.save(employee=employee)
            except Employee.DoesNotExist:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"error": "Der Benutzer hat kein Mitarbeiter-Profil."})
        else:
            # Admin/Manager können employee frei wählen
            serializer.save()
    
    def perform_update(self, serializer):
        """
        Berechtigungsprüfung für Updates:
        - Vorgesetzte (admin, hr, department_manager) können alle Anträge bearbeiten
        - Mitarbeiter können nur ihre eigenen ausstehenden (pending) Anträge bearbeiten
        - Wenn ein genehmigter Urlaub geändert wird, wird auch das zugehörige AbsenceRecord aktualisiert
        """
        user = self.request.user
        vacation_request = self.get_object()
        old_start_date = vacation_request.start_date
        old_end_date = vacation_request.end_date
        was_approved = vacation_request.status == VacationRequestStatus.APPROVED
        
        # Vorgesetzte können alle Anträge bearbeiten
        is_supervisor = UserRoles.is_supervisor_or_above(user.role)
        
        if not is_supervisor:
            # Mitarbeiter können nur eigene pending-Anträge bearbeiten
            if user.role == UserRoles.EMPLOYEE:
                # Prüfe ob es der eigene Antrag ist
                if vacation_request.employee.user != user:
                    raise PermissionDenied("Sie können nur Ihre eigenen Urlaubsanträge bearbeiten.")
                
                # Prüfe ob der Antrag noch pending ist
                if vacation_request.status != VacationRequestStatus.PENDING:
                    raise PermissionDenied(ValidationMessages.MUST_BE_PENDING)
                
                # Mitarbeiter dürfen employee field nicht ändern
                if 'employee' in serializer.validated_data:
                    serializer.validated_data.pop('employee')
        
        # Speichere die Änderungen
        updated_vacation = serializer.save()
        
        # Wenn der Urlaub genehmigt war, aktualisiere auch das AbsenceRecord
        if was_approved:
            # Lösche altes AbsenceRecord
            AbsenceRecord.objects.filter(
                employee=vacation_request.employee,
                start_date=old_start_date,
                end_date=old_end_date,
                absence_type='vacation'
            ).delete()
            
            # Erstelle neues AbsenceRecord mit aktualisierten Daten, wenn noch genehmigt
            if updated_vacation.status == VacationRequestStatus.APPROVED:
                # Erstelle Notiz mit dem Namen der genehmigenden Person
                approver_name = updated_vacation.approved_by.get_full_name() if updated_vacation.approved_by and updated_vacation.approved_by.get_full_name() else (updated_vacation.approved_by.username if updated_vacation.approved_by else 'Unbekannt')
                AbsenceRecord.objects.create(
                    employee=updated_vacation.employee,
                    start_date=updated_vacation.start_date,
                    end_date=updated_vacation.end_date,
                    absence_type='vacation',
                    notes=f'Genehmigter Urlaubsantrag - Genehmigt von {approver_name}'
                )
    
    def perform_destroy(self, instance):
        """
        Berechtigungsprüfung für Löschung:
        - Vorgesetzte (admin, hr, department_manager) können alle Anträge löschen
        - Mitarbeiter können nur ihre eigenen ausstehenden (pending) Anträge löschen
        - Beim Löschen eines genehmigten Urlaubs wird auch das zugehörige AbsenceRecord gelöscht
        """
        user = self.request.user
        
        # Vorgesetzte können alle Anträge löschen
        is_supervisor = UserRoles.is_supervisor_or_above(user.role)
        
        if not is_supervisor:
            # Mitarbeiter können nur eigene pending-Anträge löschen
            if user.role == UserRoles.EMPLOYEE:
                # Prüfe ob es der eigene Antrag ist
                if instance.employee.user != user:
                    raise PermissionDenied("Sie können nur Ihre eigenen Urlaubsanträge löschen.")
                
                # Prüfe ob der Antrag noch pending ist
                if instance.status != VacationRequestStatus.PENDING:
                    raise PermissionDenied(ValidationMessages.MUST_BE_PENDING)
        
        # Wenn es ein genehmigter Urlaub ist, lösche auch das zugehörige AbsenceRecord
        if instance.status == VacationRequestStatus.APPROVED:
            AbsenceRecord.objects.filter(
                employee=instance.employee,
                start_date=instance.start_date,
                end_date=instance.end_date,
                absence_type='vacation'
            ).delete()
        
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Urlaubsantrag genehmigen"""
        vacation_request = self.get_object()
        
        if not UserRoles.is_supervisor_or_above(request.user.role):
            return Response(
                {'error': ValidationMessages.PERMISSION_DENIED},
                status=status.HTTP_403_FORBIDDEN
            )
        
        vacation_request.status = VacationRequestStatus.APPROVED
        vacation_request.approved_by = request.user
        vacation_request.save()
        
        # Automatisch AbsenceRecord erstellen für genehmigte Urlaubsanträge
        # Erstelle Notiz mit dem Namen der genehmigenden Person
        approver_name = request.user.get_full_name() if request.user.get_full_name() else request.user.username
        AbsenceRecord.objects.get_or_create(
            employee=vacation_request.employee,
            start_date=vacation_request.start_date,
            end_date=vacation_request.end_date,
            absence_type='vacation',
            defaults={
                'notes': f'Genehmigter Urlaubsantrag - Genehmigt von {approver_name}'
            }
        )
        
        serializer = self.get_serializer(vacation_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Urlaubsantrag ablehnen - löscht auch das zugehörige AbsenceRecord falls vorhanden"""
        vacation_request = self.get_object()
        
        if not UserRoles.is_supervisor_or_above(request.user.role):
            return Response(
                {'error': ValidationMessages.PERMISSION_DENIED},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Wenn der Urlaub vorher genehmigt war, lösche das AbsenceRecord
        if vacation_request.status == VacationRequestStatus.APPROVED:
            AbsenceRecord.objects.filter(
                employee=vacation_request.employee,
                start_date=vacation_request.start_date,
                end_date=vacation_request.end_date,
                absence_type='vacation'
            ).delete()
        
        vacation_request.status = VacationRequestStatus.REJECTED
        vacation_request.approved_by = request.user
        vacation_request.save()
        
        serializer = self.get_serializer(vacation_request)
        return Response(serializer.data)


class ShiftTypeViewSet(viewsets.ModelViewSet):
    """ViewSet für Schichttypen"""
    queryset = ShiftType.objects.all()
    serializer_class = ShiftTypeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.organization:
            queryset = ShiftType.objects.filter(organization=user.organization)
            
            # Filter nach Abteilung
            department_id = self.request.query_params.get('department')
            if department_id and department_id != 'all':
                queryset = queryset.filter(department_id=department_id)
            
            return queryset
        return ShiftType.objects.none()
    
    def perform_create(self, serializer):
        PermissionHelpers.require_non_employee_role(self.request.user, 'Schichttypen erstellen')
        serializer.save(organization=self.request.user.organization)
    
    def perform_update(self, serializer):
        PermissionHelpers.require_non_employee_role(self.request.user, 'Schichttypen bearbeiten')
        serializer.save()
    
    def perform_destroy(self, instance):
        PermissionHelpers.require_non_employee_role(self.request.user, 'Schichttypen löschen')
        instance.delete()


class ShiftViewSet(viewsets.ModelViewSet):
    """ViewSet für Schichten"""
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'start_time']
    ordering = ['date', 'start_time']
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = Shift.objects.filter(organization=user.organization)
            
            # Filter nach Datum-Bereich
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            # Filter nach Mitarbeiter
            employee_id = self.request.query_params.get('employee')
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            
            # Filter nach Abteilung
            department_id = self.request.query_params.get('department')
            if department_id:
                queryset = queryset.filter(employee__department_id=department_id)
            
            # Filter nach Status
            status_filter = self.request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            # Mitarbeiter sehen nur veröffentlichte Schichten
            if user.role == 'employee':
                queryset = queryset.filter(status='published')
            
            return queryset
        return Shift.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    def destroy(self, request, *args, **kwargs):
        """Schicht löschen und andere Schichten der Woche auf draft setzen wenn veröffentlicht"""
        shift = self.get_object()
        shift_date = shift.date
        was_published = shift.status == 'published'
        
        # Schicht löschen
        response = super().destroy(request, *args, **kwargs)
        
        # Wenn die gelöschte Schicht published war, setze alle anderen Schichten der Woche auf draft
        if was_published:
            # Finde Start und Ende der Woche
            from datetime import timedelta
            week_start = shift_date - timedelta(days=shift_date.weekday())
            week_end = week_start + timedelta(days=6)
            
            # Setze alle Schichten der Woche auf draft
            Shift.objects.filter(
                organization=request.user.organization,
                date__gte=week_start,
                date__lte=week_end
            ).update(status=ShiftStatus.DRAFT)
        
        return response
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Schicht veröffentlichen"""
        shift = self.get_object()
        
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'Keine Berechtigung zum Veröffentlichen'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        shift.status = ShiftStatus.PUBLISHED
        shift.save()
        
        serializer = self.get_serializer(shift)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def publish_week(self, request):
        """Schichtplan für eine Woche veröffentlichen und Mitarbeiter benachrichtigen"""
        if not UserRoles.is_supervisor_or_above(request.user.role):
            return Response(
                {'error': ValidationMessages.PERMISSION_DENIED},
                status=status.HTTP_403_FORBIDDEN
            )
        
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date und end_date sind erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Ungültiges Datumsformat (YYYY-MM-DD erforderlich)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Speichere den aktuellen published Status für Änderungserkennung
        previous_published_shifts = {}
        existing_published = Shift.objects.filter(
            organization=request.user.organization,
            date__gte=start,
            date__lte=end,
            status=ShiftStatus.PUBLISHED,
            employee__isnull=False
        ).select_related('employee', 'shift_type')
        
        for shift in existing_published:
            # Speichere relevante Daten für Vergleich
            key = (shift.employee_id, shift.date)
            previous_published_shifts[key] = {
                'id': shift.id,
                'shift_type_id': shift.shift_type_id,
                'shift_type_name': shift.shift_type.name,
                'start_time': shift.shift_type.start_time,
                'end_time': shift.shift_type.end_time,
            }
        
        # Schichten für den Zeitraum abrufen (neue/geänderte)
        shifts = Shift.objects.filter(
            organization=request.user.organization,
            date__gte=start,
            date__lte=end,
            employee__isnull=False  # Nur Schichten mit zugewiesenen Mitarbeitern
        )
        
        if not shifts.exists():
            return Response(
                {'error': 'Keine Schichten im angegebenen Zeitraum gefunden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Zuerst ALLE Schichten der Woche auf draft setzen (auch ohne Mitarbeiter)
        all_shifts_in_week = Shift.objects.filter(
            organization=request.user.organization,
            date__gte=start,
            date__lte=end
        )
        all_shifts_in_week.update(status=ShiftStatus.DRAFT)
        
        # Dann nur die Schichten mit Mitarbeitern auf "published" setzen
        updated_count = shifts.update(status=ShiftStatus.PUBLISHED)
        
        # Refresh shifts from DB to get updated status
        shifts = Shift.objects.filter(
            organization=request.user.organization,
            date__gte=start,
            date__lte=end,
            employee__isnull=False,
            status=ShiftStatus.PUBLISHED
        ).select_related('employee', 'shift_type')
        
        # Mitarbeiter nach Schichten gruppieren und Änderungen erkennen
        employees_with_shifts = defaultdict(list)
        employees_with_changes = defaultdict(list)
        new_shift_employees = set()
        
        for shift in shifts:
            if shift.employee:
                employees_with_shifts[shift.employee].append(shift)
                
                # Prüfe auf Änderungen
                key = (shift.employee_id, shift.date)
                if key in previous_published_shifts:
                    # Schicht existierte bereits - prüfe auf Änderungen
                    previous = previous_published_shifts[key]
                    if previous['shift_type_id'] != shift.shift_type_id:
                        # Schichttyp hat sich geändert
                        change_msg = f"{shift.date.strftime('%d.%m.')}: {previous['shift_type_name']} → {shift.shift_type.name}"
                        employees_with_changes[shift.employee].append(change_msg)
                else:
                    # Neue Schicht
                    new_shift_employees.add(shift.employee)
        
        # Gelöschte Schichten erkennen
        current_shift_keys = {(s.employee_id, s.date) for s in shifts}
        deleted_shifts = {}
        for key, prev_data in previous_published_shifts.items():
            if key not in current_shift_keys:
                employee_id, shift_date = key
                if employee_id not in deleted_shifts:
                    deleted_shifts[employee_id] = []
                deleted_shifts[employee_id].append(f"{shift_date.strftime('%d.%m.')}: {prev_data['shift_type_name']} entfernt")
        
        # Wochenanzeige erstellen
        week_number = start.isocalendar()[1]
        week_display = f"KW {week_number} ({start.strftime('%d.%m.')} - {end.strftime('%d.%m.%Y')})"
        
        # Benachrichtigungen erstellen
        notifications_created = 0
        
        # 1. Neue Schichten
        for employee in new_shift_employees:
            shift_list = employees_with_shifts[employee]
            shift_details = ", ".join([f"{s.date.strftime('%d.%m.')} ({s.shift_type.name})" for s in shift_list])
            Notification.objects.create(
                user=employee.user,
                notification_type='shift_created',
                title=f'Schichtplan {week_display} veröffentlicht',
                message=f'Ihr Schichtplan für {week_display} wurde veröffentlicht: {shift_details}',
            )
            notifications_created += 1
        
        # 2. Geänderte Schichten
        for employee, changes in employees_with_changes.items():
            if employee not in new_shift_employees:  # Nicht doppelt benachrichtigen
                Notification.objects.create(
                    user=employee.user,
                    notification_type='shift_updated',
                    title=f'Schichtplan {week_display} geändert',
                    message=f'Ihre Schichten für {week_display} wurden geändert: {"; ".join(changes)}',
                )
                notifications_created += 1
        
        # 3. Gelöschte Schichten
        for employee_id, deleted_list in deleted_shifts.items():
            try:
                from .models import Employee
                employee = Employee.objects.get(id=employee_id)
                Notification.objects.create(
                    user=employee.user,
                    notification_type='shift_deleted',
                    title=f'Schichten aus {week_display} entfernt',
                    message=f'Folgende Schichten wurden entfernt: {"; ".join(deleted_list)}',
                )
                notifications_created += 1
            except Employee.DoesNotExist:
                pass
        
        # Email-Benachrichtigungen versenden (nur für neue/alle Mitarbeiter)
        email_result = send_bulk_shift_notifications(employees_with_shifts, week_display)
        
        return Response({
            'message': f'Schichtplan für {week_display} wurde veröffentlicht',
            'shifts_published': updated_count,
            'employees_notified': len(employees_with_shifts),
            'notifications_created': notifications_created,
            'emails_sent': email_result['sent'],
            'emails_failed': email_result['failed'],
            'week_display': week_display
        })
    
    @action(detail=False, methods=['get'])
    def validate_compliance(self, request):
        """Prüft Arbeitszeitgesetz-Compliance für einen Mitarbeiter"""
        employee_id = request.query_params.get('employee')
        date = request.query_params.get('date')
        
        if not employee_id or not date:
            return Response(
                {'error': 'employee und date sind erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(id=employee_id)
            check_date = datetime.strptime(date, '%Y-%m-%d').date()
        except (Employee.DoesNotExist, ValueError):
            return Response(
                {'error': 'Ungültige Mitarbeiter-ID oder Datum'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        violations = []
        
        # Prüfe Ruhezeiten (11h zwischen Schichten)
        previous_shift = Shift.objects.filter(
            employee=employee,
            date__lt=check_date,
            status=ShiftStatus.PUBLISHED
        ).order_by('-date', '-end_time').first()
        
        current_shift = Shift.objects.filter(
            employee=employee,
            date=check_date,
            status=ShiftStatus.PUBLISHED
        ).order_by('start_time').first()
        
        if previous_shift and current_shift:
            prev_end = datetime.combine(previous_shift.date, previous_shift.end_time)
            curr_start = datetime.combine(current_shift.date, current_shift.start_time)
            
            rest_hours = (curr_start - prev_end).total_seconds() / 3600
            
            if rest_hours < WorkingTimeRules.MINIMUM_REST_HOURS:
                violations.append({
                    'type': 'rest_period',
                    'message': ValidationMessages.REST_PERIOD_VIOLATION.format(
                        actual=f'{rest_hours:.1f}',
                        required=WorkingTimeRules.MINIMUM_REST_HOURS
                    ),
                    'severity': 'error'
                })
        
        # Prüfe Wochenarbeitszeit
        week_start = check_date - timedelta(days=check_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        week_shifts = Shift.objects.filter(
            employee=employee,
            date__gte=week_start,
            date__lte=week_end,
            status=ShiftStatus.PUBLISHED
        )
        
        week_hours = sum([shift.get_duration_hours() for shift in week_shifts])
        
        if week_hours > employee.max_hours_per_week:
            violations.append({
                'type': 'weekly_hours',
                'message': f'Wochenstunden überschritten: {week_hours:.1f}h (max. {employee.max_hours_per_week}h)',
                'severity': 'error'
            })
        
        return Response({
            'employee': EmployeeSerializer(employee).data,
            'date': date,
            'violations': violations,
            'is_compliant': len(violations) == 0
        })


class ShiftSwapRequestViewSet(viewsets.ModelViewSet):
    """ViewSet für Tauschwünsche"""
    queryset = ShiftSwapRequest.objects.all()
    serializer_class = ShiftSwapRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = ShiftSwapRequest.objects.filter(
                shift__organization=user.organization
            )
            
            # Mitarbeiter sehen nur ihre eigenen Tauschwünsche
            if user.role == 'employee':
                queryset = queryset.filter(
                    Q(requesting_employee__user=user) |
                    Q(target_employee__user=user)
                )
            
            return queryset
        return ShiftSwapRequest.objects.none()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Tauschwunsch genehmigen"""
        swap_request = self.get_object()
        
        if request.user.role not in ['admin', 'manager']:
            return Response(
                {'error': 'Keine Berechtigung zum Genehmigen'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Tausche die Mitarbeiter
        shift = swap_request.shift
        shift.employee = swap_request.target_employee
        shift.save()
        
        swap_request.status = ShiftSwapRequestStatus.APPROVED
        swap_request.approved_by = request.user
        swap_request.save()
        
        serializer = self.get_serializer(swap_request)
        return Response(serializer.data)


class AbsenceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet für Abwesenheiten"""
    queryset = AbsenceRecord.objects.all()
    serializer_class = AbsenceRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = AbsenceRecord.objects.filter(
                employee__user__organization=user.organization
            )
            
            # Mitarbeiter sehen nur ihre eigenen Abwesenheiten
            if user.role == 'employee':
                queryset = queryset.filter(employee__user=user)
            
            return queryset
        return AbsenceRecord.objects.none()


class ShiftTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet für Schichtvorlagen"""
    queryset = ShiftTemplate.objects.all()
    serializer_class = ShiftTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            return ShiftTemplate.objects.filter(organization=user.organization)
        return ShiftTemplate.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def apply_template(self, request, pk=None):
        """Wendet eine Vorlage auf einen Zeitraum an"""
        template = self.get_object()
        
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date und end_date sind erforderlich'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Ungültiges Datumsformat (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_shifts = []
        current_date = start
        
        while current_date <= end:
            weekday = current_date.weekday()
            
            # Finde passende Vorlagen-Einträge für diesen Wochentag
            entries = template.entries.filter(weekday=weekday)
            
            for entry in entries:
                shift = Shift.objects.create(
                    organization=template.organization,
                    shift_type=entry.shift_type,
                    employee=entry.employee,
                    date=current_date,
                    start_time=entry.shift_type.start_time,
                    end_time=entry.shift_type.end_time,
                    status=ShiftStatus.DRAFT,
                    created_by=request.user
                )
                created_shifts.append(shift)
            
            current_date += timedelta(days=1)
        
        return Response({
            'message': f'{len(created_shifts)} Schichten erstellt',
            'shifts': ShiftSerializer(created_shifts, many=True).data
        }, status=status.HTTP_201_CREATED)


class ShiftTemplateEntryViewSet(viewsets.ModelViewSet):
    """ViewSet für Vorlagen-Einträge"""
    queryset = ShiftTemplateEntry.objects.all()
    serializer_class = ShiftTemplateEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            return ShiftTemplateEntry.objects.filter(
                template__organization=user.organization
            )
        return ShiftTemplateEntry.objects.none()


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet für Benachrichtigungen"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']
    
    def get_queryset(self):
        # Benutzer sieht nur eigene Benachrichtigungen
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Gibt die Anzahl ungelesener Benachrichtigungen zurück"""
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Markiert alle Benachrichtigungen als gelesen"""
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'message': 'Alle Benachrichtigungen wurden als gelesen markiert'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Markiert eine Benachrichtigung als gelesen"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)


class HolidayViewSet(viewsets.ModelViewSet):
    """ViewSet für Feiertage"""
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = Holiday.objects.filter(organization=user.organization)
            
            # Optional: Filtere nach Zeitraum
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            return queryset
        return Holiday.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class EventViewSet(viewsets.ModelViewSet):
    """ViewSet für Kalender-Events"""
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_datetime', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.organization:
            queryset = Event.objects.filter(organization=user.organization)
            
            # Filter nach Zeitraum
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            
            if start_date:
                queryset = queryset.filter(end_datetime__gte=start_date)
            if end_date:
                queryset = queryset.filter(start_datetime__lte=end_date)
            
            # Filter nach Event-Typ
            event_type = self.request.query_params.get('event_type')
            if event_type:
                queryset = queryset.filter(event_type=event_type)
            
            # Normale Mitarbeiter sehen nur Events, bei denen sie Teilnehmer sind
            if user.role == 'employee' and hasattr(user, 'employee_profile'):
                queryset = queryset.filter(
                    Q(attendees=user.employee_profile) | Q(created_by=user)
                ).distinct()
            
            return queryset.select_related('created_by').prefetch_related('attendees__user')
        return Event.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )

