import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * The access token lives only in memory (module scope + AuthContext state).
 * The refresh token is an httpOnly cookie managed by the server.
 */
let accessToken = null;
let handlers = { onTokenRefreshed: () => {}, onAuthFailure: () => {} };
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

/** AuthContext registers callbacks so the interceptor can sync React state. */
export function configureAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

const extractToken = (payload) => payload?.accessToken ?? payload?.data?.accessToken ?? null;

/**
 * Single-flight refresh: concurrent 401s (and React StrictMode double effects)
 * share one POST /auth/refresh so rotating refresh tokens aren't invalidated.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = extractToken(res.data);
        if (!token) throw new Error('No access token in refresh response');
        setAccessToken(token);
        handlers.onTokenRefreshed(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.data instanceof FormData) {
    // Let the browser set multipart boundary.
    delete config.headers['Content-Type'];
  }
  return config;
});

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = AUTH_PATHS.some((p) => original?.url?.includes(p));

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        handlers.onAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

/* ---------- Response helpers ---------- */

/** For single-resource endpoints: accepts `{ data: X }`, `{ success, data: X }` or `X`. */
export const unwrap = (res) => {
  const body = res?.data;
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body && !('pages' in body)) {
    return body.data;
  }
  return body;
};

/** For list endpoints: returns `{ data, total, page, pages }` even if the API sends a bare array. */
export const toPaged = (res) => {
  const body = res?.data;
  if (Array.isArray(body)) return { data: body, total: body.length, page: 1, pages: 1 };
  if (Array.isArray(body?.data)) {
    return {
      data: body.data,
      total: body.total ?? body.data.length,
      page: body.page ?? 1,
      pages: body.pages ?? 1,
    };
  }
  return { data: [], total: 0, page: 1, pages: 1 };
};

/** Normalises a paged object or array into an array. */
export const toList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error.message === 'Network Error' && !error.response) return 'Cannot reach the server. Check your connection.';
  return error.response?.data?.message || error.message || fallback;
}

/** Backend field errors: `{ errors: { field: message } }` (also tolerates express-validator arrays). */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  if (!errors) return {};
  if (Array.isArray(errors)) {
    return errors.reduce((acc, e) => {
      const key = e.path || e.param || e.field;
      if (key) acc[key] = e.msg || e.message;
      return acc;
    }, {});
  }
  return errors;
}

/** Drops empty values so they don't end up as `?type=&trainer=` */
export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export default api;
