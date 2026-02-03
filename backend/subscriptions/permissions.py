from rest_framework import permissions


class IsAdminOrHR(permissions.BasePermission):
    """
    Custom permission: Nur Admin oder HR dürfen Subscriptions bearbeiten.
    Alle können ihre Subscription lesen (my_subscription, check_limits).
    """
    
    def has_permission(self, request, view):
        # Authentifizierung erforderlich
        if not request.user or not request.user.is_authenticated:
            return False
        
        # GET-Requests für my_subscription und check_limits sind für alle erlaubt
        if view.action in ['my_subscription', 'check_limits']:
            return True
        
        # Alle anderen Actions nur für Admin oder HR
        return request.user.role in ['admin', 'hr']
    
    def has_object_permission(self, request, view, obj):
        # Admin oder HR dürfen alles
        if request.user.role in ['admin', 'hr']:
            return True
        
        # Andere dürfen nur ihre eigene Subscription lesen
        if request.method in permissions.SAFE_METHODS:
            # Prüfe ob User der Owner ist oder zur gleichen Organization gehört
            if hasattr(request.user, 'subscription') and request.user.subscription == obj:
                return True
            if request.user.organization:
                owner = request.user.organization.users.filter(subscription=obj).first()
                if owner:
                    return True
        
        return False
