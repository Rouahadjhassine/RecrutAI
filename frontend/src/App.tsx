// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { LoadingSpinner } from './components/Shared/LoadingSpinner';
import CandidatDashboard from './components/Dashboard/CandidatDashboard';
import RecruteurDashboard from './components/Dashboard/RecruteurDashboard';
import CandidatAnalysisPage from './pages/CandidatAnalysisPage';
import RecruteurAnalysisPage from './pages/RecruteurAnalysisPage';
import HistoryPage from './pages/HistoryPage';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'candidat' | 'recruteur' 
}> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  if (requiredRole && user.role !== requiredRole) {
    const redirectPath = user.role === 'candidat' 
      ? "/candidat/dashboard" 
      : "/recruteur/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <LoadingSpinner />;

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

      {/* Routes CANDIDAT */}
      <Route
        path="/candidat/dashboard"
        element={
          <ProtectedRoute requiredRole="candidat">
            <CandidatDashboard user={user!} onLogout={logout} loading={loading} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidat/analyze"
        element={
          <ProtectedRoute requiredRole="candidat">
            <CandidatAnalysisPage user={user!} />
          </ProtectedRoute>
        }
      />

      {/* Routes RECRUTEUR */}
      <Route
        path="/recruteur/dashboard"
        element={
          <ProtectedRoute requiredRole="recruteur">
            <RecruteurDashboard user={user!} onLogout={logout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruteur/analyze"
        element={
          <ProtectedRoute requiredRole="recruteur">
            <RecruteurAnalysisPage user={user!} />
          </ProtectedRoute>
        }
      />

      {/* Route commune : Historique */}
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage user={user!} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;