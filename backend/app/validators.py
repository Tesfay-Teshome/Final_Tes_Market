"""
File upload validators for security
Validates file types and sizes to prevent malicious uploads
"""
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from django.core.files.uploadedfile import UploadedFile
import os

# Allowed MIME types for images
ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']

# Maximum file size (5MB)
MAX_UPLOAD_SIZE = 5 * 1024 * 1024


@deconstructible
class FileValidator:
    """
    Validator for file uploads with type and size checking
    """
    def __init__(self, allowed_types=None, max_size=None):
        self.allowed_types = allowed_types or ALLOWED_IMAGE_TYPES
        self.max_size = max_size or MAX_UPLOAD_SIZE
    
    def __call__(self, file: UploadedFile):
        # Check file size
        if file.size > self.max_size:
            raise ValidationError(
                f'File size ({file.size / 1024 / 1024:.2f}MB) exceeds maximum allowed size '
                f'({self.max_size / 1024 / 1024}MB)'
            )
        
        # Check file extension
        ext = os.path.splitext(file.name)[1].lower()
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
        if ext not in allowed_extensions:
            raise ValidationError(
                f'File extension "{ext}" is not allowed. '
                f'Allowed extensions: {", ".join(allowed_extensions)}'
            )
        
        # Try to validate content type
        # Note: Django's ImageField already validates that it's a valid image
        # This provides an additional layer of security
        # Only check content_type for new uploads (UploadedFile), not existing files (ImageFieldFile)
        if hasattr(file, 'content_type'):
            content_type = file.content_type
            if content_type and content_type not in self.allowed_types:
                raise ValidationError(
                    f'File type "{content_type}" is not allowed. '
                    f'Allowed types: {", ".join(self.allowed_types)}'
                )
        
        return file
    
    def __eq__(self, other):
        return (
            isinstance(other, FileValidator) and
            self.allowed_types == other.allowed_types and
            self.max_size == other.max_size
        )


# Pre-configured validator for images
validate_image = FileValidator()


# Validator for larger images (e.g., banners)
validate_large_image = FileValidator(max_size=10 * 1024 * 1024)  # 10MB
