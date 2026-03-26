from django.urls import re_path
from . import consumers

# WebSocket URL patterns
websocket_urlpatterns = [
    re_path(
        r'ws/chat/(?P<conversation_id>[\w-]+)/$',
        consumers.ChatConsumer.as_asgi(),
        name='chat_websocket'
    ),
]
