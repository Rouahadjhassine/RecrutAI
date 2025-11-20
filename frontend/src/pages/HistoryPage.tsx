// src/pages/HistoryPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import { cvService } from '../services/cvService';
import { ArrowLeft } from 'lucide-react';

interface AnalysisItem {
  id: number;
  cv_file_name: string;
  created_at: string;
  match_score?: number;
  predicted_category?: string;
  experience_level?: string;
  confidence_score?: number;
  skills?: string[];
  summary?: string;
  user: number;
}

export default function HistoryPage({ user }: { user: User | null }) {
  const [history, setHistory] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisItem | null>(null);
  const navigate = useNavigate();

  const loadHistory = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const historyData = await cvService.getHistory();
      console.log('Données reçues:', historyData);
      setHistory(historyData);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue lors du chargement de l\'historique';
      setError(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDeleteCV = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      try {
        await cvService.deleteCV(id);
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedAnalysis?.id === id) {
          setSelectedAnalysis(null);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Chargement de votre historique...</h2>
          <p className="text-gray-500 mt-2">Veuillez patienter un instant</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadHistory}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      <Navbar user={user} onLogout={() => {}} role={user.role} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <Link 
              to={user?.role === 'candidat' ? '/candidat/dashboard' : '/recruteur/dashboard'}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Retour au tableau de bord</span>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">Historique des analyses</h1>
            <p className="text-gray-600 mt-1">Retrouvez toutes vos analyses précédentes</p>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={loadHistory}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
              title="Rafraîchir"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link
              to="/analyze"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nouvelle analyse
            </Link>
          </div>
        </div>
        
        {!loading && history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="text-center p-12">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-50">
                <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune analyse trouvée</h3>
              <p className="mt-1 text-gray-500 max-w-md mx-auto">
                Vous n'avez pas encore effectué d'analyse. Créez votre première analyse pour commencer.
              </p>
              <div className="mt-6">
                <Link
                  to="/analyze"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Commencer une analyse
                </Link>
              </div>
            </div>
          </div>
        ) : !selectedAnalysis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 flex flex-col"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate max-w-[180px]">
                            {item.cv_file_name || 'Analyse sans nom'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(item.created_at || new Date().toISOString())}
                          </p>
                        </div>
                      </div>
                      
                      {item.match_score !== undefined && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">Correspondance</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.match_score.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" 
                              style={{ width: `${item.match_score}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {item.summary && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 line-clamp-4 mb-2">
                            {item.summary}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnalysis(item);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline focus:outline-none"
                          >
                            Lire le résumé complet →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto bg-gray-50 px-5 py-3 flex justify-between items-center border-t border-gray-100">
                  <button
                    onClick={() => handleDeleteCV(item.id)}
                    className="text-gray-400 hover:text-red-500 p-2 -ml-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                    title="Supprimer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setSelectedAnalysis(item)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Voir les détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Retour à la liste</span>
              </button>
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAnalysis.cv_file_name}</h2>
                    <p className="text-gray-600 mt-1">
                      <span className="font-medium">Analysé le :</span> {formatDate(selectedAnalysis.created_at)}
                    </p>
                  </div>
                  
                  {selectedAnalysis.match_score !== undefined && (
                    <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-100">
                      <div className="text-sm font-medium text-gray-700 mb-1">Score de correspondance</div>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-blue-600">{selectedAnalysis.match_score.toFixed(1)}</span>
                        <span className="text-gray-500 ml-1">/ 100</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      Détails de l'analyse
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">Catégorie prédite</span>
                        <span className="font-medium text-gray-900">
                          {selectedAnalysis.predicted_category || 'Non spécifié'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">Niveau d'expérience</span>
                        <span className="font-medium text-gray-900">
                          {selectedAnalysis.experience_level || 'Non spécifié'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">Confiance</span>
                        <span className="font-medium text-gray-900">
                          {selectedAnalysis.confidence_score ? `${selectedAnalysis.confidence_score}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      Compétences identifiées
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.skills && selectedAnalysis.skills.length > 0 ? (
                        selectedAnalysis.skills.map((skill: string, index: number) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">Aucune compétence identifiée</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedAnalysis.summary && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Résumé d'analyse</h3>
                  </div>
                  <div className="p-5">
                    <div className="prose max-w-none text-gray-700">
                      {selectedAnalysis.summary.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}