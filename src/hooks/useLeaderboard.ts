import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import type { PublicClient } from 'viem'
import { MARKET_ADDRESS, MARKET_CHAIN, MARKET_DEPLOY_BLOCK, marketAbi } from '@/lib/market'
import { LIVE_CORE, coreAbi } from '@/lib/coreAbi'
import { forecast } from '@/lib/forecast'
import { buildLeaderboard, type BetEvent, type LeaderRow, type SettledEvent } from '@/lib/leaderboard'
import { fetchRecentRounds } from '@/lib/rounds'

const CHUNK = 20_000n

/** Reads an event over the whole life of the market in bounded block ranges. */
async function scan<T extends 'BetPlaced' | 'Settled'>(client: PublicClient, eventName: T) {
  if (MARKET_ADDRESS === null) return []
  const head = await client.getBlockNumber()
  const out = []
  for (let from = MARKET_DEPLOY_BLOCK; from <= head; from += CHUNK) {
    const to = from + CHUNK - 1n > head ? head : from + CHUNK - 1n
    out.push(...(await client.getContractEvents({ address: MARKET_ADDRESS, abi: marketAbi, eventName, fromBlock: from, toBlock: to })))
  }
  return out
}

export type Leaderboard = { rows: LeaderRow[]; settledMarkets: number; aiMarkets: number }

export function useLeaderboard(maxWork: number) {
  const client = usePublicClient({ chainId: MARKET_CHAIN.id })
  return useQuery({
    queryKey: ['leaderboard', maxWork],
    enabled: !!client && MARKET_ADDRESS !== null,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<Leaderboard> => {
      if (!client) return { rows: [], settledMarkets: 0, aiMarkets: 0 }
      const [betLogs, settledLogs] = await Promise.all([scan(client as PublicClient, 'BetPlaced'), scan(client as PublicClient, 'Settled')])
      const bets: BetEvent[] = betLogs.flatMap((l) =>
        l.args.round === undefined || l.args.line === undefined || !l.args.user || l.args.over === undefined || l.args.amount === undefined
          ? []
          : [{ round: l.args.round, line: l.args.line, user: l.args.user, over: l.args.over, amount: l.args.amount }],
      )
      const settled: SettledEvent[] = settledLogs.flatMap((l) =>
        l.args.round === undefined || l.args.line === undefined || l.args.work === undefined || l.args.overWon === undefined || l.args.voided === undefined
          ? []
          : [{ round: l.args.round, line: l.args.line, work: l.args.work, overWon: l.args.overWon, voided: l.args.voided }],
      )

      // The AI line of a settled round is recomputed from ledger history, so it matches what players saw.
      const aiLines = new Map<bigint, number>()
      const rounds = [...new Set(settled.map((s) => s.round))]
      if (rounds.length > 0) {
        const state = await client.readContract({ address: LIVE_CORE, abi: coreAbi, functionName: 'state' })
        const oldest = rounds.reduce((a, b) => (a < b ? a : b))
        const want = state.settledThroughRound - (oldest - 40n)
        const count = want > 400n ? 400n : want > 0n ? want : 60n
        const history = await fetchRecentRounds(client, LIVE_CORE, state.settledThroughRound, count)
        for (const r of rounds) {
          const f = forecast(history, r, maxWork)
          if (f) aiLines.set(r, f.line)
        }
      }
      return { rows: buildLeaderboard(bets, settled, aiLines), settledMarkets: settled.length, aiMarkets: aiLines.size }
    },
  })
}
