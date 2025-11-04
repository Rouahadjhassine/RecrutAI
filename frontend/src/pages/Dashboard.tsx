import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log('Dashboard - Starting user load');

    const loadUser = async () => {
      console.log('Dashboard - loadUser called');
      try {
        console.log('Dashboard - Calling getCurrentUser');
        const userData = await authService.getCurrentUser();
        console.log('Dashboard - getCurrentUser returned:', userData);
        
        if (!isMounted) return;
        
        console.log('Dashboard - Setting user and stopping loading');
        setUser(userData);
        
        // If no user data, redirect to login
        if (!userData) {
          console.log('Dashboard - No user data, redirecting to login');
          window.location.href = '/login';
          return;
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Dashboard - Error loading user:', err);
        if (isMounted) {
          setError('Failed to load user data');
          setLoading(false);
          window.location.href = '/login';
        }
      }
    };

    loadUser();

    return () => {
      console.log('Dashboard - Cleaning up');
      isMounted = false;
    };
  }, []);

  // Debug effect to track loading state and user
  useEffect(() => {
    console.log('Dashboard - State update:', { loading, user, error });
  }, [loading, user, error]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de votre tableau de bord...</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez patienter pendant le chargement de vos données.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retour à la page de connexion
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

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