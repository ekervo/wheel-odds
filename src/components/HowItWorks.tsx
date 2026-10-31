import { useState } from 'react'
import { BadgeCheck, Ban, Coins, ExternalLink, FileCode2, RotateCcw, ShieldCheck } from 'lucide-react'
import { LIVE_CORE } from '@/lib/coreAbi'
import { MARKET_ADDRESS, addressUrl } from '@/lib/market'

const STEPS = [
  {
    n: '01',
    title: 'Pick a line',
    text: 'Choose a round and a number of work units. The AI line is the model\'s own guess. Fixed lines and custom lines are open too.',
  },
  {
    n: '02',
    title: 'Bet over or under',
    text: 'Stake Sepolia ETH on the wheel doing more than the line, or the line holding. Bets close the moment the round starts.',
  },
  {
    n: '03',
    title: 'Settle from SqueekCore',
    text: 'Once the round closes, SqueekCore certifies its work. Anyone can press Settle, the contract reads that number, and winners claim their share.',
  },
]

const TRUST = [
  { icon: Ban, title: 'No admin', text: 'The contract has no owner, no pause switch and no upgrade path. Nobody can change a result.' },
  { icon: Coins, title: 'No fee', text: 'Winners split the entire pool in proportion to their stake. The house takes nothing.' },
  { icon: RotateCcw, title: 'Refunds, not traps', text: 'If nobody backed the winning side, or SqueekCore never certifies the round within 7 days, every stake is returned.' },
  { icon: BadgeCheck, title: 'One source of truth', text: 'The only input is the work SqueekCore certified for that round. There is no price feed or outside oracle.' },
]

function SourceViewer() {
  const [text, setText] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const load = (open: boolean) => {
    if (!open || text !== null) return
    fetch(`${import.meta.env.BASE_URL}HamsterRoundMarket.sol`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('not found'))))
      .then(setText)
      .catch(() => setFailed(true))
  }
  return (
    <details className="group mt-4 rounded-xl border border-line" onToggle={(e) => load(e.currentTarget.open)}>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium">
        <FileCode2 size={16} className="text-cyan" aria-hidden />
        Read the contract source
        <span className="ml-auto text-xs text-faint group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs text-faint group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-line p-3">
        <p className="mb-2 text-xs text-faint text-pretty">
          This is the exact file the deployed contract was built from. The explorer page for the contract is not source-verified, so compare it with the code here.
        </p>
        <pre className="mono max-h-96 overflow-auto rounded-lg bg-bg p-3 text-[11px] leading-relaxed text-mute">
          {failed ? 'Could not load the source file.' : (text ?? 'Loading...')}
        </pre>
      </div>
    </details>
  )
}

export function HowItWorks() {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5" aria-labelledby="how-title">
      <div className="label flex items-center gap-1.5">
        <ShieldCheck size={13} aria-hidden /> How it works
      </div>
      <h2 id="how-title" className="display mt-1 text-xl font-semibold text-balance">
        Three steps, and no one can fix the result
      </h2>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="rounded-xl border border-line bg-panel2 p-3.5">
            <div className="mono text-xs text-cyan">{s.n}</div>
            <div className="display mt-1.5 text-base font-semibold">{s.title}</div>
            <p className="mt-1 text-sm text-mute text-pretty">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="label mt-6">Why it is fair</div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
            <Icon size={18} className="shrink-0 text-gold" aria-hidden />
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <p className="mt-0.5 text-xs text-mute text-pretty">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {MARKET_ADDRESS !== null && (
          <a href={addressUrl(MARKET_ADDRESS)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-sm text-mute hover:text-ink">
            Market contract <ExternalLink size={13} />
          </a>
        )}
        <a href={addressUrl(LIVE_CORE)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-sm text-mute hover:text-ink">
          SqueekCore it reads <ExternalLink size={13} />
        </a>
        <a href="https://docs.squeekchain.com/developers/" target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line px-4 text-sm text-mute hover:text-ink">
          Squeekchain docs <ExternalLink size={13} />
        </a>
      </div>

      <SourceViewer />
    </section>
  )
}
