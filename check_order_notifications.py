import os
import sys
import django

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.app.settings')
django.setup()

from backend.app.models import Notification, Order, User

print("=== Recent Notifications ===")
notifications = Notification.objects.order_by('-created_at')[:10]
for n in notifications:
    print(f"ID: {n.id}, OrderID: {n.related_order_id}, Type: {n.notification_type}, Recipient: {n.recipient.username if n.recipient else 'None'}, Read: {n.is_read}, Created: {n.created_at}")

print("\n=== Orders ===")
orders = Order.objects.order_by('-created_at')[:10]
for o in orders:
    print(f"ID: {o.id}, Status: {o.status}, Admin Approved: {o.admin_approved}, Vendor: {o.items.first().product.vendor.username if o.items.exists() and o.items.first().product else 'None'}")

print("\n=== Unread Notifications for Vendors ===")
vendors = User.objects.filter(user_type='vendor')
for vendor in vendors:
    unread = Notification.objects.filter(recipient=vendor, is_read=False)
    if unread.exists():
        print(f"Vendor: {vendor.username}, Unread count: {unread.count()}")
        for n in unread:
            print(f"  - OrderID: {n.related_order_id}, Type: {n.notification_type}")
