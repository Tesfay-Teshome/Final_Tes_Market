"""
ASGI config for Tes Market project.
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Set the default Django settings module BEFORE importing app modules
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')

# Initialize Django so settings/apps are ready
django.setup()

# Import routing only after Django is set up
from backend.app import routing as app_routing  # noqa: E402

# Get the default ASGI application
django_asgi_app = get_asgi_application()

# Define the ASGI application with WebSocket support
application = ProtocolTypeRouter({
    # HTTP/HTTPS requests are handled by Django's ASGI application
    "http": django_asgi_app,
    
    # WebSocket connections are handled by the URLRouter with authentication
    "websocket": AuthMiddlewareStack(
        URLRouter(
            app_routing.websocket_urlpatterns
        )
    ),
})
