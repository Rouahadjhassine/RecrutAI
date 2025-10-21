import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { LoadingSpinner } from './components/Shared/LoadingSpinner';

function App() {
  const { user, loading, login, register, logout } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <ProtectedRoute>
      <Dashboard user={user} onLogout={logout} />
    </ProtectedRoute>
  );
}

export default App;