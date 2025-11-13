// src/pages/AnalyzePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import AnalysisResultCard from '../components/CV/AnalysisResultCard';
import { User } from '../types';
import { cvService } from '../services/cvService';

export default function AnalyzePage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // ou un composant de chargement
  }

  const analyze = async () => {
    if (!jobText.trim()) return;
    setLoading(true);
    try {
      const res = await cvService.analyze(jobText);
      setResult(res);
    } catch {
      alert('Erreur d\'analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="candidat" />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Analyser une offre d'emploi
        </h2>

        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={10}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Collez le texte complet de l'offre d'emploi ici..."
          />
          <button
            onClick={analyze}
            disabled={loading || !jobText.trim()}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
          </button>
        </div>

        {result && <AnalysisResultCard result={result} />}
      </div>
    </div>
  );
}