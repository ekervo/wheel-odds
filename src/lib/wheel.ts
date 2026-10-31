/** Read-only client for the Squeekchain public API (https://api.squeekchain.com/v1). */
const API = 'https://api.squeekchain.com/v1'

export type WheelStatus = {
  available: boolean
  freshness: 'online' | 'stale' | 'unknown'
  coreStatus: string
  rpm: number
  speedMmPerSecond: number
  distanceMm: number
  openRoundWorkUnits: bigint | null
  closedWorkUnits: bigint | null
  settledThroughRound: bigint | null
  blockHeight: bigint | null
  blockProgress: bigint | null
  observedAt: string | null
}

export type ApiCore = {
  core: string | null
  genesisTimestamp: bigint | null
  roundDuration: bigint | null
  maxWorkPerRound: bigint | null
  settledThroughRound: bigint | null
}

type Json = Record<string, unknown>

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const big = (v: unknown): bigint | null => {
  if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v)
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return BigInt(v)
  return null
}

async function getJson(path: string): Promise<Json> {
  const res = await fetch(`${API}${path}`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`Squeekchain API ${res.status}`)
  const body: unknown = await res.json()
  if (!isObj(body)) throw new Error('Unexpected API response')
  return body
}

export async function fetchWheelStatus(): Promise<WheelStatus> {
  const body = await getJson('/status')
  const m = isObj(body.measurement) ? body.measurement : null
  const builder = isObj(body.builder) ? body.builder : null
  const queued = builder && isObj(builder.queued) ? builder.queued : null
  const anchor = builder && isObj(builder.anchor) ? builder.anchor : null
  const freshness = m?.freshness === 'online' ? 'online' : m?.freshness === 'stale' ? 'stale' : 'unknown'
  return {
    available: m !== null,
    freshness,
    coreStatus: typeof m?.coreStatus === 'string' ? m.coreStatus : 'UNKNOWN',
    rpm: num(m?.rpmMilli) / 1000,
    speedMmPerSecond: num(m?.speedMmPerSecond),
    distanceMm: num(m?.distanceMm),
    openRoundWorkUnits: queued ? big(queued.openRoundWorkUnits) : null,
    closedWorkUnits: queued ? big(queued.closedWorkUnits) : null,
    settledThroughRound: anchor ? big(anchor.settledThroughRound) : null,
    blockHeight: anchor ? big(anchor.blockHeight) : null,
    blockProgress: anchor ? big(anchor.blockProgress) : null,
    observedAt: typeof m?.observedAt === 'string' ? m.observedAt : null,
  }
}

export async function fetchApiCore(): Promise<ApiCore> {
  const body = await getJson('/core')
  const identities = isObj(body.identities) ? body.identities : null
  const configuration = isObj(body.configuration) ? body.configuration : null
  const core = isObj(body.core) ? body.core : null
  return {
    core: identities && typeof identities.core === 'string' ? identities.core : null,
    genesisTimestamp: configuration ? big(configuration.genesisTimestamp) : null,
    roundDuration: configuration ? big(configuration.roundDuration) : null,
    maxWorkPerRound: configuration ? big(configuration.maxWorkPerRound) : null,
    settledThroughRound: core ? big(core.settledThroughRound) : null,
  }
}
