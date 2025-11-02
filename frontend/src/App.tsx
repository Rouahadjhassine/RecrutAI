import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import CandidatDashboard from './pages/candidat/Dashboard';
import RecruteurDashboard from './pages/recruteur/Dashboard';
import { LoadingSpinner } from './components/Shared/LoadingSpinner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authService } from './services/authService';

function App() {
  const { user, loading, logout } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Effet pour gérer le chargement initial
  useEffect(() => {
    // Désactiver le chargement initial après un court délai
    // pour éviter les clignotements inutiles
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  console.log('App - État actuel:', { 
    user, 
    loading, 
    showRegister, 
    initialLoading,
    isAuthenticated: authService.isAuthenticated()
  });

  // Afficher le spinner uniquement pendant le chargement initial
  if (initialLoading || loading) {
    console.log('App - Affichage du spinner de chargement');
    return <LoadingSpinner />;
  }

  // Si l'utilisateur n'est pas connecté, afficher le formulaire de connexion ou d'inscription
  if (!user) {
    console.log('App - Aucun utilisateur connecté, affichage du formulaire de connexion ou d\'inscription');
    
    if (showRegister) {
      console.log('App - Affichage du formulaire d\'inscription');
      return (
        <Register 
          onRegisterSuccess={() => {
            // Après une inscription réussie, on revient à la page de connexion
            console.log('App - Inscription réussie, retour au formulaire de connexion');
            setShowRegister(false);
          }} 
        />
      );
    }
    
    console.log('App - Affichage du formulaire de connexion');
    return (
      <Login 
        onLoginSuccess={async (userRole) => {
          console.log('App - Connexion réussie, rôle reçu:', userRole);
          
          // Vérifier si le rôle est valide
          const normalizedRole = String(userRole).toLowerCase().trim();
          if (!['candidat', 'recruteur'].includes(normalizedRole)) {
            console.error('Rôle non reconnu après connexion:', userRole);
            // Déconnexion si le rôle n'est pas valide
            await logout();
            return;
          }
          
          // Attendre un court instant pour permettre la mise à jour de l'état
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Forcer un re-rendu complet
          setInitialLoading(true);
          
          // Simuler un rechargement de la page pour forcer la réinitialisation de l'état
          window.location.reload();
        }} 
        onShowRegister={() => {
          console.log('App - Affichage du formulaire d\'inscription');
          setShowRegister(true);
        }} 
      />
    );
  }

  console.log('App - Utilisateur connecté, affichage du tableau de bord');
  
  // Rendu conditionnel basé sur le rôle de l'utilisateur
  const renderDashboard = () => {
    // Vérification que l'utilisateur est bien défini
    if (!user) {
      console.error('Erreur: l\'utilisateur est null ou undefined');
      return (
        <div className="p-4">
          <h2 className="text-xl font-bold text-red-600 mb-2">Erreur</h2>
          <p>Les informations de l'utilisateur ne sont pas disponibles.</p>
          <button 
            onClick={logout}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Se déconnecter
          </button>
        </div>
      );
    }

    console.log('Rôle de l\'utilisateur:', user.role, '(type:', typeof user.role, ')');
    console.log('Données complètes de l\'utilisateur:', user);
    
    // Normalisation du rôle (en minuscules et sans espaces)
    const normalizedRole = String(user.role).toLowerCase().trim();
    
    // Vérification du chemin actuel et du rôle
    const currentPath = window.location.pathname;
    const isOnCandidatPath = currentPath.startsWith('/candidat');
    const isOnRecruteurPath = currentPath.startsWith('/recruteur');
    
    // Vérifier si l'utilisateur a accès à la page demandée
    if ((normalizedRole === 'candidat' && isOnRecruteurPath) || 
        (normalizedRole === 'recruteur' && isOnCandidatPath)) {
      console.warn(`Tentative d'accès non autorisé: ${currentPath} avec le rôle ${normalizedRole}`);
      // Rediriger vers le tableau de bord approprié
      const redirectPath = normalizedRole === 'candidat' ? '/candidat' : '/recruteur';
      window.location.href = redirectPath;
      return <LoadingSpinner message="Redirection en cours..." />;
    }
    
    switch(normalizedRole) {
      case 'candidat':
        return (
          <CandidatDashboard 
            user={user} 
            onLogout={logout} 
          />
        );
      case 'recruteur':
        return (
          <RecruteurDashboard 
            user={user} 
            onLogout={logout} 
          />
        );
      default:
        console.error('Rôle non reconnu:', user.role, 'Valeurs attendues: "candidat" ou "recruteur"');
        // Déconnexion automatique si le rôle n'est pas reconnu
        logout();
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold text-red-600 mb-2">Erreur de rôle</h2>
            <p>Le rôle de l'utilisateur n'est pas reconnu: <code>{String(user.role)}</code></p>
            <p className="mt-2">Vous allez être redirigé vers la page de connexion...</p>
          </div>
        );
    }
  };
  
  return (
    <>
      <ProtectedRoute>
        {renderDashboard()}
      </ProtectedRoute>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;