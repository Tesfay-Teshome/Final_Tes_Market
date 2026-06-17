from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.files.storage import default_storage

from .models import VendorStore, Product, StoreReview, Notification
from .serializers import ProductSerializer, StoreReviewSerializer


class InlineVendorStoreSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='vendor.id', read_only=True)
    vendor_id = serializers.IntegerField(source='vendor.id', read_only=True)
    vendor_email = serializers.EmailField(source='vendor.email', read_only=True)

    class Meta:
        model = VendorStore
        fields = [
            'id', 'vendor_id', 'vendor_email',
            'slug', 'display_name', 'logo_url', 'banner_url',
            'theme_preset', 'primary_color', 'accent_color',
            'about', 'socials', 'featured_collection_id', 'featured_product_ids',
            'is_published', 'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['vendor_id', 'vendor_email', 'published_at', 'created_at', 'updated_at']

    def validate_slug(self, value):
        qs = VendorStore.objects.filter(slug__iexact=value)
        instance = getattr(self, 'instance', None)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError('This slug is already in use.')
        return value


@api_view(["GET", "PUT", "PATCH", "DELETE"]) 
@permission_classes([IsAuthenticated])
def vendor_store(request):
    """Create/update/read/delete the authenticated vendor's storefront.
    - GET: return existing (creating default if missing)
    - PUT/PATCH: upsert draft fields; if is_published=True, set published_at
    - DELETE: remove the vendor's storefront completely
    """
    user = request.user
    if not getattr(user, 'user_type', None) == 'vendor':
        return Response({'detail': 'Only vendors can manage storefront'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'DELETE':
        try:
            store = VendorStore.objects.get(vendor=user)
            store_name = store.display_name
            store.delete()
            return Response({'detail': f'Storefront "{store_name}" deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
        except VendorStore.DoesNotExist:
            # Check if vendor exists
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                vendor_user = User.objects.get(id=user.id)
                vendor_stores = VendorStore.objects.filter(vendor=vendor_user)
                return Response({
                    'detail': 'No storefront found to delete',
                    'debug': {
                        'vendor_id': user.id,
                        'vendor_email': user.email,
                        'vendor_username': user.username,
                        'existing_stores_count': vendor_stores.count(),
                        'existing_stores': list(vendor_stores.values_list('id', 'display_name', 'slug'))
                    }
                }, status=status.HTTP_404_NOT_FOUND)
            except User.DoesNotExist:
                return Response({'detail': 'Vendor user not found'}, status=status.HTTP_404_NOT_FOUND)

    defaults = {
        'display_name': user.store_name or (user.full_name or user.username),
        'slug': (user.store_name or user.username or f'vendor-{user.id}').lower().replace(' ', '-'),
    }
    store, _ = VendorStore.objects.get_or_create(vendor=user, defaults=defaults)

    if request.method == 'GET':
        return Response(InlineVendorStoreSerializer(store, context={'request': request}).data)

    serializer = InlineVendorStoreSerializer(store, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    updated = serializer.save()
    if updated.is_published and not updated.published_at:
        updated.published_at = timezone.now()
        updated.save(update_fields=['published_at', 'updated_at'])
    return Response(InlineVendorStoreSerializer(updated, context={'request': request}).data)


@api_view(["POST"]) 
@permission_classes([IsAuthenticated])
def media_upload(request):
    """Upload logo/banner. multipart/form-data with 'file' and optional 'type' ('logo'|'banner'). Returns {url}"""
    f = request.FILES.get('file')
    if not f:
        return Response({'detail': 'No file provided (expected form-data field "file")'}, status=status.HTTP_400_BAD_REQUEST)
    kind = (request.data.get('type') or 'logo').lower()
    subdir = 'store_banners' if kind == 'banner' else 'store_logos'
    path = f"{subdir}/{timezone.now().strftime('%Y%m%d%H%M%S')}_{f.name}"
    saved_path = default_storage.save(path, f)
    try:
        url = request.build_absolute_uri(default_storage.url(saved_path))
    except Exception:
        url = request.build_absolute_uri(f"{getattr(settings, 'MEDIA_URL', '')}{saved_path}")
    return Response({'url': url})


@api_view(["GET"]) 
@permission_classes([permissions.AllowAny])
def public_store(request, slug: str):
    """Fetch published store config by slug"""
    store = VendorStore.objects.filter(slug__iexact=slug, is_published=True).first()
    if not store:
        return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
    data = InlineVendorStoreSerializer(store, context={'request': request}).data
    return Response({'store': data})


@api_view(["GET"]) 
@permission_classes([permissions.AllowAny])
def public_store_by_vendor(request, vendor_id: int):
    """Lookup published store by vendor id and return slug + store minimal."""
    store = VendorStore.objects.filter(vendor_id=vendor_id, is_published=True).first()
    if not store:
        return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
    data = InlineVendorStoreSerializer(store, context={'request': request}).data
    return Response({'slug': store.slug, 'store': data})


@api_view(["GET"]) 
@permission_classes([permissions.AllowAny])
def public_store_products(request, slug: str):
    """List products for a published store (vendor scoped). Supports search, sort, pagination."""
    store = VendorStore.objects.filter(slug__iexact=slug, is_published=True).first()
    if not store:
        return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

    qs = Product.objects.filter(vendor=store.vendor, is_active=True)
    search = request.query_params.get('search')
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
    sort = request.query_params.get('sort')
    if sort == 'price_asc':
        qs = qs.order_by('price')
    elif sort == 'price_desc':
        qs = qs.order_by('-price')
    else:
        qs = qs.order_by('-created_at')

    paginator = PageNumberPagination()
    paginator.page_size_query_param = 'page_size'
    page = paginator.paginate_queryset(qs, request)
    ser = ProductSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(ser.data)


@api_view(["GET"]) 
@permission_classes([permissions.AllowAny])
def public_store_preview(request, slug: str):
    """Draft preview: return store by slug regardless of publish status (do not index)."""
    store = VendorStore.objects.filter(slug__iexact=slug).first()
    if not store:
        return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
    data = InlineVendorStoreSerializer(store, context={'request': request}).data
    return Response({'store': data})

@api_view(["GET", "POST"]) 
@permission_classes([permissions.AllowAny])
def public_store_reviews(request, slug: str):
    """Fetch approved store reviews or submit a new review"""
    store = VendorStore.objects.filter(slug__iexact=slug).first()
    if not store:
        return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        qs = StoreReview.objects.filter(vendor=store.vendor, status='approved').order_by('-created_at')
        
        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginator.page_size_query_param = 'page_size'
        page = paginator.paginate_queryset(qs, request)
        ser = StoreReviewSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(ser.data)
        
    if request.method == "POST":
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required to post a review'}, status=status.HTTP_401_UNAUTHORIZED)
            
        data = request.data.copy()
        
        # We need to pass vendor and buyer securely
        ser = StoreReviewSerializer(data=data, context={'request': request})
        ser.is_valid(raise_exception=True)
        review = ser.save(vendor=store.vendor, buyer=request.user, status='pending')
        
        # Create notification for vendor
        Notification.objects.create(
            recipient=store.vendor,
            title='New Storefront Review',
            message=f'{request.user.email} left a review for your store. It requires your approval.',
            notification_type='store_review',
            related_order_id=review.id,
            requires_confirmation=True,
            is_read=False
        )
        
        return Response(StoreReviewSerializer(review, context={'request': request}).data, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vendor_approve_review(request, review_id: int):
    """Approve a pending store review"""
    # Use update for atomicity and to ensure it hits the DB directly
    updated_count = StoreReview.objects.filter(id=review_id, vendor=request.user).update(status='approved')
    
    if updated_count == 0:
        return Response({'detail': 'Review not found or permission denied'}, status=status.HTTP_404_NOT_FOUND)
        
    # mark notification as confirmed
    Notification.objects.filter(
        recipient=request.user, 
        notification_type='store_review', 
        related_order_id=review_id
    ).update(confirmed_by_vendor=True, confirmed_at=timezone.now(), is_read=True)
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin_users = User.objects.filter(user_type='administrator')
    for admin in admin_users:
        Notification.objects.create(
            recipient=admin,
            title='Storefront Review Approved',
            message=f'Vendor {request.user.username} has approved a storefront review.',
            notification_type='system',
            related_order_id=review_id
        )
    
    return Response({'detail': 'Review approved successfully'})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vendor_reject_review(request, review_id: int):
    """Reject a pending store review"""
    updated_count = StoreReview.objects.filter(id=review_id, vendor=request.user).update(status='rejected')
    
    if updated_count == 0:
        return Response({'detail': 'Review not found or permission denied'}, status=status.HTTP_404_NOT_FOUND)
        
    # mark notification as confirmed
    Notification.objects.filter(
        recipient=request.user, 
        notification_type='store_review', 
        related_order_id=review_id
    ).update(confirmed_by_vendor=True, confirmed_at=timezone.now(), is_read=True)
    
    return Response({'detail': 'Review rejected successfully'})

