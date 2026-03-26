from django.utils.text import slugify
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone

from .models import (
    Category, Product, ProductImage, ProductVariant, Cart, CartItem, 
    Order, OrderItem, Transaction, VendorEarning, Review, Wishlist, 
    WishlistItem, Notification, Testimonial, UserMessageSettings, PayoutRequest,
    Conversation, Message, MessageReaction, MessageReadReceipt,
    VendorAnalytics, AdministratorDashboardMetrics, MessageStatus, VendorEarnings,
    VendorStore, Coupon, CouponUsage
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField(read_only=True)
    
    def get_status(self, obj):
        if obj.is_verified:
            return 'approved'
        elif not obj.is_active:
            return 'rejected'
        return 'pending'
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    current_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    full_name = serializers.CharField(write_only=False, required=False, allow_blank=True)  # Allow blank on update
    phone_number = serializers.CharField(source='phone', required=False, allow_blank=True)
    user_type = serializers.CharField(required=True)
    store_name = serializers.CharField(required=False, allow_blank=True)
    store_description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.SerializerMethodField(read_only=True)
    
    def create(self, validated_data):
        """Create a new user with properly hashed password"""
        from django.contrib.auth.hashers import make_password
        
        # Hash the password
        password = validated_data.get('password')
        if password:
            validated_data['password'] = make_password(password)
        
        # Remove confirm_password if present
        validated_data.pop('confirm_password', None)
        
        # Handle full_name
        full_name = validated_data.pop('full_name', '')
        
        # Set username to email for consistency
        email = validated_data.get('email')
        if email:
            # Check if email already exists
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError({"email": "This email is already registered."})
            
            # Always set username to email (this is required for login)
            validated_data['username'] = email
        
        # Check if this is an admin creating the user
        request = self.context.get('request')
        is_admin_creating = (
            request and 
            hasattr(request, 'user') and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'administrator'
        )
        
        # If admin is creating the user, automatically approve and activate
        if is_admin_creating:
            validated_data['is_active'] = True
            validated_data['is_verified'] = True
            print(f"🔧 Admin creating user {email} - Auto-approved and activated")
        
        # Create the user
        user = User.objects.create(**validated_data)
        
        # Set full_name
        if full_name:
            user.full_name = full_name
            user.save()
        
        return user

    def update(self, instance, validated_data):
        # Only update fields that are present in validated_data
        password = validated_data.pop('password', None)
        confirm_password = validated_data.pop('confirm_password', None)
        current_password = validated_data.pop('current_password', None)
        full_name = validated_data.pop('full_name', None)
        username = validated_data.pop('username', None)

        # If password change is requested, validate current password
        if password or current_password:
            if not current_password:
                raise serializers.ValidationError({
                    'current_password': 'Current password is required to change password.'
                })
            
            # Verify current password
            if not instance.check_password(current_password):
                raise serializers.ValidationError({
                    'current_password': 'Current password is incorrect.'
                })
            
            if not password:
                raise serializers.ValidationError({
                    'password': 'New password is required.'
                })
            
            if password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_password': 'New passwords do not match.'
                })
            
            # Update password
            instance.set_password(password)

        # Handle username update explicitly
        if username is not None and username.strip():
            new_username = username.strip()
            # Check if username already exists for another user
            existing_user = User.objects.filter(username=new_username).exclude(id=instance.id).first()
            if existing_user:
                raise serializers.ValidationError({
                    'username': f'This username "{new_username}" is already taken by another user.'
                })
            
            print(f"🔧 Updating username from '{instance.username}' to '{new_username}'")
            instance.username = new_username

        # Update other fields
        for attr, value in validated_data.items():
            if attr != 'username':  # Skip username as we handled it above
                setattr(instance, attr, value)
                print(f"🔧 Setting {attr} = {value}")
            
        # Handle full_name update
        if full_name is not None:
            instance.full_name = full_name
            print(f"🔧 Setting full_name = {full_name}")
            
        try:
            instance.save()
            print(f"✅ User saved successfully with username: '{instance.username}' and full_name: '{instance.full_name}'")
        except Exception as e:
            print(f"❌ Error saving user: {e}")
            raise serializers.ValidationError({
                'detail': f'Failed to save user: {str(e)}'
            })
            
        return instance

    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None
        
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'confirm_password', 'current_password',
            'phone_number', 'address', 'user_type', 'store_name', 'full_name',
            'store_description', 'profile_image', 'is_verified', 'is_active',
            'date_joined', 'status'
        )
        
        read_only_fields = ('id', 'date_joined')  # Allow is_verified to be updated by admin
        extra_kwargs = {
            'email': {'required': True},
            'username': {'read_only': False, 'required': False},  # Allow username updates
            'is_active': {'read_only': False},  # Allow is_active to be updated
            'profile_image': {'read_only': True}  # Handle this field manually
        }
        
    def get_status(self, obj):
        if obj.is_verified:
            return 'approved'
        elif not obj.is_active:
            return 'rejected'
        else:
            return 'pending'



    def validate(self, data):
        request = self.context.get('request', None)
        is_create = request and request.method == 'POST'
        user = request.user if request else None
        is_admin = hasattr(user, 'user_type') and user.user_type == 'administrator'

        # Only require full_name and password fields on create
        if is_create:
            if not data.get('full_name'):
                raise serializers.ValidationError({'full_name': 'Full name is required.'})
            if data.get('password') != data.get('confirm_password'):
                raise serializers.ValidationError("Passwords don't match")
        else:
            # On update (PATCH), ignore full_name validation entirely, even if present and blank
            data['full_name'] = data.get('full_name', '')
            # Only allow is_verified, store_name, store_description to be updated by admin
            if not is_admin:
                data.pop('is_verified', None)
                data.pop('store_name', None)
                data.pop('store_description', None)
        # Validate user_type only if present
        user_type = data.get('user_type', None)
        if user_type is not None:
            if user_type not in ['buyer', 'vendor', 'administrator']:
                raise serializers.ValidationError("User type must be either 'buyer', 'vendor', or 'administrator'")
            if user_type == 'vendor' and not data.get('store_name'):
                raise serializers.ValidationError("Store name is required for vendors")
        return data

    def create(self, validated_data):
        # Hash the password
        validated_data['password'] = make_password(validated_data.get('password'))

        # Check if email already exists
        email = validated_data.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        
        # Set username to email for consistency
        validated_data['username'] = email

        # Handle the full name
        full_name = validated_data.pop('full_name', '')

        # Remove confirm_password
        validated_data.pop('confirm_password')

        # Self-registered users: active but not verified (pending approval)
        validated_data['is_active'] = True
        validated_data['is_verified'] = False
        print(f"📝 Public registration: {email} - Pending admin approval")

        try:
            user = User.objects.create(**validated_data)
            # Set full name
            user.full_name = full_name
            user.save()
            return user

        except IntegrityError as e:
            # This should not happen now, but just in case
            raise serializers.ValidationError({"email": "This email is already registered."})
                
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        trim_whitespace=False
    )

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            raise serializers.ValidationError("Email and password are required")

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            raise serializers.ValidationError("Account disabled")

        if not hasattr(user, 'user_type') or not hasattr(user, 'is_verified'):
            raise serializers.ValidationError("System configuration error")

        data['user'] = user
        return data
    
class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'parent', 'description', 'image', 'children')

    def get_children(self, obj):
        return CategorySerializer(obj.get_children(), many=True).data

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'is_primary')

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ('id', 'name', 'value', 'price_adjustment', 'stock')

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    vendor_name = serializers.SerializerMethodField()
    vendor = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    
    # Explicitly define category field to handle both string and integer inputs
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        error_messages={
            'does_not_exist': 'The selected category does not exist.',
            'incorrect_type': 'Incorrect type. Expected category ID, got {data_type}.'
        }
    )
    
    # Add image field with proper configuration
    image = serializers.ImageField(required=False, allow_null=True)
    
    def get_image_url(self, obj):
        """Return the full URL for the product image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'slug', 'description', 'price',
            'stock', 'category', 'category_name', 'vendor',
            'vendor_name', 'images', 'variants', 'is_active',
            'approval_status', 'approval_note', 'featured',
            'average_rating', 'created_at', 'image'
        )
        read_only_fields = ('slug', 'approval_status', 'approval_note')
        
    def create(self, validated_data):
        # Set the vendor to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['vendor'] = request.user
            
        # Generate slug from name
        if 'name' in validated_data and not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])
            
        # Ensure the slug is unique
        if 'slug' in validated_data:
            base_slug = validated_data['slug']
            counter = 1
            while Product.objects.filter(slug=validated_data['slug']).exists():
                validated_data['slug'] = f"{base_slug}-{counter}"
                counter += 1
        
        # Handle image upload
        image = validated_data.pop('image', None)
        
        # Set the image on the product itself
        if image:
            validated_data['image'] = image
            
        product = super().create(validated_data)
        
        # Also create a ProductImage for consistency with the images relationship
        if image:
            ProductImage.objects.create(
                product=product,
                image=image,
                is_primary=True
            )
            
        return product
        
    def validate_category(self, value):
        # Ensure the category exists and is active
        if not value.is_active:
            raise serializers.ValidationError("This category is not active.")
        return value

    def get_vendor_name(self, obj):
        """Return vendor's full name using the same logic as customer full_name"""
        if obj.vendor:
            vendor = obj.vendor
            
            # Get full name - handle empty strings (same logic as customer)
            full_name = getattr(vendor, 'full_name', '').strip()
            if not full_name:
                first = getattr(vendor, 'first_name', '').strip()
                last = getattr(vendor, 'last_name', '').strip()
                full_name = f"{first} {last}".strip()
            
            # Return the full name if we have it, otherwise return None
            return full_name if full_name else None
                
        return None
    
    def get_vendor(self, obj):
        """Return full vendor object with name fields"""
        if obj.vendor:
            return {
                'id': obj.vendor.id,
                'username': obj.vendor.username,
                'email': obj.vendor.email,
                'first_name': getattr(obj.vendor, 'first_name', ''),
                'last_name': getattr(obj.vendor, 'last_name', ''),
                'full_name': getattr(obj.vendor, 'full_name', ''),
                'store_name': getattr(obj.vendor, 'store_name', ''),
            }
        return None

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return sum(review.rating for review in reviews) / len(reviews)

class CartItemSerializer(serializers.ModelSerializer):
    # Provide full product details for frontend consumption
    product = ProductSerializer(read_only=True)
    # Allow write via product_id when needed
    product_id = serializers.PrimaryKeyRelatedField(source='product', queryset=Product.objects.all(), write_only=True, required=False)
    variant_name = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = (
            'id', 'product', 'product_id', 'variant',
            'variant_name', 'quantity', 'subtotal'
        )

    def get_variant_name(self, obj):
        if obj.variant:
            return f"{obj.variant.name}: {obj.variant.value}"
        return None

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'total_amount', 'created_at')
        read_only_fields = ('user',)

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    # Provide minimal nested product expected by vendor Orders page
    product = serializers.SerializerMethodField()
    variant_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            'id', 'product', 'product_name', 'variant',
            'variant_name', 'quantity', 'price',
            'vendor_earning', 'platform_fee'
        )
        read_only_fields = ('vendor_earning', 'platform_fee')

    def get_variant_name(self, obj):
        if obj.variant:
            return f"{obj.variant.name}: {obj.variant.value}"
        return None

    def get_product(self, obj):
        try:
            image_url = None
            if obj.product and getattr(obj.product, 'image', None) and hasattr(obj.product.image, 'url'):
                request = self.context.get('request')
                image_url = request.build_absolute_uri(obj.product.image.url) if request else obj.product.image.url
            
            # Get vendor information
            vendor_info = None
            if obj.product and obj.product.vendor:
                vendor = obj.product.vendor
                vendor_info = {
                    'id': vendor.id,
                    'username': vendor.username,
                    'first_name': getattr(vendor, 'first_name', ''),
                    'last_name': getattr(vendor, 'last_name', ''),
                    'full_name': getattr(vendor, 'full_name', ''),
                    'email': vendor.email,
                    'phone': getattr(vendor, 'phone', ''),
                    'store_name': getattr(vendor, 'store_name', ''),
                }
            
            return {
                'id': getattr(obj.product, 'id', None),
                'name': getattr(obj.product, 'name', None),
                'image': image_url,
                'price': getattr(obj.product, 'price', None),
                'vendor': vendor_info,
            }
        except Exception:
            return {
                'id': None,
                'name': None,
                'image': None,
                'price': None,
                'vendor': None,
            }

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.SerializerMethodField()  # Override to include complete user info
    user_name = serializers.CharField(source='user.username', read_only=True)
    # Frontend expects 'customer' and a structured 'shipping_address'
    customer = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    can_vendor_process = serializers.SerializerMethodField()
    admin_approved_by_name = serializers.CharField(source='admin_approved_by.username', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'user', 'user_name', 'status', 'total_amount',
            'customer', 'shipping_address', 'tracking_number', 'notes',
            'items', 'created_at', 'updated_at',
            'admin_approved', 'admin_approved_by', 'admin_approved_by_name', 
            'admin_approval_date', 'admin_notes', 'vendor_can_process',
            'processing_started_at', 'shipped_at', 'delivered_at',
            'progress_percentage', 'can_vendor_process'
        )
        read_only_fields = ('user', 'admin_approved_by', 'admin_approval_date')

    def get_user(self, obj):
        """Return complete user information for invoice/order details"""
        user = obj.user
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': getattr(user, 'full_name', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'phone': getattr(user, 'phone', ''),
        }

    def get_customer(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'full_name': getattr(user, 'full_name', user.username),
            'email': user.email,
            'phone': getattr(user, 'phone', ''),
        }

    def get_shipping_address(self, obj):
        """Attempt to parse the free-text shipping_address into a structured object.
        Expected format from Checkout: "{address}, {city}, {country} {zip}"
        """
        text = obj.shipping_address or ''
        address_line1 = ''
        city = ''
        country = ''
        postal_code = ''
        try:
            parts = [p.strip() for p in text.split(',')]
            if len(parts) >= 1:
                address_line1 = parts[0]
            if len(parts) >= 2:
                city = parts[1]
            if len(parts) >= 3:
                tail = parts[2].split()
                if len(tail) >= 1:
                    country = tail[0]
                if len(tail) >= 2:
                    postal_code = tail[1]
        except Exception:
            pass
        return {
            'address_line1': address_line1,
            'address_line2': '',
            'city': city,
            'state': '',
            'postal_code': postal_code,
            'country': country,
        }
    
    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()
    
    def get_can_vendor_process(self, obj):
        return obj.can_vendor_process()

class TransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.id', read_only=True)
    user_name = serializers.CharField(source='order.user.username', read_only=True)

    class Meta:
        model = Transaction
        fields = (
            'id', 'order', 'order_number', 'user_name',
            'transaction_id', 'amount', 'status',
            'payment_method', 'payment_details',
            'admin_approved', 'admin_note', 'created_at'
        )
        read_only_fields = ('admin_approved', 'admin_note')

class VendorEarningSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order_item.order.id', read_only=True)
    product_name = serializers.CharField(source='order_item.product.name', read_only=True)

    class Meta:
        model = VendorEarning
        fields = (
            'id', 'vendor', 'order_item', 'order_number',
            'product_name', 'amount', 'status', 'payout_date',
            'payout_reference', 'admin_note', 'created_at'
        )
        read_only_fields = ('vendor', 'admin_note')

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id', 'user', 'user_name', 'product',
            'product_name', 'rating', 'comment', 'created_at'
        )
        read_only_fields = ('user',)

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value

class WishlistItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(
        source='product.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = WishlistItem
        fields = ('id', 'product', 'product_name', 'product_price', 'created_at')

class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ('id', 'user', 'items', 'created_at')
        read_only_fields = ('user',)

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'related_id', 'created_at', 'time_ago',
            'requires_confirmation', 'confirmed_by_vendor', 'confirmed_at',
            'admin_notified_of_confirmation'
        ]
        read_only_fields = ('created_at', 'updated_at', 'confirmed_at')
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        now = timezone.now()
        if obj.created_at > now - timezone.timedelta(days=1):
            return timesince(obj.created_at, now) + ' ago'
        return obj.created_at.strftime('%b %d, %Y')


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ['id', 'name', 'role', 'image', 'content', 'rating', 'created_at']


class UserMessageSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMessageSettings
        fields = ['email_notifications', 'desktop_notifications', 'allow_messages_from']
        read_only_fields = ['created_at', 'updated_at']


class MessageReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'reaction_type', 'created_at', 'user_name', 'user_id']
        read_only_fields = ['id', 'created_at', 'user_name', 'user_id']


class MessageReadReceiptSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = MessageReadReceipt
        fields = ['id', 'read_at', 'user_name', 'user_id']
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    is_own_message = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    status = serializers.ChoiceField(
        choices=MessageStatus.choices,
        default=MessageStatus.SENDING,
        required=False
    )
    reactions = MessageReactionSerializer(many=True, read_only=True)
    read_receipts = MessageReadReceiptSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    is_edited = serializers.SerializerMethodField()
    conversation = serializers.PrimaryKeyRelatedField(queryset=Conversation.objects.all())
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'content', 'is_read', 'created_at', 'updated_at', 'edited_at',
            'sender_name', 'sender_id', 'sender_avatar', 'is_own_message', 
            'time_ago', 'status', 'reactions', 'read_receipts', 'parent_id',
            'can_edit', 'can_delete', 'is_edited'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'edited_at', 'is_read',
            'sender_name', 'sender_id', 'sender_avatar', 'is_own_message',
            'time_ago', 'reactions', 'read_receipts', 'can_edit',
            'can_delete', 'is_edited'
        ]
    
    def create(self, validated_data):
        # Get the conversation from validated data
        from django.utils import timezone
        conversation = validated_data.pop('conversation', None)
        
        try:
            # Create the message with required fields
            message = Message.objects.create(
                conversation=conversation,
                sender=self.context['request'].user,
                content=validated_data.get('content', ''),
                status=MessageStatus.SENT,
                is_read=False
            )
            
            # Ensure the created_at is timezone-aware
            if not timezone.is_aware(message.created_at):
                message.created_at = timezone.make_aware(message.created_at)
                message.save(update_fields=['created_at'])
                
            return message
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating message: {str(e)}")
            raise
    
    def get_sender_avatar(self, obj):
        if obj.sender.profile_image:
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.sender.profile_image.url)
            return obj.sender.profile_image.url
        return None

    def get_is_own_message(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender == request.user
        return False
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return False
        # Allow editing within 15 minutes of sending
        time_since_sent = timezone.now() - obj.created_at
        return obj.sender == request.user and time_since_sent.total_seconds() < 900  # 15 minutes
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return False
        # Allow deletion within 1 hour of sending
        time_since_sent = timezone.now() - obj.created_at
        return obj.sender == request.user and time_since_sent.total_seconds() < 3600  # 1 hour
    
    def get_is_edited(self, obj):
        return obj.edited_at is not None

    def get_time_ago(self, obj):
        from django.utils import timezone
        from django.utils.timesince import timesince
        now = timezone.now()
        if obj.created_at:
            delta = now - obj.created_at
            if delta.total_seconds() < 60:  # Less than a minute
                return 'Just now'
            if delta.total_seconds() < 3600:  # Less than an hour
                minutes = int(delta.total_seconds() / 60)
                return f'{minutes}m ago' if minutes > 1 else '1m ago'
            if delta.days == 0:  # Today
                return obj.created_at.strftime('%I:%M %p')
            if delta.days == 1:  # Yesterday
                return 'Yesterday'
            if delta.days < 7:  # This week
                return obj.created_at.strftime('%A')
            return obj.created_at.strftime('%b %d, %Y')
        return ''


class MessageReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'reaction_type', 'created_at', 'user_name', 'user_id']
        read_only_fields = ['id', 'created_at', 'user_name', 'user_id']


class ConversationListSerializer(serializers.ModelSerializer):
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    typing = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'other_participant', 'last_message', 'unread_count', 
            'created_at', 'updated_at', 'is_online', 'typing'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            other_user = obj.get_other_participant(request.user)
            if other_user:
                profile_image = None
                if other_user.profile_image and hasattr(other_user.profile_image, 'url'):
                    profile_image = request.build_absolute_uri(other_user.profile_image.url)
                
                return {
                    'id': other_user.id,
                    'username': other_user.username,
                    'full_name': getattr(other_user, 'full_name', other_user.username),
                    'email': other_user.email,
                    'profile_image': profile_image,
                    'is_online': getattr(other_user, 'is_online', False)
                }
        return None

    def get_last_message(self, obj):
        if not obj.last_message:
            return None
            
        last_msg = obj.last_message
        message = {
            'id': last_msg.id,
            'content': last_msg.content[:100] + ('...' if len(last_msg.content) > 100 else ''),
            'created_at': last_msg.created_at,
            'is_read': last_msg.is_read,
            'status': last_msg.status,
            'sender_id': last_msg.sender.id,
            'is_own_message': False,
            'is_edited': last_msg.edited_at is not None
        }
        
        # Add sender info if it's not the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user') and last_msg.sender != request.user:
            message.update({
                'sender_name': getattr(last_msg.sender, 'full_name', last_msg.sender.username),
                'sender_avatar': request.build_absolute_uri(last_msg.sender.profile_image.url) 
                               if hasattr(last_msg.sender, 'profile_image') and last_msg.sender.profile_image else None
            })
        
        return message

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.get_unread_count(request.user)
        return 0
        
    def get_is_online(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            other_user = obj.get_other_participant(request.user)
            if other_user:
                return getattr(other_user, 'is_online', False)
        return False
        
    def get_typing(self, obj):
        # This will be populated by the WebSocket consumer
        return False


class ConversationDetailSerializer(ConversationListSerializer):
    messages = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    can_reply = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    
    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + [
            'messages', 'participants', 'can_reply', 'is_muted'
        ]
    
    def get_messages(self, obj):
        request = self.context.get('request')
        messages = obj.messages.select_related('sender').prefetch_related(
            'read_receipts', 'reactions'
        ).order_by('-created_at')
        
        # Pagination
        page = request.query_params.get('page', 1) if request else 1
        page_size = 50  # Messages per page
        paginator = Paginator(messages, page_size)
        
        try:
            messages_page = paginator.page(page)
        except PageNotAnInteger:
            messages_page = paginator.page(1)
        except EmptyPage:
            messages_page = paginator.page(paginator.num_pages)
        
        # Mark messages as read when viewing conversation
        if request and hasattr(request, 'user'):
            unread_messages = messages.filter(
                read_receipts__isnull=True
            ).exclude(sender=request.user)
            
            if unread_messages.exists():
                from .models import MessageReadReceipt
                read_receipts = [
                    MessageReadReceipt(message=msg, user=request.user)
                    for msg in unread_messages
                ]
                MessageReadReceipt.objects.bulk_create(read_receipts, ignore_conflicts=True)
                
                # Update message status to read
                unread_messages.update(is_read=True)
        
        return {
            'count': paginator.count,
            'next': messages_page.has_next(),
            'previous': messages_page.has_previous(),
            'page': messages_page.number,
            'pages': paginator.num_pages,
            'results': MessageSerializer(
                messages_page.object_list, 
                many=True, 
                context=self.context
            ).data
        }
    
    def get_participants(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return []
            
        participants = []
        for user in obj.participants.all():
            profile_image = None
            if user.profile_image and hasattr(user.profile_image, 'url'):
                profile_image = request.build_absolute_uri(user.profile_image.url)
                
            participants.append({
                'id': user.id,
                'username': user.username,
                'full_name': getattr(user, 'full_name', user.username),
                'email': user.email,
                'profile_image': profile_image,
                'is_online': getattr(user, 'is_online', False),
                'is_you': user == request.user
            })
        return participants
    
    def get_can_reply(self, obj):
        # Add any business logic for reply permissions here
        return True
    
    def get_is_muted(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return False
        # Check if the user has muted this conversation
        # You'll need to implement this based on your notification settings
        return False

class VendorAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorAnalytics
        fields = (
            'id', 'vendor', 'date', 'total_sales',
            'total_orders', 'total_products_sold',
            'total_earnings', 'platform_fees'
        )
        read_only_fields = ('vendor',)

class AdministratorDashboardMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdministratorDashboardMetrics
        fields = (
            # Basic fields
            'id', 'date',
            
            # User metrics
            'total_users', 'new_users_today', 'active_users', 'user_growth',
            
            # Vendor metrics
            'total_vendors', 'pending_vendor_approvals', 'active_vendors', 'vendor_growth',
            
            # Product metrics
            'total_products', 'pending_product_approvals', 'out_of_stock_products',
            
            # Order metrics
            'total_orders', 'pending_orders', 'completed_orders', 'cancelled_orders', 'order_growth',
            
            # Financial metrics
            'total_sales', 'platform_revenue', 'pending_payouts', 'revenue_growth',
            
            # System metrics
            'refund_requests', 'open_disputes',
            
            # Performance metrics
            'conversion_rate', 'conversion_rate_change', 'average_order_value', 'aov_change',
            
            # Legacy/compatibility fields
            'total_commission', 'pending_approvals'
        )


class PayoutRequestSerializer(serializers.ModelSerializer):
    vendor_info = serializers.SerializerMethodField()
    receipt_info = serializers.SerializerMethodField()
    admin_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'vendor', 'vendor_info', 'amount', 'status',
            'notes', 'admin_notes', 'payout_reference', 'payout_date',
            'approved_by', 'approved_at', 'completed_by', 'completed_at',
            'created_at', 'updated_at', 'receipt_info', 'admin_info'
        ]
        read_only_fields = [
            'approved_by', 'approved_at', 'completed_by', 'completed_at',
            'created_at', 'updated_at'
        ]
    
    def get_vendor_info(self, obj):
        vendor = obj.vendor
        
        # Get full name - handle empty strings
        full_name = getattr(vendor, 'full_name', '').strip()
        if not full_name:
            first = getattr(vendor, 'first_name', '').strip()
            last = getattr(vendor, 'last_name', '').strip()
            full_name = f"{first} {last}".strip()
        if not full_name:
            full_name = vendor.username
            
        # Get store name - handle empty strings
        store_name = getattr(vendor, 'store_name', '').strip()
        if not store_name:
            store_name = vendor.username
            
        # Get phone - handle empty strings
        phone = getattr(vendor, 'phone', '').strip()
        
        return {
            'id': vendor.id,
            'username': vendor.username,
            'first_name': getattr(vendor, 'first_name', ''),
            'last_name': getattr(vendor, 'last_name', ''),
            'full_name': full_name,
            'email': vendor.email,
            'store_name': store_name,
            'phone': phone if phone else None,
            'commission_rate': getattr(vendor, 'commission_rate', 10),
            'payment_method': getattr(vendor, 'payment_method', ''),
        }
    
    def get_receipt_info(self, obj):
        """Return receipt information if available"""
        try:
            receipt = obj.receipt
            return {
                'receipt_number': receipt.receipt_number,
                'transaction_id': receipt.transaction_id,
                'payment_method': receipt.payment_method,
                'payment_destination': receipt.payment_destination,
                'gross_amount': str(receipt.gross_amount),
                'processing_fee': str(receipt.processing_fee),
                'net_amount': str(receipt.net_amount),
                'payment_status': receipt.payment_status,
                'issued_at': receipt.issued_at,
                'payment_completed_at': receipt.payment_completed_at,
            }
        except:
            return None
    
    def get_admin_info(self, obj):
        """Return admin information for completed_by and approved_by"""
        admin_info = {}
        
        if obj.approved_by:
            admin = obj.approved_by
            approved_name = getattr(admin, 'full_name', '').strip()
            if not approved_name:
                approved_name = f"{admin.first_name} {admin.last_name}".strip()
            if not approved_name:
                approved_name = admin.username
            admin_info['approved_by_name'] = approved_name
        else:
            admin_info['approved_by_name'] = None
            
        if obj.completed_by:
            admin = obj.completed_by
            completed_name = getattr(admin, 'full_name', '').strip()
            if not completed_name:
                completed_name = f"{admin.first_name} {admin.last_name}".strip()
            if not completed_name:
                completed_name = admin.username
            admin_info['completed_by_name'] = completed_name
        else:
            admin_info['completed_by_name'] = None
            
        return admin_info


class VendorEarningsSerializer(serializers.ModelSerializer):
    """Serializer for vendor earnings and balance tracking"""
    vendor_name = serializers.CharField(source='vendor.full_name', read_only=True)
    vendor_email = serializers.CharField(source='vendor.email', read_only=True)
    store_name = serializers.CharField(source='vendor.store_name', read_only=True)
    
    class Meta:
        model = VendorEarnings
        fields = [
            'id', 'vendor', 'vendor_name', 'vendor_email', 'store_name',
            'total_earnings', 'available_balance', 'pending_balance', 
            'total_withdrawn', 'total_orders', 'last_payout_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['vendor', 'created_at', 'updated_at']


class PayoutRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for vendors to create payout requests"""
    
    class Meta:
        model = PayoutRequest
        fields = ['amount', 'notes']
    
    def validate_amount(self, value):
        """Validate that the vendor has sufficient balance"""
        from decimal import Decimal
        
        if value <= Decimal('0'):
            raise serializers.ValidationError("Amount must be greater than zero.")
        
        # Check minimum payout amount
        min_payout = Decimal('10.00')
        if value < min_payout:
            raise serializers.ValidationError(f"Minimum payout amount is ${min_payout}.")
        
        return value
    
    def validate(self, data):
        """Validate vendor has sufficient balance - calculated in real-time"""
        from django.db.models import Sum
        vendor = self.context['request'].user
        
        # Calculate real-time earnings from delivered orders
        total_earnings = OrderItem.objects.filter(
            product__vendor=vendor,
            order__status__in=['delivered', 'completed']
        ).aggregate(total=Sum('vendor_earning'))['total'] or 0
        
        # Calculate withdrawn and pending amounts
        # Include both 'completed' and 'processed' for backward compatibility
        total_withdrawn = PayoutRequest.objects.filter(
            vendor=vendor,
            status__in=['completed', 'processed']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        pending_balance = PayoutRequest.objects.filter(
            vendor=vendor,
            status__in=['pending', 'approved']
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Calculate available balance
        available_balance = float(total_earnings) - float(total_withdrawn) - float(pending_balance)
        
        if data['amount'] < 100:
            raise serializers.ValidationError({
                'amount': "Minimum withdrawal amount is $100.00"
            })

        if data['amount'] > available_balance:
            raise serializers.ValidationError({
                'amount': f"Insufficient balance. Available: ${available_balance:.2f}"
            })
        
        return data
    
    def create(self, validated_data):
        vendor = self.context['request'].user
        
        # Create payout request (balance is calculated in real-time, no need to update stored values)
        payout = PayoutRequest.objects.create(
            vendor=vendor,
            **validated_data
        )
        
        return payout


class AdminPayoutApprovalSerializer(serializers.Serializer):
    """Serializer for admin to approve or reject payout requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    admin_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        payout = self.context['payout']
        
        if payout.status != 'pending':
            raise serializers.ValidationError("Only pending payouts can be approved or rejected.")
        
        return data


class AdminPayoutProcessSerializer(serializers.Serializer):
    """Serializer for admin to mark payout as completed"""
    payout_reference = serializers.CharField(
        required=True,
        help_text="Transaction ID, check number, or reference"
    )
    payout_date = serializers.DateField(
        required=False,
        help_text="Date of payout (defaults to today)"
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        payout = self.context['payout']
        
        if payout.status != 'approved':
            raise serializers.ValidationError("Only approved payouts can be completed.")
        
        return data


class PaymentMethodSerializer(serializers.Serializer):
    """Serializer for vendor payment method setup"""
    payment_method = serializers.ChoiceField(
        choices=User.PAYMENT_METHOD_CHOICES,
        required=True
    )
    payment_details = serializers.JSONField(required=True)
    
    def validate_payment_details(self, value):
        """Validate payment details based on payment method"""
        payment_method = self.initial_data.get('payment_method')
        
        if payment_method == 'bank_transfer':
            required_fields = ['account_name', 'account_number', 'bank_name', 'routing_number']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"Missing required field: {field}")
        
        elif payment_method == 'paypal':
            if 'email' not in value:
                raise serializers.ValidationError("PayPal email is required")
        
        elif payment_method == 'stripe':
            if 'account_id' not in value:
                raise serializers.ValidationError("Stripe account ID is required")
        
        elif payment_method == 'wise':
            if 'email' not in value:
                raise serializers.ValidationError("Wise email is required")
        
        return value


# ===== COUPON & DISCOUNT SERIALIZERS =====

class CouponSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    vendor_name = serializers.CharField(source='vendor.store_name', read_only=True)
    is_valid_now = serializers.SerializerMethodField()
    discount_display = serializers.SerializerMethodField()
    uses_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = (
            'id', 'code', 'description', 'discount_type', 'discount_value',
            'coupon_type', 'vendor', 'vendor_name', 'min_purchase_amount',
            'max_discount_amount', 'valid_from', 'valid_until', 'max_uses',
            'max_uses_per_user', 'is_active', 'times_used', 'created_by',
            'created_by_name', 'created_at', 'updated_at', 'is_valid_now',
            'discount_display', 'uses_remaining'
        )
        read_only_fields = ('created_by', 'times_used', 'created_at', 'updated_at')
    
    def get_is_valid_now(self, obj):
        valid, _ = obj.is_valid()
        return valid
    
    def get_discount_display(self, obj):
        return obj.get_discount_display()
    
    def get_uses_remaining(self, obj):
        if obj.max_uses is None:
            return "Unlimited"
        remaining = obj.max_uses - obj.times_used
        return max(0, remaining)
    
    def validate_code(self, value):
        """Ensure coupon code is unique and uppercase"""
        value = value.upper().strip()
        
        # Check uniqueness for new coupons or when changing code
        instance = self.instance
        if not instance or instance.code != value:
            if Coupon.objects.filter(code=value).exists():
                raise serializers.ValidationError("This coupon code already exists")
        
        return value
    
    def validate(self, data):
        """Validate coupon data"""
        # Ensure vendor-specific coupons have a vendor
        if data.get('coupon_type') == 'vendor' and not data.get('vendor'):
            raise serializers.ValidationError({
                'vendor': 'Vendor must be specified for vendor-specific coupons'
            })
        
        # Ensure platform-wide coupons don't have a vendor
        if data.get('coupon_type') == 'platform' and data.get('vendor'):
            raise serializers.ValidationError({
                'vendor': 'Platform-wide coupons cannot be assigned to a specific vendor'
            })
        
        # Validate discount value
        if data.get('discount_type') == 'percentage' and data.get('discount_value'):
            if not (0 < data['discount_value'] <= 100):
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount must be between 0 and 100'
                })
        
        # Validate dates
        if data.get('valid_until') and data.get('valid_from'):
            if data['valid_until'] <= data['valid_from']:
                raise serializers.ValidationError({
                    'valid_until': 'End date must be after start date'
                })
        
        return data


class CouponUsageSerializer(serializers.ModelSerializer):
    coupon_code = serializers.CharField(source='coupon.code', read_only=True)
    coupon_description = serializers.CharField(source='coupon.description', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    order_number = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = CouponUsage
        fields = (
            'id', 'coupon', 'coupon_code', 'coupon_description',
            'user', 'user_email', 'order', 'order_number',
            'used_at', 'discount_amount'
        )
        read_only_fields = ('used_at',)