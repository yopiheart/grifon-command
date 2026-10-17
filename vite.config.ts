import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        const [pathOnly] = req.url.split('?')
        const rel = pathOnly.replace(/^\/+/, '')
        let candidate = path.resolve(server.config.root, rel + '.ts')
        let dynamicParam: { name: string; value: string } | null = null

        if (!fs.existsSync(candidate)) {
          // Vercel-style dynamic routing: try [param].ts in the parent dir.
          const segs = rel.split('/').filter(Boolean)
          if (segs.length === 0) return next()
          const lastSeg = segs[segs.length - 1]
          const parentDir = path.resolve(server.config.root, segs.slice(0, -1).join('/'))
          if (!fs.existsSync(parentDir)) return next()
          const dynFile = fs.readdirSync(parentDir).find(f => /^\[[^\]]+\]\.ts$/.test(f))
          if (!dynFile) return next()
          const paramName = dynFile.slice(1, -4)
          candidate = path.join(parentDir, dynFile)
          dynamicParam = { name: paramName, value: decodeURIComponent(lastSeg) }
        }

        let mod: any
        try {
          mod = await server.ssrLoadModule(candidate)
        } catch (err: any) {
          console.error('[vercel-api-dev] load error:', err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'handler_load_failed', detail: String(err?.message ?? err) }))
          return
        }

        const handler = mod.default
        if (typeof handler !== 'function') return next()

        const chunks: Buffer[] = []
        try {
          for await (const chunk of req) chunks.push(chunk as Buffer)
        } catch {
          // Closing a tab can abort the body while the handler module loads.
          // The disconnected request must not reject the middleware and kill Vite.
          if (!req.aborted && !res.destroyed) {
            res.statusCode = 400
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid_body' }))
          }
          return
        }
        if (req.aborted || res.destroyed) return
        const raw = Buffer.concat(chunks).toString('utf8')
        let body: any = undefined
        if (raw) {
          const ct = (req.headers['content-type'] ?? '').toString()
          if (ct.includes('application/json')) {
            try { body = JSON.parse(raw) } catch { body = raw }
          } else {
            body = raw
          }
        }
        ;(req as any).body = body

        const url = new URL(req.url, 'http://localhost')
        const query: Record<string, string> = {}
        url.searchParams.forEach((v, k) => { query[k] = v })
        if (dynamicParam) query[dynamicParam.name] = dynamicParam.value
        ;(req as any).query = query

        const vRes = res as any
        vRes.status = (code: number) => { res.statusCode = code; return vRes }
        vRes.json = (obj: any) => {
          if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(obj))
          return vRes
        }
        vRes.send = (data: any) => {
          if (data && typeof data === 'object' && !(data instanceof Buffer)) return vRes.json(data)
          res.end(data)
          return vRes
        }

        try {
          await handler(req, vRes)
        } catch (err: any) {
          console.error('[vercel-api-dev] handler threw:', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'handler_threw', detail: String(err?.message ?? err) }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v
  }
  return {
    plugins: [react(), vercelApiDevPlugin()],
    server: {
      watch: {
        // Runtime-written, gitignored dirs inside the repo crash the dev server
        // with EBUSY when Vite tries to watch a large/locked file in them:
        //   .playwright-mcp/  — MCP artifact downloads (e.g. the final MP4)
        //   .tmp/             — disposable scratch (smoke heroes / fixtures)
        //   .tools/           — restore-*.ps1 portable binaries (e.g. gh.exe/zip)
        //   samples/          — committed review artifacts (ad creatives etc.);
        //                       writing a batch here mid-dev otherwise EBUSY-crashes the server.
        // Ignore them (and any media) so smokes / tooling can't kill the server.
        ignored: ['**/.playwright-mcp/**', '**/.tmp/**', '**/.tools/**', '**/samples/**', '**/*.mp4', '**/*.webm'],
      },
    },
    build: {
      // The approved bounded voice checks are available only on HTTPS previews.
      rollupOptions: process.env.VERCEL_ENV === 'preview' ? {
        input: {
          app: path.resolve(process.cwd(), 'index.html'),
          voiceCheck: path.resolve(process.cwd(), 'voice-check.html'),
        },
      } : undefined,
      // Originally set because Vite 8 defaults to lightningcss, which warned on
      // every @tailwind directive it didn't recognize — back when nothing
      // processed them and they reached the minifier intact. The 2026-07-25
      // PostCSS migration consumes those directives before minification, so
      // that reason is gone. Kept on esbuild deliberately: it's the minifier
      // the current CSS output was verified against (incl. the tier cascade
      // order), and swapping it is a change to shipped bytes for no gain.
      cssMinify: 'esbuild',
    },
  }
})
