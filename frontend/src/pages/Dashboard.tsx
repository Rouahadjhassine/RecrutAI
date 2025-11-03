import { useEffect, useState } from 'react';
import Navbar from '../components/Layout/Navbar';
import UploadCV from '../components/CV/UploadCV';
import AnalysisResultCard from '../components/CV/AnalysisResultCard';
import RankingTable from '../components/CV/RankingTable';
import { cvService } from '../services/cvService';
import { authService } from '../services/authService';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [cv, setCv] = useState<any>(null);
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = authService.getCurrentUser();
    setUser(u);
  }, []);

  const analyze = async () => {
    if (!jobText.trim()) return;
    setLoading(true);
    try {
      if (user.role === 'candidat') {
        const res = await cvService.analyze(jobText, cv?.id);
        setResult(res);
      } else {
        const res = await cvService.rank(jobText);
        setRankings(res);
      }
    } catch (err) {
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} role={user.role} />
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-3xl font-bold mb-8">
          {user.role === 'candidat' ? 'Analyse de votre CV' : 'Classement des candidats'}
        </h2>

        {user.role === 'candidat' && !cv && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">1. Uploadez votre CV</h3>
            <UploadCV onUpload={setCv} />
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            {user.role === 'candidat' ? '2. Offre d\'emploi' : 'Texte de l\'offre'}
          </h3>
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={8}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder="Collez le texte de l'offre..."
          />
          <button
            onClick={analyze}
            disabled={loading || !jobText.trim()}
            className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold disabled:opacity-50"
          >
            {loading ? 'Analyse...' : 'Analyser'}
          </button>
        </div>

        {result && <AnalysisResultCard result={result} />}
        {rankings.length > 0 && <RankingTable rankings={rankings} />}
      </div>
    </div>
  );
}