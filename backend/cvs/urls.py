# cvs/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Candidat
    path('upload/', views.upload_cv),
    path('my-cvs/', views.get_my_cvs),

    # Recruteur
    path('all-cvs/', views.get_all_cvs),

    # Analyse
    path('analyze/', views.analyze_cv_vs_text),
    path('rank/', views.rank_cvs_by_text),

    # Email
    path('send-email/', views.send_email_to_candidate),

    # Historique
    path('history/', views.get_analysis_history),
]