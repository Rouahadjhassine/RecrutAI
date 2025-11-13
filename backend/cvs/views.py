# cvs/views.py
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import CV, AnalysisResult
from .serializers import CVSerializer, AnalysisResultSerializer
from nlp_service.analyzer import MLCVAnalyzer
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
import logging
import re

logger = logging.getLogger(__name__)
analyzer = MLCVAnalyzer()
User = get_user_model()

# ============================================
# CANDIDAT : Upload + Analyse
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cv_candidat(request):
    """Candidat upload son CV"""
    if request.user.role != 'candidat':
        return Response({'error': 'Accès refusé'}, status=403)

    file = request.FILES.get('file')
    if not file or not file.name.lower().endswith('.pdf'):
        return Response({'error': 'PDF requis'}, status=400)

    # Limite : 5 CVs max par candidat
    if CV.objects.filter(candidat=request.user).count() >= 5:
        return Response({'error': 'Maximum 5 CVs atteint'}, status=400)

    # Extraction texte
    extracted_text = analyzer.extract_text_from_pdf(file)
    if not extracted_text.strip():
        return Response({'error': 'PDF vide ou illisible'}, status=400)

    # Extraction compétences + expérience
    skills = analyzer.extract_skills(extracted_text)
    experience = analyzer.extract_experience_years(extracted_text)

    # Sauvegarde
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_candidat(request):
    """Candidat : Analyser son CV vs offre d'emploi"""
    if request.user.role != 'candidat':
        return Response({'error': 'Accès refusé'}, status=403)

    job_text = request.data.get('job_offer_text', '').strip()
    if not job_text:
        return Response({'error': 'Texte de l\'offre requis'}, status=400)

    # Récupérer le dernier CV du candidat
    try:
        cv = CV.objects.filter(candidat=request.user).latest('uploaded_at')
    except CV.DoesNotExist:
        return Response({'error': 'Aucun CV trouvé. Veuillez d\'abord uploader un CV'}, status=404)

    # Analyse NLP + IA
    score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
    summary = analyzer.summarize_cv(cv.extracted_text)

    # Sauvegarde du résultat
    analysis = AnalysisResult.objects.create(
        cv=cv,
        job_offer_text=job_text,
        compatibility_score=score,
        matched_keywords=matched,
        missing_keywords=missing,
        summary=summary
    )

    return Response({
        'compatibility_score': score,
        'matched_keywords': matched,
        'missing_keywords': missing,
        'summary': summary,
        'cv_id': cv.id,
        'candidat_name': cv.candidat.get_full_name()
    })


# ============================================
# RECRUTEUR : Upload 1 ou plusieurs CVs + Analyse/Classement
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cvs_recruteur(request):
    """Recruteur : Upload 1 ou plusieurs CVs"""
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès refusé'}, status=403)

    files = request.FILES.getlist('files')  # Support multi-upload
    if not files:
        return Response({'error': 'Aucun fichier fourni'}, status=400)

    uploaded_cvs = []
    errors = []

    for file in files:
        if not file.name.lower().endswith('.pdf'):
            errors.append(f"{file.name} : Format non supporté (PDF uniquement)")
            continue

        try:
            # Extraction
            extracted_text = analyzer.extract_text_from_pdf(file)
            if not extracted_text.strip():
                errors.append(f"{file.name} : PDF vide ou illisible")
                continue

            # Extraction nom + email depuis le CV
            name = extract_name_from_cv(extracted_text)
            email = extract_email_from_cv(extracted_text)

            skills = analyzer.extract_skills(extracted_text)
            experience = analyzer.extract_experience_years(extracted_text)

            # Créer un candidat temporaire si email trouvé (optionnel)
            candidat = None
            if email:
                candidat, _ = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': name.split()[0] if name else 'Inconnu',
                        'last_name': ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '',
                        'role': 'candidat'
                    }
                )
            else:
                # Si pas d'email, créer un user temporaire
                candidat = User.objects.create(
                    email=f"temp_{file.name.replace('.pdf', '')}@temp.com",
                    first_name=name.split()[0] if name else 'Inconnu',
                    last_name=' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '',
                    role='candidat'
                )

            # Sauvegarder CV
            cv = CV.objects.create(
                candidat=candidat,
                file=file,
                extracted_text=extracted_text,
                parsed_data={
                    'skills': skills,
                    'experience_years': experience,
                    'extracted_name': name,
                    'extracted_email': email
                }
            )

            uploaded_cvs.append({
                'cv_id': cv.id,
                'file_name': file.name,
                'candidat_name': name or 'Non extrait',
                'candidat_email': email or 'Non extrait',
                'skills': skills,
                'experience_years': experience
            })

        except Exception as e:
            logger.error(f"Erreur upload {file.name}: {e}")
            errors.append(f"{file.name} : Erreur d'extraction")

    return Response({
        'message': f'{len(uploaded_cvs)} CV(s) uploadé(s) avec succès',
        'uploaded_cvs': uploaded_cvs,
        'errors': errors
    }, status=201 if uploaded_cvs else 400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_recruteur_single(request):
    """Recruteur : Analyser 1 seul CV vs offre"""
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès refusé'}, status=403)

    cv_id = request.data.get('cv_id')
    job_text = request.data.get('job_offer_text', '').strip()

    if not cv_id or not job_text:
        return Response({'error': 'cv_id et job_offer_text requis'}, status=400)

    try:
        cv = CV.objects.get(id=cv_id)
    except CV.DoesNotExist:
        return Response({'error': 'CV non trouvé'}, status=404)

    # Analyse NLP
    score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
    summary = analyzer.summarize_cv(cv.extracted_text)

    # Sauvegarde
    AnalysisResult.objects.create(
        cv=cv,
        job_offer_text=job_text,
        compatibility_score=score,
        matched_keywords=matched,
        missing_keywords=missing,
        summary=summary
    )

    return Response({
        'cv_id': cv.id,
        'candidat_name': cv.parsed_data.get('extracted_name', cv.candidat.get_full_name()),
        'candidat_email': cv.parsed_data.get('extracted_email', cv.candidat.email),
        'compatibility_score': score,
        'matched_keywords': matched,
        'missing_keywords': missing,
        'summary': summary
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rank_cvs_recruteur(request):
    """Recruteur : Classer TOUS les CVs vs offre (ordre décroissant)"""
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès refusé'}, status=403)

    job_text = request.data.get('job_offer_text', '').strip()
    if not job_text:
        return Response({'error': 'job_offer_text requis'}, status=400)

    cvs = CV.objects.all()
    if not cvs.exists():
        return Response({'error': 'Aucun CV disponible'}, status=404)

    rankings = []
    for cv in cvs:
        score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
        
        # Extraction info candidat
        name = cv.parsed_data.get('extracted_name', cv.candidat.get_full_name())
        email = cv.parsed_data.get('extracted_email', cv.candidat.email)

        rankings.append({
            'cv_id': cv.id,
            'candidat_name': name,
            'candidat_email': email,
            'candidat_id': cv.candidat.id,
            'score': score,
            'matched_keywords': matched,
            'missing_keywords': missing
        })

    # Tri décroissant
    rankings.sort(key=lambda x: x['score'], reverse=True)

    return Response({
        'message': f'{len(rankings)} CVs analysés',
        'rankings': rankings
    })


# ============================================
# ENVOI EMAIL
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_email_to_candidate(request):
    """Recruteur : Envoyer un email à un candidat"""
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès refusé'}, status=403)

    candidate_id = request.data.get('candidate_id')
    subject = request.data.get('subject', 'Opportunité professionnelle')
    message = request.data.get('message', '')

    if not all([candidate_id, message]):
        return Response({'error': 'candidate_id et message requis'}, status=400)

    try:
        candidate = User.objects.get(id=candidate_id, role='candidat')
        
        send_mail(
            subject=subject,
            message=message,
            from_email='no-reply@recrutai.com',
            recipient_list=[candidate.email],
            fail_silently=False,
        )
        
        return Response({'message': f'Email envoyé à {candidate.email}'})
    
    except User.DoesNotExist:
        return Response({'error': 'Candidat non trouvé'}, status=404)
    except Exception as e:
        logger.error(f"Erreur envoi email : {e}")
        return Response({'error': 'Erreur lors de l\'envoi'}, status=500)


# ============================================
# HISTORIQUE
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analysis_history(request):
    """Historique des analyses (candidat : seulement les siennes / recruteur : tout)"""
    if request.user.role == 'candidat':
        analyses = AnalysisResult.objects.filter(cv__candidat=request.user).order_by('-created_at')
    else:
        analyses = AnalysisResult.objects.all().order_by('-created_at')
    
    return Response(AnalysisResultSerializer(analyses, many=True).data)


# ============================================
# UTILITAIRES : Extraction nom/email depuis CV
# ============================================

def extract_name_from_cv(text: str) -> str:
    """Extrait le nom du candidat (heuristique simple)"""
    lines = text.split('\n')[:10]  # Chercher dans les 10 premières lignes
    for line in lines:
        line_clean = line.strip()
        # Chercher ligne avec 2-4 mots capitalisés
        words = line_clean.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
            return line_clean
    return "Nom non extrait"


def extract_email_from_cv(text: str) -> str:
    """Extrait l'email du candidat"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else ""