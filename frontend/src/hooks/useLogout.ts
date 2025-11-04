import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const useLogout = () => {
  const navigate = useNavigate();

  const logout = useCallback(() => {
    authService.logout();
    navigate('/login');
  }, [navigate]);

  return { logout };
};

export default useLogout;
