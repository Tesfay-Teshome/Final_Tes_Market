import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { authAPI } from '@/services/api';
import { setUser, setLoading, setAuthError, loginSuccess } from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const checkAuth = async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        dispatch(setLoading(false));
        return;
      }

      try {
        // First try to get the current user with the existing token
        try {
          const response = await authAPI.getCurrentUser();
          dispatch(setUser(response.data));
          return;
        } catch (error) {
          console.log('Access token expired, attempting to refresh...');
        }

        // If that fails, try to refresh the token
        const refreshResponse = await authAPI.refreshToken(refreshToken);
        if (refreshResponse.data) {
          const { access } = refreshResponse.data;
          
          // Get user data with the new token
          const userResponse = await authAPI.getCurrentUser();
          dispatch(loginSuccess({ 
            user: userResponse.data,
            accessToken: access,
            refreshToken: refreshToken 
          }));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        dispatch(setUser(null));
        dispatch(setAuthError(error instanceof Error ? error.message : 'Authentication failed'));
      } finally {
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  return { user, isAuthenticated, loading, error };
};