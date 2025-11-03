// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoadingSpinner } from './components/Shared/LoadingSpinner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import UploadPage from './pages/UploadPage';
import AnalyzePage from './pages/AnalyzePage';
import RankPage from './pages/RankPage';
import HistoryPage from './pages/HistoryPage';

// Dashboards
import CandidatDashboard from './components/Dashboard/CandidatDashboard';
import RecruteurDashboard from './components/Dashboard/RecruteurDashboard';

function App() {
  const { user, loading, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (initialLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <>
        {showRegister ? (
          <Register onRegisterSuccess={() => setShowRegister(false)} />
        ) : (
          <Login
            onLoginSuccess={() => {
              window.location.href = '/dashboard';
            }}
            onShowRegister={() => setShowRegister(true)}
          />
        )}
      </>
    );
  }

  const role = user.role;

  return (
    <>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="/register" element={<Navigate to="/dashboard" />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {role === 'candidat' ? (
                <CandidatDashboard user={user} onLogout={logout} />
              ) : (
                <RecruteurDashboard user={user} onLogout={logout} />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute requiredRole="candidat">
              <UploadPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analyze"
          element={
            <ProtectedRoute requiredRole="candidat">
              <AnalyzePage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rank"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <RankPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={5000} />
    </>
  );
}

export default App;