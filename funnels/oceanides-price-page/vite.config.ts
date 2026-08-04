import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { normalizePhMobile } from './src/lib/phPhone';

// MPA — two entries, no router. index.html is the landing page, thank-you.html
// is the bridge page the form redirects to after a successful POST /api/lead.
const entry = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// ===========================================================================
// leadApiDevPlugin — makes POST /api/lead answer on a local machine.
//
// WHY THIS EXISTS (Neil, 2026-08-01: "ayaw mapunta sa thank you page")
// It was not a bug in the page. `vite dev` and `vite preview` serve static
// files; `api/lead.ts` is a Vercel function and NOTHING was running it. So the
// form POSTed, got a 404, and showed the generic failure — correctly. The cost
// was that the single most important path on the funnel (form -> thank-you ->
// magnet variant) could not be walked until after a deploy, which is exactly
// backwards: the last place you want to discover a broken form is production.
//
// Two modes, chosen by whether the Supabase keys are present:
//
//   keys set    -> the REAL handler runs, via ssrLoadModule. Writes real rows.
//   keys absent -> MOCK. Same request rules, no database, no row.
//
// 🔴 WHAT THE MOCK PROVES AND WHAT IT DOES NOT.
// It proves the browser contract: method, honeypot, consent, email shape, phone
// shape, the JSON envelope, the redirect, the `?v=` magnet routing. It proves
// NOTHING about Supabase — not the upsert, not the unique index, not the
// service-role key, not the column types. The live POST against the deployed
// URL is still the gate before this funnel is called done. The mock is loud in
// the terminal for exactly that reason.
//
// This file never ships. Vite config is build-time only.
// ===========================================================================

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (res: any, code: number, body: unknown) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = async (req: any): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
};

/** The mock. Mirrors api/lead.ts's request rules, stops short of the database. */
const mockLead = (body: Record<string, unknown>, res: any) => {
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    // Honeypot: bots get an indistinguishable success, same as production.
    return json(res, 200, { ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || !LOOKS_LIKE_EMAIL.test(email)) {
    return json(res, 400, { error: 'invalid_email' });
  }

  const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const parsedPhone = rawPhone ? normalizePhMobile(rawPhone) : null;
  if (parsedPhone && !parsedPhone.ok) {
    return json(res, 400, { error: 'invalid_phone' });
  }

  console.log(
    [
      '',
      '  🟡 MOCK LEAD (walang Supabase env, WALANG naisulat na row)',
      `     email:      ${email}`,
      `     phone:      ${parsedPhone?.ok ? parsedPhone.local : '(wala)'}`,
      `     qualifiers: ${JSON.stringify(body.qualifiers ?? {})}`,
      '     Ang live POST sa deployed URL pa rin ang totoong test.',
      '',
    ].join('\n')
  );
  return json(res, 200, { ok: true, mocked: true });
};

function leadApiDevPlugin(): Plugin {
  const handle = async (req: any, res: any, next: () => void, server?: any) => {
    if (!req.url?.startsWith('/api/lead')) return next();
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'method_not_allowed' });
    }

    const body = await readBody(req);
    const configured = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

    // The preview server has no module runner, so the real handler is only
    // reachable from `npm run dev`. Say so rather than silently mocking.
    if (!configured || !server) {
      if (configured && !server) {
        console.log('  🟡 May Supabase env pero preview server ito. Gamitin ang `npm run dev` para sa totoong handler.');
      }
      return mockLead(body, res);
    }

    try {
      const mod = await server.ssrLoadModule(entry('./api/lead.ts'));
      req.body = body;
      req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (obj: unknown) => {
        if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };
      await mod.default(req, res);
    } catch (err) {
      console.error('[api/lead] handler threw:', err);
      if (!res.headersSent) json(res, 500, { error: 'handler_threw' });
    }
  };

  // 🔴 BLOCK BODIES, NEVER `=>` EXPRESSIONS. `middlewares.use()` returns the
  // connect app for chaining, and Vite treats a value returned from these hooks
  // as a POST-hook to call once the internal middlewares are installed. An
  // arrow shorthand therefore hands Vite the app itself, which it then calls
  // with no arguments: "TypeError: Cannot read properties of undefined
  // (reading 'url')" at startup, nowhere near this file. Return nothing.
  return {
    name: 'lead-api-dev',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next, server));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next));
    },
  };
}

// ===========================================================================
// opsApiDevPlugin — pareho ang layunin ng nasa itaas, para sa /api/ops.
//
// 🔴 WALANG MOCK DITO, sinadya. Ang mock para sa lead ay nagpapatunay ng
// kontrata ng browser at walang PII na hinahawakan. Ang ops ay pawang PII: ang
// pekeng roster ay hindi nagpapatunay ng kahit ano at ang pekeng "pasok" ay
// magtuturo sayong gumagana ang password gayong hindi pa nasusubukan. Kapag
// walang Supabase env, tumatanggi sya nang malinaw — gaya rin ng production.
// ===========================================================================
function opsApiDevPlugin(): Plugin {
  const handle = async (req: any, res: any, next: () => void, server?: any) => {
    if (!req.url?.startsWith('/api/ops')) return next();

    const configured =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.OPS_PASSPHRASE;
    if (!configured || !server) {
      console.log(
        '  🟡 /api/ops: kailangan ng SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + OPS_PASSPHRASE sa .env, at `npm run dev` (hindi preview).'
      );
      return json(res, 500, { error: 'not_configured' });
    }

    try {
      const mod = await server.ssrLoadModule(entry('./api/ops.ts'));
      req.body = req.method === 'GET' ? {} : await readBody(req);
      req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (obj: unknown) => {
        if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(obj));
        return res;
      };
      await mod.default(req, res);
    } catch (err) {
      console.error('[api/ops] handler threw:', err);
      if (!res.headersSent) json(res, 500, { error: 'handler_threw' });
    }
  };

  return {
    name: 'ops-api-dev',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next, server));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => handle(req, res, next));
    },
  };
}

export default defineConfig(({ mode }) => {
  // Unprefixed secrets (SUPABASE_SERVICE_ROLE_KEY) are read by the handler from
  // process.env, exactly as they are on Vercel. Nothing here reaches the bundle.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) process.env[key] = value;

  return {
    plugins: [react(), leadApiDevPlugin(), opsApiDevPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: entry('./index.html'),
          thankYou: entry('./thank-you.html'),
          ops: entry('./ops.html'),
          presyo: entry('./presyo.html'),
        },
      },
    },
  };
});
