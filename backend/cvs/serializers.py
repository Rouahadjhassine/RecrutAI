# cvs/serializers.py
from rest_framework import serializers
from .models import CV, AnalysisResult

class CVSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source='file_name', read_only=True)
    candidat_name = serializers.CharField(source='candidat.get_full_name', read_only=True)

    class Meta:
        model = CV
        fields = ['id', 'file_name', 'uploaded_at', 'parsed_data', 'candidat_name']


class AnalysisResultSerializer(serializers.ModelSerializer):
    cv_file_name = serializers.CharField(source='cv.file_name', read_only=True)
    candidat_name = serializers.CharField(source='cv.candidat.get_full_name', read_only=True)

    class Meta:
        model = AnalysisResult
        fields = '__all__'