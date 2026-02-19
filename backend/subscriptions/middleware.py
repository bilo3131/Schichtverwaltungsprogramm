from rest_framework import status
from rest_framework.response import Response
from django.utils.deprecation import MiddlewareMixin

# Pfade, die auch bei abgelaufener Subscription erlaubt bleiben (Lesezugriff + Auth)
SUBSCRIPTION_EXEMPT_PATHS = [
    '/api/v1/accounts/login/',
    '/api/v1/accounts/logout/',
    '/api/v1/accounts/demo-login/',
    '/api/v1/accounts/users/me/',
    '/api/v1/subscriptions/my_subscription/',
    '/api/v1/subscriptions/check_limits/',
    '/api/v1/subscriptions/tier_options/',
    '/api/v1/subscriptions/create-checkout-session/',
    '/api/v1/subscriptions/checkout-success/',
    '/api/v1/subscriptions/webhook/',
    '/admin/',
]

# Nur diese HTTP-Methoden werden für abgelaufene Subscriptions blockiert
WRITE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


class SubscriptionLimitMiddleware(MiddlewareMixin):
    """
    Middleware zur Prüfung der Subscription-Limits und Ablauf-Status.
    - Blockiert Schreibzugriffe bei abgelaufenen Trials/Subscriptions
    - Prüft Mitarbeiter- und Abteilungs-Limits bei POST-Anfragen
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        path = request.path
        user = request.user

        # Nur für authentifizierte Benutzer
        if not user.is_authenticated:
            return None

        # Organization und Subscription ermitteln
        organization = getattr(user, 'organization', None)
        if not organization:
            return None

        subscription = getattr(organization, 'subscription', None)
        if not subscription:
            return None

        # Exempt-Pfade überspringen
        if any(path.startswith(exempt) for exempt in SUBSCRIPTION_EXEMPT_PATHS):
            return None

        # Bei abgelaufener/inaktiver Subscription: Schreibzugriffe blockieren
        if request.method in WRITE_METHODS:
            if not subscription.is_active or subscription.is_expired(organization):
                return Response(
                    {
                        'detail': (
                            'Ihr Testzeitraum bzw. Abonnement ist abgelaufen. '
                            'Bitte wählen Sie ein Abonnement, um fortzufahren.'
                        ),
                        'subscription_expired': True,
                        'trial_end_date': str(subscription.trial_end_date) if subscription.trial_end_date else None,
                        'subscription_end_date': str(subscription.subscription_end_date) if subscription.subscription_end_date else None,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED,
                )

        # Nur bei POST-Requests Limits prüfen
        if request.method != 'POST':
            return None

        # Prüfe Mitarbeiter-Limit
        if '/api/v1/accounts/employees/' in path and path.endswith('/'):
            if not subscription.can_add_employee(organization):
                return Response(
                    {
                        'detail': f'Mitarbeiter-Limit erreicht. Ihr aktuelles Tier ({subscription.get_tier_display()}) erlaubt maximal {subscription.max_employees} Mitarbeiter.',
                        'limit_reached': True,
                        'current_count': subscription.get_current_employee_count(organization),
                        'max_count': subscription.max_employees,
                        'tier': subscription.tier
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        # Prüfe Abteilungs-Limit
        if '/api/v1/departments/' in path and path.endswith('/'):
            if not subscription.can_add_department(organization):
                return Response(
                    {
                        'detail': f'Abteilungs-Limit erreicht. Ihr aktuelles Tier ({subscription.get_tier_display()}) erlaubt maximal {subscription.max_departments} Abteilungen.',
                        'limit_reached': True,
                        'current_count': subscription.get_current_department_count(organization),
                        'max_count': subscription.max_departments,
                        'tier': subscription.tier
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

        return None
