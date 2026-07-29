import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// MPA — two entries, no router. index.html is the landing page, thank-you.html
// is the bridge page the form redirects to after a successful POST /api/lead.
const entry = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: entry('./index.html'),
        thankYou: entry('./thank-you.html'),
      },
    },
  },
});
