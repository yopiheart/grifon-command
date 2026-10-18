import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { voiceLabPlugin } from './dev/voice-lab/plugin';

// Deliberately independent of vite.config.ts and its production API middleware.
export default defineConfig({
  plugins: [voiceLabPlugin(), react()],
  appType: 'mpa',
  envDir: false,
  envPrefix: [],
  server: { host: '127.0.0.1', port: 5184, strictPort: true, allowedHosts: ['127.0.0.1'], cors: false, open: false },
  build: { outDir: '.tmp/voice-lab-build', rollupOptions: { input: fileURLToPath(new URL('./voice-lab.html', import.meta.url)) } },
});
