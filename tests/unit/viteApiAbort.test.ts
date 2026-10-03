import { describe, expect, it, vi } from 'vitest';

vi.mock('vite', () => ({
  defineConfig: (config: unknown) => config,
  loadEnv: () => ({}),
}));
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react-fixture' }) }));

import viteConfig from '../../vite.config.js';

function fixture() {
  const handler = vi.fn(async () => undefined);
  const use = vi.fn();
  const config = (viteConfig as Function)({ mode: 'test', command: 'serve' });
  const plugin = config.plugins.find((item: { name: string }) => item.name === 'vercel-api-dev');
  plugin.configureServer({
    config: { root: process.cwd() },
    middlewares: { use },
    ssrLoadModule: async () => ({ default: handler }),
  });
  const res = {
    destroyed: false, headersSent: false, statusCode: 200,
    setHeader: vi.fn(), getHeader: vi.fn(), end: vi.fn(),
  };
  return { middleware: use.mock.calls[0][0], handler, res };
}

describe('local API request interruption', () => {
  it('does not reject or call the handler when a closing tab aborts the request', async () => {
    const { middleware, handler, res } = fixture();
    const req = {
      url: '/api/billing?action=usage', headers: {}, aborted: true,
      async *[Symbol.asyncIterator]() {
        throw Object.assign(new Error('aborted'), { code: 'ECONNRESET' });
      },
    };
    res.destroyed = true;
    await expect(middleware(req, res, vi.fn())).resolves.toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('returns a client error for an unreadable body without running the handler', async () => {
    const { middleware, handler, res } = fixture();
    const req = {
      url: '/api/billing', headers: {}, aborted: false,
      async *[Symbol.asyncIterator]() { throw new Error('body read failed'); },
    };
    await expect(middleware(req, res, vi.fn())).resolves.toBeUndefined();
    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledOnce();
    expect(handler).not.toHaveBeenCalled();
  });

  it('still forwards a complete JSON request and its query to the handler', async () => {
    const { middleware, handler, res } = fixture();
    const req = {
      url: '/api/billing?action=usage', headers: { 'content-type': 'application/json' }, aborted: false,
      async *[Symbol.asyncIterator]() { yield Buffer.from('{"fixture":true}'); },
    };
    await middleware(req, res, vi.fn());
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      body: { fixture: true }, query: { action: 'usage' },
    }), res);
  });
});
