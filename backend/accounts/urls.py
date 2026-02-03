from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationViewSet, UserViewSet, RegisterView,
    LoginView, LogoutView
)

router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
