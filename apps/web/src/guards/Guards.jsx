import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export const AuthGuard = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

export const RoleGuard = ({ children, roles }) => {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) {
    const redirects = { super_admin: '/super-admin', admin: '/admin', agent: '/agent', customer: '/track' };
    return <Navigate to={redirects[user?.role] || '/login'} replace />;
  }
  return children;
};
