import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authAPI } from '@/services/api';
import { setUser, setLoading, logout as logoutAction } from '@/store/slices/authSlice';

const useCheckAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken) {
        dispatch(setLoading(false));
        return;
      }

      try {
        // First try to get the current user with the existing token
        const response = await authAPI.getCurrentUser().catch(async (error) => {
          // If we get a 401 and we have a refresh token, try to refresh
          if (error.response?.status === 401 && refreshToken) {
            try {
              const refreshResponse = await authAPI.refreshToken(refreshToken);
              if (refreshResponse?.data?.access) {
                localStorage.setItem('access_token', refreshResponse.data.access);
                const userResponse = await authAPI.getCurrentUser();
                return userResponse;
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              throw new Error('Session expired. Please log in again.');
            }
          }
          throw error;
        });

        if (response?.data) {
          dispatch(setUser(response.data));
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Clear auth state and redirect to login
        dispatch(logoutAction());
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Don't force redirect, let the routing handle it
        console.log('Authentication failed, user logged out');
      } finally {
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  // Return the current auth state
  return {
    // Add any additional auth-related methods or state if needed
  };
};

export default useCheckAuth;