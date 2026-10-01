import api, { unwrap, toPaged, cleanParams } from './axios';

/* ---------- Analytics ---------- */
/** AdminStats { activeMembers, revenueMTD, checkInsToday, churnRate, newMembersThisMonth, membershipMix? } */
export const getStats = () => api.get('/admin/stats').then(unwrap);
/** range: '7d' | '30d' | '12m' → [{ label|date, amount|revenue }] */
export const getRevenue = (range = '30d', params) =>
  api.get('/admin/revenue', { params: cleanParams({ range, ...params }) }).then(unwrap);
/** → [{ hour, count }] */
export const getPeakHours = () => api.get('/admin/peak-hours').then(unwrap);

/** Downloads a CSV report. params: { type, from, to, report } */
export const exportReport = async (params = {}) => {
  const res = await api.get('/admin/reports/export', {
    params: cleanParams({ type: 'csv', ...params }),
    responseType: 'blob',
  });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `fitverse-report-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
};

/* ---------- Users (admin) ---------- */
/** params: { role, search, status, page, limit, sort } */
export const getUsers = (params) => api.get('/users', { params: cleanParams(params) }).then(toPaged);
export const getUser = (id) => api.get(`/users/${id}`).then(unwrap);
/** Assumed endpoint: POST /users (admin creates trainer accounts) */
export const createUser = (data) => api.post('/users', data).then(unwrap);
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then(unwrap);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(unwrap);

/* ---------- Gym settings (assumed endpoints) ---------- */
export const getSettings = () => api.get('/admin/settings').then(unwrap);
export const updateSettings = (data) => api.put('/admin/settings', data).then(unwrap);
