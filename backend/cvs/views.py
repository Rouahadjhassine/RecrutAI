from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import CV, JobOffer, AnalysisResult
from .serializers import CVSerializer, JobOfferSerializer, AnalysisResultSerializer
from nlp_service.analyzer import CVAnalyzer

analyzer = CVAnalyzer()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cv(request):
    """CANDIDAT: Upload son CV"""
    if request.user.role != 'candidat':
        return Response({'message': 'Seuls les candidats peuvent uploader des CVs'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    if 'file' not in request.FILES:
        return Response({'message': 'Fichier manquant'}, status=status.HTTP_400_BAD_REQUEST)
    
    file = request.FILES['file']
    
    # Extraire le texte
    try:
        extracted_text = analyzer.extract_text_from_pdf(file)
    except Exception as e:
        return Response({'message': f'Erreur extraction: {str(e)}'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Extraire les compétences
    skills = analyzer.extract_skills(extracted_text)
    experience_years = analyzer.extract_experience_years(extracted_text)
    
    # Sauvegarder le CV
    cv = CV.objects.create(
        candidat=request.user,
        file=file,
        extracted_text=extracted_text,
        parsed_data={
            'skills': skills,
            'experience_years': experience_years
        }
    )
    
    return Response({
        'message': 'CV uploadé avec succès',
        'cv': CVSerializer(cv).data,
        'skills_detected': skills,
        'experience_years': experience_years
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_cv_vs_job(request):
    """
    CANDIDAT: Analyser son CV vs une offre (copier/coller texte offre)
    RECRUTEUR: Analyser un CV spécifique vs son offre
    """
    job_description = request.data.get('job_description')
    cv_id = request.data.get('cv_id')  # Optionnel pour candidat
    
    if not job_description:
        return Response({'message': 'Description de l\'offre requise'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Trouver le CV
    if request.user.role == 'candidat':
        # Candidat: son propre CV
        try:
            cv = CV.objects.filter(candidat=request.user).latest('uploaded_at')
        except CV.DoesNotExist:
            return Response({'message': 'Vous devez d\'abord uploader votre CV'}, 
                           status=status.HTTP_404_NOT_FOUND)
    else:
        # Recruteur: CV spécifique
        if not cv_id:
            return Response({'message': 'cv_id requis pour les recruteurs'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        try:
            cv = CV.objects.get(id=cv_id)
        except CV.DoesNotExist:
            return Response({'message': 'CV non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    
    # Analyser la compatibilité
    score, matched, missing = analyzer.calculate_compatibility(
        cv.extracted_text,
        job_description
    )
    
    return Response({
        'compatibility_score': score,
        'matched_keywords': matched,
        'missing_keywords': missing,
        'cv_id': cv.id,
        'candidat_name': cv.candidat.first_name
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_cvs(request):
    """RECRUTEUR: Voir tous les CVs"""
    if request.user.role != 'recruteur':
        return Response({'message': 'Accès interdit'}, status=status.HTTP_403_FORBIDDEN)
    
    cvs = CV.objects.all().select_related('candidat')
    
    cv_list = []
    for cv in cvs:
        cv_list.append({
            'id': cv.id,
            'candidat_name': f"{cv.candidat.first_name} {cv.candidat.last_name}",
            'candidat_email': cv.candidat.email,
            'uploaded_at': cv.uploaded_at,
            'skills': cv.parsed_data.get('skills', []),
            'experience_years': cv.parsed_data.get('experience_years', 0)
        })
    
    return Response({'cvs': cv_list}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rank_all_cvs(request):
    """RECRUTEUR: Classer TOUS les CVs par compatibilité avec une offre"""
    if request.user.role != 'recruteur':
        return Response({'message': 'Accès interdit'}, status=status.HTTP_403_FORBIDDEN)
    
    job_description = request.data.get('job_description')
    
    if not job_description:
        return Response({'message': 'Description de l\'offre requise'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    cvs = CV.objects.all().select_related('candidat')
    
    if not cvs.exists():
        return Response({'message': 'Aucun CV disponible'}, status=status.HTTP_404_NOT_FOUND)
    
    # Préparer les données pour le ranking
    cvs_data = [{'id': cv.id, 'text': cv.extracted_text} for cv in cvs]
    
    # Analyser et classer
    rankings = analyzer.rank_cvs(cvs_data, job_description)
    
    # Enrichir avec les infos candidats
    for rank in rankings:
        cv = cvs.get(id=rank['cv_id'])
        rank['candidat_name'] = f"{cv.candidat.first_name} {cv.candidat.last_name}"
        rank['candidat_email'] = cv.candidat.email
        rank['candidat_id'] = cv.candidat.id
    
    return Response({
        'message': f'{len(rankings)} CVs analysés',
        'rankings': rankings
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summarize_cv(request, cv_id):
    """RECRUTEUR: Résumer un CV"""
    if request.user.role != 'recruteur':
        return Response({'message': 'Accès interdit'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        cv = CV.objects.get(id=cv_id)
    except CV.DoesNotExist:
        return Response({'message': 'CV non trouvé'}, status=status.HTTP_404_NOT_FOUND)
    
    summary = analyzer.summarize_cv(cv.extracted_text)
    
    return Response({
        'cv_id': cv_id,
        'candidat_name': f"{cv.candidat.first_name} {cv.candidat.last_name}",
        'summary': summary,
        'skills': cv.parsed_data.get('skills', []),
        'experience_years': cv.parsed_data.get('experience_years', 0)
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_emails_to_candidates(request):
    """RECRUTEUR: Envoyer email aux candidats sélectionnés"""
    if request.user.role != 'recruteur':
        return Response({'message': 'Accès interdit'}, status=status.HTTP_403_FORBIDDEN)
    
    candidate_ids = request.data.get('candidate_ids', [])
    subject = request.data.get('subject', '')
    message = request.data.get('message', '')
    
    if not candidate_ids or not subject or not message:
        return Response({'message': 'Données manquantes'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.core.mail import send_mail
    from accounts.models import User
    
    candidates = User.objects.filter(id__in=candidate_ids, role='candidat')
    
    emails_sent = 0
    for candidate in candidates:
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email='noreply@recrut.ai',
                recipient_list=[candidate.email],
                fail_silently=False,
            )
            emails_sent += 1
        except:
            pass
    
    return Response({
        'message': f'{emails_sent} email(s) envoyé(s) avec succès',
        'total_sent': emails_sent
    }, status=status.HTTP_200_OK)