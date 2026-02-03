from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Organization, User


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer für Organisation"""
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'address', 'phone', 'email', 'subscription_plan', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer für User (Lesen)"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    subscription_plan = serializers.CharField(source='organization.subscription_plan', read_only=True)
    full_name = serializers.SerializerMethodField()
    employee_profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'full_name', 'role', 'phone', 'employee_id', 'employee_profile',
            'organization', 'organization_name', 'subscription_plan', 'is_active', 
            'date_joined', 'last_login', 'theme_preference'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_employee_profile(self, obj):
        """Gibt die Employee Profile ID und Abteilung zurück, falls vorhanden"""
        try:
            if hasattr(obj, 'employee_profile') and obj.employee_profile:
                return {
                    'id': obj.employee_profile.id,
                    'department': obj.employee_profile.department_id
                }
        except Exception:
            pass
        return None


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer für Benutzerregistrierung"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        label="Passwort bestätigen"
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone', 'organization'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Die Passwörter stimmen nicht überein."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer für Passwortänderung"""
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password2 = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({
                "new_password": "Die Passwörter stimmen nicht überein."
            })
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer für Login"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
