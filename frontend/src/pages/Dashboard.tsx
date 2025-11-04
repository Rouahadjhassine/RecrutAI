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
  const [cvs, setCvs] = useState<File[]>([]);
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
    if (!jobText.trim()) {
      setError('Veuillez saisir une description de poste');
      return;
    }
    
    if (user.role === 'recruteur' && cvs.length === 0) {
      setError('Veuillez télécharger au moins un CV');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      if (user.role === 'candidat') {
        if (!cv) {
          setError('Veuvez d\'abord télécharger votre CV');
          return;
        }
        const res = await cvService.analyze(jobText, cv.id);
        setResult(res);
      } else {
        const formData = new FormData();
        cvs.forEach((file, index) => {
          formData.append(`cv_${index}`, file);
        });
        formData.append('job_description', jobText);
        
        const res = await cvService.rankCVs(formData);
        setRankings(res);
      }
    } catch (err) {
      console.error('Erreur lors de l\'analyse :', err);
      setError('Une erreur est survenue lors de l\'analyse. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCVUpload = (file: File) => {
    if (user.role === 'candidat') {
      setCv(file);
    } else {
      setCvs(prev => [...prev, file]);
    }
  };
  
  const removeCV = (index: number) => {
    setCvs(prev => prev.filter((_, i) => i !== index));
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

        {/* Section Upload CV */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            {user.role === 'candidat' ? '1. Votre CV' : '1. CVs des candidats'}
          </h3>
          {user.role === 'candidat' ? (
            !cv ? (
              <UploadCV onUpload={handleCVUpload} />
            ) : (
              <div className="p-4 border rounded-lg bg-green-50">
                <p className="text-green-700 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  CV téléchargé avec succès
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <UploadCV onUpload={handleCVUpload} multiple />
              {cvs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">CVs sélectionnés :</p>
                  <ul className="border rounded-lg divide-y">
                    {cvs.map((file, index) => (
                      <li key={index} className="p-3 flex justify-between items-center">
                        <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                        <button
                          onClick={() => removeCV(index)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Supprimer ce CV"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500">
                    {cvs.length} CV{cvs.length > 1 ? 's' : ''} sélectionné{cvs.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section Description du poste */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">
            2. Description du poste
          </h3>
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={8}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-primary"
            placeholder={user.role === 'candidat' 
              ? 'Collez ici le texte de l\'offre d\'emploi pour analyser votre CV...'
              : 'Collez ici la description complète du poste à pourvoir...'}
          />
          
          {error && (
            <div className="mt-2 text-red-600 text-sm flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={analyze}
              disabled={loading || !jobText.trim() || (user.role === 'candidat' ? !cv : cvs.length === 0)}
              className={`px-6 py-3 rounded-lg font-bold text-white flex items-center ${
                loading || !jobText.trim() || (user.role === 'candidat' ? !cv : cvs.length === 0)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyse en cours...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {user.role === 'candidat' ? 'Analyser mon CV' : 'Classer les CVs'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Affichage des résultats */}
        {user.role === 'candidat' && result && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-4">Résultats de l'analyse</h3>
            <AnalysisResultCard result={result} />
          </div>
        )}
        
        {user.role === 'recruteur' && rankings.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Résultats du classement</h3>
              <button
                onClick={() => {
                  setRankings([]);
                  setCvs([]);
                  setJobText('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Nouvelle analyse
              </button>
            </div>
            <RankingTable rankings={rankings} />
          </div>
        )}
      </div>
    </div>
  );
}