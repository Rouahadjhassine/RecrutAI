# nlp_service/train_model.py - VERSION CORRIGÉE
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder
import joblib
import re
import os
import sys

# Pour embeddings avancés (optionnel)
try:
    from sentence_transformers import SentenceTransformer
    import torch
except ImportError:
    print("⚠️  Sentence-transformers non installé, utilisation de TF-IDF uniquement")

class CVJobMatcher:
    """
    Modèle ML pour matcher CV et offres d'emploi
    Entraîné sur dataset Kaggle
    """
    
    def __init__(self, model_type='tfidf_rf'):
        """
        Args:
            model_type: 'tfidf_rf' (TF-IDF + Random Forest) 
                       ou 'sbert' (Sentence-BERT embeddings)
        """
        self.model_type = model_type
        self.vectorizer = None
        self.classifier = None
        self.label_encoder = None
        self.sbert_model = None
        
        if model_type == 'sbert':
            try:
                self.sbert_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            except ImportError:
                print("❌ Sentence-transformers non installé, basculement vers TF-IDF")
                self.model_type = 'tfidf_rf'
    
    def clean_text(self, text):
        """Nettoie le texte"""
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r'http\S+', '', text)  # URLs
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)  # Caractères spéciaux
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def prepare_data(self, df, text_column='Resume', label_column='Category'):
        """
        Prépare les données pour l'entraînement
        
        Args:
            df: DataFrame Kaggle (ex: UpdatedResumeDataSet.csv)
            text_column: colonne contenant le texte du CV
            label_column: colonne contenant la catégorie d'emploi
        """
        # Nettoyage
        df[text_column] = df[text_column].apply(self.clean_text)
        
        # Encodage des labels
        self.label_encoder = LabelEncoder()
        df['encoded_label'] = self.label_encoder.fit_transform(df[label_column])
        
        return df[text_column].values, df['encoded_label'].values
    
    def train(self, X_text, y_labels, test_size=0.2, random_state=42):
        """
        Entraîne le modèle
        
        Args:
            X_text: array de textes (CVs)
            y_labels: array de labels encodés (catégories)
        """
        print("🚀 Début de l'entraînement du modèle...")
        
        # Split train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X_text, y_labels, 
            test_size=test_size, 
            random_state=random_state,
            stratify=y_labels
        )
        
        print(f"📊 Données : {len(X_train)} train, {len(X_test)} test")
        
        if self.model_type == 'tfidf_rf':
            # ===== MÉTHODE 1 : TF-IDF + Random Forest =====
            print("🔧 Vectorisation TF-IDF...")
            self.vectorizer = TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                min_df=2,
                max_df=0.8,
                stop_words='english'
            )
            X_train_vec = self.vectorizer.fit_transform(X_train)
            X_test_vec = self.vectorizer.transform(X_test)
            
            print("🌲 Entraînement Random Forest...")
            self.classifier = RandomForestClassifier(
                n_estimators=100,  # Réduit pour plus de rapidité
                max_depth=20,
                min_samples_split=5,
                random_state=random_state,
                n_jobs=-1
            )
            self.classifier.fit(X_train_vec, y_train)
            
            # Évaluation
            y_pred = self.classifier.predict(X_test_vec)
            accuracy = accuracy_score(y_test, y_pred)
            
        elif self.model_type == 'sbert':
            # ===== MÉTHODE 2 : SBERT Embeddings + Logistic Regression =====
            print("🤖 Génération embeddings SBERT...")
            X_train_emb = self.sbert_model.encode(X_train.tolist(), show_progress_bar=True)
            X_test_emb = self.sbert_model.encode(X_test.tolist(), show_progress_bar=True)
            
            print("📈 Entraînement Logistic Regression...")
            self.classifier = LogisticRegression(
                max_iter=500,
                multi_class='multinomial',
                random_state=random_state,
                n_jobs=-1
            )
            self.classifier.fit(X_train_emb, y_train)
            
            # Évaluation
            y_pred = self.classifier.predict(X_test_emb)
            accuracy = accuracy_score(y_test, y_pred)
        
        print(f"\n✅ Entraînement terminé !")
        print(f"📊 Accuracy : {accuracy*100:.2f}%")
        print("\n📋 Rapport de classification :")
        print(classification_report(
            y_test, y_pred, 
            target_names=self.label_encoder.classes_
        ))
        
        return accuracy
    
    def predict_category(self, cv_text):
        """
        Prédit la catégorie d'emploi pour un CV
        
        Returns:
            (category_name, confidence_score)
        """
        cv_clean = self.clean_text(cv_text)
        
        if self.model_type == 'tfidf_rf':
            cv_vec = self.vectorizer.transform([cv_clean])
            prediction = self.classifier.predict(cv_vec)[0]
            probabilities = self.classifier.predict_proba(cv_vec)[0]
            confidence = probabilities.max()
            
        elif self.model_type == 'sbert':
            cv_emb = self.sbert_model.encode([cv_clean])
            prediction = self.classifier.predict(cv_emb)[0]
            probabilities = self.classifier.predict_proba(cv_emb)[0]
            confidence = probabilities.max()
        
        category = self.label_encoder.inverse_transform([prediction])[0]
        return category, confidence
    
    def calculate_match_score(self, cv_text, job_description):
        """
        Calcule le score de match entre CV et offre
        
        Returns:
            score (0-100)
        """
        cv_clean = self.clean_text(cv_text)
        job_clean = self.clean_text(job_description)
        
        if self.model_type == 'tfidf_rf':
            # TF-IDF similarity
            combined = self.vectorizer.transform([cv_clean, job_clean])
            similarity = (combined[0] @ combined[1].T).toarray()[0][0]
            score = min(similarity * 100, 100)
            
        elif self.model_type == 'sbert':
            # SBERT cosine similarity
            cv_emb = self.sbert_model.encode(cv_clean)
            job_emb = self.sbert_model.encode(job_clean)
            similarity = np.dot(cv_emb, job_emb) / (np.linalg.norm(cv_emb) * np.linalg.norm(job_emb))
            score = min(similarity * 100, 100)
        
        return round(score, 2)
    
    def save_model(self, path='models/cv_job_matcher.pkl'):
        """Sauvegarde le modèle entraîné"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        model_data = {
            'model_type': self.model_type,
            'vectorizer': self.vectorizer,
            'classifier': self.classifier,
            'label_encoder': self.label_encoder
        }
        
        joblib.dump(model_data, path)
        print(f"💾 Modèle sauvegardé : {path}")
    
    @classmethod
    def load_model(cls, path='models/cv_job_matcher.pkl'):
        """Charge un modèle pré-entraîné"""
        model_data = joblib.load(path)
        
        instance = cls(model_type=model_data['model_type'])
        instance.vectorizer = model_data['vectorizer']
        instance.classifier = model_data['classifier']
        instance.label_encoder = model_data['label_encoder']
        
        print(f"✅ Modèle chargé : {path}")
        return instance


# ============================================
# SCRIPT D'ENTRAÎNEMENT PRINCIPAL
# ============================================

def find_dataset_file():
    """Trouve le fichier dataset dans différents emplacements possibles"""
    possible_paths = [
        'UpdatedResumeDataSet.csv',  # Dans le dossier courant
        '../UpdatedResumeDataSet.csv',  # Dans le dossier parent
        os.path.join(os.path.dirname(__file__), 'UpdatedResumeDataSet.csv'),  # Dans le même dossier
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'UpdatedResumeDataSet.csv'),  # Dans backend
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            print(f"✅ Dataset trouvé : {path}")
            return path
    
    # Si non trouvé, lister les fichiers disponibles
    print("❌ Dataset non trouvé. Fichiers disponibles :")
    current_dir = os.path.dirname(__file__) if __file__ else os.getcwd()
    for file in os.listdir(current_dir):
        if file.endswith('.csv'):
            print(f"   📄 {file}")
    
    for file in os.listdir(os.path.dirname(current_dir)):
        if file.endswith('.csv'):
            print(f"   📄 ../{file}")
    
    return None

def train_from_kaggle_dataset(
    csv_path=None,
    model_type='tfidf_rf',
    save_path='models/cv_job_matcher.pkl'
):
    """
    Entraîne le modèle à partir d'un dataset Kaggle
    """
    print("=" * 60)
    print("🎯 ENTRAÎNEMENT MODÈLE CV-JOB MATCHER")
    print("=" * 60)
    
    # 1. Trouver le dataset
    if csv_path is None:
        csv_path = find_dataset_file()
    
    if not csv_path or not os.path.exists(csv_path):
        print("❌ Impossible de trouver le dataset UpdatedResumeDataSet.csv")
        print("📋 Veuillez télécharger le dataset depuis :")
        print("   https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset")
        print("📁 Et le placer dans le dossier backend/")
        return None
    
    # 2. Charger dataset Kaggle
    print("\n📂 Chargement du dataset...")
    try:
        df = pd.read_csv(csv_path, encoding='latin-1')
        print(f"✅ Dataset chargé : {len(df)} exemples")
        print(f"📋 Colonnes : {list(df.columns)}")
        
        if 'Category' in df.columns:
            print(f"🎯 Catégories : {df['Category'].nunique()}")
            print(f"   → {df['Category'].unique()[:10]}...")
        else:
            print("❌ Colonne 'Category' non trouvée dans le dataset")
            return None
            
    except Exception as e:
        print(f"❌ Erreur lors du chargement du dataset : {e}")
        return None
    
    # 3. Initialiser modèle
    matcher = CVJobMatcher(model_type=model_type)
    
    # 4. Préparer données
    X_text, y_labels = matcher.prepare_data(df)
    
    # 5. Entraîner
    accuracy = matcher.train(X_text, y_labels)
    
    # 6. Sauvegarder
    matcher.save_model(save_path)
    
    print("\n" + "=" * 60)
    print(f"🎉 ENTRAÎNEMENT TERMINÉ - Accuracy : {accuracy*100:.2f}%")
    print("=" * 60)
    
    return matcher


# ============================================
# TEST DU MODÈLE
# ============================================

def test_model(model_path='models/cv_job_matcher.pkl'):
    """Teste le modèle entraîné"""
    print("\n🧪 TEST DU MODÈLE")
    
    try:
        matcher = CVJobMatcher.load_model(model_path)
        
        # Exemple de CV
        cv_test = """
        John Doe - Data Scientist
        Skills: Python, Machine Learning, TensorFlow, Pandas, SQL
        Experience: 5 years in data science and ML model development
        Developed predictive models for customer churn, NLP systems
        """
        
        # Exemple d'offre
        job_test = """
        We are looking for a Senior Data Scientist with expertise in
        machine learning, Python, and NLP. 5+ years experience required.
        Must know TensorFlow, PyTorch, and cloud platforms.
        """
        
        # Prédiction catégorie
        category, confidence = matcher.predict_category(cv_test)
        print(f"\n📊 Catégorie prédite : {category}")
        print(f"🎯 Confiance : {confidence*100:.2f}%")
        
        # Score de match
        score = matcher.calculate_match_score(cv_test, job_test)
        print(f"💯 Score de match CV-Job : {score}%")
        
    except Exception as e:
        print(f"❌ Erreur lors du test : {e}")


# ============================================
# POINT D'ENTRÉE
# ============================================

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'train':
        # Mode entraînement
        train_from_kaggle_dataset(
            model_type='tfidf_rf',  # ou 'sbert'
            save_path='models/cv_job_matcher.pkl'
        )
    else:
        # Mode test
        test_model('models/cv_job_matcher.pkl')