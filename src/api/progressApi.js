import api, { unwrap, toPaged, cleanParams } from './axios';

/** params: { from, to, page, limit, sort } */
export const getMyProgress = (params) => api.get('/progress/me', { params: cleanParams(params) }).then(toPaged);
export const createProgress = (data) => api.post('/progress', data).then(unwrap);
export const deleteProgress = (id) => api.delete(`/progress/${id}`).then(unwrap);

export const uploadProgressPhotos = (id, files, onUploadProgress) => {
  const form = new FormData();
  Array.from(files).forEach((file) => form.append('photos', file));
  return api.post(`/progress/${id}/photos`, form, { onUploadProgress }).then(unwrap);
};

/** Assumed endpoint for trainers: GET /progress?member=:id&from&to */
export const getClientProgress = (memberId, params) =>
  api.get('/progress', { params: cleanParams({ member: memberId, ...params }) }).then(toPaged);
