import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { useBrandingStore } from '../store/branding.store';

const stringifyErrorMessage = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyErrorMessage(item)).filter(Boolean).join(', ');
  }

  if (value && typeof value === 'object') {
    const message = (value as { message?: unknown }).message;
    if (message !== undefined) {
      return stringifyErrorMessage(message);
    }
  }

  return '';
};

const api = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status as number | undefined;

    if (status === 401) {
      const requestUrl = (err.config?.url as string | undefined) ?? '';
      const currentSessionType = useAuthStore.getState().sessionType;
      const isAuthRequest = requestUrl.includes('/auth/master/login')
        || requestUrl.includes('/auth/master/lock-status')
        || requestUrl.includes('/auth/multi-tenant/status')
        || requestUrl.includes('/auth/tenant/login')
        || requestUrl.includes('/auth/tenant/bootstrap')
        || requestUrl.includes('/auth/tenant/bootstrap/status')
        || requestUrl.includes('/auth/tenant/lock-status')
        || requestUrl.includes('/auth/tenant/password/reset');
      const isMasterSessionTenantApi401 = currentSessionType === 'master'
        && (requestUrl === '/api' || requestUrl.startsWith('/api/'));
      if (!isAuthRequest) {
        if (isMasterSessionTenantApi401) {
          return Promise.reject(err);
        }
        useBrandingStore.getState().reset();
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    const isServerErrorPage = window.location.pathname.startsWith('/server-error');
    const isServerFailure = (typeof status === 'number' && status >= 500) || !err.response;

    if (isServerFailure && !isServerErrorPage) {
      const searchParams = new URLSearchParams();

      if (status) {
        searchParams.set('status', String(status));
      }

      if (window.location.pathname) {
        searchParams.set('from', window.location.pathname);
      }

      if (typeof err.config?.url === 'string' && err.config.url.length > 0) {
        searchParams.set('request', err.config.url);
      }

      if (import.meta.env.DEV) {
        const messageFromResponse = stringifyErrorMessage(err.response?.data?.message);
        const message = messageFromResponse || stringifyErrorMessage(err.message);

        if (message) {
          searchParams.set('message', message);
        }
      }

      window.location.href = `/server-error?${searchParams.toString()}`;
    }

    return Promise.reject(err);
  },
);

export default api;
