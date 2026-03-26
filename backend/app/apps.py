from django.apps import AppConfig


class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'backend.app'
    label = 'app'  # This allows AUTH_USER_MODEL to use 'app.User'
