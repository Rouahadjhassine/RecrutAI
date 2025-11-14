# cvs/urls.py
import logging
from django.urls import path
from . import views

logger = logging.getLogger(__name__)

# Point de débogage
logger.info("Chargement des URLs de l'application CVs")
try:
    # Vérifier que la vue est correctement importée
    from .views import rank_cvs_recruteur
    logger.info("Vue rank_cvs_recruteur importée avec succès")
except ImportError as e:
    logger.error(f"Erreur d'importation de la vue rank_cvs_recruteur: {e}")
    raise

def debug_urls(request):
    """Vue de débogage pour afficher les URLs enregistrées"""
    from django.urls import get_resolver
    from django.http import HttpResponse
    
    urlconf = __import__('cvs.urls', fromlist=['urlpatterns'])
    resolver = get_resolver(urlconf)
    
    response = []
    response.append("=== URLs enregistrées ===\n")
    
    for url_pattern in resolver.url_patterns:
        response.append(f"Pattern: {url_pattern.pattern}")
        response.append(f"Name: {getattr(url_pattern, 'name', '')}")
        response.append(f"Callback: {url_pattern.callback.__module__}.{url_pattern.callback.__name__}")
        response.append("-" * 50)
    
    return HttpResponse("\n".join(response), content_type="text/plain")

urlpatterns = [
    # URL de débogage
    path('debug/urls/', debug_urls, name='debug-urls'),
    
    # CANDIDAT
    path('candidat/analyze-job/<int:cv_id>/', views.analyze_job_with_cv, name='analyze-job-with-cv'),
    path('candidat/cvs/', views.manage_cv, name='candidat-cvs'),
    path('candidat/cvs/<int:cv_id>/', views.manage_cv, name='candidat-delete-cv'),
    path('candidat/upload/', views.upload_cv_candidat, name='candidat-upload'),
    
    # RECRUTEUR
    path('recruteur/upload/', views.upload_cvs_recruteur, name='recruteur-upload-multiple'),
    path('recruteur/analyze-single/', views.analyze_recruteur_single, name='recruteur-analyze-single'),
    path('recruteur/rank/', views.rank_cvs_recruteur, name='recruteur-rank'),
    
    # EMAIL
    path('send-email/', views.send_email_to_candidate, name='send-email'),
    
    # HISTORIQUE
    path('history/', views.get_analysis_history, name='history'),
    
    # TEST
    path('test-analyzer/', views.test_analyzer, name='test-analyzer'),
]