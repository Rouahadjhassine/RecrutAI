// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { LoadingSpinner } from './components/Shared/LoadingSpinner';
import CandidatDashboard from './components/Dashboard/CandidatDashboard';
import RecruteurDashboard from './components/Dashboard/RecruteurDashboard';
import UploadPage from './pages/UploadPage';
import AnalyzePage from './pages/AnalyzePage';
import RankPage from './pages/RankPage';
import HistoryPage from './pages/HistoryPage';

// Composant de protection des routes
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'candidat' | 'recruteur' 
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const [initialCheck, setInitialCheck] = useState(true);

  useEffect(() => {
    // Marquer que le contrôle initial est terminé après le premier rendu
    if (initialCheck) {
      setInitialCheck(false);
    }
  }, [initialCheck]);

  // Afficher un indicateur de chargement pendant le chargement initial
  if (loading && initialCheck) {
    return <LoadingSpinner />;
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!user) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  // Vérifier si l'utilisateur a le rôle requis
  if (requiredRole && user.role !== requiredRole) {
    // Rediriger vers le bon dashboard selon le rôle
    const redirectPath = user.role === 'candidat' ? '/candidat/dashboard' : '/recruteur/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Si tout est bon, afficher le contenu protégé
  return <>{children}</>;
};

function App() {
  const { user, loading, logout } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Marquer l'application comme initialisée après le premier rendu
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Afficher un indicateur de chargement pendant le chargement initial
  if (loading || !isInitialized) {
    return <LoadingSpinner />;
  }

  // Fonction pour rendre les routes protégées avec l'utilisateur
  const renderProtectedRoutes = (role: 'candidat' | 'recruteur') => {
    if (!user) return <Navigate to="/login" replace />;
    
    if (role === 'candidat') {
      return (
        <Routes>
          <Route path="dashboard" element={<CandidatDashboard user={user} onLogout={logout} />} />
          <Route path="upload" element={<UploadPage user={user} />} />
          <Route path="analyze" element={<AnalyzePage user={user} />} />
          <Route path="history" element={<HistoryPage user={user} />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      );
    } else {
      return (
        <Routes>
          <Route path="dashboard" element={<RecruteurDashboard user={user} onLogout={logout} />} />
          <Route path="rank" element={<RankPage user={user} />} />
          <Route path="history" element={<HistoryPage user={user} />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      );
    }
  };

  return (
    <Routes>
      {/* Routes publiques */}
      <Route 
        path="/login" 
        element={
          user ? (
            user.role === 'candidat' 
              ? <Navigate to="/candidat/dashboard" replace /> 
              : <Navigate to="/recruteur/dashboard" replace />
          ) : (
            <Login onLoginSuccess={() => {}} />
          )
        } 
      />
      <Route 
        path="/register" 
        element={
          user ? (
            user.role === 'candidat' 
              ? <Navigate to="/candidat/dashboard" replace /> 
              : <Navigate to="/recruteur/dashboard" replace />
          ) : (
            <Register onRegisterSuccess={() => {}} />
          )
        } 
      />

      {/* Routes protégées pour les candidats */}
      <Route 
        path="/candidat/*" 
        element={
          <ProtectedRoute requiredRole="candidat">
            {renderProtectedRoutes('candidat')}
          </ProtectedRoute>
        } 
      />

      {/* Routes protégées pour les recruteurs */}
      <Route 
        path="/recruteur/*" 
        element={
          <ProtectedRoute requiredRole="recruteur">
            {renderProtectedRoutes('recruteur')}
          </ProtectedRoute>
        } 
      />

      {/* Redirection par défaut */}
      <Route 
        path="/" 
        element={
          user ? (
            user.role === 'candidat' 
              ? <Navigate to="/candidat/dashboard" replace /> 
              : <Navigate to="/recruteur/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Route 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;