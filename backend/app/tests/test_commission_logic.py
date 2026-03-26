from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from backend.app.models import Category, Product, Order, OrderItem, CommissionRule, CommissionTier, ProductVariant

User = get_user_model()

class CommissionLogicTests(TestCase):
    def setUp(self):
        # Create users
        self.vendor = User.objects.create_user(
            username='vendor', 
            email='vendor@example.com', 
            password='password123',
            user_type='vendor',
            commission_rate=Decimal('10.00') # 10% Default
        )
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='password123',
            user_type='buyer'
        )
        
        # Create categories
        self.category_electronics = Category.objects.create(name='Electronics')
        self.category_books = Category.objects.create(name='Books')
        
        # Create products
        self.product_laptop = Product.objects.create(
            vendor=self.vendor,
            category=self.category_electronics,
            name='Laptop',
            price=Decimal('1000.00'),
            slug='laptop',
            stock=10
        )
        self.product_book = Product.objects.create(
            vendor=self.vendor,
            category=self.category_books,
            name='Book',
            price=Decimal('20.00'),
            slug='book',
            stock=100
        )

    def test_default_commission_rate(self):
        """Test that vendor's default commission rate is used when no rules exist"""
        order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('1000.00'),
            status='pending',
            shipping_address='123 Test St'
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product_laptop,
            quantity=1,
            price=self.product_laptop.price,
            vendor_earning=0, # Calculated on save
            platform_fee=0    # Calculated on save
        )
        
        # Default rate is 10%
        # Fee should be 1000 * 0.10 = 100
        self.assertEqual(item.platform_fee, Decimal('100.00'))
        self.assertEqual(item.vendor_earning, Decimal('900.00'))

    def test_category_commission_rule(self):
        """Test that a category-specific rule overrides default rate"""
        # Create a rule for Electronics category: 5%
        CommissionRule.objects.create(
            name="Electronics Promo",
            category=self.category_electronics,
            commission_rate=Decimal('5.00'),
            priority=10
        )
        
        order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('1000.00'),
            status='pending',
            shipping_address='123 Test St'
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product_laptop,  # Is in Electronics
            quantity=1,
            price=self.product_laptop.price,
            vendor_earning=0,
            platform_fee=0
        )
        
        # Rule rate is 5%
        # Fee should be 1000 * 0.05 = 50
        self.assertEqual(item.platform_fee, Decimal('50.00'))
        self.assertEqual(item.vendor_earning, Decimal('950.00'))
        
    def test_product_commission_rule(self):
         """Test that a product-specific rule overrides category rule"""
         # Category rule: 5%
         CommissionRule.objects.create(
            name="Electronics Promo",
            category=self.category_electronics,
            commission_rate=Decimal('5.00'),
            priority=10
        )
         # Product rule: 2%
         CommissionRule.objects.create(
            name="Laptop Special",
            product=self.product_laptop,
            commission_rate=Decimal('2.00'),
            priority=20 # Higher priority
        )
         
         order = Order.objects.create(
            user=self.buyer,
            total_amount=Decimal('1000.00'),
            status='pending',
            shipping_address='123 Test St'
        )
         item = OrderItem.objects.create(
            order=order,
            product=self.product_laptop,
            quantity=1,
            price=self.product_laptop.price,
            vendor_earning=0,
            platform_fee=0
        )
         
         # Rule rate is 2%
         # Fee should be 1000 * 0.02 = 20
         self.assertEqual(item.platform_fee, Decimal('20.00'))

    def test_tiered_commission(self):
        """Test that sales volume triggers tiered commission rates"""
        # Tier: > $2000 sales -> 8% commission (Default is 10%)
        CommissionTier.objects.create(
            name="Gold Tier",
            min_sales_amount=Decimal('2000.00'),
            commission_rate=Decimal('8.00')
        )
        
        # Create past COMPLETED orders to boost sales volume
        # Order 1: $1500
        order1 = Order.objects.create(user=self.buyer, total_amount=1500, status='completed', shipping_address='x')
        OrderItem.objects.create(
            order=order1, product=self.product_laptop, quantity=1, price=Decimal('1500.00'),
            vendor_earning=0, platform_fee=0
        )
        
        # Order 2: $1000 (Total sales now $2500 > $2000)
        order2 = Order.objects.create(user=self.buyer, total_amount=1000, status='completed', shipping_address='x')
        OrderItem.objects.create(
             order=order2, product=self.product_laptop, quantity=1, price=Decimal('1000.00'),
            vendor_earning=0, platform_fee=0
        )
        
        # Now create new order, should get 8% rate
        order_new = Order.objects.create(user=self.buyer, total_amount=100, status='pending', shipping_address='x')
        item_new = OrderItem.objects.create(
            order=order_new, product=self.product_book, quantity=1, price=Decimal('100.00'),
            vendor_earning=0, platform_fee=0
        )
        
        # 8% of 100 = 8
        self.assertEqual(item_new.platform_fee, Decimal('8.00'))
