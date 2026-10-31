import { useState } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { formatEther, parseEther } from 'viem'
import { ArrowUp, ArrowDown, ExternalLink, Loader2, Minus, Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { useMarketTx } from '@/hooks/useMarket'
import { MARKET_CHAIN, MIN_BET, projectedPayout, txUrl, type MarketState } from '@/lib/market'
import { fmtEth, lineLabel } from '@/lib/format'
import { ShareButton } from './ShareButton'

const CHIPS = ['0.0005', '0.001', '0.005', '0.01']
const STEP = parseEther('0.001')
const GAS_RESERVE = parseEther('0.002')

function fmtInput(wei: bigint): string {
  const s = formatEther(wei)
  const [whole, frac = ''] = s.split('.')
  const trimmed = frac.slice(0, 6).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

function parseAmount(text: string): bigint | null {
  if (!/^\d*\.?\d{0,18}$/.test(text) || text === '' || text === '.') return null
  try {
    return parseEther(text)
  } catch {
    return null
  }
}

export function BetPanel({
  round,
  line,
  over,
  market,
  closed,
  ai = false,
  onSide,
  onClose,
}: {
  round: bigint
  line: number
  over: boolean
  market?: MarketState
  closed: boolean
  ai?: boolean
  onSide: (over: boolean) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState('0.005')
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address, chainId: MARKET_CHAIN.id })
  const tx = useMarketTx()

  const stake = parseAmount(amount)
  const overPool = market?.overPool ?? 0n
  const underPool = market?.underPool ?? 0n
  const payout = stake ? projectedPayout(over ? overPool : underPool, over ? underPool : overPool, stake) : 0n
  const multiple = stake && stake > 0n ? Number((payout * 1000n) / stake) / 1000 : 0

  let problem: string | null = null
  if (stake === null) problem = 'Enter an amount in ETH.'
  else if (stake < MIN_BET) problem = `Minimum bet is ${fmtEth(MIN_BET)} ETH.`
  else if (balance && stake > balance.value) problem = 'Not enough Sepolia ETH.'
  else if (closed) problem = 'Betting for this round has closed.'

  const busy = tx.isPending || tx.isConfirming
  const label = tx.isPending ? 'Confirm in wallet...' : tx.isConfirming ? 'Confirming...' : ai ? (over ? 'Bet the hamster beats the AI' : 'Bet the AI holds') : `Bet ${over ? 'over' : 'under'} ${line === 0 ? '0' : line}`

  return (
    <div className="rounded-xl border border-line bg-panel2 p-4">
      <div className="flex items-center justify-between">
        <div className="label">
          Round {round.toString()} / {lineLabel(line)}
        </div>
        <button onClick={onClose} aria-label="Close bet panel" className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-white/5">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Side">
        <SideButton active={over} onClick={() => onSide(true)} tone="up" icon={<ArrowUp size={16} />} title={ai ? 'Beat the AI' : 'Over'} sub={line === 0 ? 'Wheel runs' : `more than ${line}`} />
        <SideButton active={!over} onClick={() => onSide(false)} tone="down" icon={<ArrowDown size={16} />} title={ai ? 'AI holds' : 'Under'} sub={line === 0 ? 'Stays idle' : `${line} or less`} />
      </div>

      <label className="mt-4 block">
        <span className="label">Stake (Sepolia ETH)</span>
        <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-line bg-bg px-1.5 focus-within:border-white/30">
          <button
            type="button"
            aria-label="Decrease stake by 0.001 ETH"
            onClick={() => setAmount(fmtInput(stake && stake > STEP + MIN_BET ? stake - STEP : MIN_BET))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-ink"
          >
            <Minus size={16} />
          </button>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
            className="display num h-12 min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
            placeholder="0.005"
            aria-label="Stake in ETH"
          />
          <span className="mono text-xs text-mute">ETH</span>
          <button
            type="button"
            aria-label="Increase stake by 0.001 ETH"
            onClick={() => setAmount(fmtInput((stake ?? 0n) + STEP))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-mute hover:bg-white/5 hover:text-ink"
          >
            <Plus size={16} />
          </button>
        </div>
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button key={c} onClick={() => setAmount(c)} className="h-9 rounded-lg border border-line px-3 text-xs text-mute hover:text-ink num">
            {c}
          </button>
        ))}
        {balance && (
          <>
            <button
              onClick={() => setAmount(fmtInput(balance.value > GAS_RESERVE + MIN_BET ? balance.value - GAS_RESERVE : MIN_BET))}
              className="h-9 rounded-lg border border-line px-3 text-xs text-mute hover:text-ink"
            >
              Max
            </button>
            <span className="ml-auto text-xs text-faint num">Balance {fmtEth(balance.value)} ETH</span>
          </>
        )}
      </div>

      <dl className="mt-4 space-y-2 rounded-xl border border-line bg-bg p-3 text-sm">
        <Row k="If you win (at current pools)" v={stake && stake >= MIN_BET ? `${fmtEth(payout)} ETH` : '--'} />
        <Row k="Multiple" v={multiple ? `${multiple.toFixed(2)}x` : '--'} />
        <Row k="Pool, over / under" v={`${fmtEth(overPool)} / ${fmtEth(underPool)} ETH`} />
      </dl>
      <p className="mt-2 text-xs text-faint text-pretty">
        Pari-mutuel: winners split the whole pool pro rata, no fee. If nobody backs the winning side, every stake is refunded. Odds move as others bet.
      </p>

      <div className="mt-4">
        {!isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="h-12 w-full rounded-xl bg-gold font-semibold text-bg">
                Connect wallet to bet
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : (
          <button
            disabled={busy || problem !== null}
            onClick={() => stake && void tx.send({ functionName: 'bet', args: [round, BigInt(line), over], value: stake })}
            className={clsx('flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold transition-opacity', over ? 'bg-up text-bg' : 'bg-down text-bg', (busy || problem !== null) && 'opacity-50')}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {label}
          </button>
        )}
        {problem && isConnected && stake !== null && <p className="mt-2 text-xs text-down">{problem}</p>}
        {tx.isSuccess && tx.hash && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-up">
            Bet placed.
            <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              View transaction <ExternalLink size={12} />
            </a>
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <ShareButton round={round} line={line} over={over} ai={ai} label="Share this bet" />
        </div>
        {tx.isFailed && <p className="mt-3 text-sm text-down">The transaction failed onchain. Your stake was not placed.</p>}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-mute">{k}</dt>
      <dd className="num font-medium">{v}</dd>
    </div>
  )
}

function SideButton({ active, onClick, tone, icon, title, sub }: { active: boolean; onClick: () => void; tone: 'up' | 'down'; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex min-h-[56px] flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors',
        active ? (tone === 'up' ? 'border-up bg-up/10 text-up' : 'border-down bg-down/10 text-down') : 'border-line text-mute hover:text-ink',
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </span>
      <span className="text-xs opacity-80">{sub}</span>
    </button>
  )
}
