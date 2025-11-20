// src/components/Layout/Navbar.tsx
import { LogOut, Upload, BarChart3, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';

interface Props {
  user: User;
  onLogout: () => void;
  role: 'candidat' | 'recruteur';
}

export default function Navbar({ user, onLogout, role }: Props) {
  const navigate = useNavigate();

  return (
    <nav className="bg-white/10 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">RecrutAI</h1>
        <div className="flex items-center gap-6">
          {role === 'candidat' ? (
            <>
              <button onClick={() => navigate('/upload')} className="flex items-center gap-2 text-white hover:text-blue-200">
                <Upload className="w-5 h-5" /> Upload
              </button>
              <button onClick={() => navigate('/analyze')} className="flex items-center gap-2 text-white hover:text-blue-200">
                <BarChart3 className="w-5 h-5" /> Analyser
              </button>
            </>
          ) : (
            <button onClick={() => navigate('rank')} className="flex items-center gap-2 text-white hover:text-purple-200">
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
            <span className="text-sm font-medium">{user.first_name}</span>
            <button onClick={onLogout} className="text-red-300 hover:text-red-100">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}