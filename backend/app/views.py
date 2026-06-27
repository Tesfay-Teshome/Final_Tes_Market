import logging
import stripe
from datetime import timedelta
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.db.models import Q, Sum, Count, Prefetch, F, ExpressionWrapper
from django.db import IntegrityError, models, connection

from rest_framework import viewsets, status, permissions, filters, serializers, generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from django.core.files.storage import default_storage
from rest_framework.response import Response

import os
import json
import requests
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django_ratelimit.decorators import ratelimit

from .models import (
    User, Category, Product, ProductImage, ProductVariant, MessageStatus,
    Cart, CartItem, Order, OrderItem, Transaction, Review,
    Wishlist, WishlistItem, VendorEarning, VendorAnalytics,
    AdministratorDashboardMetrics, Testimonial, Notification,
    Conversation, Message, UserMessageSettings, MessageReadReceipt,
    PayoutRequest, PayoutReceipt, VendorStore, Coupon, CouponUsage
)
from .serializers import (
    UserSerializer, LoginSerializer, CategorySerializer, ProductSerializer,
    CartSerializer, OrderSerializer, TransactionSerializer,
    ReviewSerializer, WishlistSerializer, AdministratorDashboardMetricsSerializer,
    TestimonialSerializer, VendorEarningSerializer, NotificationSerializer,
    ConversationListSerializer, ConversationDetailSerializer, MessageSerializer, UserMessageSettingsSerializer,
    CouponSerializer, CouponUsageSerializer
)

logger = logging.getLogger(__name__)

User = get_user_model()



class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Don't allow registration as administrator
        if request.data.get('user_type') == 'administrator':
            return Response(
                {'detail': 'Administrator accounts can only be created through the admin panel'},
                status=status.HTTP_400_BAD_REQUEST
            )
        logger.info(f"Registration attempt from IP: {request.META.get('REMOTE_ADDR')}")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.perform_create(serializer)
        if isinstance(result, Response):
            logger.warning(f"Registration failed from IP: {request.META.get('REMOTE_ADDR')}")
            return result
        headers = self.get_success_headers(serializer.data)
        logger.info(f"Registration successful from IP: {request.META.get('REMOTE_ADDR')}")
        # Generate tokens for the new user and return response
        user = serializer.instance
        refresh = RefreshToken.for_user(user)
        data = {
            'user': serializer.data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        try:
            user = serializer.save()
            # Handle profile image if provided
            if 'profile_image' in self.request.FILES:
                user.profile_image = self.request.FILES['profile_image']
                user.save()
            # Set user active status based on user type
            if user.user_type == 'buyer':
                # Buyers are automatically active - no approval needed
                user.is_active = True
                user.save()
            elif user.user_type == 'vendor':
                # Check if request is authenticated (admin creating user)
                if hasattr(self.request, 'user') and self.request.user.is_authenticated and self.request.user.is_staff:
                    # Admin-created vendors are auto-approved
                    user.is_verified = True
                    user.is_active = True
                else:
                    # Public registration - pending approval
                    user.is_verified = False
                    user.is_active = False
                user.save()
            return user
        except IntegrityError:
            raise serializers.ValidationError({"email": "This email is already registered."})
        except serializers.ValidationError:
            # Re-raise validation errors so DRF can handle them properly
            raise
        except Exception as e:
            logger.error(f"Registration error from IP {request.META.get('REMOTE_ADDR')}: {str(e)}", exc_info=True)
            raise serializers.ValidationError({"detail": f"Registration error: {str(e)}"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_generate(request):
    key = getattr(settings, 'GEMINI_API_KEY', '')
    if not key:
        return Response({'detail': 'AI service not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Configure official client
    try:
        import warnings
        warnings.filterwarnings(
            'ignore',
            category=FutureWarning,
            message=r'.*google\.generativeai.*'
        )
        import google.generativeai as genai
        genai.configure(api_key=key)
    except Exception as e:
        return Response({'detail': 'AI client init failed', 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = request.data or {}
    prompt = data.get('prompt')
    task = data.get('task')
    inputs = data.get('inputs') or {}

    # Build prompt from task/inputs if no raw prompt provided
    if not prompt:
        if task == 'store_description':
            name = inputs.get('name', '')
            category = inputs.get('category', '')
            tone = inputs.get('tone', 'professional, trustworthy, concise')
            prompt = (
                f"Write a concise SEO-friendly store description (90-140 words) for a vendor store named "
                f"'{name}' in the '{category}' category. Tone: {tone}. Avoid fluff."
            )
        elif task == 'palette':
            industry = inputs.get('industry', '')
            mood = inputs.get('mood', 'modern, clean, emerald-first')
            prompt = (
                f"Suggest a brand color palette JSON using emerald as primary for a {industry} store. "
                f"Mood: {mood}. Return JSON with primary, secondary, background, text, accent as hex values."
            )
        elif task == 'template':
            industry = inputs.get('industry', '')
            inventory = inputs.get('inventory_size', 'medium')
            tone = inputs.get('tone', 'modern')
            prompt = (
                "Recommend one template key from ['minimal','vibrant','classic','dark'] for a "
                f"{industry} store with {inventory} inventory. Tone {tone}. Return JSON {{template: key, reason: string}}."
            )
        elif task == 'layout':
            category = inputs.get('category', '')
            goals = inputs.get('goals', 'increase conversions')
            inventory = inputs.get('inventory_size', 'medium')
            prompt = (
                f"Propose a homepage section layout JSON for a {category} store with {inventory} inventory to {goals}. "
                "Use sections: hero, product_grid, image_text, featured_collection. Include minimal settings like headline, cta, title, source."
            )
        else:
            return Response({'detail': 'Provide either prompt or valid task'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
        model = genai.GenerativeModel(model_name)
        result = model.generate_content(prompt)
        text = getattr(result, 'text', '') or ''
        if not text:
            return Response({'detail': 'Empty AI response'}, status=status.HTTP_502_BAD_GATEWAY)

        # Parse JSON for structured tasks
        if not data.get('prompt') and task in {'palette', 'template', 'layout'}:
            try:
                s = text.strip()
                start, end = s.find('{'), s.rfind('}')
                if start != -1 and end > start:
                    return Response({'task': task, 'result': json.loads(s[start:end+1])})
                return Response({'task': task, 'result': json.loads(s)})
            except Exception:
                return Response({'task': task, 'result_raw': text})

        if task:
            return Response({'task': task, 'result': text})
        return Response({'result': text})
    except Exception as e:
        return Response({'detail': 'AI request failed', 'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

@ensure_csrf_cookie
def csrf_token(request):
    """Simple endpoint to set CSRF cookie for the client."""
    return JsonResponse({"detail": "CSRF cookie set"})

# ---- Stripe Payments ----
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """Create a Stripe PaymentIntent for a given amount or current cart total.

    Body: { amount?: number, currency?: 'usd', order_id?: number }
    Returns: { client_secret }
    """
    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        currency = (request.data.get('currency') or 'usd').lower()

        amount = request.data.get('amount')
        if amount is None:
            # fallback to cart total
            try:
                cart = Cart.objects.get(user=request.user)
                amount = cart.total_amount
            except Cart.DoesNotExist:
                return Response({'detail': 'No amount provided and cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal
        amount_cents = int(Decimal(str(amount)) * 100)
        if amount_cents <= 0:
            return Response({'detail': 'Amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

        metadata = {'user_id': str(request.user.id)}
        if request.data.get('order_id'):
            metadata['order_id'] = str(request.data['order_id'])

        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata=metadata,
        )
        return Response({'client_secret': intent.client_secret})
    except Exception as e:
        logger.error(f"Stripe create_payment_intent error: {str(e)}", exc_info=True)
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhook events (payment_intent.succeeded)."""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=endpoint_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.warning(f"Stripe webhook signature error: {e}")
        return HttpResponse(status=400)

    try:
        if event.get('type') == 'payment_intent.succeeded':
            pi = event['data']['object']
            order_id = (pi.get('metadata') or {}).get('order_id')
            if order_id:
                order = Order.objects.filter(id=order_id).first()
                if order:
                    txn, _ = Transaction.objects.get_or_create(
                        order=order,
                        defaults={
                            'transaction_id': pi.get('id', ''),
                            'amount': order.total_amount,
                            'status': 'completed',
                            'payment_method': 'stripe',
                            'payment_details': pi,
                        }
                    )
                    if txn.status != 'completed':
                        txn.status = 'completed'
                        txn.payment_details = pi
                        txn.save(update_fields=['status', 'payment_details', 'updated_at'])

                        if order.status in ['pending']:
                            order.status = 'awaiting_approval'
                            order.save(update_fields=['status', 'updated_at'])

                    # Create VendorEarning entries
                    for item in order.items.all():
                        VendorEarning.objects.get_or_create(
                            order_item=item,
                            defaults={
                                'vendor': item.product.vendor,
                                'amount': item.vendor_earning,
                                'status': 'pending',
                            }
                        )

                    # Notify buyer
                    try:
                        Notification.objects.create(
                            recipient=order.user,
                            title='Payment received',
                            message=f'Your payment for order #{order.id} was received.',
                            notification_type='order',
                            related_order_id=order.id,
                        )
                    except Exception:
                        pass

        return HttpResponse(status=200)
    except Exception as e:
        logger.error(f"Stripe webhook handling error: {str(e)}", exc_info=True)
        return HttpResponse(status=500)

# ---- Admin Order Management ----
@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_order_management(request, order_id=None):
    """Admin endpoint for order approval and management"""
    if request.method == 'GET':
        if order_id:
            # Get specific order
            order = get_object_or_404(Order, id=order_id)
            serializer = OrderSerializer(order, context={'request': request})
            return Response(serializer.data)
        else:
            # Get all orders for admin review
            orders = Order.objects.all().order_by('-created_at')
            
            # Filter by status if provided
            order_status = request.query_params.get('status')
            if order_status:
                orders = orders.filter(status=order_status)
            
            # Filter by approval status
            approval_status = request.query_params.get('approval_status')
            if approval_status == 'pending':
                orders = orders.filter(admin_approved=False, status__in=['pending', 'awaiting_approval'])
            elif approval_status == 'approved':
                orders = orders.filter(admin_approved=True)
            
            serializer = OrderSerializer(orders, many=True, context={'request': request})
            return Response(serializer.data)
    
    elif request.method == 'PATCH':
        # Approve/reject order
        order = get_object_or_404(Order, id=order_id)
        action = request.data.get('action')

        if action == 'approve':
            # Check if order is already approved
            if order.admin_approved:
                return Response({'error': 'Order is already approved'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if order is rejected
            if order.status == 'rejected':
                return Response({'error': 'Cannot approve a rejected order'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if order has items
            if not order.items.exists():
                return Response({'error': 'Order has no items'}, status=status.HTTP_400_BAD_REQUEST)

            order.admin_approved = True
            order.admin_approved_by = request.user
            order.admin_approval_date = timezone.now()
            order.vendor_can_process = True
            # Transition to approved status
            order.status = 'approved'
            order.admin_notes = request.data.get('admin_notes', '')
            order.save()

            # Notify ALL unique vendors who have items in this order
            try:
                notified_vendor_ids = set()
                for item in order.items.select_related('product__vendor').all():
                    if item.product and item.product.vendor:
                        v = item.product.vendor
                        if v.id not in notified_vendor_ids:
                            notified_vendor_ids.add(v.id)
                            notif = Notification.objects.create(
                                recipient=v,
                                title='\U0001f4e6 New Order Ready for Processing',
                                message=(
                                    f'Order #{order.id} has been approved by the administrator and '
                                    f'is ready for your action. Please visit your Order Management '
                                    f'page to start processing immediately.'
                                ),
                                notification_type='order_approved',
                                related_order_id=order.id,
                                requires_confirmation=True,
                            )
                            logger.info(
                                f"Notified vendor {v.username} (id={v.id}) for order {order.id} "
                                f"(notification id={notif.id})"
                            )
                if not notified_vendor_ids:
                    logger.warning(f"No vendors found to notify for order {order.id}")
            except Exception as e:
                logger.error(f"Failed to create vendor notifications for order {order.id}: {str(e)}", exc_info=True)

            return Response({'message': 'Order approved successfully'})
        
        elif action == 'reject':
            order.admin_approved = False
            order.admin_approved_by = request.user
            order.admin_approval_date = timezone.now()
            order.vendor_can_process = False
            order.status = 'rejected'
            order.admin_notes = request.data.get('admin_notes', '')
            order.save()
            
            # Create notification for customer
            try:
                Notification.objects.create(
                    recipient=order.user,
                    title='Order Rejected',
                    message=f'Order #{order.id} has been rejected by administration. {order.admin_notes}',
                    notification_type='order_rejected',
                    related_order_id=order.id,
                )
            except Exception:
                pass
            
            return Response({'message': 'Order rejected successfully'})
        
        elif action == 'update_status':
            # Update order status with proper validation
            new_status = request.data.get('status')
            admin_notes = request.data.get('admin_notes', '')
            
            if not new_status:
                return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # ---- Admin-only valid transitions ----
            # IMPORTANT: 'processing' and 'shipped' are VENDOR-ONLY transitions.
            # Admin can only: cancel/reject early-stage orders, confirm delivery, complete.
            valid_statuses = ['delivered', 'completed', 'cancelled', 'rejected']
            if new_status not in valid_statuses:
                return Response(
                    {
                        'error': (
                            f'Invalid status for admin. Valid options: {", ".join(valid_statuses)}. '
                            f'Note: \'processing\' and \'shipped\' are vendor-only transitions.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Strict per-status transition map (admin scope only)
            current_status = order.status
            valid_transitions = {
                'pending':           ['cancelled', 'rejected'],
                'payment_confirmed': ['cancelled', 'rejected'],
                'awaiting_approval': ['cancelled', 'rejected'],
                'approved':          ['cancelled', 'rejected'],
                'processing':        ['cancelled'],
                'shipped':           ['delivered', 'cancelled'],
                'delivered':         ['completed'],
                'completed':         [],
                'cancelled':         [],
                'rejected':          [],
            }

            allowed = valid_transitions.get(current_status, [])
            if new_status not in allowed:
                return Response(
                    {
                        'error': (
                            f'Cannot transition from \'{current_status}\' to \'{new_status}\'. '
                            f'Allowed: {", ".join(allowed) if allowed else "None — this is a final status."}'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Extra guard: delivered only valid after shipped
            if new_status == 'delivered' and current_status != 'shipped':
                return Response(
                    {'error': 'Order must be in \'shipped\' status before marking as delivered.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            order.status = new_status
            if admin_notes:
                order.admin_notes = admin_notes
            order.save()
            
            # Update VendorEarnings when order is delivered (wrapped to prevent import errors)
            if new_status == 'delivered':
                try:
                    from .models import VendorEarnings
                    for item in order.items.all():
                        vendor = item.product.vendor
                        earnings, created = VendorEarnings.objects.get_or_create(vendor=vendor)
                        earnings.update_from_order(item)
                except Exception as _ee:
                    logger.warning(f"VendorEarnings update skipped for order {order.id}: {_ee}")
            
            # Create notification for vendor based on status
            try:
                if new_status == 'processing':
                    notification_title = 'Ship Order to Customer'
                    notification_message = f'Order #{order.id} has been approved for processing. Please prepare and ship this order to the customer destination address immediately.'
                elif new_status == 'shipped':
                    notification_title = 'Order Shipped'
                    notification_message = f'Order #{order.id} has been marked as shipped.'
                elif new_status == 'delivered':
                    notification_title = 'Order Delivered'
                    notification_message = f'Order #{order.id} has been delivered successfully.'
                elif new_status == 'completed':
                    notification_title = 'Order Completed'
                    notification_message = f'Order #{order.id} has been completed. Thank you for your business!'
                else:
                    notification_title = 'Order Status Updated'
                    notification_message = f'Order #{order.id} status has been updated to {new_status}.'
                
                # Notify vendor
                notification = Notification.objects.create(
                    recipient=order.items.first().product.vendor,
                    title=notification_title,
                    message=notification_message,
                    notification_type='order',
                    related_order_id=order.id,
                    requires_confirmation=(new_status == 'processing'),  # Require confirmation for shipping notifications
                )
                
                # Also notify customer for delivered and completed orders
                if new_status in ['delivered', 'completed']:
                    Notification.objects.create(
                        recipient=order.user,
                        title=notification_title,
                        message=notification_message,
                        notification_type='order',
                        related_order_id=order.id,
                    )
            except Exception:
                pass
            
            return Response({'message': f'Order status updated to {new_status} successfully'})
        
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer 
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            email = request.data.get('email') or ''
            password = request.data.get('password') or ''

            email = email.strip()
            username_to_auth = email

            try:
                user_record = User.objects.filter(email__iexact=email).first()
                if user_record and user_record.username:
                    username_to_auth = user_record.username
            except Exception:
                pass


            if not email or not password:
                return Response(
                    {'detail': 'Email and password required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = authenticate(request, username=username_to_auth, password=password)
            if not user and password.strip() != password:
                user = authenticate(request, username=username_to_auth, password=password.strip())
            # Also try authenticating using the email kwarg in case backend expects USERNAME_FIELD
            if not user:
                user = authenticate(request, email=email, password=password)
            if not user and password.strip() != password:
                user = authenticate(request, email=email, password=password.strip())

            # Manual fallback: verify password directly on the email-matched user
            if not user and 'user_record' in locals() and user_record:
                try:
                    if user_record.check_password(password) or (
                        password.strip() != password and user_record.check_password(password.strip())
                    ):
                        user = user_record
                except Exception:
                    pass

            # Final fallback: try case-insensitive username match when email lookup failed
            if not user and (not user_record):
                try:
                    uname_user = User.objects.filter(username__iexact=email).first()
                    if uname_user and (uname_user.check_password(password) or (
                        password.strip() != password and uname_user.check_password(password.strip())
                    )):
                        user = uname_user
                except Exception:
                    pass

            if not user:
                logger.warning(f"Login failed from IP: {request.META.get('REMOTE_ADDR')}")
                return Response(
                    {'detail': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Update last login timestamp (handled by Django's AbstractUser)
            user.save(update_fields=['last_login'])

            if user.user_type == 'vendor' and not user.is_verified:
                return Response(
                    {'detail': 'Vendor account pending verification'},
                    status=status.HTTP_403_FORBIDDEN
                )

            refresh = RefreshToken.for_user(user)
            return Response({
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'user_type': user.user_type
                },
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Login Error: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Authentication service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class IsVendorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_vendor

class IsVendorOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.vendor == request.user

class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_administrator

class VendorActionViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(user_type='vendor')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    @action(detail=True, methods=['post'], url_path='approve', url_name='approve_vendor')
    def approve_vendor(self, request, pk=None):
        try:
            vendor = self.get_object()
            vendor.is_verified = True
            vendor.save()
            return Response({
                'message': 'Vendor approved successfully',
                'vendor_id': vendor.id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error approving vendor: {str(e)}")
            return Response({
                'error': 'Failed to approve vendor',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject', url_name='reject_vendor')
    def reject_vendor(self, request, pk=None):
        try:
            vendor = self.get_object()
            vendor.is_active = False
            vendor.is_verified = False
            vendor.save()
            return Response({
                'message': 'Vendor rejected successfully',
                'vendor_id': vendor.id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error rejecting vendor: {str(e)}")
            return Response({
                'error': 'Failed to reject vendor',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class AdministratorDashboardViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(user_type='vendor')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdministrator]
    
    class VendorPagination(PageNumberPagination):
        page_size = 10
        page_size_query_param = 'page_size'
        max_page_size = 100

    pagination_class = VendorPagination

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get administrator dashboard metrics"""
        today = timezone.now().date()

        range_param = (request.query_params.get('range') or '30d').lower()
        group_by = (request.query_params.get('group_by') or 'day').lower()

        def _parse_range_days(value: str) -> int:
            if value == '7d':
                return 7
            if value == '30d':
                return 30
            if value == '90d':
                return 90
            if value == 'ytd':
                start = today.replace(month=1, day=1)
                return max(1, (today - start).days + 1)
            if value.endswith('d'):
                try:
                    return max(1, int(value[:-1]))
                except Exception:
                    return 30
            return 30

        range_days = _parse_range_days(range_param)

        last_month = today - timedelta(days=30)
        metrics, _ = AdministratorDashboardMetrics.objects.get_or_create(date=today)
        
        # User Metrics
        metrics.total_users = User.objects.count()
        metrics.new_users_today = User.objects.filter(date_joined__date=today).count()
        # Consider all users as active for now, since login tracking might not be reliable
        metrics.active_users = metrics.total_users
        users_last_month = User.objects.filter(date_joined__lte=last_month).count()
        users_growth = 0.0
        if users_last_month > 0:
            users_growth = ((metrics.total_users - users_last_month) / users_last_month) * 100
        metrics.user_growth = round(users_growth, 2)
        
        # Vendor Metrics
        metrics.total_vendors = User.objects.filter(user_type='vendor').count()
        # Consider all vendors as active for now
        metrics.active_vendors = metrics.total_vendors
        metrics.pending_vendor_approvals = User.objects.filter(
            user_type='vendor', is_verified=False, is_active=True
        ).count()
        vendors_last_month = User.objects.filter(user_type='vendor', date_joined__lte=last_month).count()
        vendors_growth = 0.0
        if vendors_last_month > 0:
            vendors_growth = ((metrics.total_vendors - vendors_last_month) / vendors_last_month) * 100
        metrics.vendor_growth = round(vendors_growth, 2)
        
        # Product Metrics
        metrics.total_products = Product.objects.count()
        metrics.pending_product_approvals = Product.objects.filter(approval_status='pending').count()
        metrics.out_of_stock_products = Product.objects.filter(stock=0).count()
        
        # For backward compatibility
        metrics.pending_approvals = metrics.pending_product_approvals
        
        # Order Metrics
        metrics.total_orders = Order.objects.count()
        metrics.pending_orders = Order.objects.filter(
            status__in=['pending', 'payment_confirmed', 'awaiting_approval', 'approved', 'processing']
        ).count()
        metrics.completed_orders = Order.objects.filter(status__in=['delivered', 'completed']).count()
        metrics.cancelled_orders = Order.objects.filter(status='cancelled').count()
        orders_last_month = Order.objects.filter(created_at__lte=last_month).count()
        orders_growth = 0.0
        if orders_last_month > 0:
            orders_growth = ((metrics.total_orders - orders_last_month) / orders_last_month) * 100
        metrics.order_growth = round(orders_growth, 2)
        
        # Financial Metrics
        # Calculate total sales from delivered/completed orders instead of completed transactions
        # since transactions often remain in 'pending' status even after orders are delivered
        delivered_orders = Order.objects.filter(status__in=['delivered', 'completed'])
        metrics.total_sales = delivered_orders.aggregate(
            total=models.Sum('total_amount')
        )['total'] or 0
        
        # Platform revenue (commission from delivered orders)
        metrics.platform_revenue = OrderItem.objects.filter(
            order__status__in=['delivered', 'completed']
        ).aggregate(Sum('platform_fee'))['platform_fee__sum'] or 0
        
        # For backward compatibility
        metrics.total_commission = metrics.platform_revenue
        
        # Pending payouts
        metrics.pending_payouts = VendorEarning.objects.filter(status='pending').count()
        
        # Revenue growth - use delivered orders instead
        today_delivered = delivered_orders.filter(created_at__date=today)
        month_delivered = delivered_orders.filter(created_at__gte=last_month)
        
        prev_month_delivered = delivered_orders.filter(
            created_at__lt=last_month, 
            created_at__gte=last_month - timedelta(days=30)
        )
        prev_month_revenue = prev_month_delivered.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        current_month_revenue = month_delivered.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        revenue_growth = 0.0
        if prev_month_revenue > 0:
            revenue_growth = ((current_month_revenue - prev_month_revenue) / prev_month_revenue) * 100
        metrics.revenue_growth = round(revenue_growth, 2)
        
        # System Metrics
        # Note: This depends on how refunds and disputes are tracked in your system
        # For this example, we'll count orders with status 'refunded' as refund requests
        metrics.refund_requests = Order.objects.filter(status='refunded').count()
        # Similarly for disputes, you might have a field in the order model
        metrics.open_disputes = Order.objects.filter(has_dispute=True, dispute_resolved=False).count() if hasattr(Order, 'has_dispute') else 0
        
        # Performance Metrics
        # Calculate conversion rate (orders / unique visitors)
        # This would ideally come from analytics, but we'll approximate
        # Assume 5% of users make a purchase on any given day
        site_visitors = metrics.active_users * 3  # Approximate site visitors
        if site_visitors > 0:
            metrics.conversion_rate = round((metrics.total_orders / site_visitors) * 100, 2)
            
        # Average Order Value (based on delivered orders)
        delivered_orders_count = delivered_orders.count()
        if delivered_orders_count > 0:
            metrics.average_order_value = round(metrics.total_sales / delivered_orders_count, 2)
        
        # Conversion rate and AOV change (compared to previous period)
        # These would be best calculated from historical data
        # For demonstration, we'll set some reasonable values
        metrics.conversion_rate_change = 0.5  # Assume 0.5% improvement 
        metrics.aov_change = 2.3  # Assume 2.3% improvement
        
        # Save all the updated metrics
        metrics.save()
        
        # Include additional data for charts and detailed reporting
        additional_data = {
            'recent_activities': self.get_recent_activities(),
            'sales_over_time': self.get_sales_over_time(range_days=range_days, group_by=group_by),
            'top_products': self.get_top_products(),
            'top_vendors': self.get_top_vendors(),
            'orders_today': Order.objects.filter(created_at__date=today).count(),
            'pending_payout_amount': float(
                VendorEarning.objects.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or 0
            ),
        }

        serializer = AdministratorDashboardMetricsSerializer(metrics)
        legacy = {**serializer.data, **additional_data}

        response_data = {
            'schema_version': 2,
            'generated_at': timezone.now().isoformat(),
            'range': range_param,
            'group_by': group_by,
            'metrics': {
                'user_metrics': {
                    'total_users': metrics.total_users,
                    'new_users_today': metrics.new_users_today,
                    'active_users': metrics.active_users,
                    'user_growth': float(metrics.user_growth or 0),
                },
                'vendor_metrics': {
                    'total_vendors': metrics.total_vendors,
                    'active_vendors': metrics.active_vendors,
                    'pending_vendor_approvals': metrics.pending_vendor_approvals,
                    'vendor_growth': float(metrics.vendor_growth or 0),
                },
                'product_metrics': {
                    'total_products': metrics.total_products,
                    'pending_product_approvals': metrics.pending_product_approvals,
                    'out_of_stock_products': metrics.out_of_stock_products,
                },
                'order_metrics': {
                    'total_orders': metrics.total_orders,
                    'pending_orders': metrics.pending_orders,
                    'completed_orders': metrics.completed_orders,
                    'cancelled_orders': metrics.cancelled_orders,
                    'order_growth': float(metrics.order_growth or 0),
                    'orders_today': additional_data['orders_today'],
                },
                'financial_metrics': {
                    'total_sales': float(metrics.total_sales or 0),
                    'platform_revenue': float(metrics.platform_revenue or 0),
                    'pending_payouts_count': int(metrics.pending_payouts or 0),
                    'pending_payout_amount': float(additional_data['pending_payout_amount'] or 0),
                    'revenue_growth': float(metrics.revenue_growth or 0),
                    'average_order_value': float(metrics.average_order_value or 0),
                    'aov_change': float(metrics.aov_change or 0),
                },
                'performance_metrics': {
                    'conversion_rate': float(metrics.conversion_rate or 0),
                    'conversion_rate_change': float(metrics.conversion_rate_change or 0),
                },
                'system_metrics': {
                    'refund_requests': metrics.refund_requests,
                    'open_disputes': metrics.open_disputes,
                },
            },
            'charts': {
                'sales_over_time': additional_data['sales_over_time'],
            },
            'lists': {
                'recent_activities': additional_data['recent_activities'],
                'top_products': additional_data['top_products'],
                'top_vendors': additional_data['top_vendors'],
            },
            'system_status': {
                'database': 'online',
                'api': 'online',
                'storage': 'online',
                'last_checked': timezone.now().isoformat(),
            },
            'legacy': legacy,
        }

        return Response(response_data)

    @action(detail=False, methods=['get'], url_path='recent_orders')
    def recent_orders(self, request):
        """Get recent orders for the dashboard sidebar"""
        try:
            limit = int(request.query_params.get('limit') or 5)
        except Exception:
            limit = 5
        limit = max(1, min(50, limit))

        orders = (
            Order.objects.select_related('user')
            .order_by('-created_at')[:limit]
        )

        results = []
        for order in orders:
            results.append({
                'id': str(order.id),
                'status': order.status,
                'total_amount': float(order.total_amount or 0),
                'created_at': order.created_at.isoformat(),
                'buyer': {
                    'id': str(order.user_id),
                    'email': getattr(order.user, 'email', ''),
                    'full_name': getattr(order.user, 'full_name', ''),
                },
                'link': f'/administrator/orders/{order.id}',
            })

        return Response({'results': results})

    @action(detail=False, methods=['get'], url_path='health')
    def health(self, request):
        """Lightweight health snapshot for the system status panel"""
        status_map = {
            'api': 'online',
            'database': 'online',
            'storage': 'online',
        }

        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            status_map['database'] = 'offline'

        return Response({
            **status_map,
            'last_checked': timezone.now().isoformat(),
        })

    @action(detail=False, methods=['get'])
    def pending_vendors(self, request):
        """Get list of pending vendor approvals"""
        pending_vendors = User.objects.filter(
            user_type='vendor',
            is_verified=False
        )
        return Response(UserSerializer(pending_vendors, many=True).data)

    @action(detail=True, methods=['post'])
    def approve_vendor(self, request, pk=None):
        """Approve a vendor"""
        try:
            vendor = User.objects.get(pk=pk, user_type='vendor')
            vendor.is_verified = True
            vendor.save()
            return Response({'message': 'Vendor approved successfully'})
        except User.DoesNotExist:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def reject_vendor(self, request, pk=None):
        """Reject a vendor"""
        try:
            vendor = User.objects.get(pk=pk, user_type='vendor')
            vendor.is_active = False
            vendor.save()
            return Response({'message': 'Vendor rejected'})
        except User.DoesNotExist:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def pending_products(self, request):
        """Get list of pending product approvals"""
        pending_products = Product.objects.filter(approval_status='pending')
        return Response(ProductSerializer(pending_products, many=True).data)

    @action(detail=True, methods=['post'])
    def approve_product(self, request, pk=None):
        """Approve a product"""
        product = get_object_or_404(Product, id=pk)
        
        product.approval_status = 'approved'
        product.save()
        
        # Send notification to vendor (async task would be better)
        # Notification.objects.create(
        #    user=product.vendor,
        #    message=f'Your product {product.name} has been approved.',
        #    type='product_approved'
        # )
        
        return Response({
            'id': product.id,
            'name': product.name,
            'status': product.approval_status,
            'message': f'Product {product.name} has been approved.'
        })
        
    # Helper methods for dashboard metrics
    def get_recent_activities(self):
        """Get recent activities for the dashboard"""
        # Combine recent orders, new users, and product additions
        activities = []
        
        # Recent orders (last 5)
        try:
            recent_orders = Order.objects.all().order_by('-created_at')[:5]
            for order in recent_orders:
                activities.append({
                    'id': f'order_{order.id}',
                    'type': 'order',
                    'title': f'New Order #{order.id}',
                    'description': f'Order placed by {order.user.email}',
                    'timestamp': order.created_at.isoformat(),
                    'link': f'/administrator/orders/{order.id}'
                })
        except Exception as e:
            logger.error(f'Error getting recent orders: {str(e)}')
        
        # Recent user registrations (last 5)
        try:
            recent_users = User.objects.all().order_by('-date_joined')[:5]
            for user in recent_users:
                activities.append({
                    'id': f'user_{user.id}',
                    'type': 'user',
                    'title': 'New User Registration',
                    'description': f'{user.email} joined as {user.user_type}',
                    'timestamp': user.date_joined.isoformat(),
                    'link': f'/administrator/users/{user.id}'
                })
        except Exception as e:
            logger.error(f'Error getting recent users: {str(e)}')
        
        # Recent product additions (last 5)
        try:
            recent_products = Product.objects.all().order_by('-created_at')[:5]
            for product in recent_products:
                activities.append({
                    'id': f'product_{product.id}',
                    'type': 'product',
                    'title': 'New Product Added',
                    'description': f'{product.name}',
                    'timestamp': product.created_at.isoformat(),
                    'link': f'/administrator/products/{product.id}'
                })
        except Exception as e:
            logger.error(f'Error getting recent products: {str(e)}')

        return sorted(activities, key=lambda x: x['timestamp'], reverse=True)[:10]

    def get_sales_over_time(self, range_days: int = 30, group_by: str = 'day'):
        """Get sales data for chart visualization"""
        try:
            now = timezone.now()
            start = (now - timedelta(days=max(1, range_days) - 1)).date()

            daily = []
            for i in range(max(1, range_days)):
                day = start + timedelta(days=i)
                # Use delivered orders like total_sales calculation for consistency
                day_orders = Order.objects.filter(
                    created_at__date=day,
                    status__in=['delivered', 'completed']
                )
                amount = day_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
                day_new_users = User.objects.filter(date_joined__date=day).count()
                daily.append({
                    'date': day.isoformat(),
                    'value': float(amount),
                    'orders': int(day_orders.count()),
                    'users': int(day_new_users),
                })

            if group_by not in {'day', 'week', 'month'}:
                group_by = 'day'

            if group_by == 'day':
                return daily

            grouped = {}
            for row in daily:
                d = timezone.datetime.fromisoformat(row['date']).date()
                if group_by == 'week':
                    # Monday as week start
                    key_date = d - timedelta(days=d.weekday())
                else:
                    key_date = d.replace(day=1)

                key = key_date.isoformat()
                if key not in grouped:
                    grouped[key] = {'date': key, 'value': 0.0, 'orders': 0, 'users': 0}
                grouped[key]['value'] += float(row.get('value') or 0)
                grouped[key]['orders'] += int(row.get('orders') or 0)
                grouped[key]['users'] += int(row.get('users') or 0)

            return sorted(grouped.values(), key=lambda x: x['date'])
        except Exception as e:
            logger.error(f'Error getting sales over time: {str(e)}')
            fallback_date = timezone.now().date().isoformat()
            return [{'date': fallback_date, 'value': 0, 'orders': 0, 'users': 0}]

    def get_top_products(self):
        """Get top performing products"""
        try:
            # OrderItem.price already contains the total (unit_price × quantity), so don't multiply again
            rows = (
                OrderItem.objects.filter(order__status__in=['delivered', 'completed'])
                .exclude(order__status__in=['cancelled', 'refunded', 'rejected'])
                .values('product_id', 'product__name')
                .annotate(
                    sales=Sum('quantity'),
                    revenue=Sum('price')  # price is already the total for this item
                )
                .order_by('-revenue')[:5]
            )
            
            top_products = []
            for row in rows:
                top_products.append({
                    'id': str(row.get('product_id')),
                    'name': row.get('product__name') or 'Unknown',
                    'sales': int(row.get('sales') or 0),
                    'revenue': float(row.get('revenue') or 0),
                })

            if top_products:
                return top_products

            recent_products = Product.objects.all().order_by('-created_at')[:5]
            return [
                {
                    'id': str(product.id),
                    'name': product.name,
                    'sales': 0,
                    'revenue': float(product.price or 0),
                }
                for product in recent_products
            ]
        except Exception as e:
            logger.error(f'Error getting top products: {str(e)}')
            return []

    def get_top_vendors(self):
        """Get top performing vendors"""
        try:
            # OrderItem.price already contains the total (unit_price × quantity), so don't multiply again
            rows = (
                OrderItem.objects.filter(order__status__in=['delivered', 'completed'])
                .exclude(order__status__in=['cancelled', 'refunded', 'rejected'])
                .values('product__vendor_id', 'product__vendor__store_name', 'product__vendor__email', 
                       'product__vendor__first_name', 'product__vendor__last_name')
                .annotate(
                    orders=Count('order_id', distinct=True),
                    items_sold=Sum('quantity'),
                    revenue=Sum('price')  # price is already the total for this item
                )
                .order_by('-revenue')[:5]
            )
            
            top_vendors = []
            for row in rows:
                vendor_id = row.get('product__vendor_id')
                # Try to get the best name: store_name first, then full name, then email
                store_name = row.get('product__vendor__store_name')
                first_name = row.get('product__vendor__first_name', '').strip()
                last_name = row.get('product__vendor__last_name', '').strip()
                email = row.get('product__vendor__email')
                
                if store_name:
                    name = store_name
                elif first_name or last_name:
                    name = f"{first_name} {last_name}".strip()
                else:
                    name = email or 'Vendor'
                
                top_vendors.append({
                    'id': str(vendor_id),
                    'name': name,
                    'sales': int(row.get('orders') or 0),
                    'items_sold': int(row.get('items_sold') or 0),
                    'revenue': float(row.get('revenue') or 0),
                })

            if top_vendors:
                return top_vendors

            recent_vendors = User.objects.filter(user_type='vendor').order_by('-date_joined')[:5]
            return [
                {
                    'id': str(vendor.id),
                    'name': vendor.store_name or f"{vendor.first_name or ''} {vendor.last_name or ''}".strip() or vendor.email,
                    'sales': 0,
                    'revenue': 0,
                }
                for vendor in recent_vendors
            ]
        except Exception as e:
            logger.error(f'Error getting top vendors: {str(e)}')
            return []

    @action(detail=True, methods=['post'])
    def reject_product(self, request, pk=None):
        """Reject a product"""
        try:
            product = Product.objects.get(pk=pk)
            product.approval_status = 'rejected'
            product.approval_note = request.data.get('note', '')
            product.save()
            return Response({'message': 'Product rejected'})
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='payouts')
    def get_payout_requests(self, request):
        """Get all payout requests for admin review"""
        try:
            status_filter = request.query_params.get('status', 'all')
            
            # Base queryset
            queryset = PayoutRequest.objects.all().select_related('vendor').order_by('-created_at')
            
            # Apply status filter
            if status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
            
            # Note: This code block is no longer used as the ViewSet uses PayoutRequestSerializer
            # Keeping it for reference only
            payout_data = []
            
            return Response({
                'payout_requests': payout_data,
                'total_count': queryset.count(),
                'pending_count': PayoutRequest.objects.filter(status='pending').count(),
                'approved_count': PayoutRequest.objects.filter(status='approved').count(),
                'completed_count': PayoutRequest.objects.filter(status__in=['completed', 'processed']).count()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch payout requests: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='payouts/(?P<payout_id>[^/.]+)/approve')
    def approve_payout(self, request, payout_id=None):
        """Approve a payout request"""
        try:
            payout = PayoutRequest.objects.get(id=payout_id)
            
            if payout.status != 'pending':
                return Response(
                    {'error': 'Only pending payouts can be approved'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            payout.status = 'approved'
            payout.admin_notes = request.data.get('admin_notes', '')
            payout.completed_by = request.user
            payout.completed_at = timezone.now()
            payout.save()
            
            # Create notification for vendor
            try:
                Notification.objects.create(
                    recipient=payout.vendor,
                    title='Payout Request Approved',
                    message=f'Your payout request of ${payout.amount} has been approved and will be completed soon.',
                    notification_type='payout_approved'
                )
            except Exception:
                pass
            
            return Response({
                'message': 'Payout request approved successfully',
                'payout_id': payout.id,
                'status': payout.status
            })
            
        except PayoutRequest.DoesNotExist:
            return Response(
                {'error': 'Payout request not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to approve payout: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='payouts/(?P<payout_id>[^/.]+)/reject')
    def reject_payout(self, request, payout_id=None):
        """Reject a payout request"""
        try:
            payout = PayoutRequest.objects.get(id=payout_id)
            
            if payout.status != 'pending':
                return Response(
                    {'error': 'Only pending payouts can be rejected'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            payout.status = 'rejected'
            payout.admin_notes = request.data.get('admin_notes', 'Payout request rejected by admin')
            payout.completed_by = request.user
            payout.completed_at = timezone.now()
            payout.save()
            
            # Create notification for vendor
            try:
                Notification.objects.create(
                    recipient=payout.vendor,
                    title='Payout Request Rejected',
                    message=f'Your payout request of ${payout.amount} has been rejected. Reason: {payout.admin_notes}',
                    notification_type='payout_rejected'
                )
            except Exception:
                pass
            
            return Response({
                'message': 'Payout request rejected',
                'payout_id': payout.id,
                'status': payout.status
            })
            
        except PayoutRequest.DoesNotExist:
            return Response(
                {'error': 'Payout request not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to reject payout: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Note: Automated payout processing is now handled by VendorPayoutViewSet.process_payout()
    # This provides fake payment gateway integration with automatic receipt generation

class VendorDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        if not request.user.is_vendor:
            return Response(
                {'detail': 'Only vendors can access this dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get vendor statistics
        products_count = Product.objects.filter(vendor=request.user).count()
        orders_count = Order.objects.filter(items__product__vendor=request.user).distinct().count()
        total_earnings = Transaction.objects.filter(
            vendor=request.user,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'products_count': products_count,
            'orders_count': orders_count,
            'total_earnings': total_earnings,
            'is_verified': request.user.is_verified
        })

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        if not request.user.is_vendor:
            return Response(
                {'detail': 'Only vendors can access analytics'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get analytics data
        today = timezone.now()
        last_month = today - timedelta(days=30)

        # Monthly sales
        monthly_sales = Transaction.objects.filter(
            order__items__product__vendor=request.user,
            status='completed',
            created_at__gte=last_month
        ).aggregate(
            total_sales=Sum('amount'),
            total_orders=Count('order', distinct=True)
        )

        # Best selling products
        best_selling = OrderItem.objects.filter(
            product__vendor=request.user,
            order__created_at__gte=last_month
        ).values('product__name', 'product__id').annotate(
            total_sold=Sum('quantity'),
            revenue=Sum('price')
        ).order_by('-total_sold')[:5]

        # Order status distribution
        order_statuses = Order.objects.filter(
            items__product__vendor=request.user
        ).values('status').annotate(
            count=Count('id')
        )

        # Vendor earnings
        vendor_earnings = VendorEarning.objects.filter(
            vendor=request.user,
            status='paid'
        ).aggregate(
            total_earnings=Sum('amount')
        )

        return Response({
            'monthly_sales': monthly_sales,
            'best_selling_products': best_selling,
            'order_status_distribution': order_statuses,
            'vendor_earnings': vendor_earnings
        })

class VendorProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for now

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Product.objects.none()
        return Product.objects.filter(vendor=self.request.user).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'next': None,
            'previous': None,
            'results': serializer.data
        })

    def create(self, request, *args, **kwargs):
        print("\n=== CREATE PRODUCT REQUEST ===")
        print("Raw request data:", request.data)
        print("Request FILES:", request.FILES)
        print("Request user:", request.user.id, request.user.email)
        
        # Log category data
        category_id = request.data.get('category')
        if category_id:
            try:
                from .models import Category
                category = Category.objects.get(id=category_id)
                print(f"Category found: {category.id} - {category.name}")
            except (Category.DoesNotExist, ValueError) as e:
                print(f"Category error: {str(e)}")
        
        # Handle file upload
        if 'image' in request.FILES:
            request.data._mutable = True
            request.data['image'] = request.FILES['image']
            request.data._mutable = False
            print("Image file found and added to request data")
        else:
            print("No image file found in request")
        
        try:
            response = super().create(request, *args, **kwargs)
            print("Product created successfully:", response.data)
            return response
        except Exception as e:
            print("Error creating product:", str(e))
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        try:
            print("Saving product with vendor:", self.request.user.email)
            product = serializer.save(vendor=self.request.user)
            print(f"Product saved successfully. ID: {product.id}, Name: {product.name}")
        except Exception as e:
            print("Error in perform_create:", str(e))
            raise

class VendorOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.filter(
            items__product__vendor=self.request.user
        ).distinct()
        
        # Order: pending/unfinished first, then recently completed, then old completed
        # Pending/unfinished statuses: pending, awaiting_approval, approved, processing, shipped
        # Completed statuses: delivered, completed
        from django.db.models import Case, When, IntegerField
        
        queryset = queryset.annotate(
            priority=Case(
                # High priority (0): pending, awaiting_approval, approved, processing, shipped
                When(status__in=['pending', 'awaiting_approval', 'approved', 'processing', 'shipped'], then=0),
                # Medium priority (1): recently completed (within last 7 days)
                When(
                    status__in=['delivered', 'completed'],
                    created_at__gte=timezone.now() - timezone.timedelta(days=7),
                    then=1
                ),
                # Low priority (2): old completed orders
                default=2,
                output_field=IntegerField(),
            )
        ).order_by('priority', '-created_at')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def start_processing(self, request, pk=None):
        """Start processing an approved order"""
        order = get_object_or_404(Order, id=pk, items__product__vendor=request.user)
        
        if not order.can_vendor_process():
            return Response(
                {'error': 'Order is not ready for processing or not approved by admin'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if order.status != 'approved':
            return Response(
                {'error': 'Order must be approved before processing'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'processing'
        order.processing_started_at = timezone.now()
        order.save()
        
        # Notify customer
        try:
            Notification.objects.create(
                recipient=order.user,
                title='Order Processing Started',
                message=f'Your order #{order.id} is now being completed.',
                notification_type='order_processing_started',
                related_order_id=order.id,
            )
            logger.info(f"Created processing notification for customer {order.user.username} for order {order.id}")
        except Exception as e:
            logger.error(f"Failed to create processing notification for customer: {str(e)}", exc_info=True)
        
        # Notify vendor that they have started processing
        try:
            Notification.objects.create(
                recipient=request.user,
                title='Order Processing Started',
                message=f'You have started processing order #{order.id}. Please ship it to the customer.',
                notification_type='order_processing_started',
                related_order_id=order.id,
            )
            logger.info(f"Created processing notification for vendor {request.user.username} for order {order.id}")
        except Exception as e:
            logger.error(f"Failed to create processing notification for vendor: {str(e)}", exc_info=True)
        
        return Response({'message': 'Order processing started successfully'})
    
    @action(detail=True, methods=['post'])
    def mark_shipped(self, request, pk=None):
        """Mark order as shipped with tracking number"""
        order = get_object_or_404(Order, id=pk, items__product__vendor=request.user)
        
        if order.status != 'processing':
            return Response(
                {'error': 'Order must be in processing status to mark as shipped'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tracking_number = request.data.get('tracking_number', '')
        if not tracking_number:
            return Response(
                {'error': 'Tracking number is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'shipped'
        order.tracking_number = tracking_number
        order.shipped_at = timezone.now()
        order.save()
        
        # Notify customer
        try:
            Notification.objects.create(
                recipient=order.user,
                title='Order Shipped',
                message=f'Your order #{order.id} has been shipped. Tracking: {tracking_number}',
                notification_type='order_shipped',
                related_order_id=order.id,
            )
        except Exception:
            pass
        
        return Response({'message': 'Order marked as shipped successfully'})

    # Vendors can no longer mark orders as delivered
    # Only admin can confirm delivery after buyer receives the goods

class VendorEarningViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = VendorEarningSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VendorEarning.objects.filter(vendor=self.request.user)

class BuyerOrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class BuyerWishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Wishlist.objects.none()
        return Wishlist.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class BuyerCartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Cart.objects.none()
        return Cart.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.filter(is_active=True)
    serializer_class = TestimonialSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [permissions.AllowAny()]

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'price']
    
    def filter_queryset(self, queryset):
        # Apply search and ordering filters first
        queryset = super().filter_queryset(queryset)
        
        # Handle category filtering
        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category__slug=category_param)
        
        # Handle featured filtering
        featured_param = self.request.query_params.get('featured')
        if featured_param:
            queryset = queryset.filter(featured=True)
        
        # Handle vendor filtering
        vendor_param = self.request.query_params.get('vendor')
        if vendor_param:
            queryset = queryset.filter(vendor_id=vendor_param)
            
        return queryset

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Product.objects.none()
        
        # Start with base queryset
        if self.request.user.is_authenticated:
            if self.request.user.user_type == 'administrator':
                # Admins can see all products
                queryset = Product.objects.all()
            elif self.request.user.user_type == 'vendor':
                # Vendors can see their own products (any status) + approved products from others
                queryset = Product.objects.filter(
                    Q(vendor=self.request.user) | 
                    Q(approval_status='approved', is_active=True)
                ).distinct()
            else:
                # Authenticated buyers can only see approved and active products
                queryset = Product.objects.filter(
                    approval_status='approved',
                    is_active=True
                )
        else:
            # Public users can only see approved and active products
            queryset = Product.objects.filter(
                approval_status='approved',
                is_active=True
            )
        
        # Apply additional filtering
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        category_param = self.request.query_params.get('category')
        
        # Handle price filtering
        if min_price is not None:
            try:
                min_price = float(min_price)
                queryset = queryset.filter(price__gte=min_price)
            except (ValueError, TypeError):
                pass
                
        if max_price is not None:
            try:
                max_price = float(max_price)
                queryset = queryset.filter(price__lte=max_price)
            except (ValueError, TypeError):
                pass
        
        # Handle category filtering by slug
        if category_param:
            queryset = queryset.filter(category__slug=category_param)
        
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            if self.action == 'destroy' and self.request.user.is_authenticated and self.request.user.user_type == 'administrator':
                return [IsAuthenticated()]  # Allow admins to delete
            return [IsAuthenticated(), IsVendorOrReadOnly()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_products = Product.objects.filter(
            featured=True,
            is_active=True,
            approval_status='approved'
        ).order_by('-created_at')[:8]
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        product = self.get_object()
        product.approval_status = 'approved'
        product.is_active = True  # Ensure product is also active
        product.save()
        return Response({"detail": "Product approved successfully."})
    
    @action(detail=False, methods=['get'])
    def debug_products(self, request):
        """Debug endpoint to check product statuses"""
        from django.db.models import Count
        stats = {
            'total_products': Product.objects.count(),
            'approved_products': Product.objects.filter(approval_status='approved').count(),
            'active_products': Product.objects.filter(is_active=True).count(),
            'approved_and_active': Product.objects.filter(approval_status='approved', is_active=True).count(),
            'pending_products': Product.objects.filter(approval_status='pending').count(),
        }
        
        # Get sample products
        sample_products = list(Product.objects.values(
            'id', 'name', 'approval_status', 'is_active', 'category__slug'
        )[:10])
        
        return Response({
            'stats': stats,
            'sample_products': sample_products,
            'query_params': dict(request.query_params)
        })

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Order.objects.none()
        user = self.request.user
        if user.is_administrator:
            queryset = Order.objects.all()
        elif user.is_vendor:
            queryset = Order.objects.filter(items__product__vendor=user).distinct()
        else:
            queryset = Order.objects.filter(user=user)
        
        # Order: pending/unfinished first, then recently completed, then old completed
        # Pending/unfinished statuses: pending, awaiting_approval, approved, processing, shipped
        # Completed statuses: delivered, completed
        from django.db.models import Case, When, IntegerField
        
        queryset = queryset.annotate(
            priority=Case(
                # High priority (0): pending, awaiting_approval, approved, processing, shipped
                When(status__in=['pending', 'awaiting_approval', 'approved', 'processing', 'shipped'], then=0),
                # Medium priority (1): recently completed (within last 7 days)
                When(
                    status__in=['delivered', 'completed'],
                    created_at__gte=timezone.now() - timezone.timedelta(days=7),
                    then=1
                ),
                # Low priority (2): old completed orders
                default=2,
                output_field=IntegerField(),
            )
        ).order_by('priority', '-created_at')
        
        return queryset

    def create(self, request, *args, **kwargs):
        """Create an order from a list of items {product_id, quantity}.

        Expects payload:
        {
          "items": [{"product_id": <id>, "quantity": <int>}],
          "shipping_address": "...",
          "payment_method": "stripe" | "paypal" | "bank_transfer" (optional),
          "payment_details": { ... } (optional)
        }
        """
        try:
            items = request.data.get('items', []) or []
            if not isinstance(items, list) or not items:
                return Response({'detail': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

            shipping_address = request.data.get('shipping_address', '')
            if not shipping_address:
                return Response({'detail': 'Shipping address is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Compute totals and validate products
            from decimal import Decimal
            subtotal = Decimal('0.00')
            order_items_data = []

            for entry in items:
                product_id = entry.get('product_id') or entry.get('product')
                quantity = entry.get('quantity', 1)
                try:
                    quantity = int(quantity)
                    if quantity < 1:
                        quantity = 1
                except (TypeError, ValueError):
                    quantity = 1

                try:
                    product = Product.objects.get(pk=product_id)
                except Product.DoesNotExist:
                    return Response({'detail': f'Product {product_id} not found'}, status=status.HTTP_404_NOT_FOUND)

                line_total = (product.price or Decimal('0.00')) * Decimal(quantity)
                subtotal += line_total
                order_items_data.append({
                    'product': product,
                    'quantity': quantity,
                    # Store total line price in OrderItem.price (model computes fees from this)
                    'price': line_total
                })

            # Calculate Discount
            discount_amount = Decimal('0.00')
            coupon_code = request.data.get('coupon_code')
            applied_coupon = None

            if coupon_code:
                try:
                    coupon = Coupon.objects.get(code=coupon_code.upper())
                    is_valid, msg = coupon.can_use(request.user)
                    if is_valid:
                        discount_amount = coupon.calculate_discount(subtotal)
                        applied_coupon = coupon
                    else:
                        # Optionally warn the user, but for now we just ignore invalid coupons or log it
                        logger.warning(f"Invalid coupon {coupon_code} used by user {request.user.id}: {msg}")
                except Coupon.DoesNotExist:
                    pass

            total_amount = subtotal - discount_amount
            if total_amount < 0:
                total_amount = Decimal('0.00')

            # Create order
            order = Order.objects.create(
                user=request.user,
                subtotal=subtotal,
                discount_amount=discount_amount,
                applied_coupon=applied_coupon,
                total_amount=total_amount,
                shipping_address=shipping_address,
                status='pending'
            )

            # Record coupon usage
            if applied_coupon:
                applied_coupon.apply_to_order(request.user)
                # Link usage to order
                # The apply_to_order creates usage but doesn't link order immediately if we didn't pass it
                # actually model method: CouponUsage.objects.create(coupon=self, user=user)
                # We need to update that usage to link to this order, or update the model method.
                # Let's manually handle it here to be safe and link the order.
                
                # Re-reading model: apply_to_order(self, user) creates usage. 
                # Let's fix this interaction. Better to just create usage here directly or update the last one.
                # Actually, let's update the usage record created by apply_to_order if possible, 
                # OR just manually create it here correctly.
                
                # Let's do it manually here to ensure order linkage:
                # applied_coupon.times_used += 1
                # applied_coupon.save()
                # CouponUsage.objects.create(coupon=applied_coupon, user=request.user, order=order, discount_amount=discount_amount)
                # But wait, I shouldn't duplicate logic. 
                # Let's check model again... apply_to_order doesn't take order arg. 
                # I will update the usage record found or just create one here.
                latest_usage = CouponUsage.objects.filter(coupon=applied_coupon, user=request.user).order_by('-used_at').first()
                if latest_usage and not latest_usage.order:
                    latest_usage.order = order
                    latest_usage.discount_amount = discount_amount
                    latest_usage.save()
                else: 
                     # Fallback if apply_to_order logic changes or race condition
                     # Actually, apply_to_order was called above.
                     pass
                     
            # Create items
            for oi in order_items_data:
                OrderItem.objects.create(
                    order=order,
                    product=oi['product'],
                    quantity=oi['quantity'],
                    price=oi['price']
                )

            # Optionally create a pending transaction record
            payment_method = request.data.get('payment_method')
            payment_details = request.data.get('payment_details', {}) or {}
            if payment_method in ['stripe', 'visa_card', 'paypal', 'bank_transfer']:
                import uuid
                Transaction.objects.create(
                    order=order,
                    transaction_id=str(uuid.uuid4()),
                    amount=total_amount,
                    status='pending',
                    payment_method=payment_method,
                    payment_details=payment_details
                )

            serializer = self.get_serializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Order creation error: {str(e)}", exc_info=True)
            return Response({'detail': 'Failed to create order'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only vendors or admins can update to 'shipped'
        if new_status == 'shipped' and not (request.user.is_vendor or request.user.is_administrator):
            return Response(
                {'error': 'Only vendors or administrators can mark orders as shipped'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Only admins can mark as delivered or completed
        if new_status in ['delivered', 'completed'] and not request.user.is_administrator:
            return Response(
                {'error': f'Only administrators can mark orders as {new_status}'},
                status=status.HTTP_403_FORBIDDEN
            )

        order.status = new_status
        order.save()
        return Response({'message': f'Order status updated to {new_status}'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an order - sets admin_approved and allows vendor processing"""
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can approve orders'},
                status=status.HTTP_403_FORBIDDEN
            )

        order = self.get_object()
        notes = request.data.get('notes', '')

        # Update order approval fields
        order.admin_approved = True
        order.admin_approved_by = request.user
        order.admin_approval_date = timezone.now()
        order.admin_notes = notes
        order.vendor_can_process = True  # Allow vendor to process the order
        order.status = 'approved'
        order.save()

        # Create notifications for all vendors in this order
        from .models import Notification, User
        vendors_notified = set()
        for item in order.items.all():
            if item.product.vendor and item.product.vendor.id not in vendors_notified:
                Notification.objects.create(
                    recipient=item.product.vendor,
                    notification_type='order_approved',
                    title=f'Order #{order.id} Approved',
                    message=f'Your order #{order.id} has been approved by the administrator. You can now process this order.',
                    related_order_id=order.id,
                    related_product_id=item.product.id
                )
                vendors_notified.add(item.product.vendor.id)

        # Notify administrators of the order approval
        admins = User.objects.filter(user_type='administrator')
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notification_type='order_approved',
                title=f'Order #{order.id} Approved Successfully',
                message=f'Order #{order.id} has been approved and vendors have been notified to process it.',
                related_order_id=order.id
            )

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an order"""
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can reject orders'},
                status=status.HTTP_403_FORBIDDEN
            )

        order = self.get_object()
        notes = request.data.get('notes', '')

        # Update order rejection fields
        order.admin_approved = False
        order.admin_notes = notes
        order.status = 'rejected'
        order.vendor_can_process = False
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        """Mark order as shipped - vendors or admins can do this"""
        order = self.get_object()

        if not (request.user.is_vendor or request.user.is_administrator):
            return Response(
                {'error': 'Only vendors or administrators can mark orders as shipped'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if order is approved and can be processed
        if not order.admin_approved or not order.vendor_can_process:
            return Response(
                {'error': 'Order must be approved before shipping'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tracking_number = request.data.get('tracking_number', '')
        order.status = 'shipped'
        order.tracking_number = tracking_number
        order.shipped_at = timezone.now()
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark order as delivered/completed - only admins can do this"""
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can mark orders as completed'},
                status=status.HTTP_403_FORBIDDEN
            )

        order = self.get_object()
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()

        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def get_invoice(self, request, pk=None):
        """Get invoice data for an order"""
        try:
            order = self.get_object()
            
            # Check permissions - user can only view their own orders or admin can view all
            if not request.user.is_administrator and order.user != request.user:
                return Response(
                    {'error': 'You do not have permission to view this invoice'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Return the order data with invoice information
            serializer = self.get_serializer(order)
            invoice_data = serializer.data
            
            # Add invoice-specific fields
            invoice_data['invoice_number'] = f'INV-{order.id}'
            invoice_data['invoice_date'] = order.created_at
            invoice_data['company_info'] = {
                'name': 'Tes Market',
                'email': 'admin@tesmarket.com',
                'phone': '+1 (555) 123-4567',
                'address': 'Your Trusted Marketplace'
            }
            
            return Response(invoice_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate invoice: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def buyer_orders(self, request):
        """Get orders for the current buyer"""
        if request.user.is_administrator:
            orders = Order.objects.all()
        else:
            orders = Order.objects.filter(user=request.user)
        
        serializer = self.get_serializer(orders, many=True)
        return Response({'data': serializer.data})

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Transaction.objects.none()
        user = self.request.user
        if user.is_administrator:
            return Transaction.objects.all()
        return Transaction.objects.filter(order__user=user)

    @action(detail=True, methods=['post'])
    def approve_payment(self, request, pk=None):
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can approve payments'},
                status=status.HTTP_403_FORBIDDEN
            )

        transaction = self.get_object()
        transaction.admin_approved = True
        transaction.admin_note = request.data.get('note', '')
        transaction.save()

        # Create vendor earnings
        for item in transaction.order.items.all():
            VendorEarning.objects.create(
                vendor=item.product.vendor,
                order_item=item,
                amount=item.vendor_earning
            )

        return Response({'message': 'Payment approved and vendor earnings created'})

class CartItemViewSet(viewsets.ModelViewSet):
    """Simple ViewSet for individual cart items"""
    serializer_class = CartSerializer  # We'll return the full cart
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CartItem.objects.none()
        # Get cart items for the current user's cart
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return CartItem.objects.filter(cart=cart)
    
    def create(self, request, *args, **kwargs):
        """Add an item to the cart"""
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create cart for the user
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        product_id = request.data.get('product_id') or request.data.get('product')
        quantity = request.data.get('quantity', 1)
        variant_id = request.data.get('variant_id') or request.data.get('variant')
        
        if not product_id:
            return Response(
                {'error': 'Product ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quantity = int(quantity)
            if quantity < 1:
                quantity = 1
        except (TypeError, ValueError):
            quantity = 1
        
        try:
            product = Product.objects.get(pk=product_id)
            variant = None
            if variant_id:
                variant = ProductVariant.objects.get(pk=variant_id)
            
            # Get or create cart item
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                variant=variant,
                defaults={'quantity': quantity}
            )
            
            if not created:
                # Item already exists, increment quantity
                cart_item.quantity += quantity
                cart_item.save(update_fields=['quantity'])
            
            # Return the full updated cart
            return Response(
                CartSerializer(cart, context={'request': request}).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
            
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ProductVariant.DoesNotExist:
            return Response(
                {'error': 'Product variant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, *args, **kwargs):
        """Update cart item quantity"""
        try:
            cart, _ = Cart.objects.get_or_create(user=self.request.user)
            item = CartItem.objects.get(id=kwargs['pk'], cart=cart)
            
            quantity = request.data.get('quantity')
            if quantity is not None:
                quantity = int(quantity)
                if quantity < 1:
                    return Response({'error': 'Quantity must be at least 1'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
                item.quantity = quantity
                item.save()
            
            # Return the full cart
            return Response(CartSerializer(cart, context={'request': request}).data)
            
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid quantity'}, 
                          status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete cart item"""
        try:
            cart, _ = Cart.objects.get_or_create(user=self.request.user)
            item = CartItem.objects.get(id=kwargs['pk'], cart=cart)
            item.delete()
            
            # Return the full cart
            return Response(CartSerializer(cart, context={'request': request}).data)
            
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, 
                          status=status.HTTP_404_NOT_FOUND)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Cart.objects.none()
        return Cart.objects.filter(user=self.request.user)

    def _get_or_create_cart(self):
        """Helper to get or create the current user's cart."""
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart

    def list(self, request, *args, **kwargs):
        """Return a single cart object for the current user.

        Frontend expects GET /api/cart/ to return an object, not a list.
        """
        cart = self._get_or_create_cart()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='items')
    def add_item(self, request):
        """Add an item to the current user's cart.

        Matches frontend: POST /api/cart/items/ with body { product_id, quantity?, variant_id? }
        """
        cart = self._get_or_create_cart()
        product_id = request.data.get('product_id') or request.data.get('product')
        quantity = request.data.get('quantity', 1)
        variant_id = request.data.get('variant_id') or request.data.get('variant')

        try:
            quantity = int(quantity)
            if quantity < 1:
                quantity = 1
        except (TypeError, ValueError):
            quantity = 1

        try:
            product = Product.objects.get(pk=product_id)
            variant = None
            if variant_id:
                variant = ProductVariant.objects.get(pk=variant_id)

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                variant=variant,
                defaults={'quantity': quantity}
            )

            if not created:
                cart_item.quantity = cart_item.quantity + quantity
                cart_item.save(update_fields=['quantity'])

            # Return updated cart payload
            return Response(CartSerializer(cart, context={'request': request}).data)
        except (Product.DoesNotExist, ProductVariant.DoesNotExist):
            return Response(
                {'error': 'Product or variant not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['patch'], url_path='items/(?P<item_id>[^/.]+)')
    def update_item(self, request, item_id=None):
        """Update a cart item's quantity or variant.

        Matches frontend: PATCH /api/cart/items/{id}/ with body { quantity? }
        """
        cart = self._get_or_create_cart()
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)

        quantity = request.data.get('quantity')
        if quantity is not None:
            try:
                quantity = int(quantity)
                if quantity < 1:
                    return Response({'error': 'Quantity must be at least 1'}, status=status.HTTP_400_BAD_REQUEST)
                item.quantity = quantity
            except (TypeError, ValueError):
                return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)

        item.save()
        cart = self._get_or_create_cart()
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['delete'], url_path=r'items/(?P<item_id>[^/.]+)')
    def delete_item(self, request, item_id=None):
        """Remove a cart item.

        Matches frontend: DELETE /api/cart/items/{id}/
        """
        cart = self._get_or_create_cart()
        deleted, _ = CartItem.objects.filter(id=item_id, cart=cart).delete()
        if not deleted:
            return Response({'error': 'Cart item not found'}, status=status.HTTP_404_NOT_FOUND)
        cart = self._get_or_create_cart()
        return Response(CartSerializer(cart, context={'request': request}).data)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all items from the current user's cart.

        Matches frontend: DELETE /api/cart/
        """
        cart = self._get_or_create_cart()
        cart.items.all().delete()
        return Response(CartSerializer(cart, context={'request': request}).data)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # handle schema generation
            return Wishlist.objects.none()
        return Wishlist.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Add an item to the wishlist"""
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create wishlist for the user
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        
        product_id = request.data.get('product_id') or request.data.get('product')
        
        if not product_id:
            return Response(
                {'error': 'Product ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(pk=product_id)
            
            # Check if item already exists
            wishlist_item, created = WishlistItem.objects.get_or_create(
                wishlist=wishlist,
                product=product
            )
            
            if created:
                message = 'Item added to wishlist'
                status_code = status.HTTP_201_CREATED
            else:
                message = 'Item already in wishlist'
                status_code = status.HTTP_200_OK
            
            # Return the full wishlist
            return Response(
                {
                    'message': message,
                    'wishlist': WishlistSerializer(wishlist, context={'request': request}).data
                },
                status=status_code
            )
            
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        wishlist = self.get_object()
        product_id = request.data.get('product')

        try:
            product = Product.objects.get(pk=product_id)
            WishlistItem.objects.get_or_create(
                wishlist=wishlist,
                product=product
            )
            return Response({'message': 'Item added to wishlist'})
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_permissions(self):
        """
        Allow public access to list vendors, but require authentication for other actions
        """
        if self.action == 'list' and self.request.query_params.get('user_type') == 'vendor':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def vendors_by_category(self, request):
        """
        Get vendors filtered by category and search term.
        Query params:
        - category_id: ID of the category to filter by (optional)
        - search: Search term for vendor name or store name (optional)
        """
        from django.db.models import Prefetch, Q, Count
        
        category_id = request.query_params.get('category_id')
        search_query = request.query_params.get('search', '')
        
        # Base queryset for vendors
        vendors = User.objects.filter(
            user_type='vendor',
            is_active=True,
            is_verified=True
        )
        
        # Filter by category if provided
        if category_id:
            vendors = vendors.filter(
                products__category_id=category_id,
                products__is_active=True,
                products__approval_status='approved'
            ).distinct()
        
        # Apply search if provided
        if search_query:
            vendors = vendors.filter(
                Q(store_name__icontains=search_query) |
                Q(username__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query)
            )
        
        # Prefetch related data to optimize queries
        vendors = vendors.prefetch_related(
            Prefetch(
                'products',
                queryset=Product.objects.filter(is_active=True, approval_status='approved'),
                to_attr='active_products'
            )
        ).distinct()
        
        # Get unique categories for each vendor
        vendor_data = []
        for vendor in vendors:
            # Get unique categories from active products
            categories = set()
            for product in getattr(vendor, 'active_products', []):
                if product.category:
                    categories.add((product.category.id, product.category.name))
            
            # Get avatar URL if exists
            avatar_url = None
            if vendor.profile_image:
                avatar_url = request.build_absolute_uri(vendor.profile_image.url)
            
            vendor_data.append({
                'id': vendor.id,
                'name': vendor.get_full_name() or vendor.username,
                'store_name': vendor.store_name or 'Vendor Store',
                'email': vendor.email,
                'avatar': avatar_url,
                'categories': [{'id': cat_id, 'name': name} for cat_id, name in categories],
                'product_count': len(getattr(vendor, 'active_products', []))
            })
        
        return Response({
            'count': len(vendor_data),
            'results': vendor_data
        })

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        user = request.user

        # Don't allow changing user_type through profile update
        if 'user_type' in request.data:
            return Response(
                {'detail': 'User type cannot be changed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            # Handle profile image update
            if 'profile_image' in request.FILES:
                # Delete old image if exists
                if user.profile_image:
                    user.profile_image.delete(save=False)
                user.profile_image = request.FILES['profile_image']

            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update user's active status"""
        if not getattr(request.user, 'is_superuser', False) and getattr(request.user, 'user_type', '') != 'administrator':
            return Response(
                {'detail': 'You do not have permission to perform this action'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:

            user = self.get_object()
            is_active = request.data.get('is_active')
            
            if is_active is None:
                return Response(
                    {'detail': 'is_active field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            user.is_active = is_active
            user.save()
            
            status = 'activated' if user.is_active else 'deactivated'
            return Response({
                'id': user.id,
                'email': user.email,
                'is_active': user.is_active,
                'message': f'User {user.email} has been {status} successfully.'
            })
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class VendorCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing vendor-specific categories.
    Vendors can only manage their own categories.
    """
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """Return categories created by the current vendor and global categories."""
        # Show both vendor-specific categories and global categories
        return Category.objects.filter(
            Q(vendor=self.request.user) | Q(is_global=True)
        ).distinct()
    
    def perform_create(self, serializer):
        """Set the vendor to the current user when creating a category."""
        serializer.save(vendor=self.request.user)
    
    def get_permissions(self):
        """Set permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    def get_queryset(self):
        return Category.objects.all().order_by('name')

    def perform_create(self, serializer):
        # Admin-created categories are global
        if self.request.user.is_authenticated and self.request.user.user_type == 'administrator':
            serializer.save(is_global=True, vendor=None)
        else:
            # Should not reach here due to permissions, but handle gracefully
            serializer.save(vendor=self.request.user)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        product_id = self.request.query_params.get('product_id')
        if product_id:
            return Review.objects.filter(product_id=product_id)
        return Review.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations between users.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer
    
    def get_queryset(self):
        # Get conversations where the current user is a participant
        return Conversation.objects.filter(
            participants=self.request.user,
            is_active=True
        ).distinct().order_by('-updated_at')
    
    def create(self, request, *args, **kwargs):
        participant_ids = request.data.get('participants', [])
        
        if not isinstance(participant_ids, list):
            return Response(
                {'error': 'participants must be a list of user IDs'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Ensure exactly one participant is provided for direct messages
        if len(participant_ids) != 1:
            return Response(
                {'error': 'Direct messages must have exactly one participant'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            # Ensure all participant IDs are valid integers
            try:
                participant_ids = [int(pid) for pid in participant_ids if str(pid).strip()]
            except (ValueError, TypeError) as e:
                logger.error(f'Invalid participant IDs: {participant_ids}. Error: {str(e)}')
                return Response(
                    {'error': 'Invalid participant ID format. Must be numeric.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get participant objects
            participants = User.objects.filter(id__in=participant_ids)
            if participants.count() != len(participant_ids):
                missing_ids = set(participant_ids) - set(participants.values_list('id', flat=True))
                logger.error(f'One or more participants not found. Missing IDs: {missing_ids}')
                return Response(
                    {'error': f'One or more participants not found. Missing IDs: {missing_ids}'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Include current user in participants if not already included
            current_user = request.user
            if current_user.id not in participant_ids:
                participants = list(participants)  # Convert to list to add current user
                participants.append(current_user)
            
            # Get participant IDs for logging and comparison
            participant_id_set = {p.id for p in participants}
            logger.info(f'Creating conversation between participants: {participant_id_set}')
            
            # Check if a conversation already exists with these exact participants
            existing_conv = (
                Conversation.objects
                .annotate(participant_count=Count('participants'))
                .filter(participant_count=len(participant_id_set))
            )
            
            # Further filter to ensure exact participant match
            for participant in participants:
                existing_conv = existing_conv.filter(participants=participant)
            
            existing_conv = existing_conv.first()
            
            if existing_conv:
                logger.info(f'Found existing conversation: {existing_conv.id}')
                serializer = ConversationDetailSerializer(existing_conv, context={'request': request})
                return Response(serializer.data)
            
            # Create new conversation
            conversation = Conversation.objects.create()
            conversation.participants.set(participants)
            conversation.save()
            
            logger.info(f'Created new conversation: {conversation.id}')
            
            # Use the detail serializer for the response
            detail_serializer = ConversationDetailSerializer(
                conversation, 
                context={'request': request}
            )
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f'Error creating conversation: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Failed to create conversation. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_messages_read(self, request, pk=None):
        """
        Mark specific messages in the conversation as read.
        
        Expected POST data:
        {
            "message_ids": ["id1", "id2", ...]
        }
        """
        conversation = self.get_object()
        message_ids = request.data.get('message_ids', [])
        
        if not isinstance(message_ids, list):
            return Response(
                {'error': 'message_ids must be a list of message IDs'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not message_ids:
            return Response(
                {'error': 'No message IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Ensure all message IDs belong to this conversation
            messages = Message.objects.filter(
                id__in=message_ids,
                conversation=conversation,
                is_read=False  # Only update unread messages
            ).exclude(sender=request.user)  # Don't mark own messages as read
            
            # Update messages in bulk
            updated_count = messages.update(
                is_read=True,
                read_at=timezone.now()
            )
            
            # Update conversation's last message if needed
            last_message = conversation.messages.order_by('-created_at').first()
            if last_message and last_message.is_read:
                conversation.update_last_message(last_message)
                conversation.save(update_fields=['last_message', 'updated_at'])
            
            return Response({
                'status': 'success',
                'conversation_id': str(conversation.id),
                'updated_count': updated_count
            })
            
        except Exception as e:
            logger.error(f'Error marking messages as read: {str(e)}', exc_info=True)
            return Response(
                {'error': 'Failed to mark messages as read'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Mark messages as read when retrieving conversation
        instance.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages within conversations.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only return messages from conversations the user is part of
        queryset = (
            Message.objects
            .filter(conversation__participants=self.request.user)
            .select_related('conversation', 'sender')
            .order_by('created_at')
        )

        # If a specific conversation is requested, further scope to it
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id is not None:
            try:
                conversation_id = int(conversation_id)
            except (TypeError, ValueError):
                # Invalid conversation id -> return empty queryset for safety
                return Message.objects.none()
            queryset = queryset.filter(conversation_id=conversation_id)

        return queryset
    
    def perform_create(self, serializer):
        conversation = serializer.validated_data.get('conversation')
        current_user = self.request.user
        
        # Ensure the current user is a participant
        if not conversation.participants.filter(id=current_user.id).exists():
            # Add the current user to the conversation if they're not already a participant
            conversation.participants.add(current_user)
        
        # Always set the sender to the current user, regardless of what was sent
        serializer.validated_data['sender'] = current_user
        
        # Create the message
        message = serializer.save()
        
        # Verify and update conversation participants
        participants = list(conversation.participants.all())
        if current_user not in participants:
            participants.append(current_user)
            conversation.participants.set(participants)
        
        # Update conversation's last message and timestamp
        conversation.last_message = message
        conversation.updated_at = message.created_at
        conversation.save(update_fields=['last_message', 'updated_at'])
        
        # Create read receipts for all participants
        from django.utils import timezone
        
        # Mark as read for the sender
        MessageReadReceipt.objects.get_or_create(
            message=message,
            user=current_user,
            defaults={'read_at': timezone.now()}
        )
        
        # Create unread receipts for other participants
        for participant in conversation.participants.exclude(id=current_user.id):
            MessageReadReceipt.objects.get_or_create(
                message=message,
                user=participant,
                defaults={'read_at': None}
            )
        
        return message

    def partial_update(self, request, *args, **kwargs):
        """
        Allow sender to edit only the message content via PATCH.
        """
        instance = self.get_object()
        if instance.sender != request.user:
            return Response({"detail": "You can only edit your own messages."}, status=status.HTTP_403_FORBIDDEN)

        # Only allow updating the content field
        content = request.data.get('content', None)
        if content is None:
            return Response({"detail": "Missing 'content' field."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data={"content": content}, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Only the sender can delete a message.
        """
        instance = self.get_object()
        if instance.sender != request.user:
            return Response({"detail": "You can only delete your own messages."}, status=status.HTTP_403_FORBIDDEN)

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], url_path='unread/count')
    def unread_count(self, request):
        """
        Get the count of unread messages for the current user.
        """
        try:
            count = Message.objects.filter(
                conversation__participants=request.user,
                is_read=False
            ).exclude(sender=request.user).count()
            
            return Response({'unread_count': count})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserMessageSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user message settings.
    """
    serializer_class = UserMessageSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserMessageSettings.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Ensure a user can only have one settings object
        if UserMessageSettings.objects.filter(user=self.request.user).exists():
            raise serializers.ValidationError("Settings already exist for this user.")
        serializer.save(user=self.request.user)
    
    def get_object(self):
        # Get or create settings if they don't exist
        obj, created = UserMessageSettings.objects.get_or_create(
            user=self.request.user,
            defaults={
                'email_notifications': True,
                'desktop_notifications': True,
                'allow_messages_from': 'anyone'
            }
        )
        return obj

class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj.user == request.user


# Vendor Dashboard and Analytics Views
class VendorDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for vendor dashboard analytics and statistics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        """Get vendor dashboard analytics"""
        try:
            vendor = request.user
            if vendor.user_type != 'vendor':
                return Response(
                    {'error': 'Only vendors can access this endpoint'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get vendor's products
            vendor_products = Product.objects.filter(vendor=vendor)
            
            # Get vendor's orders (delivered orders only for earnings)
            vendor_orders = Order.objects.filter(
                items__product__vendor=vendor
            ).distinct()
            
            # Orders that generate earnings (delivered and completed orders)
            delivered_orders = vendor_orders.filter(status__in=['delivered', 'completed'])
            pending_orders = vendor_orders.filter(status__in=['pending', 'awaiting_approval'])
            
            # Calculate total sales from delivered and completed orders using Django aggregation
            vendor_items = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['delivered', 'completed']
            ).aggregate(
                total_sales=models.Sum('price'),
                total_earnings=models.Sum('vendor_earning'),
                total_fees=models.Sum('platform_fee')
            )
            
            total_sales = float(vendor_items['total_sales'] or 0)
            total_earnings = float(vendor_items['total_earnings'] or 0)
            platform_fees = float(vendor_items['total_fees'] or 0)
            
            # Get products sold count from delivered and completed orders
            products_sold = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['delivered', 'completed']
            ).aggregate(total=models.Sum('quantity'))['total'] or 0
            
            # Get pending product approvals
            pending_approvals = vendor_products.filter(approval_status='pending').count()
            
            # Get recent orders (last 10)
            recent_orders = vendor_orders.order_by('-created_at')[:10]
            recent_orders_data = []
            for order in recent_orders:
                order_total = sum(
                    float(item.price) for item in order.items.filter(product__vendor=vendor)
                )
                recent_orders_data.append({
                    'id': order.id,
                    'status': order.status,
                    'amount': f"{order_total:.2f}",
                    'created_at': order.created_at.strftime('%Y-%m-%d %H:%M')
                })
            
            # Get top products by sales
            top_products_data = []
            product_sales = {}
            
            for item in OrderItem.objects.filter(
                product__vendor=vendor,
                order__status='delivered'
            ).select_related('product'):
                product_id = item.product.id
                if product_id not in product_sales:
                    product_sales[product_id] = {
                        'product': item.product,
                        'total_sales': 0,
                        'revenue': 0
                    }
                product_sales[product_id]['total_sales'] += item.quantity
                product_sales[product_id]['revenue'] += float(item.price)
            
            # Sort by revenue and take top 5
            sorted_products = sorted(
                product_sales.values(), 
                key=lambda x: x['revenue'], 
                reverse=True
            )[:5]
            
            for product_data in sorted_products:
                product = product_data['product']
                top_products_data.append({
                    'id': product.id,
                    'name': product.name,
                    'image': product.image.url if product.image else None,
                    'total_sales': product_data['total_sales'],
                    'revenue': f"{product_data['revenue']:.2f}"
                })
            
            # Calculate sales over time (last 30 days)
            from django.utils import timezone
            from django.db.models.functions import TruncDay
            from datetime import timedelta

            thirty_days_ago = timezone.now() - timedelta(days=30)
            
            sales_data = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['delivered', 'completed'],
                order__created_at__gte=thirty_days_ago
            ).annotate(
                date=TruncDay('order__created_at')
            ).values('date').annotate(
                total_sales=models.Sum('price')
            ).order_by('date')

            sales_over_time = []
            for entry in sales_data:
                sales_over_time.append({
                    'date': entry['date'].strftime('%Y-%m-%d'),
                    'value': float(entry['total_sales'])
                })

            analytics_data = {
                'total_sales': total_sales,
                'total_orders': vendor_orders.count(),
                'total_products_sold': products_sold,
                'total_earnings': total_earnings,
                'platform_fees': platform_fees,
                'net_earnings': total_earnings,  # Already calculated after fees
                'pending_orders': pending_orders.count(),
                'pending_approvals': pending_approvals,
                'recent_orders': recent_orders_data,
                'top_products': top_products_data,
                'sales_over_time': sales_over_time,  # Added this field
                'next_payout_date': 'Monthly - Next: 1st of next month',
                'commission_rate': vendor.commission_rate
            }
            
            return Response(analytics_data)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch analytics: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """Get detailed analytics - same as list for now"""
        return self.list(request)


class VendorEarningViewSet(viewsets.ViewSet):
    """
    ViewSet for vendor earnings management and payout requests
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def commission_status(self, request):
        """Get commission status for the current vendor"""
        try:
            vendor = request.user
            if vendor.user_type != 'vendor':
                return Response({'error': 'Not a vendor'}, status=status.HTTP_403_FORBIDDEN)
            
            from .models import CommissionRule, CommissionTier, OrderItem
            from django.db.models import Sum
            
            # Base information
            data = {
                'base_rate': vendor.commission_rate,
                'current_effective_rate': vendor.commission_rate, # Default
                'active_tier': None,
                'active_rules': []
            }
            
            # 1. Check Tiers (Sales Volume)
            # Calculate total completed sales
            total_sales = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['completed', 'delivered', 'shipped', 'processing']
            ).aggregate(Sum('price'))['price__sum'] or 0
            
            data['total_sales_volume'] = total_sales
            
            active_tier = CommissionTier.objects.filter(
                is_active=True, 
                min_sales_amount__lte=total_sales
            ).order_by('-min_sales_amount').first()
            
            if active_tier:
                data['active_tier'] = {
                    'name': active_tier.name,
                    'rate': active_tier.commission_rate,
                    'min_sales': active_tier.min_sales_amount
                }
            
            # 2. Get Active Rules
            # Vendor specific rules
            vendor_rules = CommissionRule.objects.filter(vendor=vendor, is_active=True)
            
            rules_data = []
            for rule in vendor_rules:
                rules_data.append({
                    'name': rule.name,
                    'type': 'Vendor Specific',
                    'rate': rule.commission_rate,
                    'priority': rule.priority
                })
                
            data['active_rules'] = rules_data
            
            return Response(data)
        except Exception as e:
            return Response(
                {'error': 'Failed to fetch commission status'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def list(self, request):
        """Get vendor earnings breakdown"""
        try:
            vendor = request.user
            if vendor.user_type != 'vendor':
                return Response(
                    {'error': 'Only vendors can access this endpoint'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get all delivered and completed orders for this vendor
            delivered_orders = Order.objects.filter(
                items__product__vendor=vendor,
                status__in=['delivered', 'completed']
            ).distinct()
            
            # Calculate totals using Django aggregation
            vendor_aggregates = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['delivered', 'completed']
            ).aggregate(
                total_earnings=models.Sum('vendor_earning'),
                total_fees=models.Sum('platform_fee')
            )
            
            total_earnings = float(vendor_aggregates['total_earnings'] or 0)
            total_platform_fees = float(vendor_aggregates['total_fees'] or 0)
            
            # Build breakdown data
            earnings_data = []
            for order in delivered_orders:
                for item in order.items.filter(product__vendor=vendor):
                    # Use updated_at as the earning date (when order was delivered/completed)
                    # This shows when the vendor actually earned the money
                    earning_date = order.updated_at if order.updated_at else order.created_at
                    earnings_data.append({
                        'order_id': order.id,
                        'product_name': item.product.name,
                        'quantity': item.quantity,
                        'gross_amount': float(item.price),
                        'platform_fee': float(item.platform_fee),
                        'net_earning': float(item.vendor_earning),
                        'commission_rate': vendor.commission_rate,
                        'date': earning_date.strftime('%Y-%m-%d'),
                        'status': order.status
                    })
            
            # Get payout requests
            payout_requests = PayoutRequest.objects.filter(vendor=vendor).order_by('-created_at')
            payout_data = []
            
            for payout in payout_requests:
                payout_data.append({
                    'id': payout.id,
                    'amount': float(payout.amount),
                    'status': payout.status,
                    'requested_at': payout.created_at.strftime('%Y-%m-%d %H:%M'),
                    'completed_at': payout.completed_at.strftime('%Y-%m-%d %H:%M') if payout.completed_at else None,
                    'admin_notes': payout.admin_notes
                })
            
            # Calculate withdrawn amounts from completed/processed payouts
            # Include both 'completed' and 'processed' for backward compatibility
            total_withdrawn = PayoutRequest.objects.filter(
                vendor=vendor,
                status__in=['completed', 'processed']
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            total_withdrawn = float(total_withdrawn)
            
            # Calculate pending payouts (requested but not yet completed)
            pending_payouts = PayoutRequest.objects.filter(
                vendor=vendor,
                status__in=['pending', 'approved']
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            pending_payouts = float(pending_payouts)
            
            # Available = Total Earnings - Withdrawn - Pending
            available_for_withdrawal = total_earnings - total_withdrawn - pending_payouts
            
            return Response({
                'total_earnings': total_earnings,
                'total_platform_fees': total_platform_fees,
                'available_for_withdrawal': max(0, available_for_withdrawal),  # Never negative
                'total_withdrawn': total_withdrawn,
                'pending_balance': pending_payouts,
                'earnings_breakdown': earnings_data,
                'payout_requests': payout_data,
                'commission_rate': vendor.commission_rate
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch earnings: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='request_payout')
    def request_payout(self, request):
        """Request a payout"""
        try:
            vendor = request.user
            if vendor.user_type != 'vendor':
                return Response(
                    {'error': 'Only vendors can request payouts'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            amount = request.data.get('amount')
            if not amount:
                return Response(
                    {'error': 'Amount is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                amount = float(amount)
                if amount <= 0:
                    return Response(
                        {'error': 'Amount must be positive'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Check minimum withdrawal amount
                if amount < 100:
                    return Response(
                        {'error': 'Minimum withdrawal amount is $100.00'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {'error': 'Invalid amount format'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if vendor has enough earnings using Django aggregation
            vendor_earnings = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['delivered', 'completed']
            ).aggregate(total=models.Sum('vendor_earning'))['total'] or 0
            
            total_earnings = float(vendor_earnings)
            
            # Subtract already requested/approved/completed payouts
            # Include both 'completed' and 'processed' for backward compatibility
            existing_payouts = PayoutRequest.objects.filter(
                vendor=vendor,
                status__in=['pending', 'approved', 'completed', 'processed']
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            available_amount = total_earnings - float(existing_payouts)
            
            if amount > available_amount:
                return Response(
                    {'error': f'Insufficient funds. Available: ${available_amount:.2f}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create payout request
            payout_request = PayoutRequest.objects.create(
                vendor=vendor,
                amount=amount,
                status='pending',
                notes=request.data.get('notes', '')
            )
            
            # Notify all administrators about the payout request
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admins = User.objects.filter(user_type='administrator')
                
                for admin in admins:
                    Notification.objects.create(
                        recipient=admin,
                        title='New Payout Request',
                        message=f'Vendor {vendor.username} ({vendor.email}) has requested a payout of ${amount:.2f}. Please review and approve.',
                        notification_type='system',
                        related_order_id=payout_request.id,
                        requires_confirmation=True,
                    )
            except Exception:
                pass
            
            return Response({
                'message': 'Payout request submitted successfully. Administrator will review your request.',
                'payout_request_id': payout_request.id,
                'amount': amount,
                'status': 'pending'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to request payout: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# Admin Payout Request Management
class PayoutRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin to manage vendor payout requests
    """
    queryset = PayoutRequest.objects.all().select_related('vendor').order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        from backend.app.serializers import PayoutRequestSerializer, AdminPayoutApprovalSerializer, AdminPayoutProcessSerializer
        if self.action in ['approve_or_reject']:
            return AdminPayoutApprovalSerializer
        elif self.action == 'process':
            return AdminPayoutProcessSerializer
        return PayoutRequestSerializer
    
    def get_permissions(self):
        # Check if user is authenticated first
        if not self.request.user.is_authenticated:
            return [permissions.IsAuthenticated()]
        
        # Only admins can access payout requests
        if self.request.user.user_type != 'administrator':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        """Override list to return payouts with statistics"""
        from django.db.models import Count, Q
        from backend.app.serializers import PayoutRequestSerializer
        
        # Get query parameters
        status_filter = request.query_params.get('status', None)
        
        # Base queryset
        queryset = self.get_queryset()
        
        # Apply status filter if provided
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Get statistics
        all_payouts = PayoutRequest.objects.all()
        stats = {
            'total_count': all_payouts.count(),
            'pending_count': all_payouts.filter(status='pending').count(),
            'approved_count': all_payouts.filter(status='approved').count(),
            'completed_count': all_payouts.filter(status__in=['completed', 'processed']).count(),
        }
        
        # Serialize payouts
        serializer = PayoutRequestSerializer(queryset, many=True)
        
        return Response({
            'payout_requests': serializer.data,
            **stats
        })
    
    @action(detail=True, methods=['post'], url_path='approve-or-reject')
    def approve_or_reject(self, request, pk=None):
        """Approve or reject a payout request"""
        from backend.app.models import VendorEarnings
        from backend.app.serializers import PayoutRequestSerializer
        
        payout_request = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'payout': payout_request})
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        admin_notes = serializer.validated_data.get('admin_notes', '')
        
        if action_type == 'approve':
            payout_request.status = 'approved'
            payout_request.approved_by = request.user
            payout_request.approved_at = timezone.now()
            payout_request.admin_notes = admin_notes or 'Approved by administrator'
            payout_request.save()
            
            # Notify vendor
            try:
                Notification.objects.create(
                    recipient=payout_request.vendor,
                    title='Payout Request Approved',
                    message=f'Your payout request of ${payout_request.amount:.2f} has been approved and will be completed shortly.',
                    notification_type='payout_approved',
                    related_order_id=payout_request.id,
                )
            except Exception:
                pass
            
            message = 'Payout request approved successfully'
        
        else:  # reject
            payout_request.status = 'rejected'
            payout_request.admin_notes = admin_notes or 'Request rejected by administrator'
            payout_request.save()
            
            # Return money to vendor's available balance
            try:
                earnings = VendorEarnings.objects.get(vendor=payout_request.vendor)
                earnings.cancel_payout_request(payout_request.amount)
            except VendorEarnings.DoesNotExist:
                pass
            
            # Notify vendor
            try:
                Notification.objects.create(
                    recipient=payout_request.vendor,
                    title='Payout Request Rejected',
                    message=f'Your payout request of ${payout_request.amount:.2f} has been rejected. Reason: {payout_request.admin_notes}',
                    notification_type='payout_rejected',
                    related_order_id=payout_request.id,
                )
            except Exception:
                pass
            
            message = 'Payout request rejected'
        
        response_serializer = PayoutRequestSerializer(payout_request)
        return Response({
            'message': message,
            'payout_request': response_serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approved payout (mark as paid)"""
        from backend.app.models import VendorEarnings
        from backend.app.serializers import PayoutRequestSerializer
        
        payout_request = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'payout': payout_request})
        serializer.is_valid(raise_exception=True)
        
        payout_request.status = 'completed'
        payout_request.completed_by = request.user
        payout_request.completed_at = timezone.now()
        payout_request.payout_reference = serializer.validated_data['payout_reference']
        payout_request.payout_date = serializer.validated_data.get('payout_date', timezone.now().date())
        payout_request.admin_notes = serializer.validated_data.get('admin_notes', payout_request.admin_notes)
        payout_request.save()
        
        # Update vendor earnings - mark as completed
        try:
            earnings = VendorEarnings.objects.get(vendor=payout_request.vendor)
            earnings.complete_payout(payout_request.amount)
        except VendorEarnings.DoesNotExist:
            pass
        
        # Notify vendor
        try:
            Notification.objects.create(
                recipient=payout_request.vendor,
                title='Payout Completed',
                message=f'Your payout of ${payout_request.amount:.2f} has been completed and sent. Reference: {payout_request.payout_reference}',
                notification_type='payout_approved',
                related_order_id=payout_request.id,
            )
        except Exception:
            pass
        
        response_serializer = PayoutRequestSerializer(payout_request)
        return Response({
            'message': 'Payout completed successfully',
            'payout_request': response_serializer.data
        })


# Vendor Payout Management
class VendorPayoutViewSet(viewsets.ViewSet):
    """
    ViewSet for vendors to manage their payouts and earnings
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        # Check if user is authenticated first
        if not self.request.user.is_authenticated:
            return [permissions.IsAuthenticated()]
        
        # Only vendors can access
        if self.request.user.user_type != 'vendor':
            return [permissions.IsAdminUser()]  # Will fail for non-vendors
        return [permissions.IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def earnings(self, request):
        """Get vendor earnings summary - calculated in real-time from delivered orders"""
        from backend.app.models import OrderItem, PayoutRequest, Order
        from django.db import models
        
        vendor = request.user
        
        # Calculate total earnings from delivered and completed orders
        vendor_aggregates = OrderItem.objects.filter(
            product__vendor=vendor,
            order__status__in=['delivered', 'completed']
        ).aggregate(
            total_earnings=models.Sum('vendor_earning'),
            total_fees=models.Sum('platform_fee'),
            total_sales=models.Sum('price')
        )
        
        total_earnings = float(vendor_aggregates['total_earnings'] or 0)
        total_fees = float(vendor_aggregates['total_fees'] or 0)
        total_sales = float(vendor_aggregates['total_sales'] or 0)
        
        # Calculate withdrawn amounts from completed payouts
        # Include both 'completed' and 'processed' for backward compatibility
        total_withdrawn = PayoutRequest.objects.filter(
            vendor=vendor,
            status__in=['completed', 'processed']
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        total_withdrawn = float(total_withdrawn)
        
        # Calculate pending balance from pending/approved payouts
        pending_balance = PayoutRequest.objects.filter(
            vendor=vendor,
            status__in=['pending', 'approved']
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        pending_balance = float(pending_balance)
        
        # Available balance = total earnings - withdrawn - pending
        available_balance = total_earnings - total_withdrawn - pending_balance
        
        # Count total delivered and completed orders
        total_orders = Order.objects.filter(
            items__product__vendor=vendor,
            status__in=['delivered', 'completed']
        ).distinct().count()
        
        # Get last payout date
        # Include both 'completed' and 'processed' for backward compatibility
        last_payout = PayoutRequest.objects.filter(
            vendor=vendor,
            status__in=['completed', 'processed']
        ).order_by('-completed_at').first()
        
        return Response({
            'total_earnings': total_earnings,
            'available_balance': max(0, available_balance),
            'pending_balance': pending_balance,
            'total_withdrawn': total_withdrawn,
            'total_orders': total_orders,
            'last_payout_date': last_payout.completed_at if last_payout else None,
        })
    
    @action(detail=False, methods=['post'])
    def request_payout(self, request):
        """Create a new payout request"""
        from backend.app.serializers import PayoutRequestCreateSerializer
        
        serializer = PayoutRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        payout = serializer.save()
        
        # Notify admins about new payout request
        from backend.app.models import User
        admins = User.objects.filter(user_type='administrator')
        for admin in admins:
            try:
                Notification.objects.create(
                    recipient=admin,
                    title='New Payout Request',
                    message=f'{request.user.store_name or request.user.email} has requested a payout of ${payout.amount:.2f}',
                    notification_type='system',
                    related_order_id=payout.id,
                )
            except Exception:
                pass
        
        from backend.app.serializers import PayoutRequestSerializer
        response_serializer = PayoutRequestSerializer(payout)
        return Response({
            'message': 'Payout request submitted successfully',
            'payout_request': response_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get vendor's payout request history with receipt info"""
        from backend.app.serializers import PayoutRequestSerializer
        from backend.app.models import PayoutReceipt
        
        payouts = PayoutRequest.objects.filter(vendor=request.user).prefetch_related('receipt').order_by('-created_at')
        
        # Pagination
        from django.core.paginator import Paginator
        page_number = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 10)
        
        paginator = Paginator(payouts, page_size)
        page_obj = paginator.get_page(page_number)
        
        serializer = PayoutRequestSerializer(page_obj, many=True)
        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_obj.number,
        })
    
    @action(detail=False, methods=['get', 'post', 'put'])
    def payment_method(self, request):
        """Get or update payment method"""
        from backend.app.serializers import PaymentMethodSerializer
        
        if request.method == 'GET':
            # Return current payment method
            return Response({
                'payment_method': request.user.payment_method or '',
                'payment_details': request.user.payment_details or {},
            })
        
        else:  # POST or PUT
            serializer = PaymentMethodSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            request.user.payment_method = serializer.validated_data['payment_method']
            request.user.payment_details = serializer.validated_data['payment_details']
            request.user.save()
            
            return Response({
                'message': 'Payment method updated successfully',
                'payment_method': request.user.payment_method,
                'payment_details': request.user.payment_details,
            })
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def process_payout(self, request, pk=None):
        """Admin processes payout - sends money and generates receipt"""
        from backend.app.models import PayoutRequest, PayoutReceipt
        from django.utils import timezone
        import random
        import string
        
        try:
            payout = PayoutRequest.objects.select_related('vendor').get(pk=pk)
        except PayoutRequest.DoesNotExist:
            return Response({'error': 'Payout request not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate payout is approved
        if payout.status != 'approved':
            return Response(
                {'error': 'Payout must be approved before processing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get vendor's payment details
        vendor = payout.vendor
        payment_method = vendor.payment_method or 'bank_transfer'
        payment_details = vendor.payment_details or {}
        
        # Generate transaction ID (fake payment gateway)
        transaction_id = 'TXN-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
        
        # Simulate payment processing
        processing_fee = float(payout.amount) * 0.02  # 2% processing fee
        net_amount = float(payout.amount) - processing_fee
        
        # Create masked payment destination for receipt
        masked_destination = {}
        if payment_method == 'visa_card' and payment_details.get('card_number'):
            card_num = payment_details['card_number'].replace(' ', '')
            masked_destination = {
                'type': 'Visa Card',
                'last_4': card_num[-4:] if len(card_num) >= 4 else '****',
                'holder': payment_details.get('card_holder_name', 'N/A')
            }
        elif payment_method == 'bank_transfer' and payment_details.get('account_number'):
            masked_destination = {
                'type': 'Bank Transfer',
                'bank': payment_details.get('bank_name', 'N/A'),
                'account': '****' + payment_details['account_number'][-4:] if len(payment_details['account_number']) >= 4 else '****',
                'holder': payment_details.get('account_name', 'N/A')
            }
        else:
            masked_destination = {
                'type': payment_method.replace('_', ' ').title(),
                'identifier': payment_details.get('email', 'N/A')
            }
        
        # Simulate payment gateway response
        gateway_response = {
            'status': 'success',
            'message': 'Payment completed successfully',
            'gateway': 'TesMarket Payment Gateway',
            'completed_at': timezone.now().isoformat(),
            'authorization_code': ''.join(random.choices(string.ascii_uppercase + string.digits, k=8)),
        }
        
        # Create receipt
        receipt = PayoutReceipt()
        receipt.payout_request = payout
        receipt.receipt_number = receipt.generate_receipt_number()
        receipt.transaction_id = transaction_id
        receipt.payment_method = payment_method
        receipt.payment_destination = masked_destination
        receipt.gross_amount = payout.amount
        receipt.processing_fee = processing_fee
        receipt.net_amount = net_amount
        receipt.payment_status = 'completed'
        receipt.gateway_response = gateway_response
        receipt.payment_completed_at = timezone.now()
        receipt.save()
        
        # Update payout request
        payout.status = 'completed'
        payout.completed_by = request.user
        payout.completed_at = timezone.now()
        payout.payout_reference = transaction_id
        payout.payout_date = timezone.now().date()
        payout.save()
        
        # Create notification for vendor
        try:
            Notification.objects.create(
                recipient=vendor,
                title='💰 Payout completed Successfully',
                message=f'Your withdrawal of ${payout.amount:.2f} has been successfully sent to your {masked_destination["type"]}. Receipt #{receipt.receipt_number}',
                notification_type='payout_approved',
                related_order_id=payout.id,
            )
        except Exception:
            pass
        
        return Response({
            'message': 'Payout completed successfully',
            'receipt': {
                'receipt_number': receipt.receipt_number,
                'transaction_id': transaction_id,
                'amount': float(payout.amount),
                'processing_fee': processing_fee,
                'net_amount': net_amount,
                'payment_method': payment_method,
                'destination': masked_destination,
            }
        })
    
    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Download receipt for a completed payout"""
        from backend.app.models import PayoutRequest, PayoutReceipt
        from django.http import HttpResponse
        from django.utils import timezone
        
        try:
            payout = PayoutRequest.objects.get(pk=pk, vendor=request.user)
        except PayoutRequest.DoesNotExist:
            return Response({'error': 'Payout not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if receipt exists
        try:
            receipt = payout.receipt
        except PayoutReceipt.DoesNotExist:
            return Response({'error': 'Receipt not available'}, status=status.HTTP_404_NOT_FOUND)
        
        # Generate HTML receipt
        # Get vendor's full name from the full_name field
        vendor_full_name = payout.vendor.full_name or "Vendor Name Not Set"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Payout Receipt #{receipt.receipt_number}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Arial', sans-serif; padding: 40px; background: #f5f5f5; }}
        .receipt {{ max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }}
        .header {{ text-align: center; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }}
        .logo {{ font-size: 32px; font-weight: bold; color: #6366f1; margin-bottom: 10px; }}
        .receipt-title {{ font-size: 24px; color: #333; margin-top: 10px; }}
        .receipt-number {{ font-size: 14px; color: #666; margin-top: 5px; }}
        .section {{ margin-bottom: 30px; }}
        .section-title {{ font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }}
        .label {{ color: #666; font-weight: 500; }}
        .value {{ color: #333; font-weight: 600; }}
        .amount-box {{ background: #f0f9ff; border: 2px solid #bfdbfe; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
        .amount-label {{ color: #666; font-size: 14px; margin-bottom: 5px; }}
        .amount-value {{ color: #1e40af; font-size: 36px; font-weight: bold; }}
        .status-badge {{ display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
        .status-completed {{ background: #10b981; color: white; }}
        .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; }}
        .payment-dest {{ background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 10px 0; }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .receipt {{ box-shadow: none; }}
        }}
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="logo">TesMarket</div>
            <div class="receipt-title">Payment Receipt</div>
            <div class="receipt-number">Receipt #{receipt.receipt_number}</div>
            <div style="margin-top: 10px;">
                <span class="status-badge status-completed">✓ PAYMENT COMPLETED</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Receipt Information</div>
            <div class="info-row">
                <span class="label">Transaction ID:</span>
                <span class="value">{receipt.transaction_id}</span>
            </div>
            <div class="info-row">
                <span class="label">Payment Date:</span>
                <span class="value">{receipt.payment_completed_at.strftime('%B %d, %Y at %I:%M %p')}</span>
            </div>
            <div class="info-row">
                <span class="label">Payment Method:</span>
                <span class="value">{receipt.payment_method.replace('_', ' ').title()}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Recipient Information</div>
            <div class="info-row">
                <span class="label">Vendor:</span>
                <span class="value">{vendor_full_name}</span>
            </div>
            <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">{payout.vendor.email}</span>
            </div>
            <div class="payment-dest">
                <strong>💳 Payment Sent To:</strong><br>
                <strong>{receipt.payment_destination.get('type', 'N/A')}</strong><br>
                {'Account: ' + receipt.payment_destination.get('account', receipt.payment_destination.get('last_4', 'N/A')) if receipt.payment_destination.get('account') or receipt.payment_destination.get('last_4') else ''}<br>
                {'Account Holder: ' + vendor_full_name}
            </div>
        </div>
        
        <div class="amount-box">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">${receipt.gross_amount:.2f}</div>
        </div>
        
        <div class="section">
            <div class="section-title">Payment Breakdown</div>
            <div class="info-row">
                <span class="label">Gross Amount:</span>
                <span class="value">${receipt.gross_amount:.2f}</span>
            </div>
            <div class="info-row">
                <span class="label">Processing Fee (2%):</span>
                <span class="value">-${receipt.processing_fee:.2f}</span>
            </div>
            <div class="info-row" style="font-size: 18px; font-weight: bold; background: #f9fafb; padding: 15px 10px;">
                <span class="label">Net Amount Received:</span>
                <span class="value" style="color: #10b981;">${receipt.net_amount:.2f}</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Payment Gateway Information</div>
            <div class="info-row">
                <span class="label">Gateway:</span>
                <span class="value">{receipt.gateway_response.get('gateway', 'TesMarket Payment Gateway')}</span>
            </div>
            <div class="info-row">
                <span class="label">Authorization Code:</span>
                <span class="value">{receipt.gateway_response.get('authorization_code', 'N/A')}</span>
            </div>
            <div class="info-row">
                <span class="label">Status:</span>
                <span class="value" style="color: #10b981;">✓ {receipt.gateway_response.get('status', 'success').upper()}</span>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>TesMarket Payment System</strong></p>
            <p>This is an official payment receipt from TesMarket</p>
            <p style="margin-top: 10px;">For support, contact: support@tesmarket.com | +1 (555) 123-4567</p>
            <p style="margin-top: 10px;">Receipt generated on: {timezone.now().strftime('%B %d, %Y at %I:%M %p')}</p>
        </div>
    </div>
    
    <script>
        // Auto print after 500ms
        window.onload = function() {{
            setTimeout(function() {{
                window.print();
            }}, 500);
        }};
    </script>
</body>
</html>
        """
        
        return HttpResponse(html_content, content_type='text/html')
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get detailed payout statistics"""
        from backend.app.models import VendorEarnings, OrderItem
        from django.db.models import Sum, Count, Q
        from decimal import Decimal
        
        earnings, created = VendorEarnings.objects.get_or_create(vendor=request.user)
        
        # Get completed orders
        completed_items = OrderItem.objects.filter(
            product__vendor=request.user,
            order__status='completed'
        )
        
        # Monthly earnings (last 6 months)
        from datetime import datetime, timedelta
        from django.db.models.functions import TruncMonth
        
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_earnings = completed_items.filter(
            order__created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('order__created_at')
        ).values('month').annotate(
            total=Sum('vendor_earning')
        ).order_by('month')
        
        # Payout status breakdown
        payout_stats = PayoutRequest.objects.filter(vendor=request.user).aggregate(
            total_requested=Sum('amount', filter=Q(status__in=['pending', 'approved', 'completed', 'processed'])),
            pending_count=Count('id', filter=Q(status='pending')),
            approved_count=Count('id', filter=Q(status='approved')),
            completed_count=Count('id', filter=Q(status__in=['completed', 'processed'])),
            rejected_count=Count('id', filter=Q(status='rejected')),
        )
        
        return Response({
            'earnings_summary': {
                'total_earnings': earnings.total_earnings,
                'available_balance': earnings.available_balance,
                'pending_balance': earnings.pending_balance,
                'total_withdrawn': earnings.total_withdrawn,
                'total_orders': earnings.total_orders,
            },
            'monthly_earnings': list(monthly_earnings),
            'payout_statistics': payout_stats,
        })


# Vendor Product Management
class VendorProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for vendor product management
    """
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not self.request.user.is_authenticated or self.request.user.user_type != 'vendor':
            return Product.objects.none()
        return Product.objects.filter(vendor=self.request.user)
    
    def perform_create(self, serializer):
        if not self.request.user.is_authenticated or self.request.user.user_type != 'vendor':
            raise PermissionDenied('Only vendors can create products')
        serializer.save(vendor=self.request.user)

 
# Vendor Category Management
class VendorCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for vendor category management
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not self.request.user.is_authenticated or self.request.user.user_type != 'vendor':
            return Category.objects.none()
        return Category.objects.filter(vendor=self.request.user)


# ===== COUPON & DISCOUNT VIEWS =====

class CouponViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing coupons.
    - Admins manage platform coupons
    - Vendors manage their own coupons
    - Public endpoint for validating coupons
    """
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins see all coupons
        if user.is_staff or user.user_type == 'administrator':
            return Coupon.objects.all()
        
        # Vendors see their own coupons + platform coupons they can use
        elif user.user_type == 'vendor':
            return Coupon.objects.filter(
                Q(vendor=user) | 
                Q(coupon_type='platform')
            ).distinct()
            
        # Buyers shouldn't manage coupons, but might need to see public ones (handled by validation)
        else:
            return Coupon.objects.filter(is_active=True, coupon_type='platform')

    def perform_create(self, serializer):
        user = self.request.user
        
        # Set creator
        serializer.validated_data['created_by'] = user
        
        # Vendor creating coupon
        if user.user_type == 'vendor':
            serializer.save(
                vendor=user,
                coupon_type='vendor'
            )
        # Admin creating coupon
        elif user.is_staff or user.user_type == 'administrator':
            # Admin can create both, defaults to platform in model if not specified
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to create coupons")

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def validate(self, request):
        """
        Validate a coupon code and return discount details
        """
        code = request.data.get('code')
        subtotal = request.data.get('subtotal', 0)
        vendor_id = request.data.get('vendor_id')
        
        if not code:
            return Response({'error': 'Coupon code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            coupon = Coupon.objects.get(code=code.upper())
            
            # 1. Check basic validity
            valid, message = coupon.is_valid()
            if not valid:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Check user eligibility (if authenticated)
            if request.user.is_authenticated:
                can_use, message = coupon.can_use(request.user)
                if not can_use:
                    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            
            # 3. Check vendor restrictions
            if coupon.coupon_type == 'vendor':
                if not vendor_id:
                     return Response({'error': 'This is a vendor-specific coupon. Please select a vendor.'}, 
                                   status=status.HTTP_400_BAD_REQUEST)
                
                # Check if coupon belongs to the specified vendor
                # Assuming vendor_id is passed as integer
                if int(coupon.vendor_id) != int(vendor_id):
                    return Response({'error': 'This coupon is not valid for this vendor.'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            # 4. Calculate discount
            try:
                subtotal_decimal = Decimal(str(subtotal))
                discount = coupon.calculate_discount(subtotal_decimal)

                return Response({
                    'valid': True,
                    'discount': float(discount),
                    'coupon_type': coupon.coupon_type,
                    'discount_type': coupon.discount_type,
                    'discount_value': float(coupon.discount_value),
                    'message': f'Coupon applied successfully! You save ${discount}'
                })
            except Exception as e:
                return Response({'error': f'Error calculating discount: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Error validating coupon: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        user = self.request.user
        # Order by: unread first, then order-related notifications, then by created_at (newest first)
        return Notification.objects.filter(recipient=user).order_by('is_read', '-created_at')

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own notifications as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_as_responded(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own notifications as responded'},
                status=status.HTTP_403_FORBIDDEN
            )
        notification.is_responded = True
        notification.responded_at = timezone.now()
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        unread_notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_response(self, request):
        pending_notifications = self.get_queryset().filter(is_read=True, is_responded=False)
        serializer = self.get_serializer(pending_notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        """Get the count of unread notifications for the current user"""
        try:
            count = self.get_queryset().filter(is_read=False).count()
            return Response({'unread_count': count})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read for the current user"""
        try:
            self.get_queryset().filter(is_read=False).update(
                is_read=True,
                read_at=timezone.now()
            )
            return Response({'message': 'All notifications marked as read'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )