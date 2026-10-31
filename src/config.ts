/**
 * wagmi configuration
 */

import { http, fallback, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Public Sepolia endpoints with CORS and eth_getLogs support, tried in order.
const SEPOLIA_RPCS = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.gateway.tenderly.co']

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(sepolia.id, SEPOLIA_RPCS[0])

export const config = createConfig({
  chains: [sepolia, arcTestnet, mainnet], // mainnet needed for ENS resolution
  connectors: [injected()],
  transports: {
    [sepolia.id]: fallback(SEPOLIA_RPCS.map((url) => http(url, { batch: true }))),
    [arcTestnet.id]: http(),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
