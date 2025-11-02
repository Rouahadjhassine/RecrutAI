// src/components/Layout/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Upload,
  Search,
  Users,
  BarChart3,
  Mail,
  Briefcase,
  Settings,
  Star,
  TrendingUp,
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  role: 'candidat' | 'recruteur';
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role, 
  currentPage, 
  onNavigate, 
  isOpen, 
  onClose,
  user 
}) => {
  const location = useLocation();

  const candidatMenuItems = [
    { path: '/candidat/dashboard', label: 'Dashboard', icon: Home },
    { path: '/candidat/upload', label: 'Mon CV', icon: Upload },
    { path: '/candidat/analyze', label: 'Analyser une offre', icon: Search },
    { path: '/candidat/profile', label: 'Mon Profil', icon: Users },
  ];

  const recruteurMenuItems = [
    { path: '/recruteur/dashboard', label: 'Dashboard', icon: Home },
    { path: '/recruteur/cvs', label: 'CVs Candidats', icon: Users },
    { path: '/recruteur/analyze', label: 'Analyser CV', icon: Search },
    { path: '/recruteur/rank', label: 'Classer CVs', icon: TrendingUp },
    { path: '/recruteur/emails', label: 'Envoyer Emails', icon: Mail },
    { path: '/recruteur/offers', label: 'Mes Offres', icon: Briefcase },
  ];

  const menuItems = role === 'candidat' ? candidatMenuItems : recruteurMenuItems;
  const bgGradient =
    role === 'candidat'
      ? 'from-blue-600 via-blue-700 to-indigo-800'
      : 'from-purple-600 via-purple-700 to-pink-800';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-gradient-to-b ${bgGradient} transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-white border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition">
              <BarChart3
                className={`w-7 h-7 ${
                  user.role === 'candidat' ? 'text-blue-600' : 'text-purple-600'
                }`}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">RecrutAI</h1>
              <p className="text-xs text-white text-opacity-70 font-medium">
                {user.role === 'candidat' ? '👤 Candidat' : '👔 Recruteur'}
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-b border-white border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-white to-gray-100 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg">
                <span className={user.role === 'candidat' ? 'text-blue-600' : 'text-purple-600'}>
                  {user.first_name[0]}
                  {user.last_name[0]}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm text-white text-opacity-70 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white shadow-lg transform scale-105'
                      : 'text-white hover:bg-white hover:bg-opacity-10 hover:translate-x-1'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? user.role === 'candidat'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                        : 'text-white group-hover:scale-110 transition'
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      isActive
                        ? user.role === 'candidat'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                        : 'text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Settings Button */}
          <div className="mt-6 pt-6 border-t border-white border-opacity-10">
            <Link
              to={`/${user.role}/settings`}
              className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white hover:bg-opacity-10 rounded-xl transition"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Paramètres</span>
            </Link>
          </div>
        </nav>

        {/* Bottom Section - Tips */}
        <div className="p-4 m-4 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl border border-white border-opacity-20">
          <div className="flex items-start gap-3">
            <Star className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-white mb-1">💡 Conseil du jour</p>
              <p className="text-xs text-white text-opacity-80 leading-relaxed">
                {user.role === 'candidat'
                  ? 'Mettez à jour régulièrement votre CV pour maximiser vos chances !'
                  : 'Utilisez les filtres NLP pour trouver les meilleurs talents rapidement.'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </>
  );
};