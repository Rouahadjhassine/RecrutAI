# nlp_service/analyzer.py
import spacy
from PyPDF2 import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re
from typing import List, Tuple, Dict
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CVAnalyzer:
    """
    Analyse avancée de CVs avec NLP (spaCy + embeddings + TF-IDF)
    """
    def __init__(self):
        try:
            self.nlp = spacy.load("fr_core_news_sm")
            logger.info("Modèle spaCy 'fr_core_news_sm' chargé avec succès.")
        except OSError:
            raise Exception(
                "Modèle spaCy 'fr_core_news_sm' non trouvé. "
                "Exécutez : python -m spacy download fr_core_news_sm"
            )

        # Stopwords étendus
        self.stopwords = set(spacy.lang.fr.stop_words.STOP_WORDS)
        self.stopwords.update([
            'expérience', 'compétence', 'formation', 'diplôme', 'année', 'mois',
            'de', 'le', 'la', 'et', 'à', 'du', 'des', 'un', 'une', 'dans', 'pour',
            'avec', 'sur', 'par', 'en', 'au', 'aux', 'les', 'qui', 'que', 'ou'
        ])

        # Compétences techniques (à étendre selon besoin)
        self.tech_keywords = [
            'python', 'javascript', 'java', 'react', 'django', 'flask', 'node.js', 'angular',
            'vue.js', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp', 'git', 'github', 'gitlab', 'ci/cd', 'agile', 'scrum',
            'api', 'rest', 'graphql', 'machine learning', 'deep learning', 'nlp', 'tensorflow',
            'pytorch', 'pandas', 'numpy', 'scikit-learn', 'html', 'css', 'bootstrap', 'tailwind'
        ]

    def extract_text_from_pdf(self, pdf_file) -> str:
        """
        Extrait le texte brut d'un PDF
        """
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
        """
        Nettoie et normalise le texte
        """
        text = text.lower()
        text = re.sub(r'\s+', ' ', text)  # Espaces multiples
        text = re.sub(r'[^\w\s\.\,\;\:\!\?\(\)\[\]\{\}\-]', ' ', text)  # Caractères spéciaux
        text = re.sub(r'\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b', ' ', text)  # Dates
        text = re.sub(r'\b\d{10,}\b', ' ', text)  # Numéros longs (téléphone, etc.)
        return text.strip()

    def extract_skills(self, text: str) -> List[str]:
        """
        Extrait les compétences techniques du texte
        """
        text_lower = text.lower()
        found = []
        for skill in self.tech_keywords:
            if re.search(r'\b' + re.escape(skill.lower()) + r'\b', text_lower):
                found.append(skill.capitalize())
        return found

    def extract_experience_years(self, text: str) -> int:
        """
        Extrait le nombre d'années d'expérience
        """
        patterns = [
            r'(\d+)\+?\s*(?:ans?|années?)\s+(?:d\'?expérience|d\'?exp\.)',
            r'expérience\s*[:\-\–]\s*(\d+)\+?\s*(?:ans?|années?)',
            r'(\d+)\+?\s*(?:years?|ans?)\s+of\s+experience',
            r'(\d+)\+?\s*(?:ans?|années?)\s+d\'?expérience',
        ]
        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                return int(match.group(1))
        return 0

    def calculate_compatibility(
        self,
        cv_text: str,
        job_description: str
    ) -> Tuple[float, List[str], List[str]]:
        """
        Calcule le score de compatibilité entre CV et offre
        Retourne : (score, matched_keywords, missing_keywords)
        """
        if not cv_text.strip() or not job_description.strip():
            return 0.0, [], []

        cv_clean = self._clean_text(cv_text)
        job_clean = self._clean_text(job_description)

        # 1. Embeddings spaCy
        cv_doc = self.nlp(cv_clean[:1_000_000])  # Limite spaCy
        job_doc = self.nlp(job_clean[:1_000_000])

        cv_vec = cv_doc.vector if cv_doc.has_vector and cv_doc.vector_norm else np.zeros(300)
        job_vec = job_doc.vector if job_doc.has_vector and job_doc.vector_norm else np.zeros(300)

        embedding_score = 0.0
        if np.any(cv_vec) and np.any(job_vec):
            embedding_score = float(cosine_similarity([cv_vec], [job_vec])[0][0])

        # 2. TF-IDF sur mots-clés + bigrams
        vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words=list(self.stopwords),
            ngram_range=(1, 2),
            lowercase=True
        )
        try:
            tfidf_matrix = vectorizer.fit_transform([cv_clean, job_clean])
            tfidf_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except:
            tfidf_score = 0.0

        # 3. Score final pondéré
        final_score = round((embedding_score * 0.65 + tfidf_score * 0.35) * 100, 2)

        # 4. Mots-clés matchés
        job_keywords = self.extract_skills(job_clean)
        cv_keywords = self.extract_skills(cv_clean)

        matched = [kw for kw in job_keywords if kw.lower() in [k.lower() for k in cv_keywords]]
        missing = [kw for kw in job_keywords if kw.lower() not in [k.lower() for k in cv_keywords]]

        return final_score, matched, missing

    def summarize_cv(self, cv_text: str, max_sentences: int = 4) -> str:
        """
        Génère un résumé intelligent du CV
        """
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
            # Bonus pour les verbes d'action
            action_verbs = ['développé', 'conçu', 'mis en place', 'géré', 'optimisé', 'créé']
            action_count = sum(1 for verb in action_verbs if verb in sent_lower)
            score = keyword_count * 2 + action_count
            scored_sentences.append((score, sent))

        # Trier et prendre les meilleures
        scored_sentences.sort(reverse=True)
        summary_sentences = [s[1] for s in scored_sentences[:max_sentences]]
        summary = ". ".join(summary_sentences)

        return summary + ("." if not summary.endswith('.') else "")

    def rank_cvs(
        self,
        cvs_data: List[Dict],
        job_description: str
    ) -> List[Dict]:
        """
        Classe plusieurs CVs par compatibilité
        """
        results = []
        for cv in cvs_data:
            score, matched, missing = self.calculate_compatibility(cv['text'], job_description)
            results.append({
                'cv_id': cv['id'],
                'score': score,
                'matched_keywords': matched,
                'missing_keywords': missing
            })
        return sorted(results, key=lambda x: x['score'], reverse=True)