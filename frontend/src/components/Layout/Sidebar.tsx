// components/Layout/Sidebar.tsx
import { Home, FileText, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../../hooks/useLogout';

export default function Sidebar() {
  const { logout } = useLogout();
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 p-6">
      <h2 className="text-2xl font-bold text-purple-600 mb-8">RecrutAI</h2>
      <nav className="space-y-2">
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 text-left">
          <Home className="w-5 h-5" /> Dashboard
        </button>
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 text-left">
          <FileText className="w-5 h-5" /> CVs
        </button>
        <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 text-left">
          <Settings className="w-5 h-5" /> Paramètres
        </button>
      </nav>
      <button
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="absolute bottom-6 left-6 flex items-center gap-3 text-red-600 hover:text-red-800"
      >
        <LogOut className="w-5 h-5" /> Déconnexion
      </button>
    </div>
  );
}