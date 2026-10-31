import { ConnectKitButton } from 'connectkit'
import { AlertTriangle } from 'lucide-react'
import { AiRecord } from '@/components/AiCard'
import { ChatWidget } from '@/components/ChatWidget'
import { Leaderboard } from '@/components/Leaderboard'
import { HowItWorks } from '@/components/HowItWorks'
import { MarketBoard } from '@/components/MarketBoard'
import { ClaimHistory, Positions, Results } from '@/components/Positions'
import { RoundHistory } from '@/components/RoundHistory'
import { WheelHero } from '@/components/WheelHero'
import { useCoreState, useIntegrity, useRecentRounds, useRoundClock, useWheelStatus } from '@/hooks/useSqueek'
import { MARKET_ADDRESS } from '@/lib/market'

function Logo() {
  const dots = [0, 1, 2, 3, 4, 5, 6, 7]
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      {dots.map((i) => {
        const a = (i / dots.length) * Math.PI * 2
        return <circle key={i} cx={14 + Math.cos(a) * 10} cy={14 + Math.sin(a) * 10} r={i === 0 ? 2.6 : 1.8} fill={i === 0 ? '#ffb43a' : '#6c88ff'} />
      })}
      <circle cx="14" cy="14" r="2" fill="#fff3dc" />
    </svg>
  )
}

export default function App() {
  const clock = useRoundClock()
  const { data: state } = useCoreState()
  const { data: status } = useWheelStatus()
  const frontier = state?.settledThroughRound
  const { data: rounds, isLoading: roundsLoading } = useRecentRounds(frontier)
  const integrity = useIntegrity()

  const wrongCore = integrity.marketMatchesApi === false || integrity.appMatchesApi === false

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-24 pt-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div>
            <div className="display text-xl font-bold leading-none tracking-tight"><span className="led">WHEEL</span> <span className="led-blue">ODDS</span></div>
            <div className="label mt-1">Squeekchain / Sepolia</div>
          </div>
        </div>
        <ConnectKitButton showBalance={false} />
      </header>

      {wrongCore && (
        <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-down/40 bg-down/10 p-3 text-sm text-down">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Squeekchain's API now reports a different SqueekCore than this market reads. Do not bet until the app is updated.
            {integrity.apiCore ? ` API core: ${integrity.apiCore}` : ''}
          </span>
        </div>
      )}

      <main className="mt-5 space-y-5">
        <WheelHero status={status} clock={clock} frontier={frontier} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <MarketBoard clock={clock} history={rounds} />
            <AiRecord history={rounds} clock={clock} />
            <RoundHistory rounds={rounds} loading={roundsLoading} />
          </div>
          <div className="space-y-5">
            <Positions clock={clock} frontier={frontier} />
            <ClaimHistory />
            <Results />
            <Leaderboard maxWork={clock ? Number(clock.maxWork) : 10000} />
          </div>
        </div>
        <HowItWorks />
      </main>

      <footer className="mt-10 text-xs text-faint text-pretty">
        Testnet only. Stakes are Sepolia ETH with no monetary value.{' '}
        {MARKET_ADDRESS === null ? 'Market contract pending deployment.' : 'Settlement is permissionless and reads SqueekCore directly.'}
      </footer>
      <p className="mt-3 text-sm text-mute">
        Built by{' '}
        <a href="https://x.com/gemresearches" target="_blank" rel="noopener noreferrer" className="font-semibold text-gold underline-offset-4 hover:underline">
          @gemresearches
        </a>
      </p>
      <ChatWidget />
    </div>
  )
}
