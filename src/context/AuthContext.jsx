import { createContext, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import toast from 'react-hot-toast';
import * as authApi from '../api/authApi';
import { configureAuthHandlers, refreshAccessToken, setAccessToken } from '../api/axios';

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  accessToken: null,
  status: 'loading', // loading | authenticated | unauthenticated
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.user, accessToken: action.accessToken, status: 'authenticated' };
    case 'TOKEN_REFRESHED':
      return { ...state, accessToken: action.accessToken };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.user } };
    case 'LOGOUT':
      return { user: null, accessToken: null, status: 'unauthenticated' };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  const bootstrapped = useRef(false);

  // Let the axios interceptor keep React state in sync.
  useEffect(() => {
    configureAuthHandlers({
      onTokenRefreshed: (accessToken) => dispatch({ type: 'TOKEN_REFRESHED', accessToken }),
      onAuthFailure: () => {
        if (statusRef.current === 'authenticated') {
          toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
        }
        // ProtectedRoute redirects to /login once status flips.
        dispatch({ type: 'LOGOUT' });
      },
    });
  }, []);

  // Restore the session on app load: refresh (cookie) → /auth/me.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        const accessToken = await refreshAccessToken();
        const me = await authApi.getMe();
        dispatch({ type: 'LOGIN_SUCCESS', user: me?.user ?? me, accessToken });
      } catch {
        setAccessToken(null);
        dispatch({ type: 'LOGOUT' });
      }
    })();
  }, []);

  const handleAuthPayload = useCallback((payload) => {
    const { user, accessToken } = payload || {};
    if (!user || !accessToken) throw new Error('Unexpected response from server');
    setAccessToken(accessToken);
    dispatch({ type: 'LOGIN_SUCCESS', user, accessToken });
    return user;
  }, []);

  const login = useCallback(async (credentials) => handleAuthPayload(await authApi.login(credentials)), [handleAuthPayload]);

  const register = useCallback(async (data) => handleAuthPayload(await authApi.register(data)), [handleAuthPayload]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors — clear local session regardless.
    }
    setAccessToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((user) => dispatch({ type: 'UPDATE_USER', user }), []);

  const value = useMemo(
    () => ({
      user: state.user,
      accessToken: state.accessToken,
      status: state.status,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      role: state.user?.role ?? null,
      login,
      register,
      logout,
      updateUser,
    }),
    [state, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
