from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
from . import views
from . import storefront_views
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()

# User management
router.register(r'users', views.UserViewSet, basename='user')

# Product management
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'testimonials', views.TestimonialViewSet, basename='testimonial')

# Shopping
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'cart-items', views.CartItemViewSet, basename='cart-items')
router.register(r'orders', views.OrderViewSet, basename='order')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')

# User features
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'wishlist', views.WishlistViewSet, basename='wishlist')

# Vendor routes
router.register(r'vendor/dashboard', views.VendorDashboardViewSet, basename='vendor-dashboard')
router.register(r'vendor/products', views.VendorProductViewSet, basename='vendor-products')
router.register(r'vendor/categories', views.VendorCategoryViewSet, basename='vendor-categories')
router.register(r'vendor/orders', views.VendorOrderViewSet, basename='vendor-orders')
router.register(r'vendor/earnings', views.VendorEarningViewSet, basename='vendor-earnings')

#Administrator Routes
router.register(r'administrator/dashboard', views.AdministratorDashboardViewSet, basename='administrator-dashboard')
router.register(r'administrator/vendors', views.VendorActionViewSet, basename='vendor-actions')
# Remove the explicit path and rely on router registration

# Buyer routes
router.register(r'buyer/orders', views.BuyerOrderViewSet, basename='buyer-orders')
router.register(r'buyer/wishlist', views.BuyerWishlistViewSet, basename='buyer-wishlist')
router.register(r'buyer/cart', views.BuyerCartViewSet, basename='buyer-cart')

# Notifications
router.register(r'notifications', views.NotificationViewSet, basename='notifications')

# Messaging
router.register(r'messaging/conversations', views.ConversationViewSet, basename='conversations')
router.register(r'messaging/messages', views.MessageViewSet, basename='messages')
router.register(r'messaging/settings', views.UserMessageSettingsViewSet, basename='message-settings')
router.register(r'coupons', views.CouponViewSet, basename='coupons')

urlpatterns = [
    path('', include(router.urls)),
    # CSRF helper endpoint
    path('csrf/', views.csrf_token, name='csrf-token'),
    # Payments (Stripe)
    path('payments/create-intent/', views.create_payment_intent, name='create-payment-intent'),
    path('payments/webhook/', views.stripe_webhook, name='stripe-webhook'),
    # Orders
    path('orders/', views.OrderViewSet.as_view({'get': 'list', 'post': 'create'}), name='orders'),
    path('orders/<int:pk>/', views.OrderViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='order-detail'),
    path('orders/<int:pk>/invoice/', views.OrderViewSet.as_view({'get': 'get_invoice'}), name='order-invoice'),
    path('orders/buyer/', views.OrderViewSet.as_view({'get': 'buyer_orders'}), name='buyer-orders'),
    # Admin order management
    path('admin/orders/', views.admin_order_management, name='admin-orders'),
    path('admin/orders/<int:order_id>/', views.admin_order_management, name='admin-order-detail'),
    # Admin payout management
    path('admin/payouts/', views.PayoutRequestViewSet.as_view({'get': 'list'}), name='admin-payouts'),
    path('admin/payouts/<int:pk>/', views.PayoutRequestViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='admin-payout-detail'),
    path('admin/payouts/<int:pk>/approve-or-reject/', views.PayoutRequestViewSet.as_view({'post': 'approve_or_reject'}), name='admin-payout-approve-reject'),
    # Automated payout processing with fake payment gateway and receipt generation
    path('admin/payouts/<int:pk>/process/', views.VendorPayoutViewSet.as_view({'post': 'process_payout'}), name='admin-payout-process'),
    
    # Vendor payout management
    path('vendor/payouts/earnings/', views.VendorPayoutViewSet.as_view({'get': 'earnings'}), name='vendor-earnings'),
    path('vendor/payouts/request/', views.VendorPayoutViewSet.as_view({'post': 'request_payout'}), name='vendor-payout-request'),
    path('vendor/payouts/history/', views.VendorPayoutViewSet.as_view({'get': 'history'}), name='vendor-payout-history'),
    path('vendor/payouts/statistics/', views.VendorPayoutViewSet.as_view({'get': 'statistics'}), name='vendor-payout-statistics'),
    path('vendor/payouts/payment-method/', views.VendorPayoutViewSet.as_view({'get': 'payment_method', 'post': 'payment_method', 'put': 'payment_method'}), name='vendor-payment-method'),
    path('vendor/payouts/<int:pk>/process/', views.VendorPayoutViewSet.as_view({'post': 'process_payout'}), name='vendor-payout-process'),
    path('vendor/payouts/<int:pk>/receipt/', views.VendorPayoutViewSet.as_view({'get': 'download_receipt'}), name='vendor-payout-receipt'),
    # Storefront (Vendor-auth)
    path('vendor/store/', storefront_views.vendor_store, name='vendor-store'),
    path('media/upload/', storefront_views.media_upload, name='media-upload'),
    # Public Storefront
    path('public/stores/<slug:slug>/', storefront_views.public_store, name='public-store'),
    path('public/stores/by-vendor/<int:vendor_id>/', storefront_views.public_store_by_vendor, name='public-store-by-vendor'),
    path('public/stores/<slug:slug>/preview/', storefront_views.public_store_preview, name='public-store-preview'),
    path('public/stores/<slug:slug>/products/', storefront_views.public_store_products, name='public-store-products'),
    # AI proxy
    path('ai/generate/', views.ai_generate, name='ai-generate'),
    # Authentication endpoints
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/user/', views.UserViewSet.as_view({'get': 'me', 'patch': 'update_profile'}), name='user-profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),# New url that calls refresh
]
# Add media URL patterns for development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)