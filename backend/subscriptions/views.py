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
        # Andere sehen nur die Subscription ihrer Organization
        if user.organization and user.organization.subscription:
            return Subscription.objects.filter(id=user.organization.subscription.id)
        return Subscription.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_subscription(self, request):
        """Gibt die Subscription des aktuellen Benutzers zurück"""
        user = request.user
        subscription = None
        
        # Subscription über Organization abrufen
        if user.organization and user.organization.subscription:
            subscription = user.organization.subscription
        
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
        organization = None
        
        # Subscription über Organization abrufen
        if user.organization and user.organization.subscription:
            subscription = user.organization.subscription
            organization = user.organization
        
        if subscription:
            return Response(subscription.get_limits_info(organization))
        
        return Response(
            {'detail': 'Keine Subscription gefunden.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['get'])
    def tier_options(self, request):
        """Gibt alle verfügbaren Tier-Optionen mit Preisen zurück"""
        from .models import EarlyAccessSettings
        
        # Prüfe ob Early-Access noch aktiv ist
        try:
            early_settings = EarlyAccessSettings.objects.first()
            is_early_access_active = early_settings.is_early_access_active() if early_settings else False
        except:
            is_early_access_active = False
        
        tiers = [
            {
                'tier': 'starter',
                'tier_display': 'Starter',
                'base_price': 29.00,
                'max_departments': 1,
                'max_employees': 20,
                'description': 'Ideal für kleine Teams',
                'features': [
                    '1 Abteilung',
                    'Bis zu 20 Mitarbeiter',
                    'Schichtplanung',
                    'Urlaubsverwaltung'
                ],
                'pricing': {
                    'early_access': {
                        'price_per_employee': 1.50,
                        'price_cap': None,
                        'available': is_early_access_active
                    },
                    'standard': {
                        'price_per_employee': 2.00,
                        'price_cap': None
                    }
                }
            },
            {
                'tier': 'pro',
                'tier_display': 'Pro',
                'base_price': 59.00,
                'max_departments': 10,
                'max_employees': 150,
                'description': 'Für wachsende Unternehmen',
                'features': [
                    'Bis zu 10 Abteilungen',
                    'Bis zu 150 Mitarbeiter',
                    'Erweiterte Schichtplanung',
                    'Urlaubsverwaltung',
                    'Reporting & Analytics'
                ],
                'pricing': {
                    'early_access': {
                        'price_per_employee': 1.00,
                        'price_cap': None,
                        'available': is_early_access_active
                    },
                    'standard': {
                        'price_per_employee': 1.50,
                        'price_cap': None
                    }
                }
            },
            {
                'tier': 'business',
                'tier_display': 'Business',
                'base_price': 99.00,
                'max_departments': -1,  # unlimited
                'max_employees': -1,    # unlimited
                'description': 'Für große Unternehmen',
                'features': [
                    'Unbegrenzte Abteilungen',
                    'Unbegrenzte Mitarbeiter',
                    'Alle Pro Features',
                    'Priority Support',
                    'Custom Integrationen'
                ],
                'pricing': {
                    'early_access': {
                        'price_per_employee': 0.80,
                        'price_cap': 399.00,
                        'available': is_early_access_active
                    },
                    'standard': {
                        'price_per_employee': 1.00,
                        'price_cap': 499.00
                    }
                }
            }
        ]
        
        return Response({
            'tiers': tiers,
            'early_access_active': is_early_access_active
        })
    
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
        
        # Hole die aktuelle Organization
        organization = request.user.organization
        if not organization:
            return Response(
                {'detail': 'Keine Organization gefunden.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Speichere den alten Tier für Downgrade-Prüfung
        old_tier = subscription.tier
        
        # Prüfe, ob diese Subscription von mehreren Organizations verwendet wird
        organizations_using_subscription = subscription.organizations.all()
        subscription_is_shared = organizations_using_subscription.count() > 1
        
        # Prüfe, ob es ein Downgrade ist und ob es möglich ist
        tier_order = {'starter': 1, 'pro': 2, 'business': 3}
        is_downgrade = tier_order.get(old_tier, 0) > tier_order.get(new_tier, 0)
        
        if is_downgrade:
            # Prüfe, ob die aktuellen Werte die neuen Limits überschreiten
            new_limits = {
                'starter': {'max_departments': 1, 'max_employees': 20},
                'pro': {'max_departments': 10, 'max_employees': 150},
                'business': {'max_departments': -1, 'max_employees': -1}
            }
            
            current_depts = subscription.get_current_department_count(organization)
            current_emps = subscription.get_current_employee_count(organization)
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
        
        # Setze is_trial auf False, wenn Plan gewechselt wird (außer im Admin Panel)
        organization.is_trial = False
        organization.save()
        
        # Wenn die Subscription geteilt wird, erstelle eine Kopie für diese Organization
        if subscription_is_shared:
            # Bestimme die Limits basierend auf dem neuen Tier
            tier_limits = {
                'starter': {'max_departments': 1, 'max_employees': 20, 'base_price': 29.00, 'price_per_employee': 2.00},
                'pro': {'max_departments': 10, 'max_employees': 150, 'base_price': 59.00, 'price_per_employee': 1.50},
                'business': {'max_departments': -1, 'max_employees': -1, 'base_price': 99.00, 'price_per_employee': 1.00}
            }
            limits = tier_limits.get(new_tier, tier_limits['starter'])
            
            # Bestimme price_cap für Business Tier
            price_cap = None
            if new_tier == 'business':
                price_cap = 399.00 if organization.is_early_access else 499.00
            
            # Erstelle eine neue Subscription-Instanz mit den neuen Tier-Werten
            from datetime import timedelta
            from django.utils import timezone
            today = timezone.now().date()
            
            new_subscription = Subscription.objects.create(
                company_name=subscription.company_name,
                tier=new_tier,
                is_early_access=subscription.is_early_access,
                max_departments=limits['max_departments'],
                max_employees=limits['max_employees'],
                base_price=limits['base_price'],
                price_per_employee=limits['price_per_employee'],
                price_cap=price_cap,
                is_active=subscription.is_active,
                trial_end_date=None,  # Kein Trial mehr
                subscription_start_date=today,  # Neues Startdatum
                subscription_end_date=today + timedelta(days=30)  # 30 Tage ab heute
            )
            # Weise die neue Subscription der Organization zu
            organization.subscription = new_subscription
            organization.save()
            subscription = new_subscription
        else:
            # Nur diese Organization nutzt die Subscription, also können wir sie direkt ändern
            # Aktualisiere auch die Tier-spezifischen Werte
            tier_limits = {
                'starter': {'max_departments': 1, 'max_employees': 20, 'base_price': 29.00, 'price_per_employee': 2.00},
                'pro': {'max_departments': 10, 'max_employees': 150, 'base_price': 59.00, 'price_per_employee': 1.50},
                'business': {'max_departments': -1, 'max_employees': -1, 'base_price': 99.00, 'price_per_employee': 1.00}
            }
            limits = tier_limits.get(new_tier, tier_limits['starter'])
            
            # Bestimme price_cap für Business Tier
            price_cap = None
            if new_tier == 'business':
                price_cap = 399.00 if organization.is_early_access else 499.00
            
            # Setze neue Daten für monatliches Abo (30 Tage)
            from datetime import timedelta
            from django.utils import timezone
            today = timezone.now().date()
            
            subscription.tier = new_tier
            subscription.max_departments = limits['max_departments']
            subscription.max_employees = limits['max_employees']
            subscription.base_price = limits['base_price']
            subscription.price_per_employee = limits['price_per_employee']
            subscription.price_cap = price_cap
            subscription.trial_end_date = None  # Kein Trial mehr
            subscription.subscription_end_date = today + timedelta(days=30)  # 30 Tage ab heute
            subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
