from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import spacy

class CVAnalyzer:
    def __init__(self):
        self.nlp = spacy.load('fr_core_news_sm')
        self.vectorizer = TfidfVectorizer(max_features=5000)
    
    def extract_text_from_pdf(self, file_path):
        """Extraire du texte PDF (PyPDF2 ou pdfplumber)"""
        # Implémentation
        pass
    
    def parse_cv(self, text):
        """Parser le CV pour extraire: nom, email, skills, expérience"""
        doc = self.nlp(text)
        result = {
            'entities': self._extract_entities(doc),
            'skills': self._extract_skills(text),
            'experience_years': self._estimate_experience(text),
            'languages': self._detect_languages(text)
        }
        return result
    
    def calculate_compatibility(self, cv_text, job_description):
        """Calculer le score de compatibilité (0-100)"""
        texts = [cv_text.lower(), job_description.lower()]
        matrix = self.vectorizer.fit_transform(texts)
        similarity = cosine_similarity(matrix)[0][1]
        return round(similarity * 100, 2)
    
    def extract_keywords(self, text1, text2):
        """Extraire les keywords communs"""
        vectorizer = TfidfVectorizer(max_features=50)
        tfidf = vectorizer.fit_transform([text1, text2])
        feature_names = vectorizer.get_feature_names_out()
        # Retourner keywords avec scores
        pass
    
    def rank_cvs(self, cvs_texts, job_description):
        """Classer plusieurs CVs par compatibilité"""
        scores = [
            {'cv_id': i, 'score': self.calculate_compatibility(cv, job_description)}
            for i, cv in enumerate(cvs_texts)
        ]
        return sorted(scores, key=lambda x: x['score'], reverse=True)

    def _extract_skills(self, text):
        """Extraire les compétences techniques"""
        skills_list = ['Python', 'JavaScript', 'React', 'Django', 'AWS', 'Docker']
        found = [s for s in skills_list if s.lower() in text.lower()]
        return found
    
    def _extract_entities(self, doc):
        """Utiliser spaCy pour NER (Named Entity Recognition)"""
        return [(ent.text, ent.label_) for ent in doc.ents]
    
    def _estimate_experience(self, text):
        """Estimer années d'expérience"""
        pattern = r'(\d+)\s*(?:ans?|years?)\s+(?:d\')?expérience'
        matches = re.findall(pattern, text, re.IGNORECASE)
        return max([int(m) for m in matches]) if matches else 0
    
    def _detect_languages(self, text):
        """Détecter les langues parlées"""
        # Utiliser textblob ou langdetect
        pass