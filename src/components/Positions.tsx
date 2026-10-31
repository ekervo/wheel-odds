import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ExternalLink, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { RoundClock } from '@/hooks/useSqueek'
import { useClaimHistory, useMarketTx, usePositions, useResults, type Position } from '@/hooks/useMarket'
import { MARKET_ADDRESS, addressUrl, txUrl } from '@/lib/market'
import { fmtEth, lineLabel } from '@/lib/format'
import { Pager, usePaged } from './Pager'

type Phase =
  | { kind: 'open'; text: string }
  | { kind: 'waiting'; text: string }
  | { kind: 'settle'; text: string }
  | { kind: 'claim'; text: string }
  | { kind: 'won'; text: string }
  | { kind: 'lost'; text: string }
  | { kind: 'done'; text: string }

function phaseOf(p: Position, clock: RoundClock | null, frontier: bigint | undefined): Phase {
  const m = p.market
  const hasStake = p.stakeOver + p.stakeUnder > 0n
  if (p.claimable > 0n) return { kind: 'claim', text: m.settled && !m.voided ? 'You won' : 'Refund available' }
  if (m.settled) {
    if (!hasStake) return { kind: 'done', text: 'Paid out' }
    const won = m.overWon ? p.stakeOver > 0n : p.stakeUnder > 0n
    return won ? { kind: 'won', text: 'You won' } : { kind: 'lost', text: `Lost. Work was ${m.work}` }
  }
  if (!clock) return { kind: 'open', text: 'Open' }
  if (clock.nowS < clock.endOf(p.round)) return { kind: 'open', text: clock.nowS < clock.startOf(p.round) ? 'Betting open' : 'Round in progress' }
  if (frontier !== undefined && frontier >= p.round) return { kind: 'settle', text: 'Ready to settle' }
  return { kind: 'waiting', text: 'Waiting for SqueekCore to certify' }
}

export function Positions({ clock, frontier }: { clock: RoundClock | null; frontier?: bigint }) {
  const { address, isConnected } = useAccount()
  const { positions, isLoading } = usePositions(address)
  const tx = useMarketTx()
  const busy = tx.isPending || tx.isConfirming
  const paged = usePaged(positions)

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="label">Your bets</div>
      <h2 className="display mt-1 text-lg font-semibold">Positions and payouts</h2>

      {MARKET_ADDRESS === null ? (
        <Empty text="Available once the market contract is deployed." />
      ) : !isConnected ? (
        <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center">
          <p className="text-sm text-mute">Connect a wallet to see your bets.</p>
          <div className="mt-3 flex justify-center">
            <ConnectKitButton />
          </div>
        </div>
      ) : isLoading ? (
        <Empty text="Loading your bets..." />
      ) : positions.length === 0 ? (
        <Empty text="No bets yet. Pick a line above." />
      ) : (
        <ul className="mt-4 space-y-2">
          {paged.slice.map((p) => {
            const phase = phaseOf(p, clock, frontier)
            return (
              <li key={`${p.round}:${p.line}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="display text-base font-semibold num">
                    Round {p.round.toString()} / {lineLabel(p.line)}
                  </div>
                  <div className="mt-0.5 text-xs text-mute num">
                    {p.stakeOver > 0n && <span className="mr-3 text-up">Over {fmtEth(p.stakeOver)} ETH</span>}
                    {p.stakeUnder > 0n && <span className="text-down">Under {fmtEth(p.stakeUnder)} ETH</span>}
                    {p.stakeOver + p.stakeUnder === 0n && <span>Stake collected</span>}
                  </div>
                </div>
                <span
                  className={clsx(
                    'label rounded-full border px-2.5 py-1',
                    phase.kind === 'won' || phase.kind === 'claim' ? 'border-up/40 text-up' : phase.kind === 'lost' ? 'border-down/40 text-down' : 'border-line',
                  )}
                >
                  {phase.text}
                </span>
                {phase.kind === 'claim' && (
                  <button
                    disabled={busy}
                    onClick={() => void tx.send({ functionName: 'claim', args: [p.round, p.line] })}
                    className="flex h-11 items-center gap-2 rounded-lg bg-up px-4 text-sm font-semibold text-bg disabled:opacity-50"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Claim {fmtEth(p.claimable)} ETH
                  </button>
                )}
                {phase.kind === 'settle' && (
                  <button
                    disabled={busy}
                    onClick={() => void tx.send({ functionName: 'settle', args: [p.round, p.line] })}
                    className="flex h-11 items-center gap-2 rounded-lg border border-gold px-4 text-sm font-semibold text-gold disabled:opacity-50"
                  >
                    {busy && <Loader2 size={14} className="animate-spin" />}
                    Settle from SqueekCore
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Pager page={paged.page} pages={paged.pages} total={paged.total} size={paged.size} onPage={paged.setPage} />

      {tx.isSuccess && tx.hash && (
        <a href={txUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-up underline">
          Confirmed. View transaction <ExternalLink size={12} />
        </a>
      )}
    </section>
  )
}

export function ClaimHistory() {
  const { address, isConnected } = useAccount()
  const { data, isLoading } = useClaimHistory(address)
  const total = (data ?? []).reduce((sum, r) => sum + r.payout, 0n)
  const paged = usePaged(data ?? [])
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="label">Your payouts</div>
          <h2 className="display mt-1 text-lg font-semibold">Claim history</h2>
        </div>
        {data && data.length > 0 && (
          <div className="text-right">
            <div className="label">Total claimed</div>
            <div className="display num text-lg font-semibold text-up">{fmtEth(total)} ETH</div>
          </div>
        )}
      </div>
      {MARKET_ADDRESS === null || !isConnected ? (
        <Empty text="Connect a wallet to see your claims." />
      ) : isLoading ? (
        <Empty text="Loading your claims..." />
      ) : !data || data.length === 0 ? (
        <Empty text="No claims yet. Winnings and refunds you claim will show up here." />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {paged.slice.map((r) => (
            <li key={r.txHash + r.line.toString()} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="num font-medium">
                  Round {r.round.toString()} / {lineLabel(r.line)}
                </div>
                <div className="text-xs text-faint num">
                  {r.timestamp ? new Date(r.timestamp * 1000).toLocaleString() : `Block ${r.blockNumber.toString()}`}
                </div>
              </div>
              <div className="display num font-semibold text-up">+{fmtEth(r.payout)} ETH</div>
              <a href={txUrl(r.txHash)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 text-xs text-mute underline hover:text-ink">
                {r.txHash.slice(0, 8)}...{r.txHash.slice(-6)} <ExternalLink size={12} />
              </a>
            </li>
          ))}
        </ul>
      )}
      <Pager page={paged.page} pages={paged.pages} total={paged.total} size={paged.size} onPage={paged.setPage} />
    </section>
  )
}

export function Results() {
  const { data, isLoading } = useResults()
  const paged = usePaged(data ?? [])
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Settled onchain</div>
          <h2 className="display mt-1 text-lg font-semibold">Recent results</h2>
        </div>
        {MARKET_ADDRESS !== null && (
          <a href={addressUrl(MARKET_ADDRESS)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-mute hover:text-ink">
            Contract <ExternalLink size={12} />
          </a>
        )}
      </div>
      {MARKET_ADDRESS === null ? (
        <Empty text="No results yet." />
      ) : isLoading ? (
        <Empty text="Loading results..." />
      ) : !data || data.length === 0 ? (
        <Empty text="No market has settled yet." />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {paged.slice.map((r) => (
            <li key={`${r.round}:${r.line}`} className="flex items-center justify-between gap-3 p-3 text-sm num">
              <span>
                Round {r.round.toString()} / {lineLabel(r.line)}
              </span>
              <span className="text-mute">{r.work.toString()} work</span>
              <span className={clsx('font-semibold', r.voided ? 'text-mute' : r.overWon ? 'text-up' : 'text-down')}>{r.voided ? 'Refunded' : r.overWon ? 'Over won' : 'Under won'}</span>
            </li>
          ))}
        </ul>
      )}
      <Pager page={paged.page} pages={paged.pages} total={paged.total} size={paged.size} onPage={paged.setPage} />
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center text-sm text-mute">{text}</div>
}
