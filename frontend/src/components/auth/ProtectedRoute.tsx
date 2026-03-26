import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: 'administrator' | 'vendor' | 'buyer';
  unauthorizedRedirect?: string;
}

const ProtectedRoute = ({ children, requiredRole, unauthorizedRedirect = '/unauthorized' }: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useSelector(
    (state: RootState) => state.auth
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.user_type !== requiredRole) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // If children are passed, render them, otherwise render the Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;