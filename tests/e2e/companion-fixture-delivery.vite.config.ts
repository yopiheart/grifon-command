import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Preview-only server: no root .env loading and no production API middleware.
export default defineConfig({
  root: resolve(import.meta.dirname, '../..'),
  envDir: resolve(import.meta.dirname, 'fixtures'),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
});
