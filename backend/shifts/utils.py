"""
Utility functions and helpers for the shifts app.
Provides reusable logic following DRY and Clean Code principles.
"""
from rest_framework.exceptions import PermissionDenied
from .constants import UserRoles, ValidationMessages


class PermissionHelpers:
    """Helper methods for common permission checks"""
    
    @staticmethod
    def require_organization(user):
        """
        Validates that a user has an organization assigned.
        Raises PermissionDenied if not.
        
        Args:
            user: The user to check
            
        Returns:
            The user's organization
            
        Raises:
            PermissionDenied: If user has no organization
        """
        organization = user.organization
        if not organization:
            raise PermissionDenied(ValidationMessages.NO_ORGANIZATION)
        return organization
    
    @staticmethod
    def check_subscription_limit(subscription, organization, limit_check_method, resource_name):
        """
        Validates subscription limits for adding resources.
        
        Args:
            subscription: The subscription to check
            organization: The organization attempting to add resources
            limit_check_method: Method to call (e.g., subscription.can_add_employee)
            resource_name: Name of the resource for error messages (e.g., 'Mitarbeiter')
            
        Raises:
            PermissionDenied: If limit is exceeded
        """
        if subscription and not limit_check_method(organization):
            tier_display = subscription.get_tier_display()
            if resource_name == 'Mitarbeiter':
                max_count = subscription.max_employees
            elif resource_name == 'Abteilung' or resource_name == 'Abteilungen':
                max_count = subscription.max_departments
            else:
                max_count = 'unlimited'
            
            raise PermissionDenied(
                ValidationMessages.SUBSCRIPTION_LIMIT_TEMPLATE.format(
                    limit=max_count,
                    resource=resource_name,
                    tier=tier_display
                )
            )
    
    @staticmethod
    def require_non_employee_role(user, action='diese Aktion'):
        """
        Validates that a user is not an employee (i.e., has management permissions).
        
        Args:
            user: The user to check
            action: Description of the action for error message
            
        Raises:
            PermissionDenied: If user has employee role
        """
        if user.role not in UserRoles.NON_EMPLOYEE_ROLES:
            raise PermissionDenied(f'{ValidationMessages.NON_EMPLOYEE_ONLY}: {action}')
    
    @staticmethod
    def is_admin_or_hr(user):
        """Check if user has admin or HR role"""
        return UserRoles.is_admin_or_hr(user.role)
    
    @staticmethod
    def is_manager_or_above(user):
        """Check if user has manager, HR, or admin role"""
        return UserRoles.is_manager_or_above(user.role)
