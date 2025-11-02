from rest_framework import serializers
from .models import CV, JobOffer, AnalysisResult

class CVSerializer(serializers.ModelSerializer):
    candidat_email = serializers.EmailField(source='candidat.email', read_only=True)
    
    class Meta:
        model = CV
        fields = ['id', 'candidat', 'candidat_email', 'file', 'extracted_text', 'parsed_data', 'uploaded_at']
        read_only_fields = ['id', 'candidat', 'uploaded_at']

class JobOfferSerializer(serializers.ModelSerializer):
    recruteur_email = serializers.EmailField(source='recruteur.email', read_only=True)
    
    class Meta:
        model = JobOffer
        fields = ['id', 'recruteur', 'recruteur_email', 'title', 'description', 'requirements', 'created_at']
        read_only_fields = ['id', 'recruteur', 'created_at']

class AnalysisResultSerializer(serializers.ModelSerializer):
    cv_id = serializers.IntegerField(source='cv.id', read_only=True)
    job_offer_id = serializers.IntegerField(source='job_offer.id', read_only=True)
    
    class Meta:
        model = AnalysisResult
        fields = ['id', 'cv', 'cv_id', 'job_offer', 'job_offer_id', 'compatibility_score', 'matched_keywords', 'analysis_details', 'created_at']
        read_only_fields = ['id', 'created_at']
