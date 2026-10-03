// Local-only preview: serve exactly the standalone review, never the repository.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const html = readFileSync(path.join(root, 'artifacts/grifon-motion-depth-review.html'));
const port = Number(process.argv[2] || 4186);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a local port from 1024 to 65535.');
createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (!['GET', 'HEAD'].includes(req.method) || !['/', '/grifon-motion-depth-review.html'].includes(pathname)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length, 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : html);
}).listen(port, '127.0.0.1', () => console.log(`Grifon motion review: http://127.0.0.1:${port}/`));
