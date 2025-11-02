from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import spacy

class CVAnalyzer:
    def __init__(self):
        # Charger spaCy (ou utiliser sans si pas installé)
        try:
            self.nlp = spacy.load('en_core_web_sm')
        except:
            self.nlp = None
        
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def extract_text_from_pdf(self, pdf_file):
        """Extraire texte d'un PDF"""
        import PyPDF2
        import io
        
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_file.read()))
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    
    def calculate_compatibility(self, cv_text, job_description):
        """
        Calcule la compatibilité entre CV et offre
        Returns: (score, matched_keywords, missing_keywords)
        """
        cv_clean = cv_text.lower()
        job_clean = job_description.lower()
        
        # 1. Calcul TF-IDF + Cosine Similarity
        try:
            tfidf_matrix = self.vectorizer.fit_transform([cv_clean, job_clean])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            score = round(similarity * 100, 2)
        except:
            score = 0.0
        
        # 2. Extraction des mots-clés techniques
        tech_keywords = self._get_tech_keywords()
        
        matched = []
        missing = []
        
        for keyword in tech_keywords:
            kw_lower = keyword.lower()
            if kw_lower in job_clean:
                if kw_lower in cv_clean:
                    matched.append(keyword)
                else:
                    missing.append(keyword)
        
        return score, matched, missing
    
    def _get_tech_keywords(self):
        """Liste des compétences techniques à détecter"""
        return [
            # Languages
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
            'TypeScript', 'Swift', 'Kotlin', 'R', 'Scala',
            
            # Frontend
            'React', 'Angular', 'Vue.js', 'Next.js', 'Redux', 'HTML', 'CSS', 'Sass',
            'Tailwind', 'Bootstrap', 'jQuery',
            
            # Backend
            'Django', 'Flask', 'FastAPI', 'Node.js', 'Express', 'Spring Boot',
            'Laravel', 'Ruby on Rails', '.NET',
            
            # Database
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite',
            'Oracle', 'SQL Server', 'Cassandra',
            
            # DevOps & Cloud
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'GitLab CI',
            'GitHub Actions', 'Terraform', 'Ansible',
            
            # Data & AI
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
            'Pandas', 'NumPy', 'NLP', 'Computer Vision',
            
            # Tools
            'Git', 'Linux', 'Agile', 'Scrum', 'REST API', 'GraphQL', 'Microservices',
            'CI/CD', 'Testing', 'Jest', 'Pytest'
        ]
    
    def rank_cvs(self, cvs_data, job_description):
        """
        Classe plusieurs CVs par compatibilité
        cvs_data: [{'id': 1, 'text': 'cv content'}, ...]
        Returns: Liste triée par score décroissant
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
        
        # Trier par score décroissant
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results
    
    def summarize_cv(self, cv_text, max_sentences=5):
        """
        Résumé extractif d'un CV
        """
        # Simple : prendre les phrases contenant le plus de mots-clés
        sentences = cv_text.split('.')
        tech_keywords = self._get_tech_keywords()
        
        # Scorer chaque phrase
        scored_sentences = []
        for sentence in sentences[:20]:  # Limite aux 20 premières phrases
            sentence = sentence.strip()
            if len(sentence) < 20:
                continue
            
            score = sum(1 for kw in tech_keywords if kw.lower() in sentence.lower())
            scored_sentences.append((score, sentence))
        
        # Prendre les top phrases
        scored_sentences.sort(reverse=True)
        summary = '. '.join([s[1] for s in scored_sentences[:max_sentences]]) + '.'
        
        return summary
    
    def extract_experience_years(self, cv_text):
        """Extraire le nombre d'années d'expérience"""
        patterns = [
            r'(\d+)\+?\s*(?:years?|ans?)\s+(?:of\s+)?(?:experience|expérience)',
            r'(?:experience|expérience)\s*:\s*(\d+)\+?\s*(?:years?|ans?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, cv_text.lower())
            if match:
                return int(match.group(1))
        
        return 0
    
    def extract_skills(self, cv_text):
        """Extraire les compétences du CV"""
        tech_keywords = self._get_tech_keywords()
        found_skills = []
        
        cv_lower = cv_text.lower()
        for skill in tech_keywords:
            if skill.lower() in cv_lower:
                found_skills.append(skill)
        
        return found_skills