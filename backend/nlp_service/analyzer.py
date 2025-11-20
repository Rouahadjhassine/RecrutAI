# nlp_service/analyzer.py 
import spacy
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer, util
import numpy as np
import re
from typing import Dict, List, Tuple
import logging
import torch
import math
import pandas as pd
import os
import joblib

# Configuration du logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLCVAnalyzer:
    def __init__(self, model_name='paraphrase-multilingual-MiniLM-L12-v2'):
        try:
            logger.info("Initialisation de l'analyseur de CV...")
            
            # Charger le modèle ML pré-entraîné
            self.ml_matcher = self._load_ml_model()
            
            # Charger spaCy pour le français
            try:
                self.nlp = spacy.load("fr_core_news_sm")
                logger.info("✅ Modèle spaCy français chargé")
            except OSError:
                logger.warning("spaCy non disponible, utilisation de méthodes simples")
                self.nlp = None
            
            # Charger les compétences depuis le dataset
            self._skills_set = self._load_skills_from_dataset()
            logger.info(f"✅ {len(self._skills_set)} compétences chargées depuis le dataset")
                
        except Exception as e:
            logger.error(f"❌ Erreur critique lors de l'initialisation: {e}")
            raise

    def _load_ml_model(self):
        """Charge le modèle ML pré-entraîné depuis train_model.py"""
        try:
            # Chercher le modèle dans différents chemins
            model_paths = [
                'models/cv_job_matcher.pkl',
                os.path.join(os.path.dirname(__file__), 'models/cv_job_matcher.pkl'),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models/cv_job_matcher.pkl'),
            ]
            
            model_path = None
            for path in model_paths:
                if os.path.exists(path):
                    model_path = path
                    break
            
            if model_path:
                # Importer dynamiquement la classe CVJobMatcher
                # Import from the same package
                from .train_model import CVJobMatcher
                ml_model = CVJobMatcher.load_model(model_path)
                logger.info("✅ Modèle ML chargé avec succès")
                return ml_model
            else:
                logger.warning("❌ Modèle ML non trouvé, utilisation de l'analyse basique")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erreur lors du chargement du modèle ML: {e}")
            return None

    def _load_skills_from_dataset(self) -> set:
        """Charge les compétences depuis le dataset UpdatedResumeDataSet.csv"""
        skills_set = set()
        
        try:
            # Chercher le dataset
            dataset_paths = [
                os.path.join(os.path.dirname(__file__), 'UpdatedResumeDataSet.csv'),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'UpdatedResumeDataSet.csv'),
                os.path.join(os.getcwd(), 'UpdatedResumeDataSet.csv'),
            ]
            
            dataset_path = None
            for path in dataset_paths:
                if os.path.exists(path):
                    dataset_path = path
                    break
            
            if not dataset_path:
                logger.warning("Dataset non trouvé")
                return set()
            
            # Lire le dataset
            df = pd.read_csv(dataset_path, encoding='latin-1')
            logger.info(f"Dataset chargé: {len(df)} entrées")
            
            # Extraire les compétences de chaque CV
            for idx, row in df.iterrows():
                resume_text = str(row['Resume']).lower()
                skills_from_cv = self._extract_skills_from_resume_text(resume_text)
                skills_set.update(skills_from_cv)
            
            # Filtrer les compétences valides
            skills_set = {skill for skill in skills_set if self._is_valid_skill(skill)}
            logger.info(f"Compétences extraites: {len(skills_set)}")
            
            return skills_set
            
        except Exception as e:
            logger.error(f"Erreur lors du chargement du dataset: {e}")
            return set()

    def _extract_skills_from_resume_text(self, text: str) -> set:
        """Extrait les compétences d'un texte de CV"""
        skills = set()
        if not text:
            return skills
        
        text = re.sub(r'\s+', ' ', text).strip().lower()
        
        # Patterns pour sections de compétences
        skill_patterns = [
            r'(?:skills?|technical skills|programming skills|technologies?|tools)[:\s\-]*(.*?)(?:\n\n|\n[A-Z]|\n\s*$|$)',
            r'(?:languages?|programming languages|langages?)[:\s\-]*(.*?)(?:\n\n|\n[A-Z]|\n\s*$|$)',
        ]
        
        # Chercher dans les sections
        for pattern in skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for section in matches:
                # Séparer les compétences
                parts = re.split(r'[,;•\-\n]', section)
                for part in parts:
                    skill = self._clean_skill(part)
                    if skill:
                        skills.add(skill)
        
        return skills

    def _clean_skill(self, skill_text: str) -> str:
        """Nettoie une compétence"""
        if not skill_text:
            return ""
        
        skill = skill_text.strip()
        skill = re.sub(r'[^\w\s\+#\.\/]', ' ', skill)
        skill = re.sub(r'\s+', ' ', skill).strip()
        skill = skill.lower()
        
        return skill

    def _is_valid_skill(self, skill: str) -> bool:
        """Vérifie si une compétence est valide"""
        if not skill or len(skill) < 2:
            return False
        
        excluded_words = {
            'and', 'or', 'the', 'a', 'an', 'with', 'using', 'knowledge', 'experience',
            'good', 'strong', 'excellent', 'basic', 'advanced'
        }
        
        if skill in excluded_words:
            return False
        
        if len(skill) > 50:
            return False
        
        return True

    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extrait le texte d'un PDF avec gestion améliorée des erreurs et formats"""
        text = ""
        
        try:
            # Gestion du fichier (fichier uploadé ou chemin)
            file_obj = None
            if hasattr(pdf_file, 'read'):
                # Si c'est un fichier uploadé, on le réinitialise
                pdf_file.seek(0)
                file_obj = pdf_file
                reader = PdfReader(file_obj)
            elif isinstance(pdf_file, str) and os.path.exists(pdf_file):
                # Si c'est un chemin de fichier
                with open(pdf_file, 'rb') as f:
                    reader = PdfReader(f)
            else:
                # Si c'est déjà un objet PdfReader ou similaire
                reader = pdf_file
            
            # Essayer d'extraire le texte de chaque page
            for page in reader.pages:
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception as page_error:
                    logger.warning(f"Erreur extraction page: {page_error}")
                    continue
            
            # Si aucun texte n'a été extrait, essayer une méthode alternative
            if not text.strip():
                logger.warning("Aucun texte extrait avec extract_text(), tentative avec extract_text(0)")
                for page in reader.pages:
                    try:
                        # Certains PDF nécessitent extract_text(0) au lieu de extract_text()
                        page_text = page.extract_text(0)  # Mode 0 pour une extraction plus agressive
                        if page_text and len(page_text) > 10:  # Vérifier que le texte a une longueur minimale
                            text += page_text + "\n"
                    except Exception as alt_error:
                        logger.warning(f"Erreur extraction alternative: {alt_error}")
                        continue
            
            # Nettoyer le texte extrait
            text = self._clean_extracted_text(text)
            
            if not text.strip():
                logger.warning("Aucun texte valide extrait après nettoyage")
                return ""
                
            logger.info(f"Texte PDF extrait: {len(text)} caractères")
            return text
            
        except Exception as e:
            logger.error(f"Erreur critique extraction PDF: {e}", exc_info=True)
            # Essayer une dernière méthode de secours
            try:
                import io
                import PyPDF2
                
                if hasattr(pdf_file, 'read'):
                    pdf_file.seek(0)
                    pdf_data = pdf_file.read()
                elif isinstance(pdf_file, str) and os.path.exists(pdf_file):
                    with open(pdf_file, 'rb') as f:
                        pdf_data = f.read()
                else:
                    return ""
                
                # Essayer avec un nouvel objet PdfReader
                with io.BytesIO(pdf_data) as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                
                text = self._clean_extracted_text(text)
                if text.strip():
                    logger.info(f"Texte extrait avec méthode de secours: {len(text)} caractères")
                    return text
                
            except Exception as fallback_error:
                logger.error(f"Échec de la méthode de secours: {fallback_error}")
            
            return ""
    
    def _clean_extracted_text(self, text: str) -> str:
        """Nettoie le texte extrait du PDF"""
        if not text:
            return ""
        
        # Remplacer les sauts de ligne multiples par un seul espace
        text = re.sub(r'\s+', ' ', text)
        
        # Supprimer les caractères non imprimables
        text = ''.join(char for char in text if char.isprintable() or char.isspace())
        
        # Supprimer les espaces multiples
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def _clean_text(self, text: str) -> str:
        """Nettoie le texte pour l'analyse"""
        if not text:
            return ""
        
        text = text.lower()
        text = re.sub(r'[^a-zA-Z0-9àâäéèêëîïôöùûüÿçÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇ\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def extract_skills(self, text: str) -> Dict[str, float]:
        """Extrait les compétences techniques"""
        if not text or not text.strip():
            return {}
        
        if not self._skills_set:
            return {}
        
        text_lower = text.lower()
        skills_found = {}
        
        for skill in self._skills_set:
            if skill in text_lower:
                count = text_lower.count(skill)
                if count > 0:
                    weight = 1 + math.log(count)
                    skills_found[skill] = weight
        
        # Normaliser
        if skills_found:
            max_weight = max(skills_found.values())
            skills_found = {k: v/max_weight for k, v in skills_found.items()}
        
        return skills_found

    def extract_experience_years(self, text: str) -> int:
        """Extrait les années d'expérience"""
        if not text:
            return 0
            
        text_lower = text.lower()
        
        patterns = [
            r'(\d+)\s*(?:ans?|années?)\s+(?:d\'?expérience|d\'?exp)',
            r'expérience\s*[\-:]\s*(\d+)\s*(?:ans?|années?)',
            r'(\d+)\s*(?:years?|ans?|années?)(?:\s+d\'expérience|\s+expérience|\s+of\s+experience)?',
            r'expérience\s*:\s*(\d+\+?)\s*(?:ans?|années?)',
        ]
        
        years_found = []
        
        for pattern in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]  # Prendre le premier groupe capturé
                try:
                    years = int(''.join(filter(str.isdigit, str(match))))
                    years_found.append(years)
                except (ValueError, TypeError):
                    continue
        
        return max(years_found) if years_found else 0

    def calculate_compatibility(self, cv_text: str, job_description: str, pdf_file=None) -> Tuple[float, List[str], List[str]]:
        """Calcule la compatibilité entre CV et offre"""
        logger.info("🎯 Début du calcul de compatibilité")
        
        if not cv_text or not job_description:
            logger.warning("Texte CV ou description d'emploi manquant")
            return 0.0, [], []
        
        try:
            # Stocker la référence au fichier PDF pour une éventuelle réextraction
            if pdf_file:
                self.last_pdf_file = pdf_file
            
            # 1. Nettoyage initial du texte
            cv_clean = self._clean_text(cv_text)
            job_clean = self._clean_text(job_description)
            
            # Vérifier si le texte extrait est trop court ou semble invalide
            if len(cv_clean.split()) < 10:  # Moins de 10 mots
                logger.warning("Le texte extrait du CV est trop court pour une analyse fiable")
                
                # Essayer d'extraire à nouveau avec une méthode différente si possible
                if hasattr(self, 'last_pdf_file') and self.last_pdf_file:
                    logger.info("Tentative d'extraction alternative...")
                    alt_text = self.extract_text_from_pdf(self.last_pdf_file)
                    if alt_text and len(alt_text.split()) >= 10:
                        cv_clean = self._clean_text(alt_text)
                        logger.info(f"Extraction alternative réussie: {len(alt_text)} caractères")
                    else:
                        logger.warning("L'extraction alternative n'a pas fourni de texte valide")
                
                # Si toujours pas de contenu valide, retourner un score bas mais pas nul
                if len(cv_clean.split()) < 10:
                    logger.warning("Texte CV insuffisant, utilisation d'un score minimal")
                    job_skills = self.extract_skills(job_clean)
                    return 15.0, [], list(job_skills.keys()) if job_skills else []
            
            # 2. Utiliser le modèle ML si disponible (60% du score)
            ml_score = 0
            if self.ml_matcher:
                try:
                    ml_score = self.ml_matcher.calculate_match_score(cv_clean, job_clean)
                    logger.info(f"🤖 Score ML: {ml_score}%")
                    
                    # Si le score ML est très bas, vérifier si c'est dû à une mauvaise extraction
                    if ml_score < 10 and hasattr(self, 'last_pdf_file') and self.last_pdf_file:
                        logger.warning("Score ML très bas, vérification de l'extraction...")
                        alt_text = self.extract_text_from_pdf(self.last_pdf_file)
                        if alt_text and len(alt_text.split()) > len(cv_clean.split()) * 1.5:  # 50% plus de contenu
                            logger.info("Meilleur texte trouvé, réessai avec le nouveau contenu")
                            return self.calculate_compatibility(alt_text, job_clean, self.last_pdf_file)
                except Exception as e:
                    logger.warning(f"Erreur modèle ML: {e}")
                    ml_score = 0
            
            # 3. Analyse basique avec le dataset (40% du score)
            cv_skills = self.extract_skills(cv_clean)
            job_skills = self.extract_skills(job_clean)
            
            matched_skills = []
            missing_skills = []
            basic_score = 0
            
            if job_skills:
                for skill, job_weight in job_skills.items():
                    if skill in cv_skills:
                        cv_weight = cv_skills[skill]
                        match_score = (job_weight + cv_weight) / 2
                        basic_score += match_score * 40 / len(job_skills)
                        matched_skills.append(skill)
                    else:
                        missing_skills.append(skill)
            else:
                basic_score = 12  # Score minimal
            
            # 4. Score final combiné avec pondération
            final_score = ml_score * 0.6 + basic_score
            
            # Ajustement basé sur la longueur du texte (pénalité pour les textes courts)
            word_count = len(cv_clean.split())
            if word_count < 50:  # Moins de 50 mots
                length_penalty = 0.5 + (word_count / 100)  # 50% à 100% du score
                final_score *= length_penalty
                logger.info(f"Ajustement pour texte court: {length_penalty:.2f}x")
            
            # S'assurer que le score est dans une plage raisonnable
            final_score = max(0, min(100, final_score))
            
            # Ajouter une petite variation pour éviter les ex-aequo
            import hashlib
            content_hash = int(hashlib.md5(cv_clean.encode()).hexdigest()[:8], 16)
            variation = (content_hash % 100) * 0.01  # Variation de 0 à 1%
            final_score += variation
            final_score = round(final_score, 2)
            
            logger.info(f"🎯 Score final: {final_score}% (ML: {ml_score}%, Basique: {basic_score}%)")
            
            return final_score, matched_skills, missing_skills
            
        except Exception as e:
            logger.error(f"Erreur dans calculate_compatibility: {e}", exc_info=True)
            # Retourner un score minimal plutôt que 0 pour éviter de pénaliser trop fortement
            job_skills = self.extract_skills(job_description) if job_description else {}
            return 10.0, [], list(job_skills.keys())

    def analyze(self, cv_text: str, job_description: str, pdf_file=None) -> Dict:
        """
        Analyse complète d'un CV par rapport à une offre
        
        Args:
            cv_text: Texte extrait du CV
            job_description: Description du poste
            pdf_file: Fichier PDF optionnel pour réextraction si nécessaire
            
        Returns:
            Dictionnaire contenant les résultats de l'analyse
        """
        try:
            # Calcul du score de compatibilité
            score, matched, missing = self.calculate_compatibility(cv_text, job_description, pdf_file)
            
            # Prédiction de la catégorie avec ML
            try:
                category, confidence = self.predict_job_category(cv_text)
            except Exception as e:
                logger.error(f"Erreur prédiction catégorie: {e}")
                category, confidence = "Non déterminé", 0.0
            
            # Extraction des compétences
            try:
                cv_skills = self.extract_skills(self._clean_text(cv_text))
                job_skills = self.extract_skills(self._clean_text(job_description))
            except Exception as e:
                logger.error(f"Erreur extraction compétences: {e}")
                cv_skills = {}
                job_skills = {}
            
            # Génération du résumé
            try:
                summary = self.summarize_cv(cv_text)
            except Exception as e:
                logger.error(f"Erreur génération résumé: {e}")
                summary = "Résumé non disponible"
            
            # Construction du résultat
            result = {
                'match_score': score,
                'matched_skills': matched,
                'missing_skills': missing,
                'cv_skills': cv_skills,
                'job_skills': job_skills,
                'job_category': category,
                'category_confidence': confidence,
                'analysis_summary': summary,
                'ml_model_used': self.ml_matcher is not None,
                'success': True
            }
            
            # Ajouter des métadonnées de débogage si nécessaire
            if score < 15:  # Si le score est très bas, ajouter des infos de débogage
                result['debug_info'] = {
                    'cv_text_length': len(cv_text) if cv_text else 0,
                    'job_text_length': len(job_description) if job_description else 0,
                    'cv_word_count': len(cv_text.split()) if cv_text else 0,
                    'job_word_count': len(job_description.split()) if job_description else 0,
                    'cv_skills_count': len(cv_skills),
                    'job_skills_count': len(job_skills),
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur critique dans analyze: {e}", exc_info=True)
            return {
                'match_score': 0,
                'matched_skills': [],
                'missing_skills': [],
                'cv_skills': {},
                'job_skills': {},
                'job_category': 'Erreur',
                'category_confidence': 0,
                'analysis_summary': f'Erreur lors de l\'analyse: {str(e)}',
                'ml_model_used': False,
                'success': False,
                'error': str(e)
            }

    def _clean_skill(self, skill: str) -> str:
        """Nettoie une compétence en supprimant les mots vides et caractères spéciaux"""
        # Liste des mots vides à supprimer
        stop_words = {'de', 'la', 'le', 'les', 'et', 'ou', 'avec', 'sans', 'pour', 'dans', 
                     'sur', 'sous', 'par', 'au', 'aux', 'du', 'des', 'un', 'une', 'a', 'b', 
                     'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 
                     'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'on', 'te', 'is', 
                     're', 'et', 'to', 'in', 'it', 'at'}
        
        # Supprimer les caractères spéciaux et les chiffres
        cleaned = re.sub(r'[^\w\s]', ' ', skill.lower())
        # Supprimer les mots courts non pertinents
        words = [word for word in cleaned.split() 
                if len(word) > 2 and word.lower() not in stop_words]
        
        return ' '.join(words).strip().capitalize()

    def extract_skills(self, text: str) -> Dict[str, float]:
        """Extrait les compétences techniques du texte avec un meilleur filtrage"""
        if not text or not isinstance(text, str):
            return {}

        # Nettoyer le texte
        text_clean = self._clean_text(text)
        
        # Convertir en minuscules pour la correspondance insensible à la casse
        text_lower = text_clean.lower()
        
        # Dictionnaire pour stocker les compétences trouvées avec leur score
        skills_found = {}
        
        # 1. Vérifier les compétences du dataset
        for skill in self._skills_set:
            # Ignorer les compétences trop courtes
            if len(skill) < 3:
                continue
                
            # Vérifier la présence de la compétence dans le texte
            if skill.lower() in text_lower:
                # Calculer un score basé sur la longueur de la compétence
                # et la fréquence d'apparition
                count = text_lower.count(skill.lower())
                score = min(len(skill) * 0.1 * (1 + count * 0.2), 1.0)  # Score entre 0.1 et 1.0
                skills_found[skill] = max(skills_found.get(skill, 0), score)
        
        # 2. Détection des langages de programmation (score élevé car très spécifiques)
        programming_keywords = {
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby',
            'swift', 'kotlin', 'go', 'rust', 'scala', 'r', 'matlab', 'bash', 'sql',
            'html', 'css', 'sass', 'less', 'dart', 'perl', 'haskell', 'elixir', 'erlang'
        }
        
        # 3. Détection des frameworks et bibliothèques
        framework_keywords = {
            'django', 'flask', 'fastapi', 'spring', 'spring boot', 'react', 'angular', 
            'vue', 'vue.js', 'node.js', 'express', 'laravel', 'ruby on rails', 'asp.net',
            'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn', 'opencv',
            'react native', 'flutter', 'xamarin', 'ionic', 'electron', 'next.js', 'nuxt.js',
            'graphql', 'apollo', 'grpc', 'thrift', 'kafka', 'rabbitmq', 'celery'
        }
        
        # 4. Détection des outils et plateformes
        tool_keywords = {
            'git', 'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'jenkins',
            'ansible', 'terraform', 'aws', 'amazon web services', 'azure', 'google cloud',
            'gcp', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'kibana',
            'prometheus', 'grafana', 'splunk', 'datadog', 'new relic', 'sentry', 'jira',
            'confluence', 'trello', 'asana', 'slack', 'microsoft teams', 'zoom', 'figma',
            'sketch', 'adobe xd', 'zeplin', 'invision', 'docker-compose', 'helm', 'argo',
            'istio', 'linkerd', 'consul', 'vault', 'terraform cloud', 'pulumi', 'serverless'
        }
        
        # 5. Vérifier les mots-clés dans le texte avec des scores différents
        for keyword_set, base_score in [
            (programming_keywords, 0.9),   # Score élevé pour les langages
            (framework_keywords, 0.8),     # Score moyen-élevé pour les frameworks
            (tool_keywords, 0.7)           # Score moyen pour les outils
        ]:
            for keyword in keyword_set:
                if keyword in text_lower:
                    # Si le mot-clé contient plusieurs mots, vérifier la correspondance exacte
                    if ' ' in keyword:
                        if keyword in text_lower:
                            skills_found[keyword] = max(skills_found.get(keyword, 0), base_score)
                    else:
                        # Pour les mots simples, vérifier les limites de mot
                        words = set(text_lower.split())
                        if keyword in words:
                            skills_found[keyword] = max(skills_found.get(keyword, 0), base_score)
        
        # 6. Utiliser spaCy pour l'extraction des entités nommées si disponible
        if hasattr(self, 'nlp') and self.nlp:
            try:
                doc = self.nlp(text_clean)
                for ent in doc.ents:
                    if ent.label_ in ['ORG', 'PRODUCT', 'TECH'] and len(ent.text) > 2:
                        skill = ent.text.lower().strip()
                        skills_found[skill] = max(skills_found.get(skill, 0), 0.6)
            except Exception as e:
                logger.warning(f"Erreur lors de l'extraction des entités avec spaCy: {e}")
        
        # 7. Filtrer les compétences trop courtes ou non pertinentes
        filtered_skills = {
            skill: score for skill, score in skills_found.items()
            if len(skill) > 2 and not any(c.isdigit() for c in skill)
        }
        
        # Trier les compétences par score décroissant
        sorted_skills = dict(sorted(
            filtered_skills.items(),
            key=lambda item: item[1],
            reverse=True
        ))
        
        return sorted_skills

    def summarize_cv(self, cv_text: str) -> str:
        """Génère un résumé concis du CV avec des compétences pertinentes"""
        if not cv_text or not isinstance(cv_text, str):
            return "Aucun contenu à résumer."
        
        try:
            # Nettoyer le texte
            clean_text = self._clean_text(cv_text)
            
            # Prédire la catégorie
            category, confidence = self.predict_job_category(clean_text)
            
            # Extraire les informations clés
            experience_years = self.extract_experience_years(clean_text)
            
            # Extraire et nettoyer les compétences
            skills = self.extract_skills(clean_text)
            
            # Filtrer et trier les compétences
            filtered_skills = {}
            for skill, score in skills.items():
                cleaned_skill = self._clean_skill(skill)
                if cleaned_skill and len(cleaned_skill) > 2:  # Ignorer les mots trop courts
                    if cleaned_skill not in filtered_skills or score > filtered_skills[cleaned_skill]:
                        filtered_skills[cleaned_skill] = score
            
            # Prendre les 5 meilleures compétences
            top_skills = sorted(filtered_skills.items(), 
                              key=lambda x: x[1], 
                              reverse=True)[:5]
            
            # Construire le résumé
            summary_parts = []
            
            # Ligne 1 : Catégorie et expérience
            category_line = f"Profil {category} avec "
            if experience_years > 1:
                category_line += f"{experience_years} ans d'expérience professionnelle."
            elif experience_years == 1:
                category_line += "1 an d'expérience professionnelle."
            else:
                category_line += "peu ou pas d'expérience professionnelle."
            
            summary_parts.append(category_line)
            
            # Ligne 2 : Compétences clés
            if top_skills:
                skills_list = ", ".join([s[0] for s in top_skills if s[0].strip()])
                if skills_list:
                    summary_parts.append(f"Compétences clés : {skills_list}.")
            
            # Ligne 3 : Note sur la confiance
            if confidence > 0.5:  # Ne montrer que si la confiance est raisonnable
                summary_parts.append(f"(Niveau de confiance de l'analyse : {confidence*100:.0f}%)")
            
            # Retourner le tout avec des sauts de ligne
            return "\n\n".join(summary_parts) if summary_parts else "Résumé non disponible"
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération du résumé: {e}")
            return "Résumé temporairement indisponible."

    def _extract_detailed_experience(self, text: str) -> str:
        """Extrait les informations d'expérience détaillées"""
        experience_years = self.extract_experience_years(text)
        experience_info = []
        
        # Détection des postes occupés
        job_titles = self._extract_job_titles(text)
        if job_titles:
            experience_info.append(f"Postes récents: {', '.join(job_titles[:3])}")
        
        # Ajout des années d'expérience
        if experience_years > 0:
            experience_info.append(f"Total d'expérience: {experience_years} ans")
        else:
            experience_info.append("Débutant ou expérience non spécifiée")
        
        return ". ".join(experience_info) + "."
    
    def _extract_job_titles(self, text: str) -> list:
        """Extrait les intitulés de poste du CV"""
        job_titles = []
        # Expressions régulières pour détecter les intitulés de poste
        patterns = [
            r"(?:Développeur|Ingénieur|Chef de projet|Consultant|Technicien)\s+\w+",
            r"\b(?:Senior|Junior|Lead|Architecte)\s+\w+",
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            job_titles.extend([m.strip() for m in matches if len(m) > 5])
        
        return list(dict.fromkeys(job_titles))  # Supprime les doublons
    
    def _extract_education(self, text: str) -> str:
        """Extrait les informations de formation"""
        education_keywords = [
            "diplôme", "licence", "master", "doctorat", "ingénieur", "bac", "bts", "dut",
            "formation", "école", "université", "études", "graduation"
        ]
        
        education = []
        lines = text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in education_keywords):
                education.append(line.strip())
        
        return "\n".join(education[:3]) if education else "Formation non spécifiée"
    
    def _extract_projects(self, text: str) -> str:
        """Extrait les projets mentionnés dans le CV"""
        project_keywords = ["projet", "réalisation", "mission", "expérience", "cas pratique"]
        projects = []
        lines = text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in project_keywords):
                projects.append(f"- {line.strip()}")
        
        return "\n".join(projects[:3]) if projects else "Aucun projet spécifié"

    def predict_job_category(self, text: str) -> Tuple[str, float]:
        """
        Prédit la catégorie d'emploi à partir d'un texte de CV ou d'offre d'emploi
        
        Args:
            text: Texte à analyser (CV ou offre d'emploi)
            
        Returns:
            Tuple[str, float]: (Catégorie d'emploi prédite, Niveau de confiance 0-1)
        """
        if not text or not isinstance(text, str):
            return "Inconnu", 0.0
            
        # Liste des catégories possibles (à adapter selon vos besoins)
        categories = [
            "Développement", "Réseau et sécurité", "Data Science", 
            "DevOps", "Design", "Marketing", "Ventes", "Ressources Humaines"
        ]
        
        # Si le modèle ML est disponible, l'utiliser pour la prédiction
        if hasattr(self, 'ml_matcher') and self.ml_matcher is not None:
            try:
                # Utiliser le modèle pour prédire la catégorie
                category, confidence = self.ml_matcher.predict_category(text)
                if category:
                    return str(category), float(confidence)
            except Exception as e:
                logger.error(f"Erreur lors de la prédiction de catégorie: {e}")
                logger.error(f"Type d'erreur: {type(e).__name__}", exc_info=True)
        
        # Méthode de repli basée sur des mots-clés avec une confiance plus faible
        text_lower = text.lower()
        if any(word in text_lower for word in ["devops", "deploy", "ci/cd", "aws", "azure", "docker", "kubernetes"]):
            return "DevOps", 0.7
        elif any(word in text_lower for word in ["data", "machine learning", "ai", "intelligence artificielle"]):
            return "Data Science", 0.7
        elif any(word in text_lower for word in ["frontend", "front-end", "react", "angular", "vue", "javascript"]):
            return "Développement Frontend", 0.7
        elif any(word in text_lower for word in ["backend", "back-end", "node", "django", "spring", ".net"]):
            return "Développement Backend", 0.7
        elif any(word in text_lower for word in ["réseau", "sécurité", "cybersécurité", "admin système"]):
            return "Réseau et sécurité", 0.7
            
        return "Autre", 0.5

    def rank_cvs(self, cvs_data: List[Dict], job_description: str) -> List[Dict]:
        """
        Classe plusieurs CVs par rapport à une offre
        
        Args:
            cvs_data: Liste de dictionnaires [{'id': 1, 'text': '...'}, ...]
            job_description: Texte de l'offre d'emploi
            
        Returns:
            Liste triée par score décroissant
        """
        results = []
        
        for cv_data in cvs_data:
            cv_id = cv_data.get('id')
            cv_text = cv_data.get('text', '')
            
            if not cv_text:
                continue
                
            # Analyser ce CV
            analysis = self.analyze(cv_text, job_description)
            
            results.append({
                'cv_id': cv_id,
                'match_score': analysis['match_score'],
                'job_category': analysis['job_category'],
                'category_confidence': analysis['category_confidence'],
                'matched_skills': analysis['matched_skills'],
                'missing_skills': analysis['missing_skills'],
                'analysis_summary': analysis['analysis_summary']
            })
        
        # Trier par score décroissant
        results.sort(key=lambda x: x['match_score'], reverse=True)
        
        return results