from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Subscription
from .serializers import SubscriptionSerializer, SubscriptionUpdateSerializer
from .permissions import IsAdminOrHR


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHR]
    
    def get_queryset(self):
        user = self.request.user
        # Admins können alle Subscriptions sehen
        if user.role == 'admin':
            return Subscription.objects.all()
        # Andere sehen nur ihre eigene Subscription
        if hasattr(user, 'subscription'):
            return Subscription.objects.filter(id=user.subscription.id)
        return Subscription.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_subscription(self, request):
        """Gibt die Subscription des aktuellen Benutzers zurück"""
        user = request.user
        subscription = None
        
        # Zuerst prüfen ob User selbst eine Subscription hat (ist Owner/Admin)
        if hasattr(user, 'subscription'):
            subscription = user.subscription
        # Ansonsten über Organization die Subscription finden
        elif user.organization:
            # Finde den Owner/Admin der Organization
            owner = user.organization.users.filter(
                subscription__isnull=False
            ).first()
            if owner and hasattr(owner, 'subscription'):
                subscription = owner.subscription
        
        if subscription:
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'Keine Subscription gefunden.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['get'])
    def check_limits(self, request):
        """Prüft die aktuellen Limits und gibt detaillierte Informationen zurück"""
        user = request.user
        subscription = None
        
        # Zuerst prüfen ob User selbst eine Subscription hat (ist Owner/Admin)
        if hasattr(user, 'subscription'):
            subscription = user.subscription
        # Ansonsten über Organization die Subscription finden
        elif user.organization:
            # Finde den Owner/Admin der Organization
            owner = user.organization.users.filter(
                subscription__isnull=False
            ).first()
            if owner and hasattr(owner, 'subscription'):
                subscription = owner.subscription
        
        if subscription:
            return Response(subscription.get_limits_info())
        
        return Response(
            {'detail': 'Keine Subscription gefunden.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'])
    def upgrade(self, request, pk=None):
        """Upgrade/Downgrade auf ein anderes Tier"""
        subscription = self.get_object()
        new_tier = request.data.get('tier')
        
        if not new_tier:
            return Response(
                {'detail': 'Tier muss angegeben werden.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validiere das Tier
        valid_tiers = ['starter', 'pro', 'business']
        if new_tier not in valid_tiers:
            return Response(
                {'detail': f'Ungültiges Tier. Mögliche Werte: {", ".join(valid_tiers)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prüfe, ob es ein Downgrade ist und ob es möglich ist
        tier_order = {'starter': 1, 'pro': 2, 'business': 3}
        is_downgrade = tier_order.get(subscription.tier, 0) > tier_order.get(new_tier, 0)
        
        if is_downgrade:
            # Prüfe, ob die aktuellen Werte die neuen Limits überschreiten
            new_limits = {
                'starter': {'max_departments': 1, 'max_employees': 20},
                'pro': {'max_departments': 10, 'max_employees': 150},
                'business': {'max_departments': -1, 'max_employees': -1}
            }
            
            current_depts = subscription.get_current_department_count()
            current_emps = subscription.get_current_employee_count()
            new_max_depts = new_limits[new_tier]['max_departments']
            new_max_emps = new_limits[new_tier]['max_employees']
            
            if new_max_depts != -1 and current_depts > new_max_depts:
                return Response(
                    {'detail': f'Downgrade nicht möglich: Sie haben aktuell {current_depts} Abteilungen, aber das {new_tier.title()}-Tier erlaubt nur {new_max_depts}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if new_max_emps != -1 and current_emps > new_max_emps:
                return Response(
                    {'detail': f'Downgrade nicht möglich: Sie haben aktuell {current_emps} Mitarbeiter, aber das {new_tier.title()}-Tier erlaubt nur {new_max_emps}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        subscription.tier = new_tier
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
