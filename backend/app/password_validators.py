"""
Custom password validators for enhanced security
Ensures passwords meet minimum complexity requirements
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class ComplexityValidator:
    """
    Password validator that enforces complexity requirements:
    - Minimum length (default 8 characters)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    def __init__(self, min_length=8):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        """
        Validate the password against complexity requirements
        Args:
            password: The password to validate
            user: Optional user object for user attribute similarity checking
        Raises:
            ValidationError: If password doesn't meet requirements
        """
        if len(password) < self.min_length:
            raise ValidationError(
                _("Password must be at least %(min_length)d characters long."),
                code='password_too_short',
                params={'min_length': self.min_length},
            )
        
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter (A-Z)."),
                code='password_no_upper',
            )
        
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter (a-z)."),
                code='password_no_lower',
            )
        
        if not re.search(r'\d', password):
            raise ValidationError(
                _("Password must contain at least one number (0-9)."),
                code='password_no_number',
            )
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/;`~]', password):
            raise ValidationError(
                _("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>_-+=[]\\\/;`~)."),
                code='password_no_special',
            )
    
    def get_help_text(self):
        """
        Return a help text describing the password requirements
        """
        return _(
            "Your password must be at least %(min_length)d characters long and "
            "include at least one uppercase letter, one lowercase letter, "
            "one number, and one special character."
        ) % {'min_length': self.min_length}
