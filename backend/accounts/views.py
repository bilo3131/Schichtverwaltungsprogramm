from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Organization, User
from .serializers import (
    OrganizationSerializer, UserSerializer, UserRegistrationSerializer,
    ChangePasswordSerializer, LoginSerializer
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """ViewSet für Organisationen"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Admin kann alle sehen, andere nur ihre eigene Organisation
        if user.role == 'admin':
            return Organization.objects.all()
        return Organization.objects.filter(id=user.organization_id)


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
            login(request, user)
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
            # Lösche Token
            request.user.auth_token.delete()
        except:
            pass
        
        logout(request)
        return Response(
            {'message': 'Logout erfolgreich.'},
            status=status.HTTP_200_OK
        )

