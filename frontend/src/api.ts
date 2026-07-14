/**
 * Centralized API helper module.
 * All HTTP calls should go through this module to ensure consistent auth,
 * error handling, and base URL resolution via the axios interceptor.
 *
 * The axios interceptor is configured in main.tsx and handles:
 * - Auto-injection of Bearer token
 * - 401 response → automatic token refresh (or redirect to login)
 * - Session timeout detection
 * - Deactivated/locked account redirect
 */
import axios from 'axios';

const api = {
  get: <TResponse = any>(url: string, params?: Record<string, any>) =>
    axios.get<TResponse>(url, { params }),

  post: <TResponse = any>(url: string, data?: any) =>
    axios.post<TResponse>(url, data),

  put: <TResponse = any>(url: string, data?: any) =>
    axios.put<TResponse>(url, data),

  patch: <TResponse = any>(url: string, data?: any) =>
    axios.patch<TResponse>(url, data),

  delete: <TResponse = any>(url: string) =>
    axios.delete<TResponse>(url),

  /** Upload file(s) via FormData — Content-Type is set automatically */
  upload: <TResponse = any>(url: string, formData: FormData) =>
    axios.post<TResponse>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Upload file(s) via PUT with FormData */
  uploadPut: <TResponse = any>(url: string, formData: FormData) =>
    axios.put<TResponse>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
