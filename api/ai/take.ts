import { handleTake } from '../../server/core.js'

type Req = { method?: string; url?: string }
type Res = { status: (code: number) => Res; setHeader: (name: string, value: string) => void; send: (body: string) => void }

/** Vercel function: GET /api/ai/take?round=N */
export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'GET') {
    res.status(405).send(JSON.stringify({ error: 'method_not_allowed' }))
    return
  }
  const result = await handleTake(new URL(req.url ?? '/', 'http://localhost'))
  res.status(result.status).send(await result.text())
}
