import api, { unwrap, toPaged, cleanParams } from './axios';

/** params: { from, to, type, trainer, page, limit, sort } */
export const getClasses = (params) => api.get('/classes', { params: cleanParams(params) }).then(toPaged);
export const getClass = (id) => api.get(`/classes/${id}`).then(unwrap);
export const createClass = (data) => api.post('/classes', data).then(unwrap);
export const updateClass = (id, data) => api.put(`/classes/${id}`, data).then(unwrap);
export const deleteClass = (id) => api.delete(`/classes/${id}`).then(unwrap);
/** Returns bookings for a class: [{ _id, user: { _id, name, avatarUrl, email }, status }] */
export const getRoster = (id) => api.get(`/classes/${id}/roster`).then(toPaged);
