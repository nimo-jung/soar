import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '^/api/admin(?:/|$)': {
        target: proxyTarget,
        rewrite: (path) => path.replace(/^\/api\/admin/, '/admin'),
      },
      '^/api(?:/|$)': proxyTarget,
      '/auth/': proxyTarget,
      '/docs/': proxyTarget,
    },
  },
});
