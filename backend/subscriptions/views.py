from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Subscription, PaymentRecord
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


class CreateCheckoutSessionView(APIView):
    """
    Erstellt eine Stripe Checkout Session für ein Abonnement-Upgrade.

    POST /api/v1/subscriptions/create-checkout-session/
    Body: { "tier": "pro" }
    Returns: { "checkout_url": "https://checkout.stripe.com/..." }
    """
    permission_classes = [IsAuthenticated, IsAdminOrHR]

    def post(self, request):
        import stripe

        tier = request.data.get("tier")
        valid_tiers = ["starter", "pro", "business"]
        if tier not in valid_tiers:
            return Response(
                {"detail": f"Ungültiges Tier. Mögliche Werte: {', '.join(valid_tiers)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        if not stripe.api_key:
            return Response(
                {"detail": "Stripe ist nicht konfiguriert. Bitte kontaktiere den Support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        organization = request.user.organization
        if not organization:
            return Response(
                {"detail": "Keine Organisation gefunden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscription = organization.subscription
        if not subscription:
            return Response(
                {"detail": "Keine Subscription gefunden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Preis berechnen (in Cent für Stripe)
        # Für Starter-Plan: Mindestgebühr €29 (Grundpreis, da Mitarbeiterzahl variiert)
        tier_base_prices = {
            "starter": 2900,   # €29,00
            "pro": 5900,       # €59,00
            "business": 9900,  # €99,00
        }
        amount_cents = tier_base_prices[tier]

        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200")

        try:
            # Stripe Customer anlegen oder laden
            if organization.stripe_customer_id:
                customer_id = organization.stripe_customer_id
            else:
                customer = stripe.Customer.create(
                    email=request.user.email or f"{request.user.username}@schichtplan.de",
                    name=organization.name,
                    metadata={"organization_id": str(organization.id)},
                )
                customer_id = customer.id
                organization.stripe_customer_id = customer_id
                organization.save(update_fields=["stripe_customer_id"])

            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "eur",
                            "product_data": {
                                "name": f"Schichtplan {tier.title()} Abonnement",
                                "description": "Monatliches Abonnement (Grundpreis, Mitarbeiterkosten werden separat berechnet)",
                            },
                            "unit_amount": amount_cents,
                            "recurring": {"interval": "month"},
                        },
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=f"{frontend_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{frontend_url}/subscription",
                metadata={
                    "organization_id": str(organization.id),
                    "tier": tier,
                    "user_id": str(request.user.id),
                },
            )
        except stripe.error.AuthenticationError:
            return Response(
                {"detail": "Stripe-Authentifizierung fehlgeschlagen. Bitte prüfe den API-Key."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except stripe.error.StripeError as e:
            return Response(
                {"detail": f"Stripe-Fehler: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": f"Unerwarteter Fehler: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"checkout_url": checkout_session.url}, status=status.HTTP_200_OK)


class CheckoutSuccessView(APIView):
    """
    Wird aufgerufen, wenn Stripe nach erfolgreicher Zahlung zurückleitet.

    GET /api/v1/subscriptions/checkout-success/?session_id=cs_xxx
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import stripe

        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"detail": "Session-ID fehlt."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as e:
            return Response(
                {"detail": f"Stripe-Fehler: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if session.payment_status != "paid" and session.status != "complete":
            return Response(
                {"detail": "Zahlung noch nicht abgeschlossen."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        organization_id = session.metadata.get("organization_id")
        tier = session.metadata.get("tier", "starter")

        from accounts.models import Organization
        try:
            org = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return Response({"detail": "Organisation nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        # Subscription aktivieren
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.now().date()

        org.is_trial = False
        if session.subscription:
            org.stripe_subscription_id = session.subscription
        org.save(update_fields=["is_trial", "stripe_subscription_id"])

        sub = org.subscription
        sub.tier = tier
        sub.is_active = True
        sub.trial_end_date = None
        sub.subscription_end_date = today + timedelta(days=30)
        sub.save()

        # PaymentRecord anlegen
        amount_map = {"starter": 29, "pro": 59, "business": 99}
        PaymentRecord.objects.create(
            organization=org,
            subscription=sub,
            stripe_payment_intent_id=session.payment_intent or "",
            stripe_checkout_session_id=session_id,
            amount=amount_map.get(tier, 29),
            currency="eur",
            status="succeeded",
            tier=tier,
            billing_period_start=today,
            billing_period_end=today + timedelta(days=30),
        )

        return Response(
            {
                "message": f"Abonnement erfolgreich aktiviert: {tier.title()}",
                "tier": tier,
                "subscription_end_date": str(sub.subscription_end_date),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Empfängt Stripe Webhook-Events und aktualisiert den Subscription-Status.

    POST /api/v1/subscriptions/webhook/stripe/
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except ValueError:
            return Response({"detail": "Ungültiger Payload."}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"detail": "Ungültige Signatur."}, status=status.HTTP_400_BAD_REQUEST)

        self._handle_event(event)
        return Response({"received": True}, status=status.HTTP_200_OK)

    def _handle_event(self, event):
        from accounts.models import Organization
        from django.utils import timezone
        from datetime import timedelta

        event_type = event["type"]

        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            org_id = session.get("metadata", {}).get("organization_id")
            tier = session.get("metadata", {}).get("tier", "starter")
            if org_id:
                try:
                    org = Organization.objects.get(id=org_id)
                    today = timezone.now().date()
                    org.is_trial = False
                    if session.get("subscription"):
                        org.stripe_subscription_id = session["subscription"]
                    org.save(update_fields=["is_trial", "stripe_subscription_id"])

                    sub = org.subscription
                    if sub:
                        sub.tier = tier
                        sub.is_active = True
                        sub.trial_end_date = None
                        sub.subscription_end_date = today + timedelta(days=30)
                        sub.save()
                except Organization.DoesNotExist:
                    pass

        elif event_type == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")
            if customer_id:
                try:
                    org = Organization.objects.get(stripe_customer_id=customer_id)
                    from django.utils import timezone
                    today = timezone.now().date()
                    sub = org.subscription
                    if sub:
                        sub.is_active = True
                        sub.subscription_end_date = today + timedelta(days=30)
                        sub.save(update_fields=["is_active", "subscription_end_date"])

                    PaymentRecord.objects.create(
                        organization=org,
                        subscription=sub,
                        stripe_payment_intent_id=invoice.get("payment_intent", ""),
                        amount=invoice.get("amount_paid", 0) / 100,
                        currency=invoice.get("currency", "eur"),
                        status="succeeded",
                        billing_period_start=today,
                        billing_period_end=today + timedelta(days=30),
                    )
                except Organization.DoesNotExist:
                    pass

        elif event_type == "invoice.payment_failed":
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")
            if customer_id:
                try:
                    org = Organization.objects.get(stripe_customer_id=customer_id)
                    sub = org.subscription
                    if sub:
                        sub.is_active = False
                        sub.save(update_fields=["is_active"])
                except Organization.DoesNotExist:
                    pass

        elif event_type == "customer.subscription.deleted":
            subscription_obj = event["data"]["object"]
            customer_id = subscription_obj.get("customer")
            if customer_id:
                try:
                    org = Organization.objects.get(stripe_customer_id=customer_id)
                    org.stripe_subscription_id = None
                    org.save(update_fields=["stripe_subscription_id"])
                    sub = org.subscription
                    if sub:
                        sub.is_active = False
                        sub.save(update_fields=["is_active"])
                except Organization.DoesNotExist:
                    pass
