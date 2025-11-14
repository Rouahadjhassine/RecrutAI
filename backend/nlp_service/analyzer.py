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

    def summarize_cv(self, cv_text: str) -> str:
        """Génère un résumé du CV"""
        if not cv_text:
            return "Aucun contenu à résumer."
        
        # Prédire la catégorie si ML disponible
        if self.ml_matcher:
            category, confidence = self.predict_job_category(cv_text)
            category_info = f"Catégorie prédite: {category} ({confidence:.1f}% de confiance). "
        else:
            category_info = ""
        
        # Extraire l'expérience
        experience = self.extract_experience_years(cv_text)
        
        # Extraire les compétences principales
        skills = self.extract_skills(cv_text)
        top_skills = sorted(skills.items(), key=lambda x: x[1], reverse=True)[:5]
        
        experience_info = f"{experience} ans d'expérience. " if experience > 0 else "Expérience non spécifiée. "
        skills_info = f"Compétences: {', '.join([s[0] for s in top_skills])}." if top_skills else "Aucune compétence détectée."
        
        return category_info + experience_info + skills_info

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