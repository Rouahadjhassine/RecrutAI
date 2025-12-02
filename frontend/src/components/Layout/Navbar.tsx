// src/components/Layout/Navbar.tsx
import { LogOut, BarChart3, History, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../../types';

interface Props {
  user: User;
  onLogout: () => void;
  role: 'candidat' | 'recruteur';
}

export default function Navbar({ user, onLogout, role }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Vérifier sur quelle page nous sommes
  const isAnalyzePage = location.pathname.includes('/analyze');
  const isHistoryPage = location.pathname.includes('/history');

  return (
    <nav className="bg-white/10 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">RecrutAI</h1>
        <div className="flex items-center gap-6">
          {role === 'candidat' ? (
            <>
              {isAnalyzePage || isHistoryPage ? (
                // Afficher le bouton Tableau de bord sur les pages d'analyse et d'historique
                <button 
                  onClick={() => navigate('/candidat/dashboard')} 
                  className="flex items-center gap-2 text-white hover:text-blue-200"
                >
                  <Home className="w-5 h-5" /> Tableau de bord
                </button>
              ) : (
                // Afficher le bouton Analyser sur les autres pages
                <button 
                  onClick={() => navigate('/candidat/analyze')} 
                  className="flex items-center gap-2 text-white hover:text-blue-200"
                >
                  <BarChart3 className="w-5 h-5" /> Analyser
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={() => navigate('/recruteur/ranking')} 
              className="flex items-center gap-2 text-white hover:text-purple-200"
            >
              <BarChart3 className="w-5 h-5" /> Classement
            </button>
          )}
          <button 
            onClick={() => navigate(role === 'candidat' ? '/candidat/history' : '/recruteur/history')} 
            className="flex items-center gap-2 text-white hover:text-green-200"
          >
            <History className="w-5 h-5" /> Historique
          </button>
          <div className="flex items-center gap-3 text-white">
            <span className="text-sm font-medium">
              {user.first_name || user.email?.split('@')[0] || 'Utilisateur'}
            </span>
            <button onClick={onLogout} className="text-red-300 hover:text-red-100">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}