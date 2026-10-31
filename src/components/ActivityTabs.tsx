import { useState } from 'react'
import clsx from 'clsx'
import type { RoundClock } from '@/hooks/useSqueek'
import { Leaderboard } from './Leaderboard'
import { ClaimHistory, Positions, Results } from './Positions'

type Tab = 'bets' | 'claims' | 'results' | 'leaders'

const TABS: { id: Tab; label: string }[] = [
  { id: 'bets', label: 'My bets' },
  { id: 'claims', label: 'Claims' },
  { id: 'results', label: 'Results' },
  { id: 'leaders', label: 'Leaders' },
]

/** Personal and community activity in one tabbed card, so the page stays short. */
export function ActivityTabs({ clock, frontier, maxWork }: { clock: RoundClock | null; frontier?: bigint; maxWork: number }) {
  const [tab, setTab] = useState<Tab>('bets')
  return (
    <section className="rounded-2xl border border-line bg-panel" aria-label="Activity">
      <div className="grid grid-cols-4 gap-1 border-b border-line p-2" role="tablist" aria-label="Activity">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="activity-panel"
            onClick={() => setTab(t.id)}
            className={clsx('h-11 rounded-lg text-sm font-medium transition-colors', tab === t.id ? 'bg-gold/10 text-gold' : 'text-mute hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="activity-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="max-h-[34rem] overflow-y-auto p-4">
        {tab === 'bets' && <Positions clock={clock} frontier={frontier} embedded />}
        {tab === 'claims' && <ClaimHistory embedded />}
        {tab === 'results' && <Results embedded />}
        {tab === 'leaders' && <Leaderboard maxWork={maxWork} embedded />}
      </div>
    </section>
  )
}
