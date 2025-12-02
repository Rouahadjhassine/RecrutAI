// src/pages/AnalyzePage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar';
import { User } from '../types';
import CVAnalysisWizard from '../components/CV/CVAnalysisWizard';

export default function AnalyzePage({ user }: { user: User | null }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // ou un composant de chargement
  }

  const handleAnalysisComplete = (result: any) => {
    console.log('Analyse terminée avec succès:', result);
    // Vous pouvez ajouter ici une logique supplémentaire après l'analyse
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600">
      <Navbar user={user} onLogout={() => {}} role="candidat" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 mb-4">
            Analyse de CV et Offre d'Emploi
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Obtenez une évaluation détaillée de l'adéquation entre votre CV et l'offre d'emploi
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10 transform transition-all duration-300 hover:shadow-purple-500/20">
          <CVAnalysisWizard 
            user={user} 
            onAnalysisComplete={handleAnalysisComplete} 
          />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-blue-200 opacity-80">
            Notre IA analyse votre CV et le compare à l'offre d'emploi pour vous donner des conseils personnalisés
          </p>
        </div>
      </div>
      
      {/* Effets de fond décoratifs */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-blue-500/10 to-transparent opacity-30"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-[200%] h-[200%] bg-gradient-radial from-purple-500/10 to-transparent opacity-30"></div>
      </div>
    </div>
  );
}