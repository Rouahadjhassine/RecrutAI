// src/pages/CandidatAnalysisPage.tsx
import React, { useState } from 'react';
import { Upload, BarChart3 } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import api from '../services/api';

interface AnalysisResult {
  cv_id: number;
  candidat_name: string;
  compatibility_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
}

const CandidatAnalysisPage = ({ user }: { user: User }) => {
  const [file, setFile] = useState<File | null>(null);
  const [cvUploaded, setCvUploaded] = useState(false);
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Upload CV
  const handleUpload = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier à télécharger');
      return;
    }

    // Validate file type and size
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Veuillez télécharger un fichier PDF ou Word (DOC/DOCX)');
      return;
    }

    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux. La taille maximale autorisée est de 5 Mo');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidat_id', user.id.toString());

    try {
      const response = await api.post('/api/cvs/candidat/upload/', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 30000 // 30 seconds timeout
      });
      
      if (response.status === 201) {
        setCvUploaded(true);
        alert('CV uploadé avec succès !');
        setFile(null);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        console.error('Response headers:', err.response.headers);
        
        if (err.response.status === 413) {
          alert('Le fichier est trop volumineux. La taille maximale autorisée est de 5 Mo');
        } else if (err.response.status === 400) {
          alert(`Erreur de validation : ${JSON.stringify(err.response.data)}`);
        } else if (err.response.status === 500) {
          alert('Erreur serveur. Veuillez réessayer plus tard ou contacter le support.');
        } else {
          alert(`Erreur lors de l'upload du CV: ${err.response.data?.detail || err.response.statusText}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        alert('Pas de réponse du serveur. Vérifiez votre connexion internet et réessayez.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', err.message);
        alert(`Erreur lors de la configuration de la requête: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Analyse
  const handleAnalyze = async () => {
    if (!jobText.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/api/cvs/candidat/analyze/', {
        job_offer_text: jobText
      });
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur d\'analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="candidat" />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          Analyser mon CV
        </h2>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Étape 1 : Uploader votre CV
          </h3>

          {!cvUploaded ? (
            <>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />

              {file && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Fichier sélectionné :</strong> {file.name}
                  </p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={loading || !file}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Upload en cours...' : 'Uploader mon CV'}
              </button>
            </>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 font-bold text-lg">✓ CV uploadé avec succès !</p>
              <button
                onClick={() => {
                  setCvUploaded(false);
                  setResult(null);
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 underline"
              >
                Uploader un nouveau CV
              </button>
            </div>
          )}
        </div>

        {/* Analysis Section */}
        {cvUploaded && (
          <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Étape 2 : Coller l'offre d'emploi
            </h3>

            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              rows={10}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              placeholder="Collez ici le texte complet de l'offre d'emploi..."
            />

            <button
              onClick={handleAnalyze}
              disabled={loading || !jobText.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Analyse IA en cours...' : 'Lancer l\'analyse'}
            </button>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Votre Score de Compatibilité</h3>
              <span
                className={`text-5xl font-bold ${
                  result.compatibility_score > 70
                    ? 'text-green-600'
                    : result.compatibility_score > 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {result.compatibility_score}%
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="font-bold text-green-700 mb-3 text-lg">✓ Compétences trouvées</p>
                <div className="flex flex-wrap gap-2">
                  {result.matched_keywords.length > 0 ? (
                    result.matched_keywords.map((k, i) => (
                      <span
                        key={i}
                        className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Aucune compétence technique détectée</p>
                  )}
                </div>
              </div>

              <div>
                <p className="font-bold text-red-700 mb-3 text-lg">✗ Compétences manquantes</p>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.length > 0 ? (
                    result.missing_keywords.map((k, i) => (
                      <span
                        key={i}
                        className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Toutes les compétences sont présentes !</p>
                  )}
                </div>
              </div>
            </div>

            {result.summary && (
              <div className="mt-6 p-6 bg-blue-50 rounded-lg">
                <p className="font-bold text-blue-900 mb-3 text-lg">📄 Résumé de votre CV</p>
                <p className="text-gray-800 leading-relaxed">{result.summary}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <p className="text-yellow-900 font-medium">
                💡 <strong>Conseil :</strong> {
                  result.compatibility_score > 70
                    ? 'Excellent match ! Postulez dès maintenant.'
                    : result.compatibility_score > 50
                    ? 'Bon potentiel. Mettez en avant vos compétences transversales.'
                    : 'Travaillez sur les compétences manquantes avant de postuler.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatAnalysisPage;