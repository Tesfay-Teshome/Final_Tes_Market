# middleware.py
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.conf import settings
import jwt
from datetime import datetime

class JWTAuthMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Allow OPTIONS requests for CORS
        if request.method == 'OPTIONS':
            return None

        # List of paths that don't need authentication
        excluded_paths = [
            '/',  # Root path
            '/api/token/',
            '/api/token/refresh/',
            '/api/token/verify/',
            '/api/auth/login/',
            '/api/auth/registration/',
            '/api/auth/password/reset/',
            '/api/auth/password/reset/confirm/',
            '/administrator/',
            '/admin/',
            '/swagger/',
            '/redoc/',
            '/static/',
            '/media/',
            '/favicon.ico',
        ]
        
        # Check if the current path matches any excluded path
        if any(request.path.startswith(path) for path in excluded_paths):
            return None
            
        # Allow public access to GET requests for products and categories
        if request.method == 'GET' and request.path.startswith(('/api/products/', '/api/categories/')):
            return None

        # Get the authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return JsonResponse(
                {'error': 'Authorization header is missing'}, 
                status=401
            )

        try:
            # Check if the header starts with 'Bearer '
            if not auth_header.startswith('Bearer '):
                raise jwt.InvalidTokenError('Invalid token format')

            token = auth_header.split(' ')[1]
            
            # Verify and decode the token
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY,
                algorithms=['HS256']
            )
            
            # Check if token is expired
            exp = payload.get('exp')
            if exp and datetime.fromtimestamp(exp) < datetime.now():
                raise jwt.ExpiredSignatureError('Token has expired')
                
            # Add user info to request
            request.user_id = payload.get('user_id')
            request.user_role = payload.get('role')
            
        except jwt.ExpiredSignatureError:
            return JsonResponse(
                {'error': 'Token has expired'}, 
                status=401
            )
        except jwt.InvalidTokenError:
            return JsonResponse(
                {'error': 'Invalid token'}, 
                status=401
            )
        except Exception as e:
            return JsonResponse(
                {'error': 'Authentication failed'}, 
                status=401
            )

        return None

class CORSMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Only allow requests from your frontend domain in production
        allowed_origins = [
            'http://localhost:3000',  # Development
            settings.FRONTEND_URL,    # Production URL (should be set in settings)
        ]
        
        origin = request.headers.get('Origin')
        
        if origin in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
        elif settings.DEBUG:
            # In development, allow all origins
            response['Access-Control-Allow-Origin'] = origin if origin else '*'
            
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Max-Age'] = '86400'  # 24 hours
        
        return response