import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, Lock, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { RoundClock, RoundWork } from '@/hooks/useSqueek'
import { backtest, WINDOW, type Forecast } from '@/lib/forecast'
import { fmtEth } from '@/lib/format'
import type { MarketState } from '@/lib/market'
import { fetchAiTake } from '@/lib/ai'

export function AiCard({
  round,
  fc,
  market,
  closed,
  selectedOver,
  onPick,
}: {
  round: bigint
  fc: Forecast | null
  market?: MarketState
  closed: boolean
  selectedOver: boolean | null
  onPick: (over: boolean) => void
}) {
  const over = market?.overPool ?? 0n
  const under = market?.underPool ?? 0n
  const total = over + under
  const overPct = total > 0n ? Number((over * 1000n) / total) / 10 : 50

  if (!fc) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4">
        <div className="flex items-center gap-2 text-sm text-mute">
          <Lock size={14} />
          The AI forecast for round {round.toString()} unlocks once SqueekCore certifies round {(round - 3n).toString()}.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-cyan/30 bg-cyan/5 p-4">
      <div className="flex items-center gap-2">
        <BrainCircuit size={16} className="text-cyan" aria-hidden />
        <span className="label text-cyan">Beat the AI / Round {round.toString()}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="display num text-4xl font-semibold">{fc.line === 0 ? 'Idle' : fc.line}</div>
          <div className="text-xs text-mute">{fc.line === 0 ? 'AI expects the wheel to stay still' : 'work units the AI expects'}</div>
        </div>
        <div className="max-w-[16rem] text-xs text-mute text-pretty">
          The wheel ran in {Math.round(fc.activeShare * 100)}% of the last {WINDOW} certified rounds{fc.activeMean > 0 ? `, averaging ${Math.round(fc.activeMean)} work when it did` : ''}. Based on rounds up to {fc.basedOnThrough.toString()}.
        </div>
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="bg-up" style={{ width: `${overPct}%` }} />
        <div className="bg-down" style={{ width: `${100 - overPct}%`, opacity: total > 0n ? 1 : 0.25 }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-faint num">
        <span>Hamster beats AI {fmtEth(over)} ETH</span>
        <span>AI holds {fmtEth(under)} ETH</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={closed}
          onClick={() => onPick(true)}
          className={clsx('h-12 rounded-lg border text-sm font-semibold disabled:opacity-40', selectedOver === true ? 'border-up bg-up/15 text-up' : 'border-line text-up hover:bg-up/10')}
        >
          Hamster beats the AI
        </button>
        <button
          disabled={closed}
          onClick={() => onPick(false)}
          className={clsx('h-12 rounded-lg border text-sm font-semibold disabled:opacity-40', selectedOver === false ? 'border-down bg-down/15 text-down' : 'border-line text-down hover:bg-down/10')}
        >
          AI holds
        </button>
      </div>
      <p className="mt-2 text-xs text-faint text-pretty">
        Beating the AI means the round's certified work is above {fc.line}. If it is {fc.line} or less, the AI holds.
      </p>
      <Analyst round={round} line={fc.line} />
    </div>
  )
}

export function AiRecord({ history, clock }: { history?: RoundWork[]; clock: RoundClock | null }) {
  const rows = useMemo(() => (history && clock ? backtest(history, Number(clock.maxWork)) : []), [history, clock])
  if (rows.length === 0) return null
  const beat = rows.filter((r) => r.hamsterBeatAi).length
  const avgError = Math.round(rows.reduce((s, r) => s + Math.abs(r.work - r.line), 0) / rows.length)
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="label">AI track record</div>
      <h2 className="display mt-1 text-lg font-semibold">
        The hamster beat the AI in {beat} of the last {rows.length} rounds
      </h2>
      <div className="mt-3 flex flex-wrap gap-1" aria-label="Round by round results">
        {rows.map((r) => (
          <span
            key={r.round.toString()}
            title={`Round ${r.round}: AI said ${r.line}, wheel did ${r.work}`}
            className={clsx('h-3.5 w-3.5 rounded-sm', r.hamsterBeatAi ? 'bg-up' : 'bg-down')}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-faint text-pretty num">
        Green: the wheel did more than the AI line. Red: the AI held. Average miss {avgError} work. Replayed on settled SqueekCore rounds with the same model.
      </p>
    </section>
  )
}

function Analyst({ round, line }: { round: bigint; line: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-take', round.toString()],
    queryFn: () => fetchAiTake(round),
    staleTime: 5 * 60_000,
    refetchInterval: (q) => (q.state.data?.status === 'ok' ? false : 60_000),
    retry: false,
  })

  const note = (text: string) => <p className="text-xs text-faint text-pretty">{text}</p>

  let body: React.ReactNode
  if (isLoading) body = note('The analyst is reading the ledger...')
  else if (!data || data.status === 'error') body = note('Analyst commentary is unavailable right now. The forecast above is unaffected.')
  else if (data.status === 'unconfigured') body = note('Analyst commentary is switched off on this server. The forecast above is unaffected.')
  else if (data.status === 'unavailable') body = note('The analyst is waiting for SqueekCore to certify enough rounds.')
  else if (data.line !== line) body = note('The analyst worked from a newer ledger snapshot. It will refresh in a minute.')
  else
    body = (
      <>
        <p className="display text-base font-semibold text-balance">{data.take.headline}</p>
        <p className="mt-1.5 text-sm text-ink/90 text-pretty">{data.take.reasoning}</p>
        <p className="mt-2 text-xs text-gold text-pretty">Watch out: {data.take.watchout}</p>
        <p className="mt-2 text-[11px] text-faint">Written by {data.model} from the ledger facts above. Commentary only, not advice.</p>
      </>
    )

  return (
    <div className="mt-4 rounded-lg border border-line bg-bg/60 p-3">
      <div className="label mb-2 flex items-center gap-1.5">
        <Sparkles size={12} aria-hidden /> AI analyst
      </div>
      {body}
    </div>
  )
}
