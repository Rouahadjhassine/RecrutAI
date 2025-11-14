# cvs/views.py - VERSION CORRIGÉE COMPLÈTE

import os
import re
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
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
    # Nettoyer le texte
    text = ' '.join(text.split())
    
    # 1. Extraction EMAIL (très fiable)
    email = ""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, text)
    if email_match:
        email = email_match.group(0)
    
    # 2. Extraction NOM (plusieurs stratégies)
    name = "Candidat Inconnu"
    
    # Stratégie 1: Chercher dans les premières lignes
    lines = text.split('\n')
    for i, line in enumerate(lines[:10]):  # 10 premières lignes
        line = line.strip()
        if len(line) > 0:
            # Filtrer les lignes qui ressemblent à un nom
            if is_likely_name(line):
                name = line
                break
    
    # Stratégie 2: Si email trouvé, extraire le nom de l'email
    if email and name == "Candidat Inconnu":
        name_from_email = email.split('@')[0]
        # Nettoyer le nom de l'email
        name_from_email = re.sub(r'[0-9._+-]+', ' ', name_from_email)
        name_from_email = ' '.join([word.capitalize() for word in name_from_email.split()])
        if len(name_from_email) > 3:
            name = name_from_email
    
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
    """
    try:
        # Récupérer le CV
        cv = CV.objects.get(id=cv_id, candidat=request.user)
        
        # Vérifier si l'offre d'emploi est fournie
        job_description = request.data.get('job_description')
        if not job_description:
            return Response({'error': 'Le texte de l\'offre d\'emploi est requis'}, status=400)
        
        # Analyser le CV avec l'offre d'emploi
        logger.info(f'Début de l\'analyse - CV ID: {cv_id}')
        
        # Vérifier si le texte extrait est None ou vide
        if not cv.extracted_text or not cv.extracted_text.strip():
            logger.error('Le texte extrait du CV est vide ou None')
            return Response({'error': 'Le texte extrait du CV est vide'}, status=400)
        
        try:
            analysis_result = analyzer.analyze(cv.extracted_text, job_description)
            logger.info(f'Résultat de l\'analyse: {analysis_result}')
        except Exception as e:
            logger.error(f'Erreur lors de l\'analyse: {str(e)}', exc_info=True)
            raise
        
        # Sauvegarder le résultat dans l'historique
        result = AnalysisResult(
            cv=cv,
            job_offer_text=job_description,
            compatibility_score=analysis_result.get('match_score', 0),
            matched_keywords=analysis_result.get('matched_skills', []),
            missing_keywords=analysis_result.get('missing_skills', []),
            summary=analysis_result.get('analysis_summary', '')
        )
        result.save()
        
        # Retourner le résultat
        return Response({
            'id': result.id,
            'cv_id': cv.id,
            'cv_name': cv.file_name,
            'match_score': result.compatibility_score,
            'missing_skills': result.missing_keywords,
            'matched_skills': result.matched_keywords,
            'analysis_summary': result.summary,
            'created_at': result.created_at
        })
        
    except CV.DoesNotExist:
        return Response({'error': 'CV non trouvé'}, status=404)
    except Exception as e:
        logger.error(f'Erreur lors de l\'analyse: {str(e)}')
        return Response({'error': 'Une erreur est survenue lors de l\'analyse'}, status=500)

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
    """Candidat upload son CV"""
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
        user_cvs.first().delete()

    # Extraction texte
    extracted_text = analyzer.extract_text_from_pdf(file)
    if not extracted_text.strip():
        return Response({'error': 'PDF vide ou illisible'}, status=400)

    # Extraction des informations personnelles
    name, email = extract_name_and_email_from_text(extracted_text)
    
    # Extraction compétences + expérience
    skills = analyzer.extract_skills(extracted_text)
    experience = analyzer.extract_experience_years(extracted_text)

    # Sauvegarde avec toutes les informations extraites
    cv = CV.objects.create(
        candidat=request.user,
        file=file,
        extracted_text=extracted_text,
        parsed_data={
            'skills': skills, 
            'experience_years': experience,
            'extracted_name': name,
            'extracted_email': email
        }
    )

    return Response({
        'message': 'CV uploadé avec succès',
        'cv': CVSerializer(cv).data
    }, status=201)

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
            
            logger.info(f"📄 Fichier {file.name} -> Nom: {name}, Email: {email}")

            # Extraction des compétences
            skills = analyzer.extract_skills(extracted_text)
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
                    'skills': skills,
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
                        'skills': skills,
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
                'skills': list(skills.keys())[:10],
                'experience_years': experience,
                'text_length': len(extracted_text)
            })

        except Exception as e:
            logger.error(f"❌ Erreur upload {file.name}: {str(e)}")
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
    """Historique des analyses (candidat : seulement les siennes / recruteur : tout)"""
    if request.user.role == 'candidat':
        analyses = AnalysisResult.objects.filter(cv__candidat=request.user).order_by('-created_at')
    else:
        analyses = AnalysisResult.objects.all().order_by('-created_at')
    
    return Response(AnalysisResultSerializer(analyses, many=True).data)

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