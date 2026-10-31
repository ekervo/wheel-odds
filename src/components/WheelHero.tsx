import { Activity, Radio, Timer } from 'lucide-react'
import clsx from 'clsx'
import type { RoundClock } from '@/hooks/useSqueek'
import type { WheelStatus } from '@/lib/wheel'

const DOTS = 24

function Wheel({ rpm, running }: { rpm: number; running: boolean }) {
  // One revolution takes 60 / rpm seconds. Clamp so very fast spins stay readable.
  const seconds = running && rpm > 0 ? Math.max(0.35, 60 / rpm) : 0
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label={running ? `Wheel spinning at ${rpm.toFixed(1)} rpm` : 'Wheel idle'}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,196,120,0.14)" />
      <g
        style={{
          transformOrigin: '60px 60px',
          animation: seconds ? `wheel-spin ${seconds}s linear infinite` : 'none',
        }}
      >
        {Array.from({ length: DOTS }, (_, i) => {
          const a = (i / DOTS) * Math.PI * 2
          return (
            <circle
              key={i}
              cx={60 + Math.cos(a) * 42}
              cy={60 + Math.sin(a) * 42}
              r={i === 0 ? 4.2 : 2.4}
              fill={i === 0 ? '#ffb43a' : running ? '#6c88ff' : '#7f7261'}
            />
          )
        })}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2
          return <line key={i} x1="60" y1="60" x2={60 + Math.cos(a) * 30} y2={60 + Math.sin(a) * 30} stroke="rgba(255,196,120,0.22)" />
        })}
      </g>
      <circle cx="60" cy="60" r="4" fill="#fff3dc" />
      <style>{`@keyframes wheel-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

const fmtClock = (s: number) => {
  const n = Math.max(0, Math.floor(s))
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

export function WheelHero({ status, clock, frontier }: { status?: WheelStatus; clock: RoundClock | null; frontier?: bigint }) {
  const online = status?.available && status.freshness === 'online'
  const running = !!online && status?.coreStatus === 'ACTIVE'
  const stateLabel = !status?.available ? 'No signal' : !online ? 'Stale' : running ? 'Running' : 'Idle'
  const lag = clock && frontier !== undefined ? Number(clock.current - 1n - frontier) : null

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="flex items-start gap-5">
        <Wheel rpm={status?.rpm ?? 0} running={running} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 label', running ? 'border-cyan/40 text-cyan' : online ? 'border-line text-mute' : 'border-down/40 text-down')}>
              <Radio size={12} aria-hidden /> {stateLabel}
            </span>
            <span className="label">live from the wheel</span>
          </div>
          <h1 className="display mt-3 text-3xl font-semibold leading-tight text-balance sm:text-4xl">
            Will the hamster run this round?
          </h1>
          <p className="mt-2 max-w-prose text-sm text-mute text-pretty">
            Every 10 minutes the wheel's work is counted and settled onchain by SqueekCore. Pick a line, bet over or under, and the contract pays out from the certified number. No oracle, no admin.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Timer size={14} />} label={clock ? `Round ${clock.current}` : 'Round'} value={clock ? fmtClock(clock.secondsToEnd) : '--:--'} sub={lag !== null && lag > 1 ? `settlement ${lag} rounds behind` : 'until next round'} />
        <Stat
          icon={<Activity size={14} />}
          label="Work this round"
          value={status?.openRoundWorkUnits != null ? status.openRoundWorkUnits.toString() : '--'}
          sub="provisional, unsettled"
        />
        <Stat
          label="Speed"
          value={status?.available ? `${(status.speedMmPerSecond / 1000).toFixed(2)} m/s` : '--'}
          sub={status?.available ? (running ? `${status.rpm.toFixed(1)} rpm` : 'wheel is resting') : 'no reading'}
        />
        <Stat
          label="Distance today"
          value={status?.available ? `${(status.distanceMm / 1000).toFixed(0)} m` : '--'}
          sub={status?.available ? (status.distanceMm > 0 ? "device's daily count" : 'no running yet today') : 'no reading'}
        />
      </dl>
    </section>
  )
}

function Stat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel2 p-3">
      <dt className="label flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="display num mt-1.5 text-2xl font-semibold">{value}</dd>
      <div className="mt-0.5 text-xs text-faint">{sub}</div>
    </div>
  )
}
