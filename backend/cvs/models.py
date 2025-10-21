from django.db import models
from accounts.models import User  # <-- importer ton User personnalisé



class CV(models.Model):
    candidat = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='cvs/')
    extracted_text = models.TextField()
    parsed_data = models.JSONField(default=dict)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class JobOffer(models.Model):
    recruteur = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

class AnalysisResult(models.Model):
    cv = models.ForeignKey(CV, on_delete=models.CASCADE)
    job_offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE)
    compatibility_score = models.FloatField()
    matched_keywords = models.JSONField(default=list)
    analysis_details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)