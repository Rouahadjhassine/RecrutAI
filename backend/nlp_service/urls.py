from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.analyze_cv_job, name='analyze-cv-job'),
    path('rank-cvs/', views.rank_cvs, name='rank-cvs'),
    path('summarize-cv/<int:cv_id>/', views.summarize_cv, name='summarize-cv'),
]