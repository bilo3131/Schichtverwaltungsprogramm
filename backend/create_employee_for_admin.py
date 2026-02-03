"""
Script to create an Employee profile for the admin user
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schichtplan.settings')
django.setup()

from accounts.models import User
from shifts.models import Employee
from datetime import date

def create_employee_for_admin():
    try:
        # Get admin user
        admin = User.objects.get(username='admin')
        
        # Check if employee profile exists
        if hasattr(admin, 'employee_profile'):
            print(f"Employee profile already exists for {admin.username}")
            print(f"Employee ID: {admin.employee_profile.id}")
            return
        
        # Create employee profile
        employee = Employee.objects.create(
            user=admin,
            employment_type='fulltime',
            min_hours_per_week=40,
            max_hours_per_week=40,
            hourly_rate=25.00,
            hire_date=date.today(),
            is_active=True,
            notes='Administrator account'
        )
        
        print(f"✓ Employee profile created for {admin.username}")
        print(f"  Employee ID: {employee.id}")
        print(f"  Employment Type: {employee.employment_type}")
        print(f"  Hourly Rate: €{employee.hourly_rate}")
        
    except User.DoesNotExist:
        print("✗ Admin user not found. Please run create_test_user.py first.")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == '__main__':
    create_employee_for_admin()
