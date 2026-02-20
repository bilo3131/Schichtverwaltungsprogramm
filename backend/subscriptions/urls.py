from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionViewSet, CreateCheckoutSessionView, CheckoutSuccessView, StripeWebhookView

router = DefaultRouter()
router.register(r'', SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('checkout-success/', CheckoutSuccessView.as_view(), name='checkout-success'),
    path('webhook/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('', include(router.urls)),
]
