from rest_framework import serializers
from .models import (
    Department, Qualification, Employee, Availability, VacationRequest,
    ShiftType, Shift, ShiftSwapRequest, AbsenceRecord,
    ShiftTemplate, ShiftTemplateEntry, Notification, Holiday, Event
)
from accounts.serializers import UserSerializer
from .constants import VacationRequestStatus


# Constants
class EmployeeConstants:
    """Constants for employee management"""
    DEFAULT_ROLE = 'employee'
    DEFAULT_PASSWORD = 'Abc123'
    USERNAME_REPLACEMENTS = {
        'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
        'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
        ' ': '.'
    }


def sanitize_username(text):
    """Convert German umlauts and special characters for username"""
    for old, new in EmployeeConstants.USERNAME_REPLACEMENTS.items():
        text = text.replace(old, new)
    return text


def generate_unique_username(first_name, last_name, email):
    """Generate a unique username from name or email"""
    from accounts.models import User
    
    if first_name and last_name:
        username_base = f"{first_name.lower()}.{last_name.lower()}"
    else:
        username_base = email.split('@')[0]
    
    username_base = sanitize_username(username_base)
    username = username_base
    
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{username_base}{counter}"
        counter += 1
    
    return username


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer für Abteilungen"""
    employee_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'organization', 'name', 'description', 'employee_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at']
    
    def get_employee_count(self, obj):
        return obj.employees.count()


class QualificationSerializer(serializers.ModelSerializer):
    """Serializer für Qualifikationen"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Qualification
        fields = ['id', 'organization', 'name', 'description', 'department', 'department_name', 'created_at']
        read_only_fields = ['id', 'organization', 'created_at']


class EmployeeSerializer(serializers.ModelSerializer):
    """Serializer for employee management with automatic user creation"""
    user_details = UserSerializer(source='user', read_only=True)
    department_details = DepartmentSerializer(source='department', read_only=True)
    qualification_details = QualificationSerializer(
        source='qualifications', 
        many=True, 
        read_only=True
    )
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    # Write-only fields for user creation
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    role = serializers.CharField(source='user.role', required=False)
    
    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'user_details', 'full_name', 'role', 'department', 'department_details', 'employment_type',
            'qualifications', 'qualification_details', 'min_hours_per_week',
            'max_hours_per_week', 'hire_date', 'is_active', 'overtime_hours',
            'notes', 'created_at', 'updated_at',
            'first_name', 'last_name', 'email'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'user': {'required': False},
            'department': {'required': True}
        }
    
    def validate(self, attrs):
        """Validate that required fields for new user creation are present"""
        if not self.instance and not attrs.get('user'):
            required_fields = ['first_name', 'last_name', 'email']
            missing_fields = [f for f in required_fields if not attrs.get(f)]
            
            if missing_fields:
                raise serializers.ValidationError(
                    f"Wenn kein User angegeben ist, sind folgende Felder erforderlich: {', '.join(missing_fields)}"
                )
        return attrs
    
    def _create_user_for_employee(self, first_name, last_name, email, role):
        """Create a new user account for the employee"""
        from accounts.models import User
        from django.contrib.auth.hashers import make_password
        
        username = generate_unique_username(first_name, last_name, email)
        
        return User.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=make_password(EmployeeConstants.DEFAULT_PASSWORD),
            organization=self.context['request'].user.organization,
            role=role
        )
    
    def create(self, validated_data):
        """Create employee with automatic user creation if needed"""
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        email = validated_data.pop('email', '')
        
        user_data = validated_data.pop('user', {})
        role = user_data.get('role', EmployeeConstants.DEFAULT_ROLE)
        
        if email:
            user = self._create_user_for_employee(first_name, last_name, email, role)
            validated_data['user'] = user
        
        return super().create(validated_data)
    
    def _update_user_fields(self, user, first_name, last_name, email, role):
        """Update user fields and return True if any changes were made"""
        has_changes = False
        
        if first_name is not None:
            user.first_name = first_name
            has_changes = True
        if last_name is not None:
            user.last_name = last_name
            has_changes = True
        if email is not None:
            user.email = email
            has_changes = True
        if role is not None:
            user.role = role
            has_changes = True
        
        return has_changes
    
    def update(self, instance, validated_data):
        """Update employee and associated user data"""
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        email = validated_data.pop('email', None)
        
        user_data = validated_data.pop('user', {})
        role = user_data.get('role', None)
        
        if self._update_user_fields(instance.user, first_name, last_name, email, role):
            instance.user.save()
        
        return super().update(instance, validated_data)


class AvailabilitySerializer(serializers.ModelSerializer):
    """Serializer für Verfügbarkeiten"""
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    
    class Meta:
        model = Availability
        fields = [
            'id', 'employee', 'employee_name', 'weekday', 'weekday_display',
            'specific_date', 'start_time', 'end_time', 'availability_type', 'notes'
        ]
        read_only_fields = ['id']
    
    def validate(self, attrs):
        # Entweder weekday oder specific_date muss gesetzt sein
        if not attrs.get('weekday') and not attrs.get('specific_date'):
            raise serializers.ValidationError(
                "Entweder 'weekday' oder 'specific_date' muss angegeben werden."
            )
        
        # Start-Zeit muss vor End-Zeit liegen
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError(
                "Die Startzeit muss vor der Endzeit liegen."
            )
        
        return attrs


class VacationRequestSerializer(serializers.ModelSerializer):
    """Serializer für Urlaubsanträge"""
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_department = serializers.IntegerField(source='employee.department.id', read_only=True)
    employee_role = serializers.CharField(source='employee.user.role', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,  # Nicht erforderlich, wird in perform_create gesetzt
        allow_null=True
    )
    
    class Meta:
        model = VacationRequest
        fields = [
            'id', 'employee', 'employee_name', 'employee_department', 'employee_role', 'start_date', 'end_date',
            'status', 'status_display', 'notes', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_by']
    
    def validate(self, attrs):
        if attrs.get('start_date') and attrs.get('end_date'):
            if attrs['start_date'] > attrs['end_date']:
                raise serializers.ValidationError(
                    "Das Startdatum muss vor dem Enddatum liegen."
                )
        return attrs


class ShiftTypeSerializer(serializers.ModelSerializer):
    """Serializer für Schichttypen"""
    qualification_details = QualificationSerializer(
        source='required_qualifications',
        many=True,
        read_only=True
    )
    department_details = DepartmentSerializer(source='department', read_only=True)
    
    class Meta:
        model = ShiftType
        fields = [
            'id', 'organization', 'department', 'department_details', 'name', 'start_time', 'end_time', 'color',
            'required_qualifications', 'qualification_details', 'min_employees',
            'night_hours', 'break_duration', 'works_on_saturday', 'works_on_sunday', 'created_at'
        ]
        read_only_fields = ['id', 'organization', 'night_hours', 'created_at']


class ShiftSerializer(serializers.ModelSerializer):
    """Serializer für Schichten"""
    shift_type_details = ShiftTypeSerializer(source='shift_type', read_only=True)
    employee_details = EmployeeSerializer(source='employee', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = Shift
        fields = [
            'id', 'organization', 'shift_type', 'shift_type_details',
            'employee', 'employee_details', 'date', 'start_time', 'end_time',
            'status', 'status_display', 'notes', 'duration_hours',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at', 'created_by']
    
    def get_duration_hours(self, obj):
        return obj.get_duration_hours()
    
    def create(self, validated_data):
        # Setze organization automatisch vom Request-User
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['organization'] = request.user.organization
            validated_data['created_by'] = request.user
        return super().create(validated_data)
    
    def validate(self, attrs):
        # Prüfe ob Mitarbeiter die erforderlichen Qualifikationen hat (nur Warnung)
        if attrs.get('employee') and attrs.get('shift_type'):
            required_quals = set(attrs['shift_type'].required_qualifications.all())
            employee_quals = set(attrs['employee'].qualifications.all())
            
            if required_quals and not required_quals.issubset(employee_quals):
                missing_quals = required_quals - employee_quals
                # Nur eine Warnung loggen, aber nicht verhindern
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"Mitarbeiter {attrs['employee'].id} fehlen Qualifikationen: "
                    f"{', '.join([q.name for q in missing_quals])}"
                )
        
        # Prüfe ob Mitarbeiter genehmigten Urlaub hat
        if attrs.get('employee') and attrs.get('date'):
            from .models import VacationRequest
            shift_date = attrs['date']
            
            # Prüfe auf genehmigte Urlaubsanträge für dieses Datum
            approved_vacation = VacationRequest.objects.filter(
                employee=attrs['employee'],
                status=VacationRequestStatus.APPROVED,
                start_date__lte=shift_date,
                end_date__gte=shift_date
            ).exists()
            
            if approved_vacation:
                raise serializers.ValidationError(
                    f"Der Mitarbeiter {attrs['employee'].user.get_full_name()} ist für diesen Zeitraum als abwesend gemeldet (Urlaub)."
                )
        
        # Prüfe ob Mitarbeiter eine Abwesenheit hat (außer Urlaubswunsch)
        if attrs.get('employee') and attrs.get('date'):
            from .models import AbsenceRecord
            shift_date = attrs['date']
            
            # Prüfe auf Abwesenheiten für dieses Datum (Urlaubswunsch ausschließen)
            absence = AbsenceRecord.objects.filter(
                employee=attrs['employee'],
                start_date__lte=shift_date,
                end_date__gte=shift_date
            ).exclude(absence_type='vacation_wish').first()  # Urlaubswunsch nicht blockieren
            
            if absence:
                # Hole die Anzeigenamen für Abwesenheitstypen
                absence_type_labels = {
                    'sick': '🤒 Krank',
                    'vacation': '🏖️ Urlaub',
                    'kug': '🏢 KUG',
                    'other': '📅 Sonstiges'
                }
                absence_label = absence_type_labels.get(absence.absence_type, absence.get_absence_type_display())
                
                raise serializers.ValidationError(
                    f"Der Mitarbeiter {attrs['employee'].user.get_full_name()} ist für diesen Zeitraum als abwesend gemeldet ({absence_label})."
                )
        
        return attrs


class ShiftSwapRequestSerializer(serializers.ModelSerializer):
    """Serializer für Tauschwünsche"""
    shift_details = ShiftSerializer(source='shift', read_only=True)
    requesting_employee_name = serializers.CharField(
        source='requesting_employee.user.get_full_name', 
        read_only=True
    )
    target_employee_name = serializers.CharField(
        source='target_employee.user.get_full_name',
        read_only=True
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ShiftSwapRequest
        fields = [
            'id', 'shift', 'shift_details', 'requesting_employee',
            'requesting_employee_name', 'target_employee', 'target_employee_name',
            'status', 'status_display', 'message', 'approved_by', 'approved_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_by']


class AbsenceRecordSerializer(serializers.ModelSerializer):
    """Serializer für Abwesenheiten"""
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_department = serializers.IntegerField(source='employee.department.id', read_only=True)
    absence_type_display = serializers.CharField(source='get_absence_type_display', read_only=True)
    
    class Meta:
        model = AbsenceRecord
        fields = [
            'id', 'employee', 'employee_name', 'employee_department', 'absence_type', 'absence_type_display',
            'start_date', 'end_date', 'notes', 'document',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        if attrs['start_date'] > attrs['end_date']:
            raise serializers.ValidationError(
                "Das Startdatum muss vor dem Enddatum liegen."
            )
        return attrs


class ShiftTemplateEntrySerializer(serializers.ModelSerializer):
    """Serializer für Vorlagen-Einträge"""
    shift_type_details = ShiftTypeSerializer(source='shift_type', read_only=True)
    employee_details = EmployeeSerializer(source='employee', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    
    class Meta:
        model = ShiftTemplateEntry
        fields = [
            'id', 'template', 'weekday', 'weekday_display',
            'shift_type', 'shift_type_details', 'employee', 'employee_details'
        ]
        read_only_fields = ['id']


class ShiftTemplateSerializer(serializers.ModelSerializer):
    """Serializer für Schichtvorlagen"""
    entries = ShiftTemplateEntrySerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ShiftTemplate
        fields = [
            'id', 'organization', 'name', 'description', 'is_active',
            'entries', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer für Benachrichtigungen"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'notification_type', 'title', 'message',
            'is_read', 'is_emailed', 'related_shift', 'related_vacation',
            'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'is_emailed']


class HolidaySerializer(serializers.ModelSerializer):
    """Serializer für Feiertage"""
    
    class Meta:
        model = Holiday
        fields = [
            'id', 'organization', 'name', 'date', 'is_recurring',
            'description', 'created_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at']


class EventSerializer(serializers.ModelSerializer):
    """Serializer für Kalender-Events"""
    attendees_details = EmployeeSerializer(source='attendees', many=True, read_only=True)
    created_by_details = EmployeeSerializer(source='created_by.employee_profile', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'organization', 'title', 'description', 'event_type',
            'start_datetime', 'end_datetime', 'location', 'is_all_day',
            'editable_by_attendees', 'attendees', 'attendees_details', 
            'created_by', 'created_by_details', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_by', 'created_at', 'updated_at']
