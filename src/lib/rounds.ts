import type { Address, PublicClient } from 'viem'
import { coreAbi } from './coreAbi'

export type RoundWork = { round: bigint; work: bigint }

/**
 * Work per round for the last `count` certified rounds, read straight from SqueekCore.
 * Idle rounds are not stored by the ledger, so any round without a checkpoint is zero work.
 */
export async function fetchRecentRounds(client: PublicClient, core: Address, frontier: bigint, count: bigint): Promise<RoundWork[]> {
  const from = frontier > count ? frontier - count : 0n
  const byRound = new Map<bigint, bigint>()
  let cursor = from
  for (let i = 0; i < 30 && cursor < frontier; i++) {
    const page = await client.readContract({
      address: core,
      abi: coreAbi,
      functionName: 'roundPage',
      args: [cursor, frontier, 16n],
    })
    let prev = page.start.cumulativeWork
    for (const r of page.rounds) {
      byRound.set(r.roundId, r.cumulativeWork - prev)
      prev = r.cumulativeWork
    }
    if (page.certifiedThroughRound <= cursor) break
    cursor = page.certifiedThroughRound
  }
  const out: RoundWork[] = []
  for (let r = from + 1n; r <= frontier; r++) out.push({ round: r, work: byRound.get(r) ?? 0n })
  return out
}
