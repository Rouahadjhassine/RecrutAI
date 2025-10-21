import React from 'react';
import { FileText, Briefcase, BarChart3, Mail, Users, X } from 'lucide-react';

interface SidebarProps {
  role: 'candidat' | 'recruteur';
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onNavigate, isOpen = true, onClose }) => {
  const menuItems =
    role === 'candidat'
      ? [
          { label: 'Dashboard', icon: FileText, page: 'candidat-dashboard' },
          { label: 'Mon CV', icon: FileText, page: 'candidat-upload' },
          { label: 'Analyser', icon: BarChart3, page: 'candidat-analyze' },
        ]
      : [
          { label: 'Dashboard', icon: Briefcase, page: 'recruteur-dashboard' },
          { label: 'Publier', icon: Briefcase, page: 'recruteur-post' },
          { label: 'Analyser', icon: BarChart3, page: 'recruteur-analyze' },
          { label: 'Envoyer Email', icon: Mail, page: 'recruteur-email' },
        ];

  return (
    <>
      {!isOpen && role === 'candidat' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={onClose} />
      )}
      <div
        className={`fixed lg:static left-0 top-0 h-full w-64 ${
          role === 'candidat' ? 'bg-blue-50' : 'bg-purple-50'
        } border-r border-gray-200 transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6">
          {onClose && (
            <button onClick={onClose} className="lg:hidden mb-4 text-gray-600 hover:text-gray-800">
              <X className="w-6 h-6" />
            </button>
          )}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    onClose?.();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? role === 'candidat'
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};