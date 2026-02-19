from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Organization, User
from .serializers import (
    OrganizationSerializer, UserSerializer, UserRegistrationSerializer,
    ChangePasswordSerializer, LoginSerializer
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet für Organisationen - NUR für Django-Admins (is_staff=True)"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAdminUser]  # Nur Django Admin Panel Admin (is_staff=True)
    
    def get_queryset(self):
        # Nur für Django-Admins zugänglich
        return Organization.objects.all()


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet für Benutzer"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Nur Benutzer der eigenen Organisation anzeigen
        if user.organization:
            return User.objects.filter(organization=user.organization)
        return User.objects.filter(id=user.id)
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Gibt den aktuell eingeloggten Benutzer zurück oder aktualisiert ihn"""
        if request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Passwort ändern"""
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            
            # Prüfe altes Passwort
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': ['Falsches Passwort.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Setze neues Passwort
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {'message': 'Passwort erfolgreich geändert.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def complete_tutorial(self, request):
        """Markiert das Tutorial als abgeschlossen"""
        user = request.user
        user.tutorial_completed = True
        user.save()
        
        return Response(
            {'message': 'Tutorial als abgeschlossen markiert.'},
            status=status.HTTP_200_OK
        )


class RegisterView(generics.CreateAPIView):
    """View für Benutzerregistrierung"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Erstelle Token für automatisches Login
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Registrierung erfolgreich.'
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(generics.GenericAPIView):
    """View für Login"""
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # WICHTIG: Kein login() call - nur Token für API!
            # login(request, user)  # <- ENTFERNT
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key,
                'message': 'Login erfolgreich.'
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': 'Ungültige Anmeldedaten.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


class LogoutView(generics.GenericAPIView):
    """View für Logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Lösche nur Token - keine Session
            request.user.auth_token.delete()
            return Response(
                {'message': 'Logout erfolgreich.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'message': 'Logout erfolgreich.'},
                status=status.HTTP_200_OK
            )


DEMO_MASTER_USERNAME = "demo_master"


@method_decorator(csrf_exempt, name='dispatch')
class DemoLoginView(APIView):
    """
    Erstellt einen temporären Demo-Zugang für die angegebene E-Mail-Adresse.

    POST /api/v1/accounts/demo-login/
    Body: { "email": "user@example.com" }
    Returns: { "token": "...", "user": {...}, "message": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()

        # E-Mail validieren
        if not email:
            return Response(
                {"error": "E-Mail-Adresse ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_email(email)
        except DjangoValidationError:
            return Response(
                {"error": "Ungültige E-Mail-Adresse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Demo-Organisation suchen
        try:
            demo_org = Organization.objects.get(is_demo=True, is_active=True)
        except Organization.DoesNotExist:
            return Response(
                {"error": "Demo nicht verfügbar. Bitte kontaktiere den Support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Demo-User für diese E-Mail finden oder erstellen
        # Username aus E-Mail ableiten (sanitized)
        base_username = f"demo_{email.split('@')[0].lower()[:30]}"
        # Sonderzeichen entfernen
        import re
        safe_username = re.sub(r'[^a-z0-9_]', '_', base_username)

        user, created = User.objects.get_or_create(
            email=email,
            organization=demo_org,
            defaults={
                "username": self._unique_username(safe_username),
                "first_name": email.split("@")[0].capitalize(),
                "last_name": "(Demo)",
                "role": "admin",
                "tutorial_completed": True,
            }
        )

        if not created:
            # Stelle sicher, dass der User noch zur Demo-Org gehört
            user.organization = demo_org
            user.role = "admin"
            user.save(update_fields=["organization", "role"])

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
                "message": "Demo-Login erfolgreich. Daten werden täglich um 2 Uhr zurückgesetzt.",
                "is_demo": True,
            },
            status=status.HTTP_200_OK,
        )

    def _unique_username(self, base_username):
        """Generates a unique username, appending a number if necessary."""
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
        return username

