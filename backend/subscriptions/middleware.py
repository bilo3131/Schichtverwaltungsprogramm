from rest_framework import status
from rest_framework.response import Response
from django.utils.deprecation import MiddlewareMixin


class SubscriptionLimitMiddleware(MiddlewareMixin):
    """
    Middleware zur Prüfung der Subscription-Limits vor dem Anlegen von Mitarbeitern/Abteilungen
    """
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        # Nur bei POST-Requests für Mitarbeiter oder Abteilungen prüfen
        if request.method != 'POST':
            return None
        
        path = request.path
        user = request.user
        
        # Nur für authentifizierte Benutzer
        if not user.is_authenticated:
            return None
        
        # Prüfe ob der User eine Subscription hat
        if not hasattr(user, 'subscription'):
            return None
        
        subscription = user.subscription
        
        # Prüfe Mitarbeiter-Limit
        if '/api/v1/accounts/employees/' in path and path.endswith('/'):
            if not subscription.can_add_employee():
                return Response(
                    {
                        'detail': f'Mitarbeiter-Limit erreicht. Ihr aktuelles Tier ({subscription.get_tier_display()}) erlaubt maximal {subscription.max_employees} Mitarbeiter.',
                        'limit_reached': True,
                        'current_count': subscription.get_current_employee_count(),
                        'max_count': subscription.max_employees,
                        'tier': subscription.tier
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Prüfe Abteilungs-Limit
        if '/api/v1/departments/' in path and path.endswith('/'):
            if not subscription.can_add_department():
                return Response(
                    {
                        'detail': f'Abteilungs-Limit erreicht. Ihr aktuelles Tier ({subscription.get_tier_display()}) erlaubt maximal {subscription.max_departments} Abteilungen.',
                        'limit_reached': True,
                        'current_count': subscription.get_current_department_count(),
                        'max_count': subscription.max_departments,
                        'tier': subscription.tier
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return None
