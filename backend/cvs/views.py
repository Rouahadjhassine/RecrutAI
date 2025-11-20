# cvs/views.py - VERSION CORRIGÉE COMPLÈTE

import os
import re
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
import logging
import re
from typing import Tuple

from .models import CV, AnalysisResult
from .serializers import CVSerializer, AnalysisResultSerializer
from nlp_service.analyzer import MLCVAnalyzer

logger = logging.getLogger(__name__)
analyzer = MLCVAnalyzer()
User = get_user_model()

# ============================================
# FONCTIONS D'EXTRACTION CORRIGÉES
# ============================================

def extract_name_and_email_from_text(text: str) -> Tuple[str, str]:
    """
    Extrait le nom et l'email du texte du CV de manière robuste
    """
    # Nettoyer le texte en gardant les retours à la ligne pour l'analyse
    text = text.replace('\r', '\n').replace('\n\n', '\n')
    clean_text = ' '.join(text.split())
    
    # 1. Extraction EMAIL (version améliorée)
    email = ""
    # Modèle plus précis pour les emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_matches = re.findall(email_pattern, text)
    
    # Liste des domaines de messagerie courants (à compléter selon les besoins)
    common_domains = [
        'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
        'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com', 'aol.com',
        'live.com', 'msn.com', 'orange.fr', 'sfr.fr', 'free.fr', 'laposte.net',
        'wanadoo.fr', 'gmx.fr', 'gmx.com', 'gmx.net', 'gmx.de', 'yahoo.fr',
        'hotmail.fr', 'outlook.fr', 'live.fr', 'me.com', 'mac.com', 'icloud.com',
        'gmail.fr', 'yahoo.co.uk', 'hotmail.co.uk', 'outlook.co.uk', 'ymail.com'
    ]
    
    # Filtrer les emails valides
    valid_emails = []
    for match in email_matches:
        domain = match.split('@')[-1].lower()
        if any(common_domain in domain for common_domain in common_domains):
            valid_emails.append(match)
    
    # Si des emails valides trouvés, prendre le premier
    if valid_emails:
        email = valid_emails[0]
    elif email_matches:  # Si aucun email valide mais des correspondances trouvées
        # Prendre l'email le plus long (moins susceptible d'être un faux positif)
        email = max(email_matches, key=len)
    
    # 2. Extraction NOM (plusieurs stratégies)
    name = "Candidat Inconnu"
    
    # Stratégie 1: Chercher dans les premières lignes (format CV standard)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # Essayer de trouver un bloc d'informations personnelles en haut du CV
    for i, line in enumerate(lines[:15]):  # Regarder les 15 premières lignes
        # Si on trouve un email dans la ligne, c'est probablement la ligne d'info perso
        if email and email in line:
            # Essayer d'extraire le nom de la même ligne ou des lignes précédentes
            if i > 0 and is_likely_name(lines[i-1]):
                name = lines[i-1]
                break
            # Ou essayer d'extraire le nom de la ligne actuelle (en retirant l'email)
            name_candidate = line.replace(email, '').strip()
            if is_likely_name(name_candidate):
                name = name_candidate
                break
    
    # Stratégie 2: Chercher un nom en majuscules ou avec une capitalisation appropriée
    if name == "Candidat Inconnu":
        for line in lines[:10]:
            if is_likely_name(line):
                name = line
                break
    
    # Stratégie 3: Si email trouvé, essayer d'extraire le nom de l'email
    if email and name == "Candidat Inconnu":
        name_from_email = email.split('@')[0]
        # Nettoyer le nom de l'email
        name_from_email = re.sub(r'[0-9._+-]+', ' ', name_from_email)
        name_parts = []
        for part in name_from_email.split():
            # Essayer de capitaliser correctement les noms composés
            if '-' in part:
                part = '-'.join([p.capitalize() for p in part.split('-')])
            else:
                part = part.capitalize()
            name_parts.append(part)
        
        name_from_email = ' '.join(name_parts)
        if len(name_from_email) > 3:
            name = name_from_email
    
    # Nettoyer le nom final
    name = ' '.join([word.capitalize() for word in re.split(r'\s+', name.strip())])
    
    return name, email

def is_likely_name(text: str) -> bool:
    """
    Détermine si un texte ressemble à un nom
    """
    # Trop court ou trop long
    if len(text) < 3 or len(text) > 50:
        return False
    
    # Contient des mots interdits
    forbidden_words = ['cv', 'curriculum', 'vitae', 'resume', 'téléphone', 'phone', 'email', 
                      'mobile', 'adresse', 'linkedin', 'github', 'expérience', 'compétence']
    if any(word in text.lower() for word in forbidden_words):
        return False
    
    # Doit contenir au moins 2 mots (prénom + nom)
    words = text.split()
    if len(words) < 2 or len(words) > 4:
        return False
    
    # Les mots doivent commencer par une majuscule
    if not all(word[0].isupper() for word in words if len(word) > 1):
        return False
    
    # Ne doit pas contenir de chiffres
    if any(char.isdigit() for char in text):
        return False
    
    return True

def create_or_get_candidate(name: str, email: str, filename: str):
    """Crée ou récupère un utilisateur candidat"""
    
    # Si email valide, chercher ou créer avec cet email
    if email and '@' in email:
        try:
            candidat, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': name.split()[0] if name else 'Candidat',
                    'last_name': ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else 'Inconnu',
                    'role': 'candidat',
                    'is_active': True
                }
            )
            return candidat
        except Exception as e:
            logger.warning(f"Impossible de créer avec email {email}: {e}")
    
    # Fallback: créer avec email temporaire basé sur le nom du fichier
    base_name = re.sub(r'[^a-zA-Z0-9]', '_', filename.lower().replace('.pdf', ''))
    temp_email = f"{base_name}@temp.recruitment"
    
    # S'assurer que l'email est unique
    counter = 1
    while User.objects.filter(email=temp_email).exists():
        temp_email = f"{base_name}_{counter}@temp.recruitment"
        counter += 1
    
    candidat = User.objects.create(
        email=temp_email,
        username=temp_email,
        first_name=name.split()[0] if name else 'Candidat',
        last_name=' '.join(name.split()[1:]) if name and len(name.split()) > 1 else filename,
        role='candidat',
        is_active=True
    )
    
    return candidat

# ============================================
# VUES PRINCIPALES
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_job_with_cv(request, cv_id):
    """
    Analyser une offre d'emploi avec un CV existant
    Retourne un résultat d'analyse conforme à l'interface CVAnalysisResult du frontend
    """
    try:
        # Récupérer le CV avec les données du candidat
        cv = CV.objects.select_related('candidat').get(id=cv_id, candidat=request.user)
        
        # Vérifier si l'offre d'emploi est fournie
        job_description = request.data.get('job_description')
        if not job_description:
            return Response(
                {'error': 'Le texte de l\'offre d\'emploi est requis'}, 
                status=400
            )
        
        # Vérifier si le texte extrait est None ou vide
        if not cv.extracted_text or not cv.extracted_text.strip():
            logger.error(f'Le texte extrait du CV {cv_id} est vide ou None')
            return Response(
                {'error': 'Le texte extrait du CV est vide et ne peut pas être analysé'}, 
                status=400
            )
        
        # Analyser le CV avec l'offre d'emploi
        try:
            logger.info(f'Début de l\'analyse - CV ID: {cv_id}')
            analysis_result = analyzer.analyze(cv.extracted_text, job_description)
            logger.info(f'Résultat de l\'analyse: {analysis_result}')
        except Exception as e:
            logger.error(f'Erreur lors de l\'analyse du CV {cv_id}: {str(e)}', exc_info=True)
            return Response(
                {'error': f'Erreur lors de l\'analyse du CV: {str(e)}'}, 
                status=500
            )
        
        # Sauvegarder le résultat dans l'historique
        try:
            result = AnalysisResult.objects.create(
                cv=cv,
                job_offer_text=job_description,
                compatibility_score=analysis_result.get('match_score', 0),
                matched_keywords=analysis_result.get('matched_skills', []),
                missing_keywords=analysis_result.get('missing_skills', []),
                summary=analysis_result.get('summary', ''),
                analyzed_by=request.user if request.user.is_authenticated else None
            )
            logger.info(f'Résultat d\'analyse enregistré avec l\'ID: {result.id}')
        except Exception as e:
            logger.error(f'Erreur lors de la sauvegarde du résultat: {str(e)}')
            # On continue quand même car l'analyse a réussi, même si la sauvegarde a échoué
        
        # Construire la réponse selon l'interface CVAnalysisResult attendue par le frontend
        response_data = {
            'cv_id': cv.id,
            'match_score': analysis_result.get('match_score', 0),
            'matching_skills': analysis_result.get('matched_skills', []),
            'missing_skills': analysis_result.get('missing_skills', []),
            'summary': analysis_result.get('analysis_summary', ''),
            'advice': analysis_result.get('advice', ''),
            'created_at': timezone.now().isoformat(),
            'cv_file_name': cv.file_name,
            'candidat_name': f"{cv.candidat.first_name} {cv.candidat.last_name}".strip() or "Candidat inconnu"
        }
        
        logger.info(f'Analyse terminée avec succès pour le CV {cv_id}')
        return Response(response_data)
        
    except CV.DoesNotExist:
        logger.error(f'CV non trouvé avec l\'ID: {cv_id}')
        return Response(
            {'error': 'CV non trouvé ou vous n\'avez pas la permission d\'y accéder'}, 
            status=404
        )
    except Exception as e:
        logger.error(f'Erreur inattendue lors de l\'analyse: {str(e)}', exc_info=True)
        return Response(
            {'error': f'Une erreur inattendue est survenue: {str(e)}'}, 
            status=500
        )

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_cv(request, cv_id=None):
    if request.method == 'GET':
        # Récupérer tous les CVs de l'utilisateur
        cvs = CV.objects.filter(candidat=request.user).order_by('-uploaded_at')
        return Response({
            'cvs': CVSerializer(cvs, many=True).data,
            'max_cvs': 5
        })
        
    elif request.method == 'DELETE':
        try:
            cv = CV.objects.get(id=cv_id, candidat=request.user)
            cv.delete()
            return Response({'message': 'CV supprimé avec succès'}, status=200)
        except CV.DoesNotExist:
            return Response({'error': 'CV non trouvé'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cv_candidat(request):
    """Candidat upload son CV et obtient une analyse automatique"""
    if request.user.role != 'candidat':
        return Response({'error': 'Accès refusé'}, status=403)

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'Aucun fichier fourni'}, status=400)
        
    if not file.name.lower().endswith('.pdf'):
        return Response({'error': 'Seuls les fichiers PDF sont acceptés'}, status=400)

    # Vérifier la limite de 5 CVs et supprimer le plus ancien si nécessaire
    max_cvs = 5
    user_cvs = CV.objects.filter(candidat=request.user).order_by('uploaded_at')
    if user_cvs.count() >= max_cvs:
        # Supprimer également les analyses associées
        cv_to_delete = user_cvs.first()
        AnalysisResult.objects.filter(cv=cv_to_delete).delete()
        cv_to_delete.delete()

    # Extraction texte
    extracted_text = analyzer.extract_text_from_pdf(file)
    if not extracted_text.strip():
        return Response({'error': 'PDF vide ou illisible'}, status=400)

    # Extraction des informations personnelles
    name, email = extract_name_and_email_from_text(extracted_text)
    
    # Extraction compétences + expérience
    skills_dict = analyzer.extract_skills(extracted_text)
    skills_list = list(skills_dict.keys())  # Convertir en liste de compétences
    experience = analyzer.extract_experience_years(extracted_text)

    # Sauvegarde avec toutes les informations extraites
    cv = CV.objects.create(
        candidat=request.user,
        file=file,
        extracted_text=extracted_text,
        parsed_data={
            'skills': skills_list,  # Utiliser la liste des compétences
            'skills_with_weights': skills_dict,  # Conserver aussi le dictionnaire complet
            'experience_years': experience,
            'extracted_name': name,
            'extracted_email': email
        }
    )

    # Créer une offre d'emploi par défaut basée sur les compétences du CV
    default_job_description = f"""
    Poste recherché : Développeur Full Stack
    
    Compétences requises :
    - {', '.join(skills_list[:5])}
    - Expérience en développement web
    - Bonnes pratiques de programmation
    
    Missions :
    - Développement d'applications web complètes
    - Participation aux réunions d'équipe
    - Rédaction de documentation technique
    
    Profil recherché :
    - {experience} ans d'expérience minimum
    - Autonome et force de proposition
    - Bonne maîtrise des méthodologies agiles
    """.strip()

    # Effectuer une analyse complète avec l'offre par défaut
    try:
        analysis_result = analyzer.analyze(extracted_text, default_job_description)
        
        # Créer l'analyse complète
        analysis = AnalysisResult.objects.create(
            cv=cv,
            job_offer_text=default_job_description,
            compatibility_score=analysis_result.get('match_score', 0),
            matched_keywords=analysis_result.get('matched_skills', []),
            missing_keywords=analysis_result.get('missing_skills', []),
            summary=analysis_result.get('analysis_summary', 
                f"CV de {name} avec {experience} ans d'expérience. "
                f"Compétences: {', '.join(skills_list[:5])}{'...' if len(skills_list) > 5 else ''}"),
            analyzed_by=request.user  # Enregistrer l'utilisateur qui effectue l'analyse
        )
        
        # Mettre à jour le CV avec l'ID de l'analyse
        cv.parsed_data['initial_analysis_id'] = analysis.id
        cv.parsed_data['default_analysis'] = True
        cv.save()
        
        return Response({
            'message': 'CV téléchargé et analysé avec succès',
            'cv': CVSerializer(cv).data,
            'analysis': AnalysisResultSerializer(analysis).data
        }, status=201)
        
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse du CV: {str(e)}")
        return Response({
            'error': f"Une erreur est survenue lors de l'analyse du CV: {str(e)}"
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_cvs_recruteur(request):
    """Version CORRIGÉE de l'upload multiple"""
    if request.user.role != 'recruteur':
        return Response({'error': 'Accès refusé'}, status=403)

    files = request.FILES.getlist('files')
    if not files:
        return Response({'error': 'Aucun fichier fourni'}, status=400)

    uploaded_cvs = []
    errors = []

    for file in files:
        try:
            # Vérification du type de fichier
            if not file.name.lower().endswith('.pdf'):
                errors.append(f"{file.name}: Format non supporté (PDF uniquement)")
                continue

            # Extraction du texte
            extracted_text = analyzer.extract_text_from_pdf(file)
            if not extracted_text or len(extracted_text.strip()) < 50:
                errors.append(f"{file.name}: PDF vide ou illisible")
                continue

            # EXTRACTION CORRECTE du nom et email
            name, email = extract_name_and_email_from_text(extracted_text)
            
            logger.info(f" Fichier {file.name} -> Nom: {name}, Email: {email}")

            # Extraction des compétences
            skills_dict = analyzer.extract_skills(extracted_text)
            skills_list = list(skills_dict.keys())  # Convertir en liste de compétences
            experience = analyzer.extract_experience_years(extracted_text)

            # Création ou récupération de l'utilisateur candidat
            candidat = create_or_get_candidate(name, email, file.name)
            
            # Vérifier si un CV similaire existe déjà pour ce candidat
            existing_cv = CV.objects.filter(
                candidat=candidat,
                extracted_text__icontains=extracted_text[:200]  # Vérifier les 200 premiers caractères pour la similarité
            ).first()
            
            if existing_cv:
                # Mettre à jour le CV existant au lieu d'en créer un nouveau
                existing_cv.file = file
                existing_cv.parsed_data = {
                    'skills': skills_list,
                    'skills_with_weights': skills_dict,
                    'experience_years': experience,
                    'extracted_name': name,
                    'extracted_email': email,
                    'file_name': file.name,
                    'updated_at': timezone.now().isoformat()
                }
                existing_cv.save()
                cv = existing_cv
                logger.info(f"CV existant mis à jour pour {email}")
            else:
                # Créer un nouveau CV
                cv = CV.objects.create(
                    candidat=candidat,
                    file=file,
                    extracted_text=extracted_text,
                    parsed_data={
                        'skills': skills_list,
                        'skills_with_weights': skills_dict,
                        'experience_years': experience,
                        'extracted_name': name,
                        'extracted_email': email,
                        'file_name': file.name,
                        'created_at': timezone.now().isoformat()
                    }
                )

            uploaded_cvs.append({
                'cv_id': cv.id,
                'file_name': file.name,
                'candidat_name': name,
                'candidat_email': email,
                'skills': skills_list[:10],  # Utiliser la liste des compétences
                'experience_years': experience,
                'text_length': len(extracted_text)
            })

        except Exception as e:
            logger.error(f" Erreur upload {file.name}: {str(e)}")
            errors.append(f"{file.name}: Erreur de traitement - {str(e)}")

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
        summary=summary,
        analyzed_by=request.user  # Enregistrer l'utilisateur qui effectue l'analyse
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

import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rank_cvs_recruteur(request):
    """
    Recruteur : Classer des CVs spécifiques vs offre (ordre décroissant)
    """
    logger.info("=== DÉBUT rank_cvs_recruteur ===")
    logger.info(f"Utilisateur: {request.user} (rôle: {getattr(request.user, 'role', 'non défini')})")
    logger.info(f"Headers: {dict(request.headers)}")
    
    try:
        # Vérifier si les données sont bien du JSON
        if not request.data:
            logger.error("Aucune donnée reçue dans la requête")
            return Response({'error': 'Données manquantes dans la requête'}, status=400)
            
        logger.info(f"Données reçues: {request.data}")
        
        # Vérification du rôle
        if not hasattr(request.user, 'role') or request.user.role != 'recruteur':
            logger.warning(f"Accès refusé: l'utilisateur {request.user.id} n'est pas un recruteur")
            return Response({'error': 'Accès refusé: rôle recruteur requis'}, status=403)

        # Récupération du texte de l'offre
        job_text = request.data.get('job_offer_text', '').strip()
        if not job_text:
            logger.warning("Aucun texte d'offre d'emploi fourni")
            return Response({'error': 'Le champ job_offer_text est requis'}, status=400)
            
        logger.info(f"Texte de l'offre d'emploi (début): {job_text[:100]}...")
        
        # Récupération des IDs des CVs
        cv_ids = request.data.get('cv_ids', [])
        logger.info(f"CVs demandés (brut): {cv_ids} (type: {type(cv_ids)})")
        
        # Si cv_ids est une liste de None, on essaie de récupérer tous les CVs
        if all(cv_id is None for cv_id in cv_ids):
            logger.info("Aucun ID de CV valide fourni, récupération de tous les CVs disponibles")
            clean_cv_ids = list(CV.objects.values_list('id', flat=True))
            if not clean_cv_ids:
                logger.warning("Aucun CV trouvé dans la base de données")
                return Response({
                    'error': 'Aucun CV disponible dans la base de données',
                    'details': 'Veuillez d\'abord importer des CVs',
                    'cv_ids_fournis': cv_ids,
                    'cv_ids_trouves': []
                }, status=400)
        else:
            # Nettoyage des IDs (suppression des valeurs None et conversion en entiers)
            clean_cv_ids = []
            for cv_id in cv_ids:
                try:
                    if cv_id is not None:
                        clean_id = int(cv_id)
                        clean_cv_ids.append(clean_id)
                except (ValueError, TypeError):
                    logger.warning(f"ID de CV invalide ignoré: {cv_id}")
        
        logger.info(f"CVs à analyser (après nettoyage): {clean_cv_ids}")
        
        # Vérification du nombre de CVs (1 à 10)
        if not clean_cv_ids:
            logger.warning("Aucun CV disponible pour l'analyse")
            return Response({
                'error': 'Aucun CV disponible pour l\'analyse',
                'details': 'Veuillez fournir des IDs de CV valides ou importer des CVs',
                'cv_ids_fournis': cv_ids,
                'cv_ids_valides': clean_cv_ids
            }, status=400)
            
        # Limite à 10 CVs maximum pour des raisons de performance
        if len(clean_cv_ids) > 10:
            logger.warning(f"Trop de CVs fournis: {len(clean_cv_ids)} (max 10)")
            clean_cv_ids = clean_cv_ids[:10]  # On garde seulement les 10 premiers
            logger.info(f"Limite appliquée: analyse des 10 premiers CVs sur {len(clean_cv_ids)}")
            
        logger.info(f"CVs à analyser (après nettoyage): {clean_cv_ids}")
        
        # Gestion de la pagination
        page = max(1, int(request.data.get('page', 1)))
        page_size = max(0, int(request.data.get('page_size', 0)))  # 0 = pas de pagination
        
        # Vérification de l'existence des CVs
        if clean_cv_ids:
            # Récupération des CVs existants avec les champs nécessaires
            cvs_query = CV.objects.filter(id__in=clean_cv_ids).order_by('id')
            total_cvs = cvs_query.count()
            
            # Vérification des CVs manquants
            found_ids = list(cvs_query.values_list('id', flat=True))
            not_found = [cv_id for cv_id in clean_cv_ids if cv_id not in found_ids]
            
            if not_found:
                logger.warning(f"Certains CVs n'ont pas été trouvés: {not_found}")
            
            # Si aucun CV n'est trouvé
            if total_cvs == 0:
                logger.warning("Aucun des CVs demandés n'a été trouvé")
                return Response({
                    'error': 'Aucun CV trouvé avec les IDs fournis',
                    'cv_ids_recherches': clean_cv_ids,
                    'cv_ids_non_trouves': clean_cv_ids,
                    'cv_ids_trouves': []
                }, status=404)
                
            # Chargement des CVs en mémoire pour éviter les problèmes d'itération
            cvs_list = list(cvs_query.all())
            logger.info(f"CVs chargés en mémoire: {[cv.id for cv in cvs_list]}")
            
            # Si certains CVs sont manquants mais qu'il y en a au moins un de valide
            if not_found:
                logger.warning(f"CVs non trouvés: {not_found}")
            
            # Appliquer la pagination si demandée
            if page_size > 0:
                start = (page - 1) * page_size
                end = start + page_size
                cvs = cvs_list[start:end]
                logger.info(f"Pagination activée - Page {page} (taille: {page_size})")
            else:
                cvs = cvs_list
                
            logger.info(f"{total_cvs} CVs trouvés sur {len(cv_ids)} demandés")
            
        # Préparation de la réponse avec les informations sur les CVs trouvés/missing
        response_meta = {
            'cv_ids_demandes': clean_cv_ids,
            'cv_ids_trouves': found_ids,
            'cv_ids_manquants': not_found,
            'total_cvs_trouves': total_cvs,
            'page': page,
            'page_size': page_size if page_size > 0 else total_cvs,
            'total_pages': (total_cvs + page_size - 1) // page_size if page_size > 0 else 1
        }

        # Analyse des CVs
        logger.info(f"Début de l'analyse des CVs (total: {total_cvs})")
        rankings = []
        processed = 0
        
        # Si on a des CVs manquants, on les ajoute dans la réponse
        if not_found:
            for missing_id in not_found:
                rankings.append({
                    'cv_id': missing_id,
                    'candidat_name': 'Non trouvé',
                    'candidat_email': '',
                    'candidat_id': None,
                    'score': 0.0,
                    'error': 'CV non trouvé',
                    'matched_keywords': [],
                    'missing_keywords': []
                })
                logger.warning(f"CV {missing_id} marqué comme non trouvé")
        
        # Création d'un ensemble pour suivre les CVs déjà traités
        processed_cv_ids = set()
        
        for cv in cvs:
            # Vérification des doublons
            if cv.id in processed_cv_ids:
                logger.warning(f"CV {cv.id} déjà traité, ignoré")
                continue
                
            try:
                # Marquer le CV comme traité
                processed_cv_ids.add(cv.id)
                
                # Vérification du texte du CV
                if not cv.extracted_text:
                    logger.warning(f"CV {cv.id} n'a pas de texte extrait, ignoré")
                    continue
                    
                logger.info(f"Analyse du CV {cv.id}...")
                
                # Calcul de la compatibilité
                score, matched, missing = analyzer.calculate_compatibility(cv.extracted_text, job_text)
                
                # Sauvegarder le résultat d'analyse avec l'utilisateur qui l'a effectuée
                analysis = AnalysisResult.objects.create(
                    cv=cv,
                    job_offer_text=job_text,
                    compatibility_score=score,
                    matched_keywords=matched,
                    missing_keywords=missing,
                    summary=analyzer.summarize_cv(cv.extracted_text),
                    analyzed_by=request.user
                )
                logger.info(f"Analyse enregistrée avec l'ID {analysis.id} pour le CV {cv.id}")
                
                # Extraction des informations du candidat
                # 1. Essayer d'abord le nom extrait du CV
                name = cv.parsed_data.get('extracted_name', '')
                
                # 2. Si non trouvé, essayer le nom du candidat lié
                if not name and cv.candidat:
                    name = cv.candidat.get_full_name()
                
                # 3. Si toujours pas trouvé, extraire du nom de fichier
                if not name and cv.file:
                    # Enlever l'extension et les caractères spéciaux
                    filename = os.path.splitext(os.path.basename(cv.file.name))[0]
                    # Supprimer les suffixes aléatoires ajoutés par Django (après le dernier _)
                    if '_' in filename:
                        filename = filename.rsplit('_', 1)[0]
                    # Remplacer les séparateurs par des espaces et formater correctement le nom
                    name_parts = []
                    for part in re.split(r'[\s_\-]+', filename):
                        if not part.strip() or any(c.isdigit() for c in part):
                            continue
                        # Mettre en majuscule la première lettre et le reste en minuscules
                        part = part.strip().lower()
                        if part in ['cv', 'resume', 'curriculum', 'vitae']:
                            continue
                        # Gestion des noms composés (ex: Ben-Hadj-Hassine)
                        if '-' in part:
                            part = '-'.join([p.capitalize() for p in part.split('-')])
                        else:
                            part = part.capitalize()
                        name_parts.append(part)
                    
                    name = ' '.join(name_parts)
                
                # 4. Si toujours rien, utiliser une valeur par défaut
                if not name:
                    name = f"Candidat {cv.id}"
                
                # Extraction de l'email avec priorité sur l'email extrait, puis sur l'email du candidat
                email = cv.parsed_data.get('extracted_email', '')
                if not email and cv.candidat and cv.candidat.email:
                    email = cv.candidat.email
                if not email:
                    email = f"candidat_{cv.id}@example.com"
                
                # Nettoyage de l'email
                email = email.strip().lower()
                
                # Utiliser l'ID du CV comme identifiant unique si pas de candidat
                candidat_id = cv.candidat.id if cv.candidat else f"cv_{cv.id}"
                
                logger.info(f"CV {cv.id} analysé - Score: {score:.2f}")

                # Ajouter des informations supplémentaires pour le débogage
                cv_info = {
                    'cv_id': cv.id,
                    'cv_filename': cv.file.name.split('/')[-1] if cv.file else 'Aucun fichier',
                    'candidat_name': name,
                    'candidat_email': email,
                    'candidat_id': candidat_id,
                    'score': score,
                    'matched_keywords': matched,
                    'missing_keywords': missing,
                    'source': 'CV' + (' (candidat existant)' if cv.candidat else ' (nouveau candidat)')
                }
                logger.info(f"CV {cv.id} - Nom: {name}, Email: {email}, Fichier: {cv_info['cv_filename']}")
                rankings.append(cv_info)
                
                processed += 1
                if processed % 10 == 0:  # Log tous les 10 CVs pour éviter de surcharger les logs
                    logger.info(f"CVs analysés: {processed}/{total_cvs} ({(processed/total_cvs*100):.1f}%)")
                logger.debug(f"CV {cv.id} analysé - Score: {score:.2f}")
                
            except Exception as e:
                logger.error(f"Erreur lors de l'analyse du CV {cv.id}: {str(e)}", exc_info=True)
                continue

        if not rankings:
            logger.warning("Aucun CV n'a pu être analysé avec succès")
            return Response({
                'error': 'Aucun CV valide pour analyse',
                'details': 'Les CVs ne contiennent pas de texte analysable'
            }, status=400)

        # Séparer les résultats valides et les erreurs
        valid_rankings = [r for r in rankings if 'error' not in r]
        error_rankings = [r for r in rankings if 'error' in r]
        
        # Trier les CVs par score décroissant
        valid_rankings.sort(key=lambda x: x['score'], reverse=True)
        
        # Grouper par email et ne garder que le meilleur score par candidat
        best_scores = {}
        for ranking in valid_rankings:
            email = ranking.get('candidat_email', '').lower()
            if not email:
                continue
                
            # Si le candidat n'est pas encore dans le dictionnaire ou si on a un meilleur score
            if email not in best_scores or ranking['score'] > best_scores[email]['score']:
                # Ajouter la liste des fichiers pour ce candidat
                if email in best_scores:
                    # Si on a déjà un CV pour ce candidat, on ajoute le fichier à la liste
                    if 'files' not in ranking:
                        ranking['files'] = []
                    if 'files' in best_scores[email]:
                        ranking['files'].extend(best_scores[email]['files'])
                    ranking['files'].append(best_scores[email]['cv_filename'])
                best_scores[email] = ranking
        
        # Convertir le dictionnaire en liste triée par score décroissant
        unique_rankings = list(best_scores.values())
        unique_rankings.sort(key=lambda x: x['score'], reverse=True)
        
        # Combiner avec les erreurs
        rankings = unique_rankings + error_rankings
        
        # Mise à jour des métadonnées de la réponse
        response_meta.update({
            'message': f"{len(unique_rankings)} candidat(s) unique(s) analysé(s) avec succès" + 
                      (f", {len(error_rankings)} CV(s) en erreur" if error_rankings else "") +
                      f" (sur {len(valid_rankings) + len(error_rankings)} CVs au total)",
            'total_cvs_analyses': len(valid_rankings),
            'total_candidates': len(unique_rankings),
            'total_cvs_en_erreur': len(error_rankings),
            'note': 'Uniquement le meilleur score par candidat est affiché. Les doublons sont regroupés.'
        })
        
        logger.info(f"Analyse terminée - {len(unique_rankings)} candidats uniques sur {len(valid_rankings)} CVs analysés" + 
                   (f" (dont {len(error_rankings)} en erreur)" if error_rankings else ""))
        
        # Préparation de la réponse finale
        response_data = {
            **response_meta,
            'rankings': rankings
        }
        
        # Ajout des liens de pagination si nécessaire
        if page_size > 0 and total_cvs > 0:
            response_data['pagination'] = {
                'current_page': page,
                'total_pages': (total_cvs + page_size - 1) // page_size,
                'total_items': total_cvs,
                'has_previous': page > 1,
                'has_next': (page * page_size) < total_cvs,
                'next_page': page + 1 if (page * page_size) < total_cvs else None,
                'previous_page': page - 1 if page > 1 else None
            }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Erreur inattendue dans rank_cvs_recruteur: {str(e)}", exc_info=True)
        return Response({
            'error': 'Une erreur est survenue lors du traitement de la requête',
            'details': str(e)
        }, status=500)

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analysis_history(request):
    """
    Historique des analyses de l'utilisateur connecté
    - Candidat : voit ses propres analyses
    - Recruteur : voit les analyses qu'il a effectuées
    """
    if request.user.role == 'recruteur':
        # Pour les recruteurs, on montre les analyses qu'ils ont effectuées
        analyses = AnalysisResult.objects.filter(
            analyzed_by=request.user
        ).select_related('cv', 'cv__candidat').order_by('-created_at')
    else:
        # Pour les candidats, on montre les analyses de leurs propres CVs
        analyses = AnalysisResult.objects.filter(
            cv__candidat=request.user
        ).select_related('cv', 'cv__candidat').order_by('-created_at')
    
    # Sérializer les résultats avec les champs nécessaires pour le frontend
    results = []
    for analysis in analyses:
        results.append({
            'id': analysis.id,
            'cv_id': analysis.cv.id if analysis.cv else None,
            'cv_file_name': analysis.cv.file_name if analysis.cv else 'CV inconnu',
            'match_score': analysis.compatibility_score,
            'created_at': analysis.created_at,
            'summary': analysis.summary or 'Aucun résumé disponible',
            'matched_skills': analysis.matched_keywords or [],
            'missing_skills': analysis.missing_keywords or [],
            'job_offer_text': analysis.job_offer_text or 'Aucune offre spécifiée',
            'user_id': analysis.cv.candidat.id if analysis.cv and analysis.cv.candidat else None,
            'user_name': analysis.cv.candidat.get_full_name() if analysis.cv and analysis.cv.candidat else 'Utilisateur inconnu',
            'analyzed_by': {
                'id': analysis.analyzed_by.id if analysis.analyzed_by else None,
                'name': analysis.analyzed_by.get_full_name() if analysis.analyzed_by else 'Système'
            } if analysis.analyzed_by else None
        })
    
    return Response(results)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_analysis_history(request, user_id):
    """
    Récupère l'historique d'analyse d'un utilisateur spécifique
    Uniquement accessible par les recruteurs ou administrateurs
    """
    # Vérifier si l'utilisateur est un recruteur ou un administrateur
    if request.user.role != 'recruteur' and not request.user.is_staff:
        return Response(
            {'error': 'Accès non autorisé. Seuls les recruteurs peuvent voir les historiques des autres utilisateurs.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Vérifier si l'utilisateur cible existe
        target_user = User.objects.get(id=user_id)
        
        # Récupérer les analyses pour l'utilisateur cible
        analyses = AnalysisResult.objects.filter(
            cv__candidat=target_user
        ).select_related('cv').order_by('-created_at')
        
        # Sérialiser les résultats
        results = []
        for analysis in analyses:
            results.append({
                'id': analysis.id,
                'cv_id': analysis.cv.id if analysis.cv else None,
                'cv_file_name': analysis.cv.file_name if analysis.cv else 'CV inconnu',
                'match_score': analysis.compatibility_score,
                'created_at': analysis.created_at,
                'summary': analysis.summary or 'Aucun résumé disponible',
                'matched_skills': analysis.matched_keywords or [],
                'missing_skills': analysis.missing_keywords or [],
                'job_offer_text': analysis.job_offer_text or 'Aucune offre spécifiée',
                'user_id': target_user.id,
                'user_name': target_user.get_full_name() or target_user.email,
            })
        
        return Response(results)
        
    except User.DoesNotExist:
        return Response(
            {'error': 'Utilisateur non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )

# ============================================
# VUE DE TEST
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_analyzer(request):
    """Endpoint de test pour debugger l'analyseur"""
    test_cv_text = """
    JEAN DUPONT
    Email: jean.dupont@email.com
    Téléphone: 01 23 45 67 89
    
    EXPÉRIENCE
    Développeur Python - 3 ans
    Compétences: Python, Django, React, PostgreSQL, Docker
    
    FORMATION
    Master Informatique
    """
    
    test_job_text = """
    Recherche Développeur Full Stack
    Compétences requises: Python, Django, React, PostgreSQL
    Expérience: 2+ ans
    """
    
    # Test extraction nom/email
    name, email = extract_name_and_email_from_text(test_cv_text)
    
    # Test calcul score
    score, matched, missing = analyzer.calculate_compatibility(test_cv_text, test_job_text)
    
    return Response({
        'extraction_test': {
            'name': name,
            'email': email,
            'success': name != "Candidat Inconnu" and email != ""
        },
        'score_test': {
            'score': score,
            'matched': matched,
            'missing': missing
        },
        'analyzer_status': 'OK'
    })