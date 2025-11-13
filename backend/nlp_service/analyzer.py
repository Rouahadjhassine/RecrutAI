# nlp_service/ml_analyzer.py
"""
Analyseur CV-Offre avec modèle ML pré-entraîné (Sentence-BERT)
Compatible avec les modèles Kaggle et HuggingFace
"""

import spacy
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer, util
import numpy as np
import re
from typing import Dict, List, Tuple
import logging
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MLCVAnalyzer:
    """
    Analyseur avancé avec Sentence-BERT pour matching sémantique
    Modèle téléchargeable depuis HuggingFace ou Kaggle
    """
    
    def __init__(self, model_name='paraphrase-multilingual-MiniLM-L12-v2'):
        """
        Args:
            model_name: Nom du modèle SBERT
                - 'paraphrase-multilingual-MiniLM-L12-v2' (multilingue, léger)
                - 'all-MiniLM-L6-v2' (anglais, très rapide)
                - 'all-mpnet-base-v2' (anglais, meilleur qualité)
        """
        try:
            # Charger modèle SBERT
            self.sbert_model = SentenceTransformer(model_name)
            logger.info(f"Modèle SBERT '{model_name}' chargé avec succès")
            
            # Charger spaCy pour extraction
            self.nlp = spacy.load("fr_core_news_sm")
            logger.info("spaCy chargé avec succès")
            
        except Exception as e:
            logger.error(f"Erreur chargement modèle : {e}")
            raise Exception(
                "Installation requise : pip install sentence-transformers torch"
            )
        
        # Stopwords français
        self.stopwords = set(spacy.lang.fr.stop_words.STOP_WORDS)
        self.stopwords.update([
            'expérience', 'compétence', 'formation', 'diplôme', 
            'année', 'mois', 'cv', 'curriculum', 'vitae'
        ])
        
        # Compétences techniques étendues
        self.tech_keywords = self._load_tech_keywords()
    
    def _load_tech_keywords(self) -> List[str]:
        """Charge une liste exhaustive de compétences techniques"""
        return [
            # Langages de programmation
            'python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 
            'rust', 'kotlin', 'swift', 'typescript', 'scala', 'r',
            
            # Frameworks Web
            'react', 'angular', 'vue.js', 'django', 'flask', 'fastapi', 'node.js',
            'express', 'spring boot', 'laravel', 'symfony', 'rails',
            
            # Data Science / ML
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
            'matplotlib', 'seaborn', 'nltk', 'spacy', 'huggingface', 'transformers',
            'machine learning', 'deep learning', 'nlp', 'computer vision',
            
            # Bases de données
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'cassandra', 'oracle', 'sqlite', 'neo4j',
            
            # DevOps / Cloud
            'docker', 'kubernetes', 'jenkins', 'gitlab ci', 'github actions',
            'aws', 'azure', 'gcp', 'terraform', 'ansible',
            
            # Méthodologies
            'agile', 'scrum', 'kanban', 'ci/cd', 'tdd', 'bdd',
            
            # APIs et Architecture
            'rest', 'graphql', 'microservices', 'api', 'websocket', 'grpc',
            
            # Frontend
            'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material ui',
            'webpack', 'vite', 'nextjs', 'gatsby',
            
            # Autres
            'git', 'github', 'gitlab', 'linux', 'bash', 'powershell'
        ]
    
    # ============================================
    # EXTRACTION PDF
    # ============================================
    
    def extract_text_from_pdf(self, pdf_file) -> str:
        """Extrait texte d'un PDF"""
        try:
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + " "
            return self._clean_text(text)
        except Exception as e:
            logger.error(f"Erreur extraction PDF : {e}")
            return ""
    
    def _clean_text(self, text: str) -> str:
        """Nettoie le texte"""
        text = text.lower()
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\.\,\;\:\-]', ' ', text)
        text = re.sub(r'\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b', ' ', text)
        text = re.sub(r'\b\d{10,}\b', ' ', text)
        return text.strip()
    
    # ============================================
    # EXTRACTION FEATURES
    # ============================================
    
    def extract_skills(self, text: str) -> List[str]:
        """Extrait compétences techniques"""
        text_lower = text.lower()
        found = []
        for skill in self.tech_keywords:
            if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
                found.append(skill.capitalize())
        return list(set(found))  # Déduplique
    
    def extract_experience_years(self, text: str) -> int:
        """Extrait années d'expérience"""
        patterns = [
            r'(\d+)\+?\s*(?:ans?|années?)\s+(?:d\'?expérience|d\'?exp\.)',
            r'expérience\s*[:\-\–]\s*(\d+)\+?\s*(?:ans?|années?)',
            r'(\d+)\+?\s*(?:years?)\s+of\s+experience',
        ]
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return int(match.group(1))
        return 0
    
    def extract_education(self, text: str) -> List[str]:
        """Extrait diplômes"""
        degrees = ['master', 'licence', 'doctorat', 'phd', 'mba', 'bac', 
                   'bachelor', 'ingénieur', 'diplôme']
        found = []
        text_lower = text.lower()
        for degree in degrees:
            if degree in text_lower:
                found.append(degree.capitalize())
        return list(set(found))
    
    # ============================================
    # MATCHING ML avec SBERT
    # ============================================
    
    def calculate_compatibility(
        self,
        cv_text: str,
        job_description: str
    ) -> Tuple[float, List[str], List[str]]:
        """
        Calcule compatibilité avec Sentence-BERT
        Retourne : (score, matched_keywords, missing_keywords)
        """
        if not cv_text.strip() or not job_description.strip():
            return 0.0, [], []
        
        cv_clean = self._clean_text(cv_text)
        job_clean = self._clean_text(job_description)
        
        # ===== 1. SBERT EMBEDDINGS (Cœur du ML) =====
        cv_embedding = self.sbert_model.encode(cv_clean, convert_to_tensor=True)
        job_embedding = self.sbert_model.encode(job_clean, convert_to_tensor=True)
        
        # Similarité cosinus
        sbert_score = float(util.cos_sim(cv_embedding, job_embedding)[0][0])
        
        # ===== 2. KEYWORD MATCHING (Complément) =====
        job_keywords = self.extract_skills(job_clean)
        cv_keywords = self.extract_skills(cv_clean)
        
        matched = [kw for kw in job_keywords if kw.lower() in [k.lower() for k in cv_keywords]]
        missing = [kw for kw in job_keywords if kw.lower() not in [k.lower() for k in cv_keywords]]
        
        # Bonus si beaucoup de keywords matchent
        keyword_bonus = len(matched) / max(len(job_keywords), 1) * 0.15
        
        # ===== 3. SCORE FINAL PONDÉRÉ =====
        # 85% SBERT (ML) + 15% keywords
        final_score = min((sbert_score * 0.85 + keyword_bonus) * 100, 100)
        final_score = round(final_score, 2)
        
        logger.info(f"Scores - SBERT: {sbert_score:.2f}, Keywords: {len(matched)}/{len(job_keywords)}, Final: {final_score}%")
        
        return final_score, matched, missing
    
    # ============================================
    # RÉSUMÉ INTELLIGENT avec spaCy
    # ============================================
    
    def summarize_cv(self, cv_text: str, max_sentences: int = 4) -> str:
        """Génère un résumé intelligent du CV"""
        if not cv_text.strip():
            return "Aucun contenu à résumer."
        
        doc = self.nlp(cv_text[:1_000_000])
        sentences = [sent.text.strip() for sent in doc.sents if len(sent.text) > 30][:25]
        
        if not sentences:
            return "Résumé non disponible."
        
        # Score par densité de mots-clés techniques
        scored_sentences = []
        for sent in sentences:
            sent_lower = sent.lower()
            keyword_count = sum(1 for kw in self.tech_keywords if kw.lower() in sent_lower)
            action_verbs = ['développé', 'conçu', 'créé', 'géré', 'mis en place', 'optimisé']
            action_count = sum(1 for verb in action_verbs if verb in sent_lower)
            score = keyword_count * 2 + action_count
            scored_sentences.append((score, sent))
        
        scored_sentences.sort(reverse=True)
        summary_sentences = [s[1] for s in scored_sentences[:max_sentences]]
        summary = ". ".join(summary_sentences)
        
        return summary + ("." if not summary.endswith('.') else "")
    
    # ============================================
    # ANALYSE D'UN SEUL CV
    # ============================================
    
    def analyze(self, cv_text: str, job_description: str) -> Dict:
        """
        Analyse un CV par rapport à une offre d'emploi
        Args:
            cv_text: Texte extrait du CV
            job_description: Description de l'offre d'emploi
        Returns:
            Dictionnaire contenant les résultats de l'analyse
        """
        if not cv_text or not job_description:
            return {
                'match_score': 0,
                'missing_skills': [],
                'analysis_summary': 'Erreur: CV ou offre d\'emploi vide',
                'cv_skills': [],
                'job_skills': []
            }
        
        try:
            # 1. Calculer la compatibilité globale
            match_score, matched_skills, missing_skills = self.calculate_compatibility(
                cv_text, job_description
            )
            
            # 2. Extraire les compétences
            cv_skills = self.extract_skills(cv_text)
            job_skills = self.extract_skills(job_description)
            
            # 3. Générer un résumé
            summary = self.summarize_cv(cv_text)
            
            return {
                'match_score': match_score,
                'missing_skills': missing_skills,
                'analysis_summary': summary,
                'cv_skills': cv_skills,
                'job_skills': job_skills,
                'matched_skills': matched_skills
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse: {str(e)}", exc_info=True)
            return {
                'match_score': 0,
                'missing_skills': [],
                'analysis_summary': f"Erreur lors de l'analyse: {str(e)}",
                'cv_skills': [],
                'job_skills': []
            }
    
    # ============================================
    # CLASSEMENT MULTIPLE
    # ============================================
    
    def rank_cvs(
        self,
        cvs_data: List[Dict],
        job_description: str
    ) -> List[Dict]:
        """
        Classe plusieurs CVs par compatibilité
        Args:
            cvs_data: [{'id': 1, 'text': '...'}, ...]
        Returns:
            Liste triée par score décroissant
        """
        results = []
        for cv in cvs_data:
            score, matched, missing = self.calculate_compatibility(
                cv['text'], 
                job_description
            )
            results.append({
                'cv_id': cv['id'],
                'score': score,
                'matched_keywords': matched,
                'missing_keywords': missing
            })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)


# ============================================
# FONCTION D'INITIALISATION
# ============================================

def get_analyzer(model_name='paraphrase-multilingual-MiniLM-L12-v2'):
    """
    Retourne une instance de l'analyseur ML
    Usage: analyzer = get_analyzer()
    """
    return MLCVAnalyzer(model_name=model_name)