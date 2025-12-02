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
        if not skill or len(skill) < 2 or len(skill) > 50:
            return False
        
        # Mots non pertinents à exclure
        excluded_words = {
            # Mots généraux
            'and', 'or', 'the', 'a', 'an', 'with', 'using', 'knowledge', 'experience',
            'good', 'strong', 'excellent', 'basic', 'advanced', 'level', 'years', 'year',
            'skills', 'skill', 'proficient', 'familiar', 'knowledgeable', 'working',
            'knowledge', 'experience', 'experienced', 'inter', 'digital', 'retour',
            'résultats', 'analyse', 'score', 'correspondance', 'votre', 'cv', 'offre',
            'compétences', 'améliorer', 'résumé', 'profil', 'développement', 'logiciel',
            'ans', 'expérience', 'professionnelle', 'clés', 'confiance', 'analyse',
            'travail', 'équipe', 'autonome', 'capacité', 'dynamique', 'motivé',
            'rigoureux', 'créatif', 'force', 'proposition', 'relation', 'client',
            'esprit', 'synthèse', 'curiosité', 'méthode', 'anglais', 'français',
            'lu', 'écrit', 'parlé', 'niveau', 'intermédiaire', 'avancé', 'débutant',
            'expert', 'maîtrise', 'notions', 'connaissance', 'connaissances'
        }
        
        # Vérifier si le mot est dans la liste noire
        if skill.lower() in excluded_words:
            return False
            
        # Exclure les mots trop courts (moins de 3 caractères) sauf acronymes connus
        if len(skill) < 3 and not skill.isupper():
            return False
            
        # Exclure les mots qui sont des nombres seuls
        if skill.replace('.', '').isdigit():
            return False
            
        # Exclure les mots qui ne contiennent que des lettres et sont trop courts
        if skill.isalpha() and len(skill) < 4 and not skill.isupper():
            return False
            
        # Exclure les mots qui contiennent des chiffres mais pas de lettres
        if any(c.isdigit() for c in skill) and not any(c.isalpha() for c in skill):
            return False
            
        # Liste des préfixes/suffixes à exclure
        invalid_prefixes_suffixes = {
            'de ', 'des ', 'du ', 'le ', 'la ', 'les ', 'un ', 'une ', 'au ', 'aux ',
            'en ', 'pour ', 'par ', 'dans ', 'sur ', 'avec ', 'sans ', 'sous ', 'vers ',
            'depuis ', 'jusqu\'au ', 'jusqu\'à ', 'dès ', 'chez ', 'contre ', 'd\'',
            'l\''
        }
        
        # Vérifier les préfixes/suffixes invalides
        skill_lower = skill.lower()
        for prefix in invalid_prefixes_suffixes:
            if skill_lower.startswith(prefix) or skill_lower.endswith(prefix.strip()):
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
        """
        Extrait les années d'expérience à partir du texte du CV avec une détection avancée.
        Prend en compte les formats variés et les plages de dates.
        """
        if not text:
            return 0
            
        text_lower = text.lower()
        
        # 1. Détection des motifs directs d'expérience
        experience_patterns = [
            # Format: "X ans d'expérience" (avec variantes)
            r'(\d+\+?)\s*(?:ans?|années?|years?)(?:\s+d[\'\s]?expérience|\s+expérience|\s+of\s+experience)?',
            # Format: "Expérience: X ans"
            r'expérience\s*[\-:]\s*(\d+\+?)\s*(?:ans?|années?|years?)',
            # Format: "Plus de X ans d'expérience"
            r'(?:plus\s+de|plus\s+d[\'\s]|>)\s*(\d+)\s*(?:ans?|années?|years?)',
            # Format: "Expérience professionnelle: X ans"
            r'expérience\s+(?:professionnelle|professionnel|en entreprise)?\s*[\-:]?\s*(\d+\+?)\s*(?:ans?|années?|years?)',
            # Format: "X années d'expérience dans le domaine"
            r'(\d+)\s*(?:ans?|années?|years?)\s*(?:d[\'\s]?expérience|d[\'\s]?exp)',
            # Format: "X ans dans le développement"
            r'(\d+)\s*(?:ans?|années?|years?)(?:\s+de\s+\w+)?\s+dans',
            # Format: "X ans en tant que développeur"
            r'(\d+)\s*(?:ans?|années?|years?)\s+(?:en\s+)?(?:tant que\s+)?\w+',
            # Format: "Expérience totale: X ans"
            r'expérience\s+(?:totale|cumulée|globale)\s*[\-:]?\s*(\d+\+?)\s*(?:ans?|années?|years?)',
            # Format: "X+ années d'expérience pertinente"
            r'(\d+\+?)\s*(?:ans?|années?|years?)\s+d[\'\s]?expérience\s+(?:pertinente|professionnelle|en entreprise)',
            # Format: "J'ai X ans d'expérience"
            r'(?:je\s+suis|j[\'\s]ai)\s+\w*\s*(?:depuis|pendant|avec)\s*(\d+)\s*(?:ans?|années?|years?)'
        ]
        
        years_found = []
        
        # 2. Recherche des motifs directs d'expérience
        for pattern in experience_patterns:
            try:
                matches = re.finditer(pattern, text_lower)
                for match in matches:
                    years_str = match.group(1) if match.groups() else match.group(0)
                    if years_str:
                        try:
                            years = int(''.join(filter(str.isdigit, str(years_str))))
                            if 0 < years < 50:  # Vérification de la plage raisonnable
                                years_found.append(years)
                                # Si c'est une plage (ex: 3-5 ans), on prend la borne supérieure
                                if '-' in years_str:
                                    parts = years_str.split('-')
                                    if len(parts) == 2 and parts[1].isdigit():
                                        years_found.append(int(parts[1]))
                        except (ValueError, TypeError):
                            continue
            except Exception as e:
                logger.warning(f"Erreur avec le motif {pattern}: {e}")
                continue
        
        # 3. Si aucune année trouvée, chercher des plages de dates d'emploi
        if not years_found:
            # Format des dates: Mois Année - Mois Année
            date_range_patterns = [
                r'(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\d{1,2})[\s\-/,]+(20\d{2})\s*[\-–]\s*(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\d{1,2})?[\s\-/,]+(20\d{2}|(?:présent|now|actuel|current))',
                r'(\d{1,2}[/-]\d{4})\s*[\-–]\s*(\d{1,2}[/-]\d{4}|(?:présent|now|actuel|current))',
                r'(20\d{2})\s*[\-–]\s*(20\d{2}|(?:présent|now|actuel|current))',
                r'(?:depuis|from)\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\d{1,2})[\s\-/,]+(20\d{2})',
                r'(?:since|depuis)\s+(20\d{2})',
                r'(20\d{2})\s*[\-–]\s*(?:présent|now|actuel|current)'
            ]
            
            # Extraire toutes les plages de dates
            date_ranges = []
            for pattern in date_range_patterns:
                try:
                    for match in re.finditer(pattern, text_lower):
                        groups = match.groups()
                        if groups:
                            start_year = None
                            end_year = None
                            
                            # Extraire l'année de début
                            if groups[0]:
                                year_match = re.search(r'(20\d{2})', groups[0])
                                if year_match:
                                    start_year = int(year_match.group(1))
                            
                            # Extraire l'année de fin (peut être "présent" ou une année)
                            if len(groups) > 1 and groups[1]:
                                if groups[1].lower() in ['présent', 'now', 'actuel', 'current']:
                                    end_year = datetime.now().year
                                else:
                                    year_match = re.search(r'(20\d{2})', groups[1])
                                    if year_match:
                                        end_year = int(year_match.group(1))
                            
                            if start_year and end_year and 2000 <= start_year <= end_year <= 2100:
                                date_ranges.append((start_year, end_year))
                except Exception as e:
                    logger.warning(f"Erreur avec le motif de date {pattern}: {e}")
                    continue
            
            # Calculer l'expérience totale à partir des plages de dates
            if date_ranges:
                # Trier par année de début
                date_ranges.sort()
                
                # Fusionner les plages qui se chevauchent
                merged_ranges = []
                for start, end in date_ranges:
                    if not merged_ranges:
                        merged_ranges.append([start, end])
                    else:
                        last_start, last_end = merged_ranges[-1]
                        if start <= last_end + 1:  # +1 pour gérer les chevauchements d'un an
                            merged_ranges[-1] = [last_start, max(last_end, end)]
                        else:
                            merged_ranges.append([start, end])
                
                # Calculer la durée totale d'expérience
                total_years = 0
                for start, end in merged_ranges:
                    total_years += end - start + 1  # +1 car on compte l'année de début
                
                if total_years > 0:
                    years_found.append(total_years)
        
        # 4. Si on a trouvé des années d'expérience, retourner la plus élevée
        if years_found:
            return min(max(years_found), 30)  # Limiter à 30 ans maximum pour éviter les valeurs aberrantes
            
        # 5. Dernier recours : chercher des mentions d'expérience sans nombre spécifique
        experience_indicators = [
            r'expérience\s+(?:professionnelle|en entreprise|dans le domaine)',
            r'expérience\s+de\s+plusieurs\s+années',
            r'expérience\s+significative',
            r'\b(?:expérience|expérimenté|expérimentée|expérimentés|expérimentées)\b',
            r'\b(senior|expérimenté|expérimentée|expérimentés|expérimentées|expert|expérimenter|expérimentant|expérimenta|expérimentai|expérimenterai|expérimenterais|expérimenterais|expérimenterait|expérimenterions|expérimenteriez|expérimenteraient|expérimentassions|expérimentassiez|expérimentassent|expérimentant|expérimenté|expérimentée|expérimentés|expérimentées|expérimenter|expérimentons|expérimentez|expérimentent|expérimenterai|expérimenteras|expérimentera|expérimenterons|expérimenterez|expérimenteront|expérimenterais|expérimenterait|expérimenterions|expérimenteriez|expérimenteraient|expérimente|expérimentes|expérimentent|expérimentions|expérimentiez|expérimentaient|expérimentasse|expérimentasses|expérimentât|expérimentassions|expérimentassiez|expérimentassent|expérimentant|expérimenté|expérimentée|expérimentés|expérimentées|expérimenter|expérimentons|expérimentez|expérimentent|expérimenterai|expérimenteras|expérimentera|expérimenterons|expérimenterez|expérimenteront|expérimenterais|expérimenterait|expérimenterions|expérimenteriez|expérimenteraient|expérimente|expérimentes|expérimentent|expérimentions|expérimentiez|expérimentaient|expérimentasse|expérimentasses|expérimentât|expérimentassions|expérimentassiez|expérimentassent|expérimentant|expérimenté|expérimentée|expérimentés|expérimentées|expérimenter|expérimentons|expérimentez|expérimentent|expérimenterai|expérimenteras|expérimentera|expérimenterons|expérimenterez|expérimenteront|expérimenterais|expérimenterait|expérimenterions|expérimenteriez|expérimenteraient|expérimente|expérimentes|expérimentent|expérimentions|expérimentiez|expérimentaient|expérimentasse|expérimentasses|expérimentât|expérimentassions|expérimentassiez|expérimentassent|expérimentant|expérimenté|expérimentée|expérimentés|expérimentées|expérimenter|expérimentons|expérimentez|expérimentent|expérimenterai|expérimenteras|expérimentera|expérimenterons|expérimenterez|expérimenteront|expérimenterais|expérimenterait|expérimenterions|expérimenteriez|expérimenteraient|expérimente|expérimentes|expérimentent|expérimentions|expérimentiez|expérimentaient|expérimentasse|expérimentasses|expérimentât|expérimentassions|expérimentassiez|expérimentassent)\b',
        ]
        
        for pattern in experience_indicators:
            if re.search(pattern, text_lower):
                return 3  # Valeur par défaut si expérience mentionnée mais pas de durée
        
        return 0  # Aucune expérience détectée

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
            # Nettoyage initial du texte
            clean_cv = self._clean_text(cv_text) if cv_text else ""
            clean_job = self._clean_text(job_description) if job_description else ""
            
            # Extraction des compétences avant le calcul de compatibilité
            try:
                cv_skills = self.extract_skills(clean_cv)
                job_skills = self.extract_skills(clean_job)
                
                # Si pas de compétences trouvées, essayer avec le texte brut
                if not cv_skills and cv_text:
                    cv_skills = self.extract_skills(cv_text.lower())
                if not job_skills and job_description:
                    job_skills = self.extract_skills(job_description.lower())
                    
            except Exception as e:
                logger.error(f"Erreur extraction compétences: {e}")
                cv_skills = {}
                job_skills = {}
            
            # Calcul du score de compatibilité
            score, matched, missing = self.calculate_compatibility(cv_text, job_description, pdf_file)
            
            # Prédiction de la catégorie avec ML et gestion des erreurs
            try:
                category, confidence = self.predict_job_category(clean_cv or cv_text)
                # Si la catégorie est "Non spécifié", essayer avec plus de contexte
                if category == "Non spécifié" and len(clean_cv) > 100:
                    # Essayer avec les 100 premiers et 100 derniers caractères
                    context_text = clean_cv[:500] + " " + clean_cv[-500:]
                    category, confidence = self.predict_job_category(context_text)
            except Exception as e:
                logger.error(f"Erreur prédiction catégorie: {e}")
                category, confidence = self._fallback_category_detection(clean_cv or cv_text)
            
            # Génération du résumé avec gestion des erreurs
            try:
                summary = self.summarize_cv(cv_text)
                if not summary or summary == "Résumé non disponible":
                    summary = self._generate_fallback_summary(clean_cv, cv_skills, category, confidence)
            except Exception as e:
                logger.error(f"Erreur génération résumé: {e}")
                summary = self._generate_fallback_summary(clean_cv, cv_skills, category, confidence)
            
            # S'assurer que les compétences sont bien formatées
            matched_skills = list(cv_skills.keys())[:10] if cv_skills else []
            missing_skills = list(job_skills.keys())[:10] if job_skills else []
            
            # Construction du résultat avec des valeurs par défaut garanties
            result = {
                'match_score': score,
                'matched_skills': matched_skills or ["Aucune compétence correspondante identifiée"],
                'missing_skills': missing_skills or ["Toutes les compétences requises sont présentes"],
                'cv_skills': cv_skills or {},
                'job_skills': job_skills or {},
                'job_category': category or "Non spécifié",
                'category_confidence': max(0.0, min(1.0, float(confidence or 0.0))),
                'analysis_summary': summary or "Aucun détail d'analyse disponible",
                'analysis_details': self._generate_analysis_details(clean_cv, score, category, confidence, cv_skills, job_skills),
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

    def _is_irrelevant_skill(self, skill: str) -> bool:
        """Détermine si une compétence est non pertinente"""
        if not skill or len(skill) < 2 or len(skill) > 30:
            return True
            
        # Mots à exclure
        excluded_terms = {
            'th', 'utr', 'cad', 'etc', 'the', 'and', 'for', 'with', 'using', 'via',
            'use', 'used', 'utilize', 'utilized', 'utilizing', 'work', 'working',
            'experience', 'experiences', 'project', 'projects', 'description', 'descriptions',
            'responsibility', 'responsibilities', 'task', 'tasks', 'duty', 'duties',
            'skill', 'skills', 'technology', 'technologies', 'tool', 'tools', 'framework',
            'frameworks', 'library', 'libraries', 'language', 'languages', 'programming',
            'development', 'developing', 'developed', 'engineer', 'engineering',
            'transaction', 'transactions', 'assurant', 'assure', 'assured', 'assuring',
            'programmer', 'program', 'programs', 'code', 'coding', 'coder',
            'performance', 'infrastructure', 'description', 'flexible', 'cit', 'net', 'man', 'ios',
            'good', 'strong', 'excellent', 'basic', 'advanced', 'knowledge', 'ability', 'abilities',
            'understanding', 'familiarity', 'familiar', 'proficient', 'proficiency', 'level', 'levels',
            'years', 'year', 'month', 'months', 'day', 'days', 'time', 'times'
        }
        
        # Vérifier les mots exclus
        skill_lower = skill.lower()
        if any(term in skill_lower for term in excluded_terms):
            return True
            
        # Vérifier les motifs non pertinents
        if any(c.isdigit() for c in skill):
            return True
            
        if len(skill_lower) <= 2:
            return True
            
        return False

    def extract_skills(self, text: str) -> Dict[str, float]:
        """
        Extrait et pèse les compétences techniques d'un texte de CV
        avec un filtrage amélioré des compétences non pertinentes.
        
        Args:
            text: Texte du CV à analyser
            
        Returns:
            Dictionnaire des compétences trouvées avec leur score (0-1)
        """
        if not text or not isinstance(text, str):
            return {}

        # Nettoyer le texte
        text_clean = self._clean_text(text)
        text_lower = text_clean.lower()
        
        # Liste noire de mots non pertinents
        blacklist = {'inter', 'digital', 'retour', 'résultats', 'analyse', 'score', 'correspondance',
                    'expérience', 'compétence', 'logiciel', 'technologie', 'outil', 'projet'}
        
        # Dictionnaire pour stocker les compétences trouvées avec leur score
        skills_found = {}
        
        # 1. Vérifier les compétences du dataset
        for skill in self._skills_set:
            skill_lower = skill.lower()
            
            # Ignorer les compétences non pertinentes
            if (self._is_irrelevant_skill(skill) or 
                any(term in skill_lower for term in blacklist) or
                len(skill) < 3):
                continue
                
            # Vérifier la présence de la compétence dans le texte
            if skill_lower in text_lower:
                # Calculer un score basé sur la longueur et la fréquence
                count = text_lower.count(skill_lower)
                score = min(0.5 + (len(skill) * 0.05) + (count * 0.1), 1.0)
                skills_found[skill] = max(skills_found.get(skill, 0), score)
        
        # 2. Détection des compétences techniques courantes
        tech_keywords = [
            # Langages
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby',
            'swift', 'kotlin', 'go', 'rust', 'scala', 'r', 'matlab', 'bash', 'sql',
            'html', 'css', 'sass', 'less', 'dart', 'perl', 'haskell', 'elixir', 'erlang',
            # Frameworks
            'django', 'flask', 'fastapi', 'spring', 'spring boot', 'react', 'angular', 
            'vue', 'vue.js', 'node.js', 'express', 'laravel', 'ruby on rails', 'asp.net',
            'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn', 'opencv',
            'react native', 'flutter', 'xamarin', 'ionic', 'electron', 'next.js', 'nuxt.js',
            # Outils
            'git', 'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'jenkins',
            'ansible', 'terraform', 'aws', 'azure', 'gcp', 'postgresql', 'mysql', 
            'mongodb', 'redis', 'elasticsearch', 'kibana', 'prometheus', 'grafana'
        ]
        
        # 3. Vérifier les mots-clés techniques dans le texte
        for keyword in tech_keywords:
            if keyword in text_lower:
                # Score de base plus élevé pour les compétences techniques confirmées
                score = 0.8 if ' ' in keyword else 0.7
                skills_found[keyword] = max(skills_found.get(keyword, 0), score)
        
        # 4. Utiliser spaCy pour l'extraction des entités nommées si disponible
        if hasattr(self, 'nlp') and self.nlp:
            try:
                doc = self.nlp(text_clean)
                for ent in doc.ents:
                    if ent.label_ in ['ORG', 'PRODUCT', 'TECH'] and 3 < len(ent.text) < 30:
                        skill = ent.text.strip().lower()
                        if (not self._is_irrelevant_skill(skill) and 
                            not any(term in skill for term in blacklist) and
                            len(skill) > 3):
                            skills_found[skill] = max(skills_found.get(skill, 0), 0.6)
            except Exception as e:
                logger.warning(f"Erreur lors de l'extraction des entités avec spaCy: {e}")
        
        # 5. Filtrer et trier les compétences
        filtered_skills = {
            skill: round(score, 2) 
            for skill, score in skills_found.items()
            if (not self._is_irrelevant_skill(skill) and 
                not any(term in skill.lower() for term in blacklist) and
                len(skill) > 2)
        }
        
        # Trier par score décroissant et limiter à 20 compétences
        return dict(sorted(
            filtered_skills.items(),
            key=lambda x: (-x[1], x[0])
        )[:20])

    def predict_job_category(self, text: str) -> tuple[str, float]:
        """
        Prédit la catégorie d'emploi à partir du texte du CV avec une détection avancée.
        Utilise une approche pondérée basée sur les mots-clés et leur importance.
        
        Args:
            text: Texte du CV à analyser
            
        Returns:
            Tuple (catégorie, confiance) où confiance est entre 0 et 1
        """
        if not text or not text.strip():
            return "Non spécifié", 0.0
            
        # Liste des catégories avec mots-clés pondérés
        categories = {
            "Développement Logiciel": {
                # Mots-clés principaux (poids 2)
                "développeur": 2, "ingénieur logiciel": 2, "programmeur": 2,
                "software engineer": 2, "ingénieur en informatique": 2, "développeuse": 2,
                "développeur web": 2, "développeur fullstack": 2, "full stack": 2,
                "programmation": 2, "coding": 2, "développement logiciel": 2,
                # Technologies spécifiques (poids 1)
                "java": 1, "python": 1, "javascript": 1, "c++": 1, "c#": 1, "php": 1,
                "ruby": 1, "swift": 1, "kotlin": 1, "go": 1, "rust": 1, "typescript": 1,
                # Frameworks (poids 0.8)
                "spring": 0.8, "django": 0.8, "flask": 0.8, "react": 0.8, "angular": 0.8,
                "vue": 0.8, "node.js": 0.8, "express": 0.8, "laravel": 0.8, ".net": 0.8,
                # Outils (poids 0.5)
                "git": 0.5, "github": 0.5, "gitlab": 0.5, "jira": 0.5, "docker": 0.5,
                "kubernetes": 0.5, "jenkins": 0.5, "ansible": 0.5, "terraform": 0.5
            },
            "Data Science": {
                # Mots-clés principaux (poids 2)
                "data scientist": 2, "machine learning": 2, "intelligence artificielle": 2,
                "data analysis": 2, "big data": 2, "data analyst": 2, "data engineer": 2,
                "ml engineer": 2, "deep learning": 2, "data mining": 2, "data science": 2,
                # Technologies spécifiques (poids 1.5)
                "tensorflow": 1.5, "pytorch": 1.5, "keras": 1.5, "scikit-learn": 1.5,
                "pandas": 1.5, "numpy": 1.5, "matplotlib": 1.5, "seaborn": 1.5,
                # Concepts (poids 1)
                "statistique": 1, "statistiques": 1, "apprentissage automatique": 1,
                "réseau de neurones": 1, "nlp": 1, "traitement du langage naturel": 1,
                "computer vision": 1, "vision par ordinateur": 1, "analyse prédictive": 1
            },
            "Réseau et Sécurité": {
                # Mots-clés principaux (poids 2)
                "réseau": 2, "sécurité": 2, "cybersécurité": 2, "admin système": 2,
                "devops": 2, "système": 2, "réseaux": 2, "sécurisation": 2, "pentest": 2,
                "ethical hacking": 2, "administration système": 2, "sysadmin": 2,
                # Technologies (poids 1.5)
                "cisco": 1.5, "juniper": 1.5, "fortinet": 1.5, "palo alto": 1.5,
                "wireshark": 1.5, "metasploit": 1.5, "nmap": 1.5, "burp suite": 1.5,
                # Concepts (poids 1)
                "pare-feu": 1, "firewall": 1, "vpn": 1, "proxy": 1, "ids": 1, "ips": 1,
                "siem": 1, "soc": 1, "grc": 1, "iso 27001": 1, "rgpd": 1
            },
            "Design et UX/UI": {
                # Mots-clés principaux (poids 2)
                "designer": 2, "ux": 2, "ui": 2, "user experience": 2, "interface utilisateur": 2,
                "design graphique": 2, "webdesign": 2, "web design": 2, "ergonomie": 2,
                "maquettage": 2, "wireframe": 2, "prototypage": 2, "design thinking": 2,
                # Outils (poids 1.5)
                "figma": 1.5, "sketch": 1.5, "adobe xd": 1.5, "invision": 1.5,
                "zeplin": 1.5, "axure": 1.5, "balsamiq": 1.5, "marvel": 1.5,
                # Compétences (poids 1)
                "design system": 1, "design d'interface": 1, "expérience utilisateur": 1,
                "interaction design": 1, "motion design": 1, "illustration": 1,
                "identité visuelle": 1, "charte graphique": 1, "typographie": 1
            },
            "Gestion de Projet": {
                # Mots-clés principaux (poids 2)
                "chef de projet": 2, "project manager": 2, "scrum master": 2, "product owner": 2,
                "gestion de projet": 2, "management": 2, "agile": 2, "scrum": 2, "kanban": 2,
                "pmp": 2, "prince2": 2, "conduite de projet": 2, "cheffe de projet": 2,
                # Méthodologies (poids 1.5)
                "safe": 1.5, "leSS": 1.5, "nexus": 1.5, "discipline agile": 1.5,
                "design sprint": 1.5, "lean": 1.5, "six sigma": 1.5, "itil": 1.5,
                # Outils (poids 1)
                "jira": 1, "confluence": 1, "trello": 1, "asana": 1, "microsoft project": 1,
                "monday.com": 1, "basecamp": 1, "wrike": 1, "clickup": 1
            },
            "Marketing Digital": {
                # Mots-clés principaux (poids 2)
                "marketing digital": 2, "community manager": 2, "réseaux sociaux": 2,
                "référencement": 2, "seo": 2, "sea": 2, "social media": 2, "content marketing": 2,
                "inbound marketing": 2, "email marketing": 2, "growth hacking": 2, "webmarketing": 2,
                # Plateformes (poids 1.5)
                "facebook ads": 1.5, "google ads": 1.5, "linkedin": 1.5, "instagram": 1.5,
                "tiktok": 1.5, "youtube": 1.5, "twitter": 1.5, "pinterest": 1.5,
                # Outils (poids 1)
                "google analytics": 1, "google tag manager": 1, "google search console": 1,
                "semrush": 1, "ahrefs": 1, "moz": 1, "hubspot": 1, "mailchimp": 1,
                "activecampaign": 1, "klaviyo": 1
            },
            "Ressources Humaines": {
                # Mots-clés principaux (poids 2)
                "ressources humaines": 2, "rh": 2, "recruteur": 2, "recrutement": 2,
                "gestion des talents": 2, "gestion des carrières": 2, "formation": 2,
                "développement des compétences": 2, "gestion des performances": 2,
                "paie": 2, "administration du personnel": 2,
                # Compétences (poids 1.5)
                "gestion des conflits": 1.5, "négociation": 1.5, "entretien d'embauche": 1.5,
                "onboarding": 1.5, "marque employeur": 1.5, "bien-être au travail": 1.5,
                "qvt": 1.5, "rse": 1.5, "diversité et inclusion": 1.5,
                # Outils (poids 1)
                "sirh": 1, "talentsoft": 1, "payfit": 1, "lucca": 1, "hr access": 1,
                "workday": 1, "successfactors": 1, "bamboo hr": 1, "personio": 1
            }
        }
        
        # Initialiser les scores à zéro
        category_scores = {category: 0.0 for category in categories}
        
        # Convertir le texte en minuscules pour la recherche insensible à la casse
        text_lower = text.lower()
        
        # Calculer le score pour chaque catégorie
        for category, keywords in categories.items():
            for keyword, weight in keywords.items():
                if keyword in text_lower:
                    category_scores[category] += weight
        
        # Trouver la catégorie avec le score le plus élevé
        if not any(category_scores.values()):
            return "Non spécifié", 0.0
        
        # Calculer le score total pour normaliser
        total_score = sum(category_scores.values())
        
        # Trouver la catégorie gagnante et son score
        best_category = max(category_scores, key=category_scores.get)
        best_score = category_scores[best_category]
        
        # Calculer la confiance (entre 0 et 1)
        if total_score > 0:
            # Normaliser le score entre 0.5 et 1.0
            confidence = 0.5 + 0.5 * (best_score / total_score)
            # Limiter à 0.95 pour laisser de la place à l'incertitude
            confidence = min(confidence, 0.95)
        else:
            confidence = 0.5  # Valeur par défaut si aucun mot-clé n'est trouvé
        
        # Vérifier si la confiance est suffisante
        if best_score < 1.0:  # Seuil minimum pour une catégorisation fiable
            return "Non spécifié", 0.0
        
        # Si la catégorie a un score très faible, retourner "Non spécifié"
        if best_score / total_score < 0.2:  # Moins de 20% du score total
            return "Non spécifié", 0.0
        
        # Retourner la catégorie avec la confiance
        return best_category, confidence

    def summarize_cv(self, cv_text: str) -> str:
        """Génère un résumé concis du CV avec des compétences pertinentes"""
        if not cv_text or not isinstance(cv_text, str):
            return "Aucun contenu à résumer."
        
        try:
            # Nettoyer le texte
            clean_text = self._clean_text(cv_text)
            
            # Prédire la catégorie avec gestion des erreurs
            try:
                category, confidence = self.predict_job_category(clean_text)
            except Exception as e:
                logger.error(f"Erreur lors de la prédiction de la catégorie: {e}")
                category, confidence = "Non spécifié", 0.0
            
            # Extraire les années d'expérience avec gestion des erreurs
            try:
                experience_years = self.extract_experience_years(clean_text)
            except Exception as e:
                logger.error(f"Erreur lors de l'extraction des années d'expérience: {e}")
                experience_years = 0
            
            # Extraire et nettoyer les compétences avec gestion des erreurs
            try:
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
            except Exception as e:
                logger.error(f"Erreur lors de l'extraction des compétences: {e}")
                top_skills = []
            
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
            logger.error(f"Erreur lors de la génération du résumé: {e}", exc_info=True)
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
            experience_info.append("Débutant ou expérience non spécifiée")
        
        return ". ".join(experience_info) + "."

    def _fallback_category_detection(self, text: str) -> tuple[str, float]:
        """
        Détection de catégorie de secours lorsque la prédiction principale échoue.
        
        Args:
            text: Texte du CV à analyser
            
        Returns:
            Tuple (catégorie, confiance) avec une catégorie par défaut
        """
        if not text:
            return "Non spécifié", 0.0
            
        text_lower = text.lower()
        
        # Détection basique basée sur les compétences
        tech_skills = sum(1 for skill in ['python', 'java', 'javascript', 'c++', 'sql'] 
                         if skill in text_lower)
        design_skills = sum(1 for skill in ['design', 'ui', 'ux', 'figma', 'sketch', 'photoshop'] 
                           if skill in text_lower)
        data_skills = sum(1 for skill in ['data', 'analyse', 'statistique', 'machine learning', 'ai'] 
                         if skill in text_lower)
        
        if tech_skills > 0:
            if data_skills > tech_skills / 2:
                return "Data Science", 0.7
            return "Développement Logiciel", 0.7
        elif design_skills > 1:
            return "Design et UX/UI", 0.7
        elif data_skills > 1:
            return "Data Science", 0.7
            
        return "Non spécifié", 0.5
    
    def _generate_analysis_details(self, text: str, score: float, category: str, 
                                confidence: float, cv_skills: dict, job_skills: dict) -> str:
        """
        Génère des détails d'analyse détaillés pour le CV.
        
        Args:
            text: Texte du CV
            score: Score de correspondance
            category: Catégorie prédite
            confidence: Confiance de la prédiction
            cv_skills: Compétences du CV
            job_skills: Compétences du poste
            
        Returns:
            Chaîne de caractères avec les détails d'analyse
        """
        details = []
        
        # 1. En-tête d'analyse
        details.append("=== DÉTAILS DE L'ANALYSE ===")
        details.append("")
        
        # 2. Catégorisation
        details.append("📋 CATÉGORISATION")
        details.append(f"- Catégorie prédite: {category}")
        details.append(f"- Niveau de confiance: {confidence*100:.1f}%")
        details.append("")
        
        # 3. Score de correspondance
        details.append("🎯 SCORE DE CORRESPONDANCE")
        details.append(f"- Score global: {score:.1f}/100")
        
        # 4. Analyse des compétences
        details.append("")
        details.append("🔧 COMPÉTENCES IDENTIFIÉES")
        
        if cv_skills:
            # Compétences triées par pertinence
            sorted_skills = sorted(cv_skills.items(), key=lambda x: x[1], reverse=True)
            top_skills = [f"{s[0]} ({s[1]*100:.0f}%)" for s in sorted_skills[:10]]
            details.append("\n".join(["- " + skill for skill in top_skills]))
        else:
            details.append("- Aucune compétence clairement identifiée")
        
        # 5. Correspondance avec le poste
        if job_skills:
            details.append("")
            details.append("✅ CORRESPONDANCE AVEC LE POSTE")
            
            # Compétences correspondantes
            matched = [skill for skill in cv_skills if skill in job_skills]
            if matched:
                details.append("\nCompétences correspondantes :")
                details.append("\n".join([f"- {s}" for s in matched[:10]]))
            
            # Compétences manquantes
            missing = [skill for skill in job_skills if skill not in cv_skills]
            if missing:
                details.append("\nCompétences à développer :")
                details.append("\n".join([f"- {s}" for s in missing[:10]]))
        
        # 6. Recommandations
        details.append("")
        details.append("💡 RECOMMANDATIONS")
        if score < 50:
            details.append("- Le profil présente un écart significatif avec les exigences du poste.")
        elif score < 70:
            details.append("- Le profil correspond partiellement aux attentes, une formation complémentaire pourrait être nécessaire.")
        else:
            details.append("- Le profil correspond bien aux attentes du poste.")
        
        return "\n".join(details)
    
    def _extract_projects(self, text: str) -> str:
        """Extrait les projets mentionnés dans le CV"""
        project_keywords = ["projet", "réalisation", "mission", "expérience", "cas pratique"]
        projects = []
        lines = text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in project_keywords):
                projects.append(line.strip())
        
        return "\n".join(projects[:3]) if projects else "Aucun projet spécifié"

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