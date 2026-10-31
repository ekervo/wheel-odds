/**
 * Local backend for development. The Vite dev server proxies /api to this port.
 * On Vercel the same logic runs as serverless functions in /api.
 */
import { createServer, type IncomingMessage } from 'node:http'
import { handleChat, handleTake } from './core.js'

const PORT = Number(process.env.AI_SERVER_PORT ?? 3001)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > 20_000) {
        reject(new Error('too_large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('bad_json'))
      }
    })
    req.on('error', reject)
  })
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const route =
    req.method === 'GET' && url.pathname === '/health'
      ? Promise.resolve(json({ ok: true }))
      : req.method === 'GET' && url.pathname === '/ai/take'
        ? handleTake(url)
        : req.method === 'POST' && url.pathname === '/ai/chat'
          ? readBody(req).then(handleChat, () => json({ error: 'invalid_query' }, 400))
          : Promise.resolve(json({ error: 'not_found' }, 404))
  route
    .then(async (r) => {
      res.writeHead(r.status, Object.fromEntries(r.headers))
      res.end(await r.text())
    })
    .catch(() => {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'internal_error' }))
    })
}).listen(PORT, () => console.log(`AI analyst server listening on :${PORT}`))
