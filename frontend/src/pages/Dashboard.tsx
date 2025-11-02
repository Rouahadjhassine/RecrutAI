import React, { useState } from 'react';
import { User } from '../types';
import { Header } from '../components/Shared/Header';
import { Sidebar } from '../components/Shared/Sidebar';
import CandidatDashboard from './candidat/Dashboard';
import UploadCV from './candidat/UploadCV';
import AnalyzeJob from './candidat/AnalyzeJob';
import { Dashboard as RecruteurDashboard, PostJob, AnalyzeCVs, SendEmails } from './recruteur';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState(
    user.role === 'candidat' ? 'candidat-dashboard' : 'recruteur-dashboard'
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  const renderPage = () => {
    switch (currentPage) {
      case 'candidat-dashboard':
        return <CandidatDashboard user={user} onLogout={onLogout} />;
      case 'candidat-upload':
        return <UploadCV />;
      case 'candidat-analyze':
        return <AnalyzeJob />;
      case 'recruteur-dashboard':
        return <RecruteurDashboard user={user} onLogout={onLogout} />;
      case 'recruteur-post':
        return <PostJob user={user} onLogout={onLogout} />;
      case 'recruteur-analyze':
        return <AnalyzeCVs user={user} onLogout={onLogout} onSelectCVs={setSelectedCandidates} />;
      case 'recruteur-email':
        return <SendEmails user={user} onLogout={onLogout} selectedCandidates={selectedCandidates} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header
        user={user}
        onLogout={onLogout}
        role={user.role}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          role={user.role}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
        />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
};