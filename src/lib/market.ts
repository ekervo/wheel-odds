import { parseAbi, parseEther } from 'viem'
import { sepolia } from 'wagmi/chains'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'

export const MARKET_CHAIN = sepolia

export { MARKET_ADDRESS, MARKET_DEPLOY_BLOCK } from './deployment'


/** Over/Under thresholds offered on every round (work units). Contract allows any multiple of 25. */
export const LINES = [0, 250, 500, 750, 1000] as const
export const LINE_STEP = 25
export const MIN_BET = parseEther('0.0001')
export const GRACE_SECONDS = 7 * 24 * 3600
export const MAX_HORIZON = 6
/** Seconds before a round starts when the UI stops accepting bets (tx needs time to land). */
export const CLOSING_BUFFER_S = 25

export const marketAbi = parseAbi([
  'struct Market { uint128 overPool; uint128 underPool; bool settled; bool voided; bool overWon; uint64 work; uint128 remainingPool; uint128 remainingWinStake; }',
  'function core() view returns (address)',
  'function genesisTimestamp() view returns (uint64)',
  'function roundDuration() view returns (uint64)',
  'function maxWorkPerRound() view returns (uint64)',
  'function getMarket(uint64 round, uint64 line) view returns (Market)',
  'function stakeOf(uint64 round, uint64 line, address user) view returns (uint256 over, uint256 under)',
  'function claimable(uint64 round, uint64 line, address user) view returns (uint256)',
  'function bet(uint64 round, uint64 line, bool over) payable',
  'function settle(uint64 round, uint64 line)',
  'function claim(uint64 round, uint64 line) returns (uint256 payout)',
  'event BetPlaced(uint64 indexed round, uint64 indexed line, address indexed user, bool over, uint256 amount)',
  'event Settled(uint64 indexed round, uint64 indexed line, uint64 work, bool overWon, bool voided)',
  'event Claimed(uint64 indexed round, uint64 indexed line, address indexed user, uint256 payout)',
])

export { coreAbi, LIVE_CORE } from './coreAbi'

export type MarketState = {
  overPool: bigint
  underPool: bigint
  settled: boolean
  voided: boolean
  overWon: boolean
  work: bigint
  remainingPool: bigint
  remainingWinStake: bigint
}

export const txUrl = (hash: string) => buildTxExplorerUrl(MARKET_CHAIN.id, hash)
export const addressUrl = (address: string) => buildAddressExplorerUrl(MARKET_CHAIN.id, address)

export const roundOf = (genesis: bigint, duration: bigint, nowSeconds: number): bigint => {
  const now = BigInt(Math.floor(nowSeconds))
  if (now < genesis) return 0n
  return (now - genesis) / duration + 1n
}

export const roundStartOf = (genesis: bigint, duration: bigint, round: bigint): number =>
  Number(genesis + (round - 1n) * duration)

export const roundEndOf = (genesis: bigint, duration: bigint, round: bigint): number =>
  Number(genesis + round * duration)

/** Payout multiple if `stake` wins, given the pools before the bet. Pari-mutuel, no fee. */
export const projectedPayout = (same: bigint, other: bigint, stake: bigint): bigint => {
  if (stake === 0n) return 0n
  const sidePool = same + stake
  return ((sidePool + other) * stake) / sidePool
}
