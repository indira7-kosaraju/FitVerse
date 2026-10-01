import api, { unwrap, toPaged, cleanParams } from './axios';

/* ---------- Plans ---------- */
export const getPlans = (params) => api.get('/plans', { params: cleanParams(params) }).then(toPaged);
export const createPlan = (data) => api.post('/plans', data).then(unwrap);
export const updatePlan = (id, data) => api.put(`/plans/${id}`, data).then(unwrap);
export const deletePlan = (id) => api.delete(`/plans/${id}`).then(unwrap);

/* ---------- Memberships ---------- */
/** Returns the current Membership (plan populated) or null */
export const getMyMembership = () =>
  api
    .get('/memberships/me')
    .then(unwrap)
    .catch((err) => {
      if (err.response?.status === 404) return null;
      throw err;
    });
export const subscribe = (planId) => api.post('/memberships/subscribe', { planId }).then(unwrap);
export const cancelMembership = (id) => api.patch(`/memberships/${id}/cancel`).then(unwrap);

/** Admin. params: { status, plan, page, limit, sort } */
export const getMemberships = (params) => api.get('/memberships', { params: cleanParams(params) }).then(toPaged);
/** Admin. freeze=false re-activates a frozen membership. */
export const freezeMembership = (id, freeze = true) =>
  api.patch(`/memberships/${id}/freeze`, { freeze }).then(unwrap);

/* ---------- Payments ---------- */
export const getMyPayments = (params) => api.get('/payments/me', { params: cleanParams(params) }).then(toPaged);
/** Admin. params: { status, from, to, search, page, limit, sort } */
export const getPayments = (params) => api.get('/payments', { params: cleanParams(params) }).then(toPaged);
