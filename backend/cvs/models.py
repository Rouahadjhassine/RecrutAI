# cvs/models.py
from django.db import models
from accounts.models import User

class CV(models.Model):
    candidat = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cvs')
    file = models.FileField(upload_to='cvs/')
    extracted_text = models.TextField()
    parsed_data = models.JSONField(default=dict)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'CV'
        verbose_name_plural = 'CVs'

    def __str__(self):
        return f"CV de {self.candidat.get_full_name()} - {self.uploaded_at.strftime('%Y-%m-%d')}"

    @property
    def file_name(self):
        return self.file.name.split('/')[-1] if self.file else "unknown.pdf"


class AnalysisResult(models.Model):
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name='analyses')
    job_offer_text = models.TextField()  # ← Texte brut de l'offre
    compatibility_score = models.FloatField()
    matched_keywords = models.JSONField(default=list)
    missing_keywords = models.JSONField(default=list)
    summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Résultat d'analyse"
        verbose_name_plural = "Résultats d'analyse"

    def __str__(self):
        return f"{self.cv.candidat.get_full_name()} → {self.compatibility_score}%"