import type { Address } from 'viem'

/** HamsterRoundMarket deployment on Ethereum Sepolia. */
export const MARKET_ADDRESS = '0x806036c434e9e7c4beea602dfa2ae7cac602fecb' as Address | null
/** Block the market was deployed at; event scans start here, never at block 0. */
export const MARKET_DEPLOY_BLOCK = 12090651n
