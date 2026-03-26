from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum
from .models import CommissionRule, CommissionTier, User, VendorAnalytics

class CommissionCalculator:
    @staticmethod
    def calculate_commission(order_item):
        """
        Calculate commission for an OrderItem.
        Returns: (commission_amount, rate_used, rule_name)
        """
        product = order_item.product
        category = product.category
        vendor = product.vendor
        price = order_item.price  # Total line price (Decimal)
        
        # Default to vendor's base rate
        rate = vendor.commission_rate
        rule_name = "Vendor Default"
        
        # 1. Check Commission Rules (Product > Category > Vendor > Global)
        # We fetch all active rules and filter/sort in Python to handle dates and priority
        
        # Potential rules:
        # - Specific Product
        # - Specific Category
        # - Specific Vendor (e.g. promotional rate for this vendor)
        # - Global rules (vendor=None)
        
        from django.db.models import Q
        
        now = timezone.now()
        
        # Filter potential rules
        rules = CommissionRule.objects.filter(
            is_active=True
        ).filter(
            Q(valid_from__isnull=True) | Q(valid_from__lte=now)
        ).filter(
            Q(valid_until__isnull=True) | Q(valid_until__gte=now)
        ).filter(
            Q(product=product) | 
            Q(category=category) | 
            Q(vendor=vendor) |
            (Q(vendor__isnull=True) & Q(category__isnull=True) & Q(product__isnull=True)) # Global rule?
        ).order_by('-priority', '-created_at')
        
        # Iterate and find the most specific/highest priority match
        # Since we ordered by priority, the first valid match is the winner.
        # But we need to ensure specificity. Usually Model logic: Product > Category.
        # However, we defined 'priority' field to handle this explicitly. 
        # So we just take the first matching rule.
        
        if rules.exists():
            rule = rules.first()
            rate = rule.commission_rate
            rule_name = f"Rule: {rule.name}"
            
            # Calculate and return immediately if rule found (highest priority)
            commission_amount = price * (rate / Decimal('100'))
            return commission_amount, rate, rule_name

        # 2. Check Tiered Commission (based on Sales Volume)
        # Calculate total sales for vendor (excluding this item ideally, or including? usually historical)
        # Let's use VendorAnalytics or aggregate OrderItems
        
        # Calculate total confirmed sales volume
        # We can use VendorAnalytics for speed if it's updated, or aggregate OrderItem
        # Let's aggregate OrderItems for accuracy for now (status=completed/delivered)
        # Actually, let's look at VendorEarnings total_earnings or similar?
        # Better: VendorAnalytics.total_sales
        
        # Determine total sales
        total_sales = Decimal('0.00')
        # Try to get from analytics current month or total? Usually total volume or monthly volume.
        # Let's assume Lifetime Volume for now based on typical tiered systems, or Monthly.
        # The prompt said "Sales Volume", ambiguous. checking implementation_plan... "based on vendor's total sales volume"
        
        # Simple aggregation (cached in VendorAnalytics would be better, but let's query efficiently)
        # For this MVP step, let's assume we check the VendorAnalytics if available, else 0
        
        # total_sales = VendorAnalytics.objects.filter(vendor=vendor).aggregate(Sum('total_sales'))['total_sales__sum'] or Decimal('0.00')
        
        # Actually, let's keep it simple and check if we have tiers defined first.
        tiers = CommissionTier.objects.filter(is_active=True).order_by('-min_sales_amount')
        
        if tiers.exists():
            # Only calculate if tiers exist
            from .models import OrderItem
            # efficient sum
            # We want completed sales.
            completed_sales = OrderItem.objects.filter(
                product__vendor=vendor,
                order__status__in=['completed', 'delivered', 'shipped', 'processing'] # Considered 'sold'
            ).aggregate(Sum('price'))['price__sum'] or Decimal('0.00')
            
            # Check tiers high to low
            for tier in tiers:
                if completed_sales >= tier.min_sales_amount:
                    rate = tier.commission_rate
                    rule_name = f"Tier: {tier.name}"
                    break
        
        # 3. Fallback (Vendor/Platform Default)
        # rate is already set to vendor.commission_rate initially
        
        commission_amount = price * (rate / Decimal('100'))
        return commission_amount, rate, rule_name
