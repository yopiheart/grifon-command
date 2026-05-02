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
        const candidate = path.resolve(server.config.root, rel + '.ts')

        if (!fs.existsSync(candidate)) return next()

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
        for await (const chunk of req) chunks.push(chunk as Buffer)
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
    if (process.env[k] === undefined) process.env[k] = v
  }
  return {
    plugins: [react(), vercelApiDevPlugin()],
  }
})
