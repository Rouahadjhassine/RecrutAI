// src/components/Dashboard/CandidatDashboard.tsx
import React, { useState } from 'react';
import { History, FileSearch, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import CVAnalysisWizard from '../CV/CVAnalysisWizard';
import Navbar from '../Layout/Navbar';

interface Props {
  user: User & { username?: string };
  onLogout: () => void;
}

const CandidatDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'dashboard' | 'analysis'>('dashboard');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Fonction pour gérer la fin de l'analyse
  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    setActiveView('dashboard'); // Revenir au tableau de bord avec les résultats
  };

  // Fonction pour retourner au tableau de bord
  const returnToDashboard = () => {
    setAnalysisResult(null);
    setActiveView('dashboard');
  };

  if (activeView === 'analysis') {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <CVAnalysisWizard 
            user={user} 
            onAnalysisComplete={handleAnalysisComplete}
            onBack={returnToDashboard}
          />
        </main>
      </div>
    );
  }

  // Afficher les résultats si disponibles
  if (analysisResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={onLogout} role="candidat" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center mb-6">
              <button
                onClick={returnToDashboard}
                className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Retour
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Résultats de l'analyse</h2>
            </div>
            
            {/* Score de correspondance */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3">Score de correspondance</h3>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full text-white text-sm font-medium flex items-center justify-center transition-all duration-1000"
                  style={{ width: `${analysisResult.match_score || 0}%` }}
                >
                  {analysisResult.match_score?.toFixed(1)}%
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Votre CV correspond à {analysisResult.match_score?.toFixed(1)}% des exigences de l'offre.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Compétences correspondantes */}
              <div className="bg-green-50 p-5 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-3">
                  Compétences correspondantes
                  <span className="ml-2 bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {analysisResult.matching_skills?.length || 0}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.matching_skills?.length > 0 ? (
                    analysisResult.matching_skills.map((skill: string, index: number) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Aucune compétence correspondante trouvée.</p>
                  )}
                </div>
              </div>
              
              {/* Compétences manquantes */}
              <div className="bg-amber-50 p-5 rounded-lg">
                <h3 className="text-lg font-medium text-amber-800 mb-3">
                  Compétences à améliorer
                  <span className="ml-2 bg-amber-200 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {analysisResult.missing_skills?.length || 0}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missing_skills?.length > 0 ? (
                    analysisResult.missing_skills.map((skill: string, index: number) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Toutes les compétences requises sont présentes !</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Résumé du CV */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Résumé du CV</h3>
              <div className="prose max-w-none">
                {analysisResult.summary ? (
                  <p className="text-gray-700 whitespace-pre-line">{analysisResult.summary}</p>
                ) : (
                  <p className="text-gray-500">Aucun résumé disponible.</p>
                )}
              </div>
            </div>
            
            {/* Conseils personnalisés */}
            {analysisResult.advice && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-800 mb-3">Conseils personnalisés</h3>
                <div className="prose max-w-none">
                  <p className="text-blue-700 whitespace-pre-line">{analysisResult.advice}</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setActiveView('analysis')}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Nouvelle analyse
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Vue normale du tableau de bord
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={onLogout} role="candidat" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          Bonjour, {user.first_name || user.username || 'Utilisateur'} !
        </h1>

        <p className="text-xl text-white/90 text-center mb-12">
          Que souhaitez-vous faire aujourd'hui ?
        </p>

        {/* Grille de boutons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bouton Analyse de CV */}
          <button
            onClick={() => setActiveView('analysis')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
          >
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <FileSearch className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyser un CV</h2>
            <p className="text-gray-600 text-center">
              Analysez votre CV avec une offre d'emploi pour évaluer votre adéquation
            </p>
          </button>

          {/* Bouton Historique */}
          <button
            onClick={() => navigate('history')}
            className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full"
          >
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <History className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Historique</h2>
            <p className="text-gray-600 text-center">
              Consultez vos analyses précédentes et vos statistiques
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatDashboard;