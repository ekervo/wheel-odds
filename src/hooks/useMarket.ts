import { useCallback, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { toast } from 'sonner'
import { MARKET_ADDRESS, MARKET_CHAIN, MARKET_DEPLOY_BLOCK, marketAbi, type MarketState } from '@/lib/market'

export function useMarketBoard(round: bigint | undefined, lines: readonly number[]) {
  const enabled = MARKET_ADDRESS !== null && round !== undefined
  const result = useReadContracts({
    contracts: lines.map((line) => ({
      address: MARKET_ADDRESS ?? undefined,
      abi: marketAbi,
      functionName: 'getMarket',
      args: [round ?? 0n, BigInt(line)],
      chainId: MARKET_CHAIN.id,
    })),
    query: { enabled, refetchInterval: 8_000 },
  })
  const markets = useMemo(() => {
    const map = new Map<number, MarketState>()
    lines.forEach((line, i) => {
      const item = result.data?.[i]
      if (item?.status === 'success') map.set(line, item.result as MarketState)
    })
    return map
  }, [result.data, lines])
  return { markets, isLoading: result.isLoading }
}

export type PositionKey = { round: bigint; line: bigint }
export type Position = PositionKey & {
  market: MarketState
  stakeOver: bigint
  stakeUnder: bigint
  claimable: bigint
}

/** Every market the wallet has bet on, rebuilt from BetPlaced logs and live contract reads. */
export function usePositions(user: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: MARKET_CHAIN.id })
  const enabled = !!user && !!client && MARKET_ADDRESS !== null

  const keysQuery = useQuery({
    queryKey: ['bet-logs', user],
    enabled,
    refetchInterval: 20_000,
    queryFn: async (): Promise<PositionKey[]> => {
      if (!client || !user || MARKET_ADDRESS === null) return []
      const logs = await client.getContractEvents({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        eventName: 'BetPlaced',
        args: { user },
        fromBlock: MARKET_DEPLOY_BLOCK,
        toBlock: 'latest',
      })
      const seen = new Map<string, PositionKey>()
      for (const log of logs) {
        const { round, line } = log.args
        if (round === undefined || line === undefined) continue
        seen.set(`${round}:${line}`, { round, line })
      }
      return [...seen.values()].sort((a, b) => (a.round === b.round ? Number(a.line - b.line) : Number(b.round - a.round)))
    },
  })

  const keys = useMemo(() => keysQuery.data ?? [], [keysQuery.data])
  const reads = useReadContracts({
    contracts: keys.flatMap((k) => [
      { address: MARKET_ADDRESS ?? undefined, abi: marketAbi, functionName: 'getMarket', args: [k.round, k.line], chainId: MARKET_CHAIN.id },
      { address: MARKET_ADDRESS ?? undefined, abi: marketAbi, functionName: 'stakeOf', args: [k.round, k.line, user ?? '0x0000000000000000000000000000000000000000'], chainId: MARKET_CHAIN.id },
      { address: MARKET_ADDRESS ?? undefined, abi: marketAbi, functionName: 'claimable', args: [k.round, k.line, user ?? '0x0000000000000000000000000000000000000000'], chainId: MARKET_CHAIN.id },
    ]),
    query: { enabled: enabled && keys.length > 0, refetchInterval: 10_000 },
  })

  const positions = useMemo(() => {
    const out: Position[] = []
    keys.forEach((k, i) => {
      const m = reads.data?.[i * 3]
      const s = reads.data?.[i * 3 + 1]
      const c = reads.data?.[i * 3 + 2]
      if (m?.status !== 'success' || s?.status !== 'success' || c?.status !== 'success') return
      const [stakeOver, stakeUnder] = s.result as readonly [bigint, bigint]
      out.push({ ...k, market: m.result as MarketState, stakeOver, stakeUnder, claimable: c.result as bigint })
    })
    return out
  }, [keys, reads.data])

  return { positions, isLoading: keysQuery.isLoading || reads.isLoading }
}

export type SettledResult = { round: bigint; line: bigint; work: bigint; overWon: boolean; voided: boolean }

export function useResults() {
  const client = usePublicClient({ chainId: MARKET_CHAIN.id })
  return useQuery({
    queryKey: ['settled-logs'],
    enabled: !!client && MARKET_ADDRESS !== null,
    refetchInterval: 30_000,
    queryFn: async (): Promise<SettledResult[]> => {
      if (!client || MARKET_ADDRESS === null) return []
      const logs = await client.getContractEvents({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        eventName: 'Settled',
        fromBlock: MARKET_DEPLOY_BLOCK,
        toBlock: 'latest',
      })
      return logs
        .map((l) => ({
          round: l.args.round ?? 0n,
          line: l.args.line ?? 0n,
          work: l.args.work ?? 0n,
          overWon: l.args.overWon ?? false,
          voided: l.args.voided ?? false,
        }))
        .reverse()
    },
  })
}

export function parseTxError(error: unknown): string | null {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (message.includes('user rejected') || message.includes('user denied')) return null
  if (message.includes('insufficient funds')) return 'Not enough Sepolia ETH to cover the stake and gas.'
  if (message.includes('bettingclosed')) return 'Betting for that round has closed.'
  if (message.includes('roundnotsettled') || message.includes('invalidroundpagebounds')) return 'SqueekCore has not settled that round yet. Try again in a minute.'
  if (message.includes('alreadysettled')) return 'This market is already settled.'
  if (message.includes('nothingtoclaim')) return 'Nothing to claim on this market.'
  if (message.includes('reverted')) return 'The transaction reverted. Refresh and try again.'
  return 'Something went wrong. Please try again.'
}

export type TxKind = 'bet' | 'settle' | 'claim'

/** One write at a time: wallet prompt, confirmation, then a refresh of every read. */
export function useMarketTx() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, data: hash, isPending, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: hash, chainId: MARKET_CHAIN.id })
  const qc = useQueryClient()

  useEffect(() => {
    if (receipt.isSuccess) void qc.invalidateQueries()
  }, [receipt.isSuccess, qc])

  const send = useCallback(
    async (request: { functionName: 'bet'; args: readonly [bigint, bigint, boolean]; value: bigint } | { functionName: 'settle' | 'claim'; args: readonly [bigint, bigint] }) => {
      if (MARKET_ADDRESS === null) return
      try {
        if (chainId !== MARKET_CHAIN.id) await switchChainAsync({ chainId: MARKET_CHAIN.id })
        if (request.functionName === 'bet') {
          await writeContractAsync({
            address: MARKET_ADDRESS,
            abi: marketAbi,
            functionName: 'bet',
            args: request.args,
            value: request.value,
            chainId: MARKET_CHAIN.id,
          })
        } else {
          await writeContractAsync({
            address: MARKET_ADDRESS,
            abi: marketAbi,
            functionName: request.functionName,
            args: request.args,
            chainId: MARKET_CHAIN.id,
          })
        }
      } catch (error) {
        const text = parseTxError(error)
        if (text) toast.error(text)
        reset()
      }
    },
    [chainId, switchChainAsync, writeContractAsync, reset],
  )

  return {
    send,
    hash,
    isConnected,
    isPending,
    isConfirming: receipt.isLoading && !!hash,
    isSuccess: receipt.isSuccess,
    isFailed: receipt.isError,
    reset,
  }
}

export type ClaimRecord = {
  round: bigint
  line: bigint
  payout: bigint
  txHash: string
  blockNumber: bigint
  timestamp: number | null
}

/** Every payout or refund the wallet has claimed, newest first, from Claimed logs. */
export function useClaimHistory(user: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: MARKET_CHAIN.id })
  return useQuery({
    queryKey: ['claim-history', user],
    enabled: !!client && !!user && MARKET_ADDRESS !== null,
    refetchInterval: 30_000,
    queryFn: async (): Promise<ClaimRecord[]> => {
      if (!client || !user || MARKET_ADDRESS === null) return []
      const logs = await client.getContractEvents({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        eventName: 'Claimed',
        args: { user },
        fromBlock: MARKET_DEPLOY_BLOCK,
        toBlock: 'latest',
      })
      const recent = logs.slice(-50).reverse()
      const blocks = [...new Set(recent.map((l) => l.blockNumber))]
      const stamps = new Map<bigint, number>()
      await Promise.all(
        blocks.map(async (blockNumber) => {
          try {
            const block = await client.getBlock({ blockNumber })
            stamps.set(blockNumber, Number(block.timestamp))
          } catch {
            // Timestamp is cosmetic; the row still shows with its block number.
          }
        }),
      )
      return recent.map((l) => ({
        round: l.args.round ?? 0n,
        line: l.args.line ?? 0n,
        payout: l.args.payout ?? 0n,
        txHash: l.transactionHash,
        blockNumber: l.blockNumber,
        timestamp: stamps.get(l.blockNumber) ?? null,
      }))
    },
  })
}
