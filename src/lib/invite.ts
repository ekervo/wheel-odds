/** Invite links carry a round, and optionally a line and a side, in the query string. No secrets. */
export type Invite = { round: bigint; line: number | null; over: boolean | null; ai: boolean }

export function readInvite(search: string): Invite | null {
  const p = new URLSearchParams(search)
  const r = p.get('r')
  if (!r || !/^\d{1,9}$/.test(r)) return null
  const l = p.get('l')
  const s = p.get('s')
  return {
    round: BigInt(r),
    line: l !== null && /^\d{1,5}$/.test(l) ? Number(l) : null,
    over: s === 'over' ? true : s === 'under' ? false : null,
    ai: p.get('a') === '1',
  }
}

export function inviteQuery(i: { round: bigint; line?: number; over?: boolean; ai?: boolean }): string {
  const p = new URLSearchParams({ r: i.round.toString() })
  if (i.line !== undefined) p.set('l', String(i.line))
  if (i.over !== undefined) p.set('s', i.over ? 'over' : 'under')
  if (i.ai) p.set('a', '1')
  return `?${p.toString()}`
}
