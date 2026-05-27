import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

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
    const requestUrl = (err.config?.url as string | undefined) ?? '';

    const isLoginPreflightRequest = requestUrl.includes('/auth/license/status')
      || requestUrl.includes('/auth/master/bootstrap/status')
      || requestUrl.includes('/auth/master/lock-status');
    const isSessionHeartbeatRequest = requestUrl.includes('/auth/session/validate')
      || requestUrl.includes('/auth/session/extend');

    if (status === 401) {
      // 인증 요청 자체(로그인·부트스트랩)가 실패한 경우 인터셉터가 개입하지 않는다.
      // 해당 핸들러의 catch 블록에서 직접 에러 메시지를 처리한다.
      const isAuthRequest = requestUrl.includes('/auth/master/login')
        || requestUrl.includes('/auth/master/bootstrap')
        || requestUrl.includes('/auth/master/bootstrap/status')
        || requestUrl.includes('/auth/master/lock-status')
        || requestUrl.includes('/auth/license/status')
        || requestUrl.includes('/auth/tenant/login');
      if (!isAuthRequest) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    const isServerErrorPage = window.location.pathname.startsWith('/server-error');
    const isServerFailure = (typeof status === 'number' && status >= 500) || !err.response;

    if (isServerFailure && !isServerErrorPage && !isLoginPreflightRequest && !isSessionHeartbeatRequest) {
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
