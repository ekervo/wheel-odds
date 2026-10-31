import type { RoundWork } from '@/hooks/useSqueek'
import { LINES } from '@/lib/market'

export function summarize(rounds: RoundWork[]) {
  const active = rounds.filter((r) => r.work > 0n)
  const sorted = active.map((r) => Number(r.work)).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  return { activeRate: rounds.length ? active.length / rounds.length : 0, median, activeCount: active.length }
}

export function RoundHistory({ rounds, loading }: { rounds?: RoundWork[]; loading: boolean }) {
  const data = (rounds ?? []).slice(-60)
  const max = Math.max(1000, ...data.map((r) => Number(r.work)))
  const stats = summarize(data)
  const lastActive = [...data].reverse().find((r) => r.work > 0n)
  const latest = data.length ? data[data.length - 1].round : undefined
  const idleStreak = latest !== undefined ? Number(latest - (lastActive?.round ?? (data[0]?.round ?? latest) - 1n)) : 0
  const H = 96

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label">Last {data.length || 60} settled rounds</div>
          <div className="display mt-1 text-lg font-semibold">What the wheel actually did</div>
        </div>
        <div className="text-right text-xs text-mute">
          <div className="num">
            Active in <span className="text-ink">{Math.round(stats.activeRate * 100)}%</span> of rounds
          </div>
          <div className="num">
            Median active round <span className="text-ink">{stats.median}</span> work
          </div>
        </div>
      </div>

      <div className="relative mt-4" style={{ height: H }}>
        {loading && data.length === 0 && <div className="absolute inset-0 grid place-items-center text-sm text-faint">Reading SqueekCore...</div>}
        {LINES.filter((l) => l > 0 && l <= max).map((l) => (
          <div key={l} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(l / max) * H}px` }}>
            <span className="mono absolute -top-4 right-0 text-[10px] text-faint">{l}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[3px]">
          {data.map((r) => {
            const h = r.work > 0n ? Math.max(4, (Number(r.work) / max) * H) : 2
            return (
              <div
                key={r.round.toString()}
                title={`Round ${r.round}: ${r.work} work`}
                className={r.work > 0n ? 'flex-1 rounded-t-sm bg-gold' : 'flex-1 rounded-t-sm bg-white/10'}
                style={{ height: h }}
              />
            )
          })}
        </div>
      </div>
      {data.length > 0 && idleStreak >= 3 && (
        <p className="mt-3 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-mute text-pretty num">
          The wheel has been idle for the last <span className="text-ink">{idleStreak}</span> settled rounds
          {lastActive ? (
            <>
              . Last active: round <span className="text-ink">{lastActive.round.toString()}</span> with <span className="text-ink">{lastActive.work.toString()}</span> work.
            </>
          ) : (
            ' and shows no activity in this window.'
          )}
        </p>
      )}
      <p className="mt-3 text-xs text-faint">Bars are work units per round, read from the SqueekCore ledger. Dashed lines are the betting lines.</p>
    </section>
  )
}
