import { handleChat } from '../../server/core.js'

type Req = { method?: string; body?: unknown }
type Res = { status: (code: number) => Res; setHeader: (name: string, value: string) => void; send: (body: string) => void }

/** Vercel function: POST /api/ai/chat */
export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }))
    return
  }
  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).send(JSON.stringify({ error: 'invalid_query' }))
      return
    }
  }
  const result = await handleChat(body)
  res.status(result.status).send(await result.text())
}
