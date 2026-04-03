from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.utils.text import slugify
from mptt.models import MPTTModel, TreeForeignKey
from decimal import Decimal
from .validators import validate_image, validate_large_image

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('vendor', 'Vendor'),
        ('buyer', 'Buyer'),
        ('administrator', 'Administrator'),
    )
    
    user_type = models.CharField(max_length=15, choices=USER_TYPE_CHOICES, default='buyer')
    full_name = models.CharField(max_length=255, default='')
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    profile_image = models.ImageField(
        upload_to='profile_images/', 
        blank=True, 
        null=True,
        validators=[validate_image]
    )
    store_name = models.CharField(max_length=100, blank=True, null=True)  # For vendors
    store_description = models.TextField(blank=True, null=True)  # For vendors
    bank_account = models.CharField(max_length=50, blank=True, null=True)  # For vendors (legacy)
    is_verified = models.BooleanField(default=False)  # For vendor verification
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Platform commission rate
    
    # Enhanced payment method support
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('visa_card', 'Visa Card (Stripe)'),
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
        ('wise', 'Wise (TransferWise)'),
        ('other', 'Other'),
    ]
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHOD_CHOICES, 
        blank=True, 
        null=True,
        help_text="Preferred payment method for payouts"
    )
    payment_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Payment method details (e.g., account number, email, etc.)"
    )

    class Meta:
        app_label = 'app'

    def __str__(self):
        return self.email

    @property
    def is_vendor(self):
        return self.user_type == 'vendor'

    @property
    def is_buyer(self):
        return self.user_type == 'buyer'

    @property
    def is_administrator(self):
        return self.user_type == 'administrator'

    def save(self, *args, **kwargs):
        # Ensure administrators are staff and superusers
        if self.user_type == 'administrator':
            self.is_staff = True
            self.is_superuser = True
        super().save(*args, **kwargs)

class Category(MPTTModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, blank=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='categories')
    description = models.TextField(blank=True)
    image = models.ImageField(
        upload_to='category_images/', 
        blank=True, 
        null=True,
        validators=[validate_image]
    )
    is_active = models.BooleanField(default=True)
    is_global = models.BooleanField(default=False)  # For admin-created categories
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class MPTTMeta:
        order_insertion_by = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            self.slug = base_slug
            # Check if a category with this slug already exists
            counter = 1
            while Category.objects.filter(slug=self.slug).exclude(pk=getattr(self, 'pk', None)).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

class Product(models.Model):
    APPROVAL_STATUS = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'user_type': 'vendor'})
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=200)
    image = models.ImageField(
        upload_to='product_images/', 
        null=True, 
        blank=True,
        validators=[validate_image]
    )
    slug = models.SlugField(unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='pending')
    approval_note = models.TextField(blank=True, null=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['vendor', 'approval_status']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['featured', 'created_at']),
            models.Index(fields=['slug']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(
        upload_to='product_images/',
        validators=[validate_image]
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)  # e.g., "Size", "Color"
    value = models.CharField(max_length=100)  # e.g., "XL", "Red"
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    stock = models.IntegerField(default=0)

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_amount(self):
        return sum(item.subtotal for item in self.items.all())

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        base_price = self.product.price
        if self.variant:
            base_price += self.variant.price_adjustment
        return base_price * self.quantity

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Payment'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('awaiting_approval', 'Awaiting Admin Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    shipping_address = models.TextField()
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    
    # Coupon/discount fields
    applied_coupon = models.ForeignKey('Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Before discount
    
    # Admin approval fields
    admin_approved = models.BooleanField(default=False)
    admin_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                         related_name='approved_orders', 
                                         limit_choices_to={'user_type': 'administrator'})
    admin_approval_date = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True, null=True)
    
    # Vendor processing fields
    vendor_can_process = models.BooleanField(default=False)  # Set to True when admin approves
    processing_started_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['admin_approved', 'vendor_can_process']),
            models.Index(fields=['created_at']),
        ]
    
    def get_progress_percentage(self):
        """Calculate order progress percentage"""
        status_progress = {
            'pending': 10,
            'payment_confirmed': 20,
            'awaiting_approval': 30,
            'approved': 40,
            'rejected': 0,
            'processing': 60,
            'shipped': 80,
            'delivered': 100,
            'completed': 100,
            'cancelled': 0,
            'refunded': 0,
        }
        return status_progress.get(self.status, 0)
    
    def can_vendor_process(self):
        """Check if vendor can process this order"""
        return self.admin_approved and self.vendor_can_process and self.status in ['approved', 'processing']

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of purchase
    vendor_earning = models.DecimalField(max_digits=10, decimal_places=2)  # Amount after commission
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)  # Commission amount

    def save(self, *args, **kwargs):
        if not self.pk:  # Only calculate on creation
            from .services import CommissionCalculator
            # Calculate dynamic commission
            commission_amount, rate, rule_name = CommissionCalculator.calculate_commission(self)
            
            self.platform_fee = commission_amount
            self.vendor_earning = self.price - self.platform_fee
        super().save(*args, **kwargs)

class Transaction(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    PAYMENT_METHOD_CHOICES = (
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
    )
    
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='transaction')
    transaction_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    payment_details = models.JSONField(default=dict)  # Store payment gateway response
    admin_approved = models.BooleanField(default=False)  # For admin payment approval
    admin_note = models.TextField(blank=True, null=True)  # Admin notes on payment
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['order']),
            models.Index(fields=['admin_approved']),
        ]

class VendorEarning(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    )
    
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'user_type': 'vendor'})
    order_item = models.OneToOneField(OrderItem, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payout_date = models.DateTimeField(null=True, blank=True)
    payout_reference = models.CharField(max_length=100, blank=True, null=True)
    admin_note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class StoreReview(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='store_reviews', limit_choices_to={'user_type': 'vendor'})
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_store_reviews')
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Store Review by {self.buyer.email} for {self.vendor.email}"

class Wishlist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class WishlistItem(models.Model):
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class VendorAnalytics(models.Model):
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'user_type': 'vendor'})
    date = models.DateField()
    total_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_orders = models.IntegerField(default=0)
    total_products_sold = models.IntegerField(default=0)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('vendor', 'date')

class AdministratorDashboardMetrics(models.Model):
    date = models.DateField(unique=True)
    
    # User Metrics
    total_users = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    user_growth = models.FloatField(default=0.0)  # Percentage growth
    
    # Vendor Metrics
    total_vendors = models.IntegerField(default=0)
    pending_vendor_approvals = models.IntegerField(default=0)
    active_vendors = models.IntegerField(default=0)
    vendor_growth = models.FloatField(default=0.0)  # Percentage growth
    
    # Product Metrics
    total_products = models.IntegerField(default=0)
    pending_product_approvals = models.IntegerField(default=0)
    out_of_stock_products = models.IntegerField(default=0)
    
    # Order Metrics
    total_orders = models.IntegerField(default=0)
    pending_orders = models.IntegerField(default=0)
    completed_orders = models.IntegerField(default=0)
    cancelled_orders = models.IntegerField(default=0)
    order_growth = models.FloatField(default=0.0)  # Percentage growth
    
    # Financial Metrics
    total_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_payouts = models.IntegerField(default=0)
    revenue_growth = models.FloatField(default=0.0)  # Percentage growth
    
    # System Metrics
    refund_requests = models.IntegerField(default=0)
    open_disputes = models.IntegerField(default=0)
    
    # Performance Metrics
    conversion_rate = models.FloatField(default=0.0)  # Percentage
    conversion_rate_change = models.FloatField(default=0.0)  # Percentage change
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    aov_change = models.FloatField(default=0.0)  # Percentage change
    
    # For backward compatibility
    total_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_approvals = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Administrator Dashboard Metric'
        verbose_name_plural = 'Administrator Dashboard Metrics'

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('order', 'Order Update'),
        ('product', 'Product Update'),
        ('system', 'System Notification'),
        ('promotion', 'Promotion'),
        ('account', 'Account Update'),
        ('store_review', 'Store Review'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    related_id = models.CharField(max_length=50, blank=True, null=True)  # For linking to orders, products, etc.
    
    # Vendor confirmation tracking
    requires_confirmation = models.BooleanField(default=False)  # If this notification needs vendor confirmation
    confirmed_by_vendor = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    admin_notified_of_confirmation = models.BooleanField(default=False)  # Track if admin was notified
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def mark_as_read(self):
        self.is_read = True
        self.save()

class Testimonial(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    image = models.ImageField(
        upload_to='testimonial_images/', 
        blank=True, 
        null=True,
        validators=[validate_image]
    )
    content = models.TextField()
    rating = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Testimonial by {self.name}"

    class Meta:
        ordering = ['-created_at']

class Conversation(models.Model):
    """Represents a conversation between users"""
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    last_message = models.ForeignKey(
        'Message',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conversation_last_message'
    )

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['updated_at']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"Conversation {self.id} with {self.participants.count()} participants"

    def mark_as_read(self, user):
        """Mark all messages in this conversation as read for a user"""
        unread_messages = self.messages.exclude(sender=user).filter(is_read=False)
        for message in unread_messages:
            message.mark_as_read(user)
    
    def get_other_participant(self, user):
        """Get the other participant in a 1:1 conversation"""
        if self.participants.count() != 2:
            return None
        return self.participants.exclude(id=user.id).first()
    
    def update_last_message(self, message):
        """Update the last message reference"""
        from django.utils import timezone
        self.last_message = message
        self.updated_at = timezone.now()
        self.save(update_fields=['last_message', 'updated_at'])
    
    def get_unread_count(self, user):
        """Get count of unread messages for a user"""
        return self.messages.exclude(sender=user).filter(is_read=False).count()


class MessageStatus(models.TextChoices):
    SENDING = 'sending', 'Sending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'

class Message(models.Model):
    """Represents a message in a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=MessageStatus.choices,
        default=MessageStatus.SENDING
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    original_content = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_read']),
        ]

    def __str__(self):
        return f"Message {self.id} from {self.sender.email}"

    def mark_as_read(self, user=None):
        """Mark this message as read by a specific user"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
            
            # Create read receipt
            if user and user.is_authenticated:
                MessageReadReceipt.objects.get_or_create(
                    message=self,
                    user=user,
                    defaults={'read_at': self.read_at}
                )
    
    def edit_content(self, new_content, commit=True):
        """Edit message content while preserving history"""
        if not self.original_content:
            self.original_content = self.content
        self.content = new_content
        self.edited_at = timezone.now()
        if commit:
            self.save(update_fields=['content', 'original_content', 'edited_at', 'updated_at'])


class MessageReaction(models.Model):
    """Tracks reactions to messages"""
    REACTION_CHOICES = [
        ('like', '👍'),
        ('love', '❤️'),
        ('laugh', '😂'),
        ('wow', '😮'),
        ('sad', '😢'),
        ('angry', '😡'),
    ]
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.email} reacted with {self.get_reaction_type_display()} to message {self.message.id}"


class MessageReadReceipt(models.Model):
    """Tracks when users read messages"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_read_receipts')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')
        ordering = ['-read_at']

    def __str__(self):
        return f"{self.user.email} read message {self.message.id} at {self.read_at}"


class UserMessageSettings(models.Model):
    """User-specific messaging settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='message_settings')
    email_notifications = models.BooleanField(default=True)
    desktop_notifications = models.BooleanField(default=True)
    allow_messages_from = models.CharField(
        max_length=20,
        choices=[
            ('anyone', 'Anyone'),
            ('followed', 'Followed Vendors Only'),
            ('none', 'No One')
        ],
        default='anyone'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Message settings for {self.user.email}"

    class Meta:
        ordering = ['-created_at']


class PayoutRequest(models.Model):
    """Model for vendor payout requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payout_requests')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True, help_text="Vendor notes for the request")
    admin_notes = models.TextField(blank=True, null=True, help_text="Admin notes for approval/rejection")
    
    # Approval tracking
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payouts'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Processing tracking
    completed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='completed_payouts',
        db_column='processed_by_id'  # Map to old database column
    )
    completed_at = models.DateTimeField(null=True, blank=True, db_column='processed_at')  # Map to old database column
    
    # Payout details
    payout_reference = models.CharField(max_length=200, blank=True, null=True, help_text="Transaction ID or check number")
    payout_date = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payout request ${self.amount} by {self.vendor.email} - {self.status}"


class PayoutReceipt(models.Model):
    """Model to store payout receipt information after admin processes payment"""
    payout_request = models.OneToOneField(
        PayoutRequest, 
        on_delete=models.CASCADE, 
        related_name='receipt'
    )
    
    # Receipt details
    receipt_number = models.CharField(max_length=50, unique=True, help_text="Unique receipt number")
    transaction_id = models.CharField(max_length=200, help_text="Payment gateway transaction ID")
    
    # Payment details
    payment_method = models.CharField(max_length=50, help_text="visa_card, bank_transfer, etc.")
    payment_destination = models.JSONField(help_text="Masked account/card details")
    
    # Amount details
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    processing_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    # Status
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # Gateway response
    gateway_response = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    issued_at = models.DateTimeField(auto_now_add=True)
    payment_completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-issued_at']
    
    def __str__(self):
        return f"Receipt {self.receipt_number} - ${self.net_amount}"
    
    def generate_receipt_number(self):
        """Generate unique receipt number"""
        import random
        import string
        from django.utils import timezone
        
        date_str = timezone.now().strftime('%Y%m%d')
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"RCP-{date_str}-{random_str}"


class VendorStore(models.Model):
    """Configuration for a vendor's public storefront"""
    THEME_CHOICES = [
        ('minimal', 'Minimal'),
        ('vibrant', 'Vibrant'),
        ('dark', 'Dark'),
        ('classic', 'Classic'),
    ]

    vendor = models.OneToOneField(User, on_delete=models.CASCADE, related_name='store')
    slug = models.SlugField(unique=True)
    display_name = models.CharField(max_length=150)
    logo_url = models.URLField(blank=True, null=True)
    banner_url = models.URLField(blank=True, null=True)
    theme_preset = models.CharField(max_length=20, choices=THEME_CHOICES, default='minimal')
    primary_color = models.CharField(max_length=20, default='#10B981')
    accent_color = models.CharField(max_length=20, default='#111827')
    about = models.TextField(blank=True, default='')
    socials = models.JSONField(default=dict, blank=True)
    featured_collection_id = models.IntegerField(blank=True, null=True)
    featured_product_ids = models.JSONField(default=list, blank=True, help_text="List of featured product IDs")
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.display_name} ({self.slug})"

    def save(self, *args, **kwargs):
        # Auto-generate slug if missing from display_name
        if not self.slug and self.display_name:
            base = slugify(self.display_name)
            candidate = base
            i = 1
            while VendorStore.objects.filter(slug=candidate).exclude(pk=getattr(self, 'pk', None)).exists():
                candidate = f"{base}-{i}"
                i += 1
            self.slug = candidate
        # Ensure published_at set when publishing
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

class VendorEarnings(models.Model):
    """Model to track vendor earnings and available balance"""
    vendor = models.OneToOneField(User, on_delete=models.CASCADE, related_name='earnings')
    
    # Earnings tracking
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total earnings from all completed orders")
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Balance available for withdrawal")
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Balance from pending payout requests")
    total_withdrawn = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total amount withdrawn")
    
    # Statistics
    total_orders = models.IntegerField(default=0, help_text="Total number of completed orders")
    last_payout_date = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Vendor Earnings"
    
    def __str__(self):
        return f"{self.vendor.email} - Available: ${self.available_balance}"
    
    def update_from_order(self, order_item):
        """Update earnings from a completed order item"""
        self.total_earnings += order_item.vendor_earning
        self.available_balance += order_item.vendor_earning
        self.total_orders += 1
        self.save()
    
    def request_payout(self, amount):
        """Move amount from available to pending when payout is requested"""
        if amount > self.available_balance:
            raise ValueError("Insufficient balance")
        self.available_balance -= amount
        self.pending_balance += amount
        self.save()
    
    def cancel_payout_request(self, amount):
        """Move amount back from pending to available when payout is cancelled"""
        self.pending_balance -= amount
        self.available_balance += amount
        self.save()
    
    def complete_payout(self, amount):
        """Mark payout as completed"""
        self.pending_balance -= amount
        self.total_withdrawn += amount
        self.last_payout_date = timezone.now()
        self.save()


# ===== COUPON & DISCOUNT SYSTEM =====

class Coupon(models.Model):
    """
    Coupon/discount code system supporting both vendor-specific and platform-wide promotions
    """
    DISCOUNT_TYPE_CHOICES = (
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    )
    
    COUPON_TYPE_CHOICES = (
        ('vendor', 'Vendor-Specific'),
        ('platform', 'Platform-Wide'),
    )
    
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    
    # Discount details
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)  # Percentage or fixed amount
    
    # Coupon type
    coupon_type = models.CharField(max_length=20, choices=COUPON_TYPE_CHOICES, default='platform')
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='coupons',
                               limit_choices_to={'user_type': 'vendor'})
    
    # Usage restrictions
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                              help_text="Maximum discount amount (for percentage coupons)")
    
    # Validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    
    # Usage limits
    max_uses = models.IntegerField(null=True, blank=True, help_text="Total number of times this coupon can be used")
    max_uses_per_user = models.IntegerField(default=1, help_text="Max uses per user")
    
    # Status
    is_active = models.BooleanField(default=True)
    times_used = models.IntegerField(default=0)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_coupons')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['code', 'is_active']),
            models.Index(fields=['vendor', 'is_active']),
            models.Index(fields=['valid_until']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.get_discount_display()}"
    
    def get_discount_display(self):
        """Return human-readable discount"""
        if self.discount_type == 'percentage':
            return f"{self.discount_value}% OFF"
        else:
            return f"${self.discount_value} OFF"
    
    def is_valid(self):
        """Check if coupon is currently valid"""
        now = timezone.now()
        
        # Check if active
        if not self.is_active:
            return False, "Coupon is inactive"
        
        # Check validity period
        if self.valid_from > now:
            return False, "Coupon is not yet valid"
        if self.valid_until and self.valid_until < now:
            return False, "Coupon has expired"
        
        # Check usage limits
        if self.max_uses and self.times_used >= self.max_uses:
            return False, "Coupon usage limit reached"
        
        return True, "Valid"
    
    def can_use(self, user):
        """Check if a specific user can use this coupon"""
        # Check general validity
        valid, message = self.is_valid()
        if not valid:
            return False, message
        
        # Check per-user usage
        user_usage_count = CouponUsage.objects.filter(coupon=self, user=user).count()
        if user_usage_count >= self.max_uses_per_user:
            return False, f"You have already used this coupon {self.max_uses_per_user} time(s)"
        
        return True, "Valid"
    
    def calculate_discount(self, subtotal):
        """Calculate discount amount for given subtotal"""
        # Check minimum purchase
        if subtotal < self.min_purchase_amount:
            return Decimal('0.00')
        
        if self.discount_type == 'percentage':
            discount = subtotal * (self.discount_value / Decimal('100'))
            # Apply max discount cap if set
            if self.max_discount_amount and discount > self.max_discount_amount:
                discount = self.max_discount_amount
        else:
            discount = self.discount_value
            # Don't discount more than the subtotal
            if discount > subtotal:
                discount = subtotal
        
        return discount.quantize(Decimal('0.01'))
    
    def apply_to_order(self, user):
        """Mark coupon as used and create usage record"""
        self.times_used += 1
        self.save()
        
        CouponUsage.objects.create(
            coupon=self,
            user=user
        )


class CouponUsage(models.Model):
    """Track coupon usage by users"""
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coupon_usages')
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='coupon_usage')
    used_at = models.DateTimeField(auto_now_add=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['coupon', 'user']),
            models.Index(fields=['used_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} used {self.coupon.code} on {self.used_at.strftime('%Y-%m-%d')}"


# ===== VENDOR COMMISSION MANAGEMENT =====

class CommissionTier(models.Model):
    """
    Tiered commission rates based on vendor sales volume.
    Example: 0-1000 sales = 10%, 1000-5000 sales = 8%
    """
    name = models.CharField(max_length=100)
    min_sales_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage commission rate")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['min_sales_amount']

    def __str__(self):
        return f"{self.name} (>{self.min_sales_amount}: {self.commission_rate}%)"

class CommissionRule(models.Model):
    """
    Dynamic commission rules based on product, category, or promotional periods.
    Higher priority rules override lower priority ones.
    """
    name = models.CharField(max_length=100)
    vendor = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, 
                              related_name='commission_rules', help_text="Specific vendor or null for platform-wide")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True, related_name='commission_rules')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, related_name='commission_rules')
    
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage commission rate")
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0, help_text="Higher number = higher priority")
    
    # Validity period (for promotional wafers)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['is_active', 'priority']),
            models.Index(fields=['vendor', 'category']),
        ]

    def __str__(self):
        target = "Global"
        if self.vendor: target = f"Vendor: {self.vendor}"
        elif self.product: target = f"Product: {self.product}"
        elif self.category: target = f"Cat: {self.category}"
        return f"{self.name} - {target} ({self.commission_rate}%)"

    def is_valid(self):
        now = timezone.now()
        if not self.is_active: return False
        if self.valid_from and now < self.valid_from: return False
        if self.valid_until and now > self.valid_until: return False
        return True
