export type AiTake =
  | {
      status: 'ok'
      round: string
      line: number
      take: { headline: string; reasoning: string; watchout: string }
      model: string
      generatedAt: string
    }
  | { status: 'unconfigured'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Asks the backend analyst to explain the forecast for a round. Never throws. */
export async function fetchAiTake(round: bigint): Promise<AiTake> {
  try {
    const res = await fetch(`/api/ai/take?round=${round.toString()}`)
    if (!res.ok) return { status: 'error', reason: 'backend_unreachable' }
    const body: unknown = await res.json()
    if (!isObj(body) || typeof body.status !== 'string') return { status: 'error', reason: 'bad_response' }
    if (body.status === 'ok' && isObj(body.take) && typeof body.line === 'number') {
      const t = body.take
      if (typeof t.headline === 'string' && typeof t.reasoning === 'string' && typeof t.watchout === 'string') {
        return {
          status: 'ok',
          round: String(body.round),
          line: body.line,
          take: { headline: t.headline, reasoning: t.reasoning, watchout: t.watchout },
          model: typeof body.model === 'string' ? body.model : 'LLM',
          generatedAt: typeof body.generatedAt === 'string' ? body.generatedAt : '',
        }
      }
    }
    const reason = typeof body.reason === 'string' ? body.reason : 'unknown'
    if (body.status === 'unconfigured') return { status: 'unconfigured', reason }
    if (body.status === 'unavailable') return { status: 'unavailable', reason }
    return { status: 'error', reason }
  } catch {
    return { status: 'error', reason: 'backend_unreachable' }
  }
}
