import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  role?: 'candidat' | 'recruteur';
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, role, onMenuToggle }) => {
  const bgColor = role === 'recruteur' ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <header className={`${bgColor} shadow-lg`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button onClick={onMenuToggle} className="text-white lg:hidden">
              <Menu className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white">RecrutAI</h1>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${role === 'recruteur' ? 'bg-purple-700' : 'bg-blue-700'} rounded-full flex items-center justify-center text-white font-bold`}>
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-white">{user.first_name}</p>
                <p className="text-sm text-gray-200">{user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-white hover:bg-black hover:bg-opacity-20 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};