import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/** Must be nested inside ProtectedRoute. Users without an allowed role go to /403. */
export default function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/403" replace />;
  return children ?? <Outlet />;
}
