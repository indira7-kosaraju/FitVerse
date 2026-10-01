import api, { unwrap, toPaged, cleanParams } from './axios';

export const createBooking = (classId) => api.post('/bookings', { classId }).then(unwrap);
/** params: { page, limit, sort, status } — returns paged Booking with populated gymClass */
export const getMyBookings = (params) => api.get('/bookings/me', { params: cleanParams(params) }).then(toPaged);
export const cancelBooking = (id) => api.delete(`/bookings/${id}`).then(unwrap);
/** status: 'attended' | 'no_show' */
export const markAttendance = (id, status = 'attended') =>
  api.patch(`/bookings/${id}/attend`, { status }).then(unwrap);

/* ---------- Gym check-in ---------- */
export const checkIn = () => api.post('/attendance/checkin').then(unwrap);
export const getMyAttendance = (params) => api.get('/attendance/me', { params: cleanParams(params) }).then(toPaged);
