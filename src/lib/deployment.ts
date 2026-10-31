import type { Address } from 'viem'

/** HamsterRoundMarket deployment on Ethereum Sepolia. */
export const MARKET_ADDRESS = '0xd780ecea3f58da7a3f8129ac1e8d06332107e7c9' as Address | null
/** Block the market was deployed at; event scans start here, never at block 0. */
export const MARKET_DEPLOY_BLOCK = 12033253n
