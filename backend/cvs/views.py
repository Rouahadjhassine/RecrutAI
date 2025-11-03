# cvs/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import CV, AnalysisResult
from .serializers import CVSerializer, AnalysisResultSerializer
from nlp_service.analyzer import CVAnalyzer
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import logging
from rest_framework.decorators import parser_classes
from rest_framework.parsers import MultiPartParser, FormParser

logger = logging.getLogger(__name__)
analyzer = CVAnalyzer()  # Singleton

User = get_user_model()

# === CANDIDAT ===
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cv(request):
    if request.user.role != 'candidat':
        return Response({'error': 'Accès refusé'}, status=403)

    file = request.FILES.get('file')
    if not file or not file.name.lower().endswith('.pdf'):
        return Response({'error': 'PDF requis'}, status=400)

    # Limite : 5 CVs max
    if CV.objects.filter(candidat=request.user).count() >= 5:
        return Response({'error': 'Maximum 5 CVs'}, status=400)

    extracted_text = analyzer.extract_text_from_pdf(file)
    if not extracted_text.strip():
        return Response({'error': 'PDF vide ou illisible'}, status=400)

    skills = analyzer.extract_skills(extracted_text)
    experience = analyzer.extract_experience_years(extracted_text)

    cv = CV.objects.create(
        candidat=request.user,
        file=file,
        extracted_text=extracted_text,
        parsed_data={'skills': skills, 'experience_years': experience}
    )

    return Response({
        'message': 'CV uploadé avec succès',
        'cv': CVSerializer(cv).data
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_cvs(request):
    if request.user.role != 'candidat':
        return Response({'error': 'Accès refusé'}, status=403)
    cvs = CV.objects.filter(candidat=request.user).order_by('-uploaded_at')
    return Response(CVSerializer(cvs, many=True).data)


# === RECRUTEUR ===
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_cvs(request):
    if request.user.role != 'recruteur':
        return Response({'error': 'Recruteur only'}, status=403)
    cvs = CV.objects.all().order_by('-uploaded_at')
    return Response(CVSerializer(cvs, many=True).data)


# === ANALYSE (Candidat & Recruteur) ===
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_cv_vs_text(request):
    job_text = request.data.get('job_offer_text', '').strip()
    cv_id = request.data.get('cv_id')

    if not job_text:
        return Response({'error': 'Texte de l\'offre requis'}, status=400)

    # Récupérer CV
    if request.user.role == 'candidat':
        try:
            cv = CV.objects.filter(candidat=request.user).latest('uploaded_at')
        except CV.DoesNotExist:
            return Response({'error': 'Upload ton CV d\'abord'}, status=404)
    else:
        if not cv_id:
            return Response({'error': 'cv_id requis'}, status=400)
        try:
            cv = CV.objects.get(id=cv_id)
        except CV.DoesNotExist:
            return Response({'error': 'CV non trouvé'}, status=404)

    # Analyse IA
    score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
    summary = analyzer.summarize_cv(cv.extracted_text)

    # Sauvegarde
    analysis = AnalysisResult.objects.create(
        cv=cv,
        job_offer_text=job_text,
        compatibility_score=score,
        matched_keywords=matched,
        missing_keywords=missing,
        summary=summary
    )

    return Response(AnalysisResultSerializer(analysis).data)


# === CLASSEMENT (Recruteur) ===
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rank_cvs_by_text(request):
    if request.user.role != 'recruteur':
        return Response({'error': 'Recruteur only'}, status=403)

    job_text = request.data.get('job_offer_text', '').strip()
    if not job_text:
        return Response({'error': 'Texte requis'}, status=400)

    cvs = CV.objects.all()
    if not cvs.exists():
        return Response({'error': 'Aucun CV'}, status=404)

    rankings = []
    for cv in cvs:
        score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
        rankings.append({
            'cv_id': cv.id,
            'candidat_name': cv.candidat.get_full_name(),
            'candidat_email': cv.candidat.email,
            'candidat_id': cv.candidat.id,
            'score': score,
            'matched_keywords': matched,
            'missing_keywords': missing
        })

    rankings.sort(key=lambda x: x['score'], reverse=True)
    return Response({'rankings': rankings})


# === ENVOI EMAIL ===
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_to_candidate(request):
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès interdit'}, status=403)

    candidate_id = request.data.get('candidate_id')
    subject = request.data.get('subject')
    message = request.data.get('message')

    if not all([candidate_id, subject, message]):
        return Response({'error': 'Données manquantes'}, status=400)

    try:
        candidate = User.objects.get(id=candidate_id, role='candidat')
        send_mail(
            subject=subject,
            message=message,
            from_email='no-reply@jobmatcher.com',
            recipient_list=[candidate.email],
            fail_silently=False,
        )
        return Response({'message': 'Email envoyé'})
    except User.DoesNotExist:
        return Response({'error': 'Candidat non trouvé'}, status=404)
    except Exception as e:
        logger.error(f"Erreur envoi email : {e}")
        return Response({'error': 'Erreur envoi'}, status=500)


# === HISTORIQUE (Candidat & Recruteur) ===
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analysis_history(request):
    if request.user.role == 'candidat':
        analyses = AnalysisResult.objects.filter(cv__candidat=request.user).order_by('-created_at')
    else:
        analyses = AnalysisResult.objects.all().order_by('-created_at')
    
    return Response(AnalysisResultSerializer(analyses, many=True).data)