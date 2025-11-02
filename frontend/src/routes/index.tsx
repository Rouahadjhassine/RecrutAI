// src/routes/index.tsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Lazy load des composants
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const CandidatDashboard = lazy(() => import('../pages/candidat/Dashboard'));
const UploadCV = lazy(() => import('../pages/candidat/UploadCV'));
const AnalyzeJob = lazy(() => import('../pages/candidat/AnalyzeJob'));
import RecruteurDashboard from '../pages/recruteur/Dashboard';
const ListCVs = lazy(() => import('../pages/recruteur/ListCVs'));
const AnalyzeCV = lazy(() => import('../pages/recruteur/AnalyzeCV'));
const RankCVs = lazy(() => import('../pages/recruteur/RankCVs'));
const SendEmails = lazy(() => import('../pages/recruteur/SendEmails'));

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
        
        {/* Routes protégées candidat */}
        <Route
          path="/candidat"
          element={
            <ProtectedRoute requiredRole="candidat">
              <CandidatDashboard 
                user={user!} 
                onLogout={() => {
                  // Gérer la déconnexion si nécessaire
                  console.log('Déconnexion depuis le tableau de bord candidat');
                }} 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidat/upload"
          element={
            <ProtectedRoute requiredRole="candidat">
              <UploadCV />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidat/analyze"
          element={
            <ProtectedRoute requiredRole="candidat">
              <AnalyzeJob />
            </ProtectedRoute>
          }
        />
        
        {/* Routes protégées recruteur */}
        <Route
          path="/recruteur"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <RecruteurDashboard 
                user={user!} 
                onLogout={() => {
                  // Gérer la déconnexion si nécessaire
                  console.log('Déconnexion depuis le tableau de bord recruteur');
                }} 
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/cvs"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <ListCVs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/analyze/:id"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <AnalyzeCV />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/rank"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <RankCVs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/emails"
          element={
            <ProtectedRoute requiredRole="recruteur">
              <SendEmails 
                user={user!}
                onLogout={() => {
                  // Gérer la déconnexion si nécessaire
                  console.log('Déconnexion depuis la page d\'envoi d\'emails');
                }}
                selectedCandidates={[]}
              />
            </ProtectedRoute>
          }
        />
        
        {/* Redirection par défaut */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === 'candidat' ? '/candidat' : '/recruteur'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        {/* 404 */}
        <Route path="*" element={<div>404 - Page non trouvée</div>} />
      </Routes>
    </Suspense>
  );
};