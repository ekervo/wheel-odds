import { formatEther } from 'viem'

/** ETH amount for display, trimmed to at most 5 decimals. */
export function fmtEth(wei: bigint): string {
  const s = formatEther(wei)
  const [whole, frac = ''] = s.split('.')
  const trimmed = frac.slice(0, 5).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

export const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export const lineLabel = (line: number | bigint) => (Number(line) === 0 ? 'Runs at all' : `${Number(line)} work`)

export function fmtCountdown(seconds: number): string {
  const n = Math.max(0, Math.floor(seconds))
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
