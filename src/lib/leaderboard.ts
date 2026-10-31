import type { Address } from 'viem'

export type BetEvent = { round: bigint; line: bigint; user: Address; over: boolean; amount: bigint }
export type SettledEvent = { round: bigint; line: bigint; work: bigint; overWon: boolean; voided: boolean }

export type LeaderRow = {
  user: Address
  /** Net result on settled markets in wei: payout minus stake. Refunded markets count as zero. */
  profit: bigint
  staked: bigint
  wins: number
  losses: number
  /** Bets placed on the AI line of a settled round. */
  aiBets: number
  /** AI-line markets where the user backed "hamster beats the AI" and the wheel did beat it. */
  aiBeats: number
}

/**
 * Rebuilds every player's result from BetPlaced and Settled events alone, using the same
 * pro rata rule the contract pays by. Unsettled markets are ignored, so nobody is scored on a guess.
 */
export function buildLeaderboard(bets: BetEvent[], settled: SettledEvent[], aiLines: Map<bigint, number>): LeaderRow[] {
  const result = new Map<string, SettledEvent>()
  for (const s of settled) result.set(`${s.round}:${s.line}`, s)

  type Stake = { over: bigint; under: bigint }
  const markets = new Map<string, Map<Address, Stake>>()
  for (const b of bets) {
    const key = `${b.round}:${b.line}`
    if (!result.has(key)) continue
    let users = markets.get(key)
    if (!users) {
      users = new Map<Address, Stake>()
      markets.set(key, users)
    }
    const stake = users.get(b.user) ?? { over: 0n, under: 0n }
    if (b.over) stake.over += b.amount
    else stake.under += b.amount
    users.set(b.user, stake)
  }

  const rows = new Map<Address, LeaderRow>()
  const rowOf = (user: Address): LeaderRow => {
    let row = rows.get(user)
    if (!row) {
      row = { user, profit: 0n, staked: 0n, wins: 0, losses: 0, aiBets: 0, aiBeats: 0 }
      rows.set(user, row)
    }
    return row
  }

  for (const [key, users] of markets) {
    const s = result.get(key)
    if (!s) continue
    let overPool = 0n
    let underPool = 0n
    for (const st of users.values()) {
      overPool += st.over
      underPool += st.under
    }
    const winPool = s.overWon ? overPool : underPool
    const refunded = s.voided || winPool === 0n
    const isAi = aiLines.get(s.round) === Number(s.line)
    for (const [user, st] of users) {
      const row = rowOf(user)
      const stake = st.over + st.under
      row.staked += stake
      if (isAi) row.aiBets += 1
      if (refunded) continue
      const winStake = s.overWon ? st.over : st.under
      const payout = ((overPool + underPool) * winStake) / winPool
      const net = payout - stake
      row.profit += net
      if (net > 0n) row.wins += 1
      else if (net < 0n) row.losses += 1
      if (isAi && s.overWon && st.over > 0n) row.aiBeats += 1
    }
  }
  return [...rows.values()]
}
