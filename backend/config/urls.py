from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    # Commenté temporairement jusqu'à ce qu'on les crée
    # path('api/cvs/', include('cvs.urls')),
    # path('api/nlp/', include('nlp_service.urls')),
]