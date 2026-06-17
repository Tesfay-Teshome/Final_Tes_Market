from backend.app.models import Notification, User, Order

notifications = Notification.objects.all()
print(f"Total notifications: {notifications.count()}")
print(f"Unread notifications: {notifications.filter(is_read=False).count()}")

print("\nRecent notifications:")
for n in notifications.order_by('-created_at')[:10]:
    print(f"ID: {n.id}, Recipient: {n.recipient.username if n.recipient else 'None'}, Type: {n.notification_type}, Read: {n.is_read}, Order ID: {n.related_order_id}")
