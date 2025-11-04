# cvs/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # === CANDIDAT ===
    path('candidat/upload/', views.upload_cv_candidat, name='candidat-upload'),
    path('candidat/analyze/', views.analyze_candidat, name='candidat-analyze'),

    # === RECRUTEUR ===
    path('recruteur/upload/', views.upload_cvs_recruteur, name='recruteur-upload-multiple'),
    path('recruteur/analyze-single/', views.analyze_recruteur_single, name='recruteur-analyze-single'),
    path('recruteur/rank/', views.rank_cvs_recruteur, name='recruteur-rank'),
    
    # === EMAIL ===
    path('send-email/', views.send_email_to_candidate, name='send-email'),

    # === HISTORIQUE ===
    path('history/', views.get_analysis_history, name='history'),
]