import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('primereact/')) {
            const match = id.match(/primereact\/([^/]+)/);
            const moduleName = match?.[1] ?? 'core';

            if (['datatable', 'column', 'paginator'].includes(moduleName)) {
              return 'vendor-prime-table';
            }

            return 'vendor-prime';
          }

          if (id.includes('primeicons') || id.includes('primeflex')) {
            return 'vendor-prime-style';
          }

          if (id.includes('dayjs') || id.includes('date-fns')) {
            return 'vendor-date';
          }

          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '^/admin(?:/|$)': proxyTarget,
      '^/api(?:/|$)': proxyTarget,
      '^/auth(?:/|$)': proxyTarget,
      '^/docs(?:/|$)': proxyTarget,
    },
  },
});
