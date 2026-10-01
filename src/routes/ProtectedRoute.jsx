import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Spinner from '../components/common/Spinner';
import useAuth from '../hooks/useAuth';
import { ROLE_HOME } from '../utils/constants';

/** Requires an authenticated session; otherwise redirects to /login (remembering where the user was going). */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner fullPage size="lg" label="Restoring your session…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children ?? <Outlet />;
}

/** For /login, /register etc. — signed-in users are bounced to their dashboard. */
export function GuestRoute({ children }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <Spinner fullPage size="lg" label="Loading…" />;
  if (status === 'authenticated') return <Navigate to={ROLE_HOME[user?.role] || '/'} replace />;
  return children ?? <Outlet />;
}
