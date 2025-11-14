// src/pages/HistoryPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import { cvService } from '../services/cvService';

export default function HistoryPage({ user }: { user: User | null }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCV, setSelectedCV] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Charger l'historique uniquement si l'utilisateur est connecté
    cvService.getHistory().then(res => {
      setHistory(res);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user, navigate]);

  const handleDeleteCV = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      try {
        // Utiliser deleteCV au lieu de deleteAnalysis
        await cvService.deleteCV(id);
        setHistory(history.filter(item => item.id !== id));
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleViewCV = (cv: any) => {
    setSelectedCV(cv);
    setShowModal(true);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600">
      <Navbar user={user} onLogout={() => {}} role={user.role} />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Historique des analyses
        </h2>

        {loading ? (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl shadow-2xl p-12 text-center">
            <p className="text-gray-600">Aucune analyse effectuée</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        Analyse du {new Date(item.created_at).toLocaleDateString()}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Score: <span className="font-medium">{item.score}%</span>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewCV(item)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Voir le CV
                      </button>
                      <button
                        onClick={() => handleDeleteCV(item.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Modal d'affichage du CV */}
        {showModal && selectedCV && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Détails du CV</h3>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-700">Informations personnelles</h4>
                      <p className="mt-2">
                        <span className="font-medium">Nom:</span> {selectedCV.candidate_name || 'Non spécifié'}
                      </p>
                      <p>
                        <span className="font-medium">Email:</span> {selectedCV.candidate_email || 'Non spécifié'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-700">Détails de l'analyse</h4>
                      <p className="mt-2">
                        <span className="font-medium">Score:</span> {selectedCV.score}%
                      </p>
                      <p>
                        <span className="font-medium">Date:</span> {new Date(selectedCV.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    {selectedCV.matched_keywords && selectedCV.matched_keywords.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700">Compétences correspondantes</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedCV.matched_keywords.map((keyword: string, index: number) => (
                            <span key={index} className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedCV.missing_keywords && selectedCV.missing_keywords.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700">Compétences manquantes</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedCV.missing_keywords.map((keyword: string, index: number) => (
                            <span key={index} className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}