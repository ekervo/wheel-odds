import type { RoundWork } from './rounds.js'

const LINE_STEP = 25

/** Rounds of history the forecaster reads. */
export const WINDOW = 30
/** The forecast for round N only sees rounds up to N - LAG, so every client computes the same line. */
export const LAG = 3n
const DECAY = 0.93

export type Forecast = {
  round: bigint
  /** Over/under line in work units, a multiple of LINE_STEP. */
  line: number
  /** Share of recent weighted rounds in which the wheel ran. */
  activeShare: number
  /** Decay-weighted mean work of the rounds the wheel ran in. */
  activeMean: number
  basedOnThrough: bigint
}

/**
 * Decay-weighted median of the last WINDOW certified rounds (newer rounds weigh more).
 * Deterministic: the same SqueekCore history always gives the same line, which keeps
 * everyone betting against the AI in one shared market.
 */
export function forecast(history: RoundWork[], target: bigint, maxWork: number): Forecast | null {
  const through = target - LAG
  const from = through - BigInt(WINDOW) + 1n
  const byRound = new Map(history.map((r) => [r.round, r.work]))
  const points: { work: number; weight: number }[] = []
  for (let r = from; r <= through; r++) {
    const work = byRound.get(r)
    if (work === undefined) return null
    points.push({ work: Number(work), weight: Math.pow(DECAY, Number(through - r)) })
  }
  const total = points.reduce((s, p) => s + p.weight, 0)
  const activeW = points.filter((p) => p.work > 0)
  const activeWeight = activeW.reduce((s, p) => s + p.weight, 0)
  const sorted = [...points].sort((a, b) => a.work - b.work)
  let acc = 0
  let median = 0
  for (const p of sorted) {
    acc += p.weight
    if (acc >= total / 2) {
      median = p.work
      break
    }
  }
  const line = Math.min(maxWork - (maxWork % LINE_STEP), Math.round(median / LINE_STEP) * LINE_STEP)
  return {
    round: target,
    line,
    activeShare: total > 0 ? activeWeight / total : 0,
    activeMean: activeWeight > 0 ? activeW.reduce((s, p) => s + p.work * p.weight, 0) / activeWeight : 0,
    basedOnThrough: through,
  }
}

export type BacktestRow = { round: bigint; line: number; work: number; hamsterBeatAi: boolean }

/** Replays the forecaster on rounds that have already settled. */
export function backtest(history: RoundWork[], maxWork: number): BacktestRow[] {
  const rows: BacktestRow[] = []
  for (const r of history) {
    const f = forecast(history, r.round, maxWork)
    if (!f) continue
    rows.push({ round: r.round, line: f.line, work: Number(r.work), hamsterBeatAi: Number(r.work) > f.line })
  }
  return rows
}

/** Rounds of history the betting ladder reads. */
export const LADDER_WINDOW = 60
export type LadderLine = { line: number; tag: string }

/**
 * Betting lines taken from what the wheel really did: quartiles of its active rounds over the
 * last LADDER_WINDOW certified rounds, plus the near-record round and the "runs at all" line.
 * Like the forecast, it only sees rounds up to target - LAG, so every client gets the same lines
 * and bets land in shared pools. Returns null until SqueekCore has certified that history.
 */
export function ladder(history: RoundWork[], target: bigint, maxWork: number): LadderLine[] | null {
  const through = target - LAG
  const from = through - BigInt(LADDER_WINDOW) + 1n
  const byRound = new Map(history.map((r) => [r.round, r.work]))
  const active: number[] = []
  for (let r = from; r <= through; r++) {
    const work = byRound.get(r)
    if (work === undefined) return null
    if (work > 0n) active.push(Number(work))
  }
  const cap = maxWork - (maxWork % LINE_STEP)
  const snap = (x: number) => Math.min(cap, Math.max(LINE_STEP, Math.round(x / LINE_STEP) * LINE_STEP))
  const out: LadderLine[] = [{ line: 0, tag: 'Wheel runs at all' }]
  if (active.length === 0) {
    for (const line of [250, 500, 750]) out.push({ line, tag: 'Default line, wheel idle lately' })
    return out
  }
  active.sort((a, b) => a - b)
  const q = (p: number) => active[Math.min(active.length - 1, Math.floor(p * active.length))]
  const picks: [number, string][] = [
    [q(0.25), 'Quiet active round'],
    [q(0.5), 'Median active round'],
    [q(0.75), 'Strong active round'],
    [active[active.length - 1], 'Best recent round'],
  ]
  for (const [value, tag] of picks) {
    const line = snap(value)
    if (!out.some((o) => o.line === line)) out.push({ line, tag })
  }
  return out.sort((a, b) => a.line - b.line)
}
