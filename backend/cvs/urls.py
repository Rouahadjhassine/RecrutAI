from django.urls import path
from . import views

urlpatterns = [
    # Candidat
    path('upload/', views.upload_cv, name='upload-cv'),
    path('analyze/', views.analyze_cv_vs_job, name='analyze-cv-job'),
    
    # Recruteur
    path('list/', views.list_all_cvs, name='list-cvs'),
    path('rank/', views.rank_all_cvs, name='rank-cvs'),
    path('summarize/<int:cv_id>/', views.summarize_cv, name='summarize-cv'),
    path('send-emails/', views.send_emails_to_candidates, name='send-emails'),
]