import api, { unwrap } from './axios';

export const register = (data) => api.post('/auth/register', data).then(unwrap);
export const login = (data) => api.post('/auth/login', data).then(unwrap);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me').then(unwrap);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then(unwrap);
export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password }).then(unwrap);

/* ---------- Current user profile ---------- */
export const updateMe = (data) => api.patch('/users/me', data).then(unwrap);

export const uploadAvatar = (file, onUploadProgress) => {
  const form = new FormData();
  form.append('avatar', file);
  return api.post('/users/me/avatar', form, { onUploadProgress }).then(unwrap);
};

/** Assumed endpoint (not in the base contract): PATCH /users/me/password */
export const changePassword = ({ currentPassword, newPassword }) =>
  api.patch('/users/me/password', { currentPassword, newPassword }).then(unwrap);
