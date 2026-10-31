import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient, useReadContract } from 'wagmi'
import { fetchRecentRounds, type RoundWork } from '@/lib/rounds'
import {
  LIVE_CORE,
  MARKET_ADDRESS,
  MARKET_CHAIN,
  coreAbi,
  marketAbi,
  roundEndOf,
  roundOf,
  roundStartOf,
} from '@/lib/market'
import { fetchApiCore, fetchWheelStatus } from '@/lib/wheel'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Round clock derived from the live core's own configuration. */
export function useRoundClock() {
  const now = useNow(1000)
  const { data: config } = useReadContract({
    address: LIVE_CORE,
    abi: coreAbi,
    functionName: 'configuration',
    chainId: MARKET_CHAIN.id,
    query: { staleTime: Infinity },
  })
  // The round clock must not depend on one RPC call: fall back to the API's copy of the same configuration.
  const { data: api } = useQuery({ queryKey: ['api-core'], queryFn: fetchApiCore, refetchInterval: 60_000, retry: 1 })
  const genesis = config?.genesisTimestamp ?? api?.genesisTimestamp
  const duration = config?.roundDuration ?? api?.roundDuration
  const maxWork = config?.maxWorkPerRound ?? api?.maxWorkPerRound
  if (genesis == null || duration == null || maxWork == null) return null
  const nowS = now / 1000
  const current = roundOf(genesis, duration, nowS)
  return {
    genesis,
    duration,
    maxWork,
    nowS,
    current,
    startOf: (round: bigint) => roundStartOf(genesis, duration, round),
    endOf: (round: bigint) => roundEndOf(genesis, duration, round),
    secondsToEnd: roundEndOf(genesis, duration, current) - nowS,
  }
}
export type RoundClock = NonNullable<ReturnType<typeof useRoundClock>>

export function useCoreState() {
  return useReadContract({
    address: LIVE_CORE,
    abi: coreAbi,
    functionName: 'state',
    chainId: MARKET_CHAIN.id,
    query: { refetchInterval: 10_000 },
  })
}

export function useWheelStatus() {
  return useQuery({
    queryKey: ['wheel-status'],
    queryFn: fetchWheelStatus,
    refetchInterval: 5_000,
    retry: 1,
  })
}

/** Checks the market is bound to the same core the live API reports. */
export function useIntegrity() {
  const { data: boundCore } = useReadContract({
    address: MARKET_ADDRESS ?? undefined,
    abi: marketAbi,
    functionName: 'core',
    chainId: MARKET_CHAIN.id,
    query: { enabled: MARKET_ADDRESS !== null, staleTime: Infinity },
  })
  const { data: api } = useQuery({
    queryKey: ['api-core'],
    queryFn: fetchApiCore,
    refetchInterval: 60_000,
    retry: 1,
  })
  const same = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
  return {
    marketMatchesApi: boundCore && api?.core ? same(boundCore, api.core) : null,
    appMatchesApi: api?.core ? same(LIVE_CORE, api.core) : null,
    apiCore: api?.core ?? null,
  }
}

export type { RoundWork }

/** Work per round for the last `count` certified rounds, read straight from SqueekCore. */
export function useRecentRounds(frontier: bigint | undefined, count = 70n) {
  const client = usePublicClient({ chainId: MARKET_CHAIN.id })
  return useQuery({
    queryKey: ['recent-rounds', frontier?.toString(), count.toString()],
    enabled: !!client && frontier !== undefined && frontier > 0n,
    staleTime: 60_000,
    queryFn: async (): Promise<RoundWork[]> => {
      if (!client || frontier === undefined) return []
      return fetchRecentRounds(client, LIVE_CORE, frontier, count)
    },
  })
}
