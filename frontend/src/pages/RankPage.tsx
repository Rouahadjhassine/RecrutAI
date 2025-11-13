// src/pages/RankPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import RankingTable from '../components/CV/RankingTable';
import { User } from '../types';
import { cvService } from '../services/cvService';

export default function RankPage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [jobText, setJobText] = useState('');
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // ou un composant de chargement
  }

  const rank = async () => {
    if (!jobText.trim()) return;
    setLoading(true);
    try {
      const res = await cvService.rank(jobText);
      setRankings(res);
    } catch {
      alert('Erreur de classement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
      <Navbar user={user} onLogout={() => {}} role="recruteur" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Classement des candidats
        </h2>

        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={10}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="Collez le texte de l'offre d'emploi..."
          />
          <button
            onClick={rank}
            disabled={loading || !jobText.trim()}
            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Classement en cours...' : 'Lancer le classement IA'}
          </button>
        </div>

        {rankings.length > 0 && <RankingTable rankings={rankings} />}
      </div>
    </div>
  );
}