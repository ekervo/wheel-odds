import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Trophy } from 'lucide-react'
import clsx from 'clsx'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { MARKET_ADDRESS } from '@/lib/market'
import { fmtEth, short } from '@/lib/format'

type Tab = 'earners' | 'slayers'
const SHOWN = 10

export function Leaderboard({ maxWork }: { maxWork: number }) {
  const [tab, setTab] = useState<Tab>('earners')
  const { address } = useAccount()
  const { data, isLoading, isError } = useLeaderboard(maxWork)

  const rows = data?.rows ?? []
  const ranked =
    tab === 'earners'
      ? [...rows].filter((r) => r.wins + r.losses > 0).sort((a, b) => (a.profit === b.profit ? b.wins - a.wins : a.profit > b.profit ? -1 : 1))
      : [...rows].filter((r) => r.aiBets > 0).sort((a, b) => b.aiBeats - a.aiBeats || b.aiBets - a.aiBets)
  const top = ranked.slice(0, SHOWN)
  const me = address ? ranked.findIndex((r) => r.user.toLowerCase() === address.toLowerCase()) : -1

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label flex items-center gap-1.5">
            <Trophy size={13} aria-hidden /> Leaderboard
          </div>
          <h2 className="display mt-1 text-lg font-semibold">Who is beating the wheel</h2>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5" role="tablist" aria-label="Leaderboard">
        {(
          [
            ['earners', 'Top earners'],
            ['slayers', 'AI slayers'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx('h-11 rounded-lg border text-sm', tab === id ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mute hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>

      {MARKET_ADDRESS === null ? (
        <Note text="Available once the market contract is deployed." />
      ) : isLoading ? (
        <Note text="Reading every settled market from the chain..." />
      ) : isError ? (
        <Note text="Could not read the market events right now. Try again in a minute." />
      ) : top.length === 0 ? (
        <Note text={tab === 'earners' ? 'No settled markets with a winner yet. Settle a round to start the board.' : 'Nobody has bet on an AI line in a settled round yet.'} />
      ) : (
        <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
          {top.map((r, i) => {
            const mine = address !== undefined && r.user.toLowerCase() === address.toLowerCase()
            return (
              <li key={r.user} className={clsx('flex items-center gap-3 p-3 text-sm', mine && 'bg-gold/5')}>
                <span className={clsx('display num w-6 shrink-0 text-center text-base font-semibold', i === 0 ? 'text-gold' : 'text-faint')}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mono truncate text-xs">
                    {short(r.user)}
                    {mine && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">YOU</span>}
                  </div>
                  <div className="text-xs text-faint num">
                    {tab === 'earners' ? `${r.wins} won, ${r.losses} lost` : `${r.aiBets} AI bet${r.aiBets === 1 ? '' : 's'}`}
                  </div>
                </div>
                {tab === 'earners' ? (
                  <div className={clsx('display num text-base font-semibold', r.profit >= 0n ? 'text-up' : 'text-down')}>
                    {r.profit >= 0n ? '+' : '-'}
                    {fmtEth(r.profit >= 0n ? r.profit : -r.profit)} ETH
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="display num text-base font-semibold text-cyan">{r.aiBeats}</div>
                    <div className="text-[11px] text-faint">AI beaten</div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {me >= SHOWN && (
        <p className="mt-2 text-xs text-mute num">
          You are ranked <span className="text-ink">#{me + 1}</span> of {ranked.length}.
        </p>
      )}
      <p className="mt-3 text-xs text-faint text-pretty">
        Built from the contract's onchain events across {data?.settledMarkets ?? 0} settled markets. Net result is payout minus stake; refunds count as zero. Only settled markets are scored.
        {tab === 'slayers' ? ' A win here means you backed "Hamster beats the AI" and the wheel did beat the AI line.' : ''}
      </p>
    </section>
  )
}

function Note({ text }: { text: string }) {
  return <div className="mt-3 rounded-xl border border-dashed border-line p-5 text-center text-sm text-mute">{text}</div>
}
