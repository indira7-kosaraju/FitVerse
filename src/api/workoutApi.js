import api, { unwrap, toPaged, cleanParams } from './axios';

/* ---------- Workout log ---------- */
/** params: { from, to, page, limit, sort } */
export const getMyWorkouts = (params) => api.get('/workouts/me', { params: cleanParams(params) }).then(toPaged);
export const createWorkout = (data) => api.post('/workouts', data).then(unwrap);
export const updateWorkout = (id, data) => api.put(`/workouts/${id}`, data).then(unwrap);
export const deleteWorkout = (id) => api.delete(`/workouts/${id}`).then(unwrap);

/* ---------- Workout plans ---------- */
export const getMyPlan = () => api.get('/workout-plans/me').then(unwrap);
export const completePlanDay = (planId, dayId, completed = true) =>
  api.patch(`/workout-plans/${planId}/days/${dayId}/complete`, { completed }).then(unwrap);

/** Trainer: create a plan for a client. data: { member, title, weeks } */
export const createWorkoutPlan = (data) => api.post('/workout-plans', data).then(unwrap);
/** Trainer: update a plan. Body includes _id so it works with PUT /workout-plans or /workout-plans/:id */
export const updateWorkoutPlan = (id, data) => api.put(`/workout-plans/${id}`, { ...data, _id: id }).then(unwrap);
/** Assumed endpoint: GET /workout-plans?member=:id — returns the client's current plan (or null) */
export const getClientPlan = (memberId) =>
  api.get('/workout-plans', { params: { member: memberId } }).then((res) => {
    const body = unwrap(res);
    if (Array.isArray(body)) return body[0] || null;
    if (Array.isArray(body?.data)) return body.data[0] || null;
    return body || null;
  });
