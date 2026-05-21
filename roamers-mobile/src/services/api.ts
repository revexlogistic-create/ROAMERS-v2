import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/theme';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* Attach JWT on every request if stored */
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Unwrap API errors — attach status + full response data so callers can inspect extra fields */
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg  = err?.response?.data?.error || err?.message || 'Network error';
    const e    = new Error(msg) as any;
    e.status   = err?.response?.status;
    e.apiData  = err?.response?.data || {};
    return Promise.reject(e);
  }
);

/* Auth */
export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const register = (data: object) =>
  api.post('/api/auth/register', data).then((r) => r.data);

export const verifyOtp = (email: string, code: string) =>
  api.post('/api/auth/verify-otp', { email, code }).then((r) => r.data);

export const resendOtp = (email: string) =>
  api.post('/api/auth/resend-otp', { email }).then((r) => r.data);

export const getMe = () =>
  api.get('/api/auth/me').then((r) => r.data);

export const changePassword = (current: string, newPass: string) =>
  api.put('/api/auth/password', { current, newPass }).then((r) => r.data);

export const updateProfile = (data: { fname: string; lname: string; phone?: string; country?: string; bio?: string }) =>
  api.put('/api/auth/profile', data).then((r) => r.data);

export const toggleWishlist = (expId: string) =>
  api.post(`/api/auth/wishlist/${expId}`).then((r) => r.data);

export const deleteAccount = () =>
  api.delete('/api/auth/account').then((r) => r.data);

/* Experiences */
export const getExperiences = (params?: { segment?: string; type?: string }) =>
  api.get('/api/experiences', { params }).then((r) => r.data.experiences as any[]);

export const getExperience = (id: string) =>
  api.get(`/api/experiences/${id}`).then((r) => r.data.experience);

/* Bookings */
export const createBooking = (data: object) =>
  api.post('/api/bookings', data).then((r) => r.data);

export const getMyBookings = () =>
  api.get('/api/bookings').then((r) => r.data.bookings as any[]);

export const cancelBooking = (id: string) =>
  api.patch(`/api/bookings/${id}/cancel`).then((r) => r.data);

/* Forms */
export const sendContact = (data: object) =>
  api.post('/api/forms/contact', data).then((r) => r.data);

export const sendPlan = (data: object) =>
  api.post('/api/forms/plan', data).then((r) => r.data);

export const sendTeam = (data: object) =>
  api.post('/api/forms/team', data).then((r) => r.data);

export const saveItinerary = (data: object) =>
  api.post('/api/forms/itinerary', data).then((r) => r.data);

export const getMyPlanRequests = () =>
  api.get('/api/forms/plan/mine').then((r) => r.data.requests as any[]);

/* Site config */
export const getSiteConfig = () =>
  api.get('/api/site-config').then((r) => r.data);

/* App version */
export const getAppVersion = () =>
  api.get('/api/app-version').then((r) => r.data as { versionCode: number; versionName: string; downloadUrl: string; releaseNotes: string });

/* Payments */
export const createPaymentIntent = (bookingId: string) =>
  api.post('/api/payments/intent', { bookingId }).then((r) => r.data);

/* Activities */
export const getActivities = () =>
  api.get('/api/activities').then((r) => r.data.activities as any[]);

export const getActivity = (id: string) =>
  api.get(`/api/activities/${id}`).then((r) => r.data.activity);

/* Promos */
export const validatePromo = (code: string) =>
  api.get('/api/promos/validate', { params: { code } }).then(
    (r) => r.data.promo as { code: string; discountPct: number; label: string }
  );

/* Reviews */
export const getReviews = (expId: string) =>
  api.get(`/api/reviews/${expId}`).then((r) => r.data as {
    reviews: any[];
    summary: { avg: number; total: number; dist: number[] };
  });

export const submitReview = (data: { expId: string; rating: number; text: string }) =>
  api.post('/api/reviews', data).then((r) => r.data);

export default api;
