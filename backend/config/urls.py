from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from django_prometheus import exports

def health_check(request):
    """Health check endpoint"""
    return JsonResponse({'status': 'healthy', 'service': 'backend'})

# API URL patterns
api_patterns = [
    # Authentication
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Apps
    path('auth/', include('accounts.urls')),
    path('cvs/', include('cvs.urls')),
    
    # Métriques Prometheus
    path('metrics/', exports.ExportToDjangoView, name='prometheus-django-metrics'),
]

urlpatterns = [
    # Health check
    path('health/', health_check, name='health'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include(api_patterns)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)