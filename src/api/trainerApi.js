import api, { unwrap, toPaged, cleanParams } from './axios';

/** params: { search, specialization, page, limit } — returns paged User (role trainer) */
export const getTrainers = (params) => api.get('/trainers', { params: cleanParams(params) }).then(toPaged);
export const getTrainer = (id) => api.get(`/trainers/${id}`).then(unwrap);
/** Returns paged User (members assigned to the trainer) */
export const getTrainerClients = (id, params) =>
  api.get(`/trainers/${id}/clients`, { params: cleanParams(params) }).then(toPaged);
