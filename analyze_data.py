#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from app.models import Order, OrderItem, Transaction

print("=== DATA CONSISTENCY ANALYSIS ===")
print()

# Get all delivered orders
delivered_orders = Order.objects.filter(status__in=['delivered', 'completed'])
print(f"Delivered Orders Count: {delivered_orders.count()}")

# Calculate total from Order.total_amount
order_total = delivered_orders.aggregate(total=models.Sum('total_amount'))['total'] or 0
print(f"Order Total Amount: ${order_total}")

# Calculate total from OrderItem
order_items = OrderItem.objects.filter(order__status__in=['delivered', 'completed'])
item_total = order_items.aggregate(total=models.Sum('price'))['total'] or 0
print(f"OrderItem Total (price field): ${item_total}")

# Calculate OrderItem revenue (price * quantity)
item_revenue = order_items.aggregate(
    total=models.Sum(models.F('price') * models.F('quantity'))
)['total'] or 0
print(f"OrderItem Revenue (price * quantity): ${item_revenue}")

# Check Transaction totals
completed_transactions = Transaction.objects.filter(status='completed')
transaction_total = completed_transactions.aggregate(total=models.Sum('amount'))['total'] or 0
print(f"Transaction Total (completed): ${transaction_total}")

print()
print("=== SAMPLE DATA ===")
print()

# Show sample order data
for order in delivered_orders[:3]:
    print(f"Order #{order.id}:")
    print(f"  Total Amount: ${order.total_amount}")
    print(f"  Status: {order.status}")
    
    # Show order items for this order
    items = order.items.all()
    for item in items:
        print(f"  Item: {item.product.name}")
        print(f"    Price: ${item.price}")
        print(f"    Quantity: {item.quantity}")
        print(f"    Item Total: ${item.price * item.quantity}")
    print()

print("=== ANALYSIS ===")
print()
print("The discrepancy is likely because:")
print("1. Order.total_amount = Sum of all OrderItem.price for that order")
print("2. OrderItem.price = unit_price * quantity (already calculated)")
print("3. So OrderItem.price * quantity = double counting!")
print()
print("We need to use OrderItem.unit_price instead of OrderItem.price")
