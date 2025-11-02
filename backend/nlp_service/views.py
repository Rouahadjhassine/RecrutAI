from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from cvs.models import CV, JobOffer, AnalysisResult
from cvs.serializers import AnalysisResultSerializer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_cv_job(request):
    """Analyser la compatibilité entre un CV et une offre d'emploi"""
    cv_id = request.data.get('cv_id')
    job_offer_id = request.data.get('job_offer_id')
    
    if not cv_id or not job_offer_id:
        return Response({
            'message': 'cv_id et job_offer_id requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        cv = CV.objects.get(id=cv_id)
        job_offer = JobOffer.objects.get(id=job_offer_id)
    except (CV.DoesNotExist, JobOffer.DoesNotExist):
        return Response({
            'message': 'CV ou offre non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Calculer la compatibilité
    score, keywords = calculate_compatibility(cv.extracted_text, job_offer.description)
    
    # Sauvegarder le résultat
    analysis = AnalysisResult.objects.create(
        cv=cv,
        job_offer=job_offer,
        compatibility_score=score,
        matched_keywords=keywords,
        analysis_details={'method': 'TF-IDF + Cosine Similarity'}
    )
    
    return Response({
        'message': 'Analyse terminée',
        'analysis': AnalysisResultSerializer(analysis).data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rank_cvs(request):
    """Classer plusieurs CVs par rapport à une offre d'emploi"""
    job_offer_id = request.data.get('job_offer_id')
    
    if not job_offer_id:
        return Response({
            'message': 'job_offer_id requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        job_offer = JobOffer.objects.get(id=job_offer_id)
    except JobOffer.DoesNotExist:
        return Response({
            'message': 'Offre non trouvée'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Récupérer tous les CVs
    cvs = CV.objects.all()
    
    if not cvs.exists():
        return Response({
            'message': 'Aucun CV disponible'
        }, status=status.HTTP_404_NOT_FOUND)
    
    results = []
    for cv in cvs:
        score, keywords = calculate_compatibility(cv.extracted_text, job_offer.description)
        
        # Créer ou mettre à jour l'analyse
        analysis, created = AnalysisResult.objects.update_or_create(
            cv=cv,
            job_offer=job_offer,
            defaults={
                'compatibility_score': score,
                'matched_keywords': keywords,
                'analysis_details': {'method': 'TF-IDF + Cosine Similarity'}
            }
        )
        
        results.append(AnalysisResultSerializer(analysis).data)
    
    # Trier par score décroissant
    results.sort(key=lambda x: x['compatibility_score'], reverse=True)
    
    return Response({
        'message': f'{len(results)} CVs analysés',
        'rankings': results
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summarize_cv(request, cv_id):
    """Résumer un CV (version simple)"""
    try:
        cv = CV.objects.get(id=cv_id)
    except CV.DoesNotExist:
        return Response({
            'message': 'CV non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Résumé simple (prendre les 500 premiers caractères)
    summary = cv.extracted_text[:500] + '...' if len(cv.extracted_text) > 500 else cv.extracted_text
    
    return Response({
        'summary': summary,
        'cv_id': cv_id
    }, status=status.HTTP_200_OK)
def calculate_compatibility(cv_text, job_description):
    """Calculer le score de compatibilité et extraire les mots-clés matchés"""
    
    # Nettoyer les textes
    cv_clean = cv_text.lower()
    job_clean = job_description.lower()
    
    # Utiliser TF-IDF
    vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
    
    try:
        tfidf_matrix = vectorizer.fit_transform([cv_clean, job_clean])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        score = round(similarity * 100, 2)
    except:
        score = 0.0
    
    # Extraire les mots-clés techniques communs
    tech_keywords = [
        'python', 'javascript', 'java', 'react', 'django', 'node.js', 'typescript',
        'aws', 'docker', 'kubernetes', 'postgresql', 'mongodb', 'mysql',
        'git', 'agile', 'scrum', 'ci/cd', 'api', 'rest', 'graphql'
    ]
    
    matched_keywords = []
    for keyword in tech_keywords:
        if keyword in cv_clean and keyword in job_clean:
            matched_keywords.append(keyword.capitalize())
    
    return score, matched_keywords
