import React from 'react';
import { authService } from '../../services/authService';
import { Login } from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRoleChange?: (role: 'candidat' | 'recruteur') => void;
  onShowRegister?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onRoleChange, onShowRegister = () => {} }) => {
  if (!authService.isAuthenticated()) {
    const handleLoginSuccess = onRoleChange 
      ? (role?: 'candidat' | 'recruteur') => {
          if (role) {
            onRoleChange(role);
          }
        }
      : () => {};
      
    return <Login onLoginSuccess={handleLoginSuccess} onShowRegister={onShowRegister} />;
  }

  return <>{children}</>;
};