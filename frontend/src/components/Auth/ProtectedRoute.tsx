import React from 'react';
import { authService } from '../../services/authService';
import { Login } from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRoleChange?: (role: 'candidat' | 'recruteur') => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onRoleChange }) => {
  if (!authService.isAuthenticated()) {
    return <Login onLoginSuccess={onRoleChange || (() => {})} />;
  }

  return <>{children}</>;
};