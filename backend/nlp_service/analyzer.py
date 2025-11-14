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
        """Extrait le texte d'un PDF"""
        try:
            text = ""
            
            if hasattr(pdf_file, 'read'):
                pdf_file.seek(0)
                reader = PdfReader(pdf_file)
            else:
                reader = PdfReader(pdf_file)
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if not text.strip():
                logger.warning("Aucun texte extrait du PDF")
                return ""
                
            logger.info(f"Texte PDF extrait: {len(text)} caractères")
            return text
            
        except Exception as e:
            logger.error(f"Erreur extraction PDF: {e}")
            return ""

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
            r'(\d+)\+?\s*(?:ans?|années?)\s+(?:d\'?expérience|d\'?exp)',
            r'expérience\s*[:\-]\s*(\d+)\+?\s*(?:ans?|années?)',
            r'(\d+)\+?\s*(?:years?)\s+of\s+experience',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                try:
                    years = max(int(y) for y in matches if y.isdigit())
                    return years
                except (ValueError, TypeError):
                    continue
        
        return 0

    def calculate_compatibility(self, cv_text: str, job_description: str) -> Tuple[float, List[str], List[str]]:
        """Calcule la compatibilité entre CV et offre"""
        logger.info("🎯 Début du calcul de compatibilité")
        
        if not cv_text or not job_description:
            return 0.0, [], []
        
        try:
            # 1. Utiliser le modèle ML si disponible (60% du score)
            ml_score = 0
            if self.ml_matcher:
                try:
                    ml_score = self.ml_matcher.calculate_match_score(cv_text, job_description)
                    logger.info(f"🤖 Score ML: {ml_score}%")
                except Exception as e:
                    logger.warning(f"Erreur modèle ML: {e}")
                    ml_score = 0
            
            # 2. Analyse basique avec le dataset (40% du score)
            cv_clean = self._clean_text(cv_text)
            job_clean = self._clean_text(job_description)
            
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
            
            # 3. Score final combiné
            final_score = ml_score * 0.6 + basic_score
            final_score = min(final_score, 100)
            
            # Variation pour éviter les scores identiques
            import hashlib
            content_hash = int(hashlib.md5(cv_text.encode()).hexdigest()[:8], 16)
            variation = (content_hash % 100) * 0.001
            final_score += variation
            final_score = round(final_score, 2)
            
            logger.info(f"🎯 Score final: {final_score}% (ML: {ml_score}%, Basique: {basic_score}%)")
            
            return final_score, matched_skills, missing_skills
            
        except Exception as e:
            logger.error(f"Erreur dans calculate_compatibility: {e}")
            return 0.0, [], []

    def predict_job_category(self, cv_text: str) -> Tuple[str, float]:
        """Prédit la catégorie d'emploi avec le modèle ML"""
        if not self.ml_matcher or not cv_text:
            return "Non déterminé", 0.0
        
        try:
            category, confidence = self.ml_matcher.predict_category(cv_text)
            return category, confidence * 100  # Convertir en pourcentage
        except Exception as e:
            logger.error(f"Erreur prédiction catégorie: {e}")
            return "Erreur", 0.0

    def analyze(self, cv_text: str, job_description: str) -> Dict:
        """Analyse complète d'un CV par rapport à une offre"""
        # Calcul du score de compatibilité
        score, matched, missing = self.calculate_compatibility(cv_text, job_description)
        
        # Prédiction de la catégorie avec ML
        category, confidence = self.predict_job_category(cv_text)
        
        # Extraction des compétences
        cv_skills = self.extract_skills(cv_text)
        job_skills = self.extract_skills(job_description)
        
        # Résumé
        summary = self.summarize_cv(cv_text)
        
        return {
            'match_score': score,
            'matched_skills': matched,
            'missing_skills': missing,
            'cv_skills': cv_skills,
            'job_skills': job_skills,
            'job_category': category,
            'category_confidence': confidence,
            'analysis_summary': summary,
            'ml_model_used': self.ml_matcher is not None
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