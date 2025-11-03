// src/components/Auth/ProtectedRoute.tsx
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../Shared/LoadingSpinner';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'candidat' | 'recruteur';
}

export const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};