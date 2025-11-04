// src/App.tsx
import React from 'react';
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

  console.log('ProtectedRoute - État actuel:', { 
    loading, 
    user: user ? { ...user, role: user.role } : 'non connecté',
    requiredRole 
  });

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('ProtectedRoute - Chargement en cours...');
    return <LoadingSpinner />;
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    console.log('ProtectedRoute - Utilisateur non connecté, redirection vers /login');
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  // If a role is required and the user doesn't have it, redirect to the appropriate dashboard
  if (requiredRole && user.role !== requiredRole) {
    console.log(`ProtectedRoute - Rôle requis: ${requiredRole}, Rôle actuel: ${user.role}`);
    const redirectPath = user.role === 'candidat' 
      ? "/candidat/dashboard" 
      : "/recruteur/dashboard";
    
    console.log(`ProtectedRoute - Redirection vers: ${redirectPath}`);
    return <Navigate to={redirectPath} replace />;
  }

  // If we get here, the user is authenticated and has the required role
  console.log('ProtectedRoute - Accès autorisé');
  return <>{children}</>;
};

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

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
              <Login 
                onLoginSuccess={(role) => {
                  console.log('Login réussi, rôle:', role);
                  // La navigation est gérée dans le composant Login
                }} 
              />
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
          path="/upload"
          element={
            <ProtectedRoute requiredRole="candidat">
              <UploadPage user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyze"
          element={
            <ProtectedRoute requiredRole="candidat">
              <AnalyzePage user={user!} />
            </ProtectedRoute>
          }
        />

        {/* Routes RECRUTEUR */}
        <Route
          path="/recruteur/dashboard"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <RecruteurDashboard user={user!} onLogout={logout} loading={loading} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rank"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <RankPage user={user!} />
            </ProtectedRoute>
          }
        />

        {/* Routes COMMUNES */}
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

        {/* Route 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export default App;