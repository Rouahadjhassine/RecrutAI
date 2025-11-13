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
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Analyse de CV et Offre d'Emploi
        </h2>
        
        <CVAnalysisWizard 
          user={user} 
          onAnalysisComplete={handleAnalysisComplete} 
        />
      </div>
    </div>
  );
}