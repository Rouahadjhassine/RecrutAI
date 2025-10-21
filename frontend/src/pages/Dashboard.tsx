import React, { useState } from 'react';
import { User } from '../types';
import { Header } from '../components/Shared/Header';
import { Sidebar } from '../components/Shared/Sidebar';
import { CandidatDashboard } from '../components/Candidat/Dashboard';
import { UploadCV } from '../components/Candidat/UploadCV';
import { AnalyzeJob } from '../components/Candidat/AnalyzeJob';
import { RecruteurDashboard } from '../components/Recruteur/Dashboard';
import { PostJob } from '../components/Recruteur/PostJob';
import { AnalyzeCVs } from '../components/Recruteur/AnalyzeCVs';
import { SendEmails } from '../components/Recruteur/SendEmails';

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
        return <CandidatDashboard user={user} />;
      case 'candidat-upload':
        return <UploadCV />;
      case 'candidat-analyze':
        return <AnalyzeJob />;
      case 'recruteur-dashboard':
        return <RecruteurDashboard user={user} />;
      case 'recruteur-post':
        return <PostJob />;
      case 'recruteur-analyze':
        return <AnalyzeCVs onSelectCVs={setSelectedCandidates} />;
      case 'recruteur-email':
        return <SendEmails selectedCandidates={selectedCandidates} />;
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
        />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
};