import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// A fixture-only frontend server: never load .env or the live API middleware.
const server = await createServer({
  configFile: false,
  envFile: false,
  envDir: false,
  plugins: [react(), {
    name: 'recovery-deny-api',
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost:5173');
        if (url.pathname.startsWith('/api/') && !(/^\/api\/_lib\/[\w/-]+\.ts$/.test(url.pathname) && request.method === 'GET')) {
          response.statusCode = 503;
          response.end('Recovery verification requires a mocked API response.');
          return;
        }
        next();
      });
    },
  }],
  server: { host: 'localhost', port: 5173, strictPort: true, watch: { ignored: ['**/.tmp/**', '**/.tools/**', '**/.playwright-mcp/**'] } },
});
await server.listen();
