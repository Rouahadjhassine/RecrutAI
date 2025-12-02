// src/pages/HistoryPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import { cvService } from '../services/cvService';
import { ArrowLeft } from 'lucide-react';

// Liste des mots à exclure des compétences
const EXCLUDED_WORDS = new Set([
  'inter', 'digital', 'retour', 'résultats', 'analyse', 'score', 'votre', 'cv',
  'correspond', 'à', 'des', 'exigences', 'de', 'loffre', 'compétences',
  'correspondantes', 'améliorer', 'résumé', 'du', 'profil', 'avec', 'ans',
  'expérience', 'professionnelle', 'clés', 'niveau', 'confiance', 'pourcent',
  'pourcentage', 'annee', 'année', 'mois', 'jour', 'date', 'années', 'mois', 'jours'
]);

// Fonction pour nettoyer et filtrer les compétences
const filterSkills = (skills?: string[]): string[] => {
  if (!skills) return [];
  
  return skills.filter(skill => {
    if (!skill) return false;
    
    const lowerSkill = skill.toLowerCase().trim();
    const words = lowerSkill.split(/[\s\-+_&,;.:/\\|]/);
    
    // Exclure les mots vides, trop courts ou dans la liste d'exclusion
    return (
      lowerSkill.length >= 2 && 
      !EXCLUDED_WORDS.has(lowerSkill) &&
      !words.some(word => EXCLUDED_WORDS.has(word)) &&
      !/^[0-9\s\-+_&,;.:/\\|]+$/.test(lowerSkill)
    );
  });
};

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
      
      // Log détaillé des données reçues
      console.group('Données d\'historique reçues :');
      console.log('Type de données:', Array.isArray(historyData) ? 'Tableau' : typeof historyData);
      console.log('Nombre d\'entrées:', Array.isArray(historyData) ? historyData.length : 'N/A');
      if (Array.isArray(historyData)) {
        console.log('Exemple d\'entrée:', historyData[0]);
        // Vérifier les doublons d'ID
        const ids = historyData.map(item => item.id);
        const uniqueIds = Array.from(new Set(ids));
      }
      console.groupEnd();
      
      // Vérifier si les données sont valides
      if (!Array.isArray(historyData)) {
        console.warn('Les données reçues ne sont pas un tableau:', historyData);
        setHistory([]);
        return;
      }

      // Créer un objet pour stocker les analyses uniques par ID
      const uniqueAnalyses = new Map<number, AnalysisItem>();
      
      // Parcourir toutes les analyses et garder la plus récente pour chaque ID
      historyData.forEach(analysis => {
        if (!analysis || typeof analysis !== 'object') return;
        
        const existing = uniqueAnalyses.get(analysis.id);
        
        // Si l'analyse n'existe pas encore ou si la date est plus récente
        if (!existing || 
            (analysis.created_at && 
             (!existing.created_at || new Date(analysis.created_at) > new Date(existing.created_at)))) {
          uniqueAnalyses.set(analysis.id, analysis);
        }
      });
      
      // Convertir la Map en tableau et trier par date décroissante
      const sortedHistory = Array.from(uniqueAnalyses.values()).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      console.log('Données après filtrage des doublons et tri:', sortedHistory);
      setHistory(sortedHistory);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="text-center bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-lg">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Chargement de votre historique...</h2>
          <p className="text-white/80 mt-2">Veuillez patienter un instant</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-sm p-6 text-center rounded-2xl shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <button
            onClick={loadHistory}
            className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role={user.role} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique des analyses</h1>
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
              <p className="text-gray-500 mt-1">
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
                        <div className="text-right">
                          <span className="font-medium text-gray-900">
                            {selectedAnalysis.predicted_category || 'Analyse en cours...'}
                          </span>
                          {selectedAnalysis.confidence_score && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {selectedAnalysis.confidence_score}% de confiance
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">Niveau d'expérience</span>
                        <span className="font-medium text-gray-900">
                          {selectedAnalysis.experience_level || 
                           (selectedAnalysis.summary && selectedAnalysis.summary.includes('expérience') ? 
                            'Détecté dans le CV' : 'Non spécifié')}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-600">Dernière mise à jour</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(selectedAnalysis.created_at)}
                        </span>
                      </div>
                      {selectedAnalysis.summary && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {selectedAnalysis.summary.split('\n')[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">
                        Compétences identifiées
                      </h3>
                      {(() => {
                        const filteredSkills = filterSkills(selectedAnalysis.skills);
                        return filteredSkills.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {filteredSkills.length} compétence{filteredSkills.length > 1 ? 's' : ''}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const filteredSkills = filterSkills(selectedAnalysis.skills);
                        return filteredSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {filteredSkills.map((skill: string, index: number) => (
                              <span 
                                key={index} 
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-200"
                                title={skill}
                              >
                                {skill.length > 20 ? `${skill.substring(0, 20)}...` : skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <svg 
                              className="mx-auto h-12 w-12 text-gray-400" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={1.5} 
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                              />
                            </svg>
                            <h4 className="mt-2 text-sm font-medium text-gray-700">Aucune compétence technique identifiée</h4>
                            <p className="mt-1 text-sm text-gray-500">
                              Essayez d'ajouter plus de détails sur vos compétences techniques dans votre CV.
                            </p>
                          </div>
                        );
                      })()}
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