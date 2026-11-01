import { useMemo, useState } from 'react'
import clsx from 'clsx'
import type { RoundClock, RoundWork } from '@/hooks/useSqueek'
import { useMarketBoard } from '@/hooks/useMarket'
import { forecast, ladder } from '@/lib/forecast'
import { AiCard } from './AiCard'
import { CLOSING_BUFFER_S, LINE_STEP, MARKET_ADDRESS } from '@/lib/market'
import { fmtCountdown, fmtEth, lineLabel } from '@/lib/format'
import { BetPanel } from './BetPanel'
import { ShareButton } from './ShareButton'
import { readInvite } from '@/lib/invite'

const ROUND_TABS = 4

export function MarketBoard({ clock, history }: { clock: RoundClock | null; history?: RoundWork[] }) {
  type Pick = { round: bigint; line: number; over: boolean; ai?: boolean }
  const invite = useMemo(() => readInvite(window.location.search), [])
  // The player's choice is an absolute round, never a tab position, so it cannot drift when a new round begins.
  const [selectedRound, setSelectedRound] = useState<bigint | null>(null)
  const [custom, setCustom] = useState<number[]>([])
  const [customInput, setCustomInput] = useState('')
  const [pickState, setPick] = useState<Pick | null | undefined>(undefined)

  // An invite link opens its round and bet until the player clicks something else.
  const inviteOffset = invite && clock ? Number(invite.round - clock.current) : null
  const inviteOpen = inviteOffset !== null && inviteOffset >= 1 && inviteOffset <= ROUND_TABS
  const inviteStale = invite !== null && clock !== null && !inviteOpen

  const wanted = selectedRound ?? (inviteOpen && invite ? invite.round : null)
  const stillOpen = clock !== null && wanted !== null && wanted > clock.current && wanted <= clock.current + BigInt(ROUND_TABS)
  const round = clock ? (stillOpen && wanted !== null ? wanted : clock.current + 1n) : undefined
  const offset = clock && round !== undefined ? Number(round - clock.current) : 1
  // The round the player was on has started: move them on and say so, instead of silently shifting the tab.
  const rolledOver = clock !== null && selectedRound !== null && selectedRound <= clock.current

  const fc = useMemo(
    () => (round !== undefined && history && clock ? forecast(history, round, Number(clock.maxWork)) : null),
    [round, history, clock],
  )
  const aiLine = fc?.line ?? null
  const rungs = useMemo(
    () => (round !== undefined && history && clock ? ladder(history, round, Number(clock.maxWork)) : null),
    [round, history, clock],
  )
  const tags = useMemo(() => new Map((rungs ?? []).map((r) => [r.line, r.tag])), [rungs])
  const invitedLine = inviteOpen && invite !== null && round === invite.round && invite.line != null ? invite.line : null
  const lines = useMemo(() => {
    const base: number[] = [...(rungs ? rungs.map((r) => r.line) : [0]), ...custom].filter((l, i, a) => a.indexOf(l) === i)
    if (aiLine !== null && !base.includes(aiLine)) base.push(aiLine)
    if (invitedLine !== null && !base.includes(invitedLine)) base.push(invitedLine)
    return base
  }, [rungs, custom, aiLine, invitedLine])
  const invitedPick: Pick | null =
    invitedLine !== null && round !== undefined && invite?.over != null ? { round, line: invitedLine, over: invite.over, ai: invite.ai && aiLine === invitedLine } : null
  const rawPick = pickState === undefined ? invitedPick : pickState
  const pick = rawPick !== null && round !== undefined && rawPick.round === round ? rawPick : null
  const choose = (line: number, over: boolean, ai: boolean) => {
    if (round === undefined) return
    setSelectedRound(round)
    setPick({ round, line, over, ai })
  }
  const { markets } = useMarketBoard(round, lines)

  const startsIn = clock && round ? clock.startOf(round) - clock.nowS : 0
  const closed = startsIn <= CLOSING_BUFFER_S

  const addCustom = () => {
    const n = Number(customInput)
    const max = clock ? Number(clock.maxWork) : 10000
    if (!Number.isInteger(n) || n < 0 || n > max || n % LINE_STEP !== 0) return
    if (!(lines as readonly number[]).includes(n)) setCustom((c) => [...c, n])
    setCustomInput('')
  }
  const customValid = customInput !== '' && Number.isInteger(Number(customInput)) && Number(customInput) % LINE_STEP === 0 && Number(customInput) >= 0

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      {inviteStale && invite && (
        <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold text-pretty">
          This invite was for round {invite.round.toString()}, which is not open for betting right now (it has either started or is more than four rounds away). Pick one of the open rounds below.
        </p>
      )}
      {rolledOver && selectedRound !== null && round !== undefined && (
        <p role="status" className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold text-pretty">
          Round {selectedRound.toString()} has started, so betting on it is closed. Now showing round {round.toString()}. Any open bet panel was closed, so nothing is placed by accident.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">Open markets</div>
          <h2 className="display mt-1 text-lg font-semibold">Over / under on a round's work</h2>
        </div>
        <div className="flex gap-1.5" role="tablist" aria-label="Round">
          {Array.from({ length: ROUND_TABS }, (_, i) => i + 1).map((o) => (
            <button
              key={o}
              role="tab"
              aria-selected={offset === o}
              onClick={() => {
                if (clock) setSelectedRound(clock.current + BigInt(o))
                setPick(null)
              }}
              className={clsx('h-10 rounded-lg border px-3 text-sm num', offset === o ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mute hover:text-ink')}
            >
              {clock ? `#${(clock.current + BigInt(o)).toString()}` : '#--'}
            </button>
          ))}
        </div>
      </div>

      {MARKET_ADDRESS === null ? (
        <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-mute">The market contract has not been deployed yet.</div>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-mute num">
              {closed ? 'Betting is closed for this round.' : `Betting closes when round ${round} starts, in ${fmtCountdown(startsIn)}.`}
            </p>
            {round !== undefined && <ShareButton round={round} label={`Invite friends to round ${round}`} />}
          </div>
          {round !== undefined && (
            <div className="mt-4">
              <AiCard
                round={round}
                fc={fc}
                market={aiLine !== null ? markets.get(aiLine) : undefined}
                closed={closed}
                selectedOver={pick?.ai ? pick.over : null}
                onPick={(over) => aiLine !== null && choose(aiLine, over, true)}
              />
              {pick?.ai && aiLine !== null && (
                <div className="mt-3">
                  <BetPanel
                    key={`${round}:${aiLine}:ai`}
                    round={round}
                    line={aiLine}
                    over={pick.over}
                    market={markets.get(aiLine)}
                    closed={closed}
                    ai
                    onSide={(o) => choose(aiLine, o, true)}
                    onClose={() => setPick(null)}
                  />
                </div>
              )}
            </div>
          )}
          <div className="label mt-5">Lines from recent wheel data</div>
          <p className="mt-1 text-xs text-faint text-pretty">
            {rungs
              ? `Set from the wheel's last 60 certified rounds up to round ${round !== undefined ? (round - 3n).toString() : ''}, so they move with the hamster.`
              : `Full lines unlock once SqueekCore certifies round ${round !== undefined ? (round - 3n).toString() : ''}. Until then only "runs at all" and custom lines are open.`}
          </p>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {lines.map((line) => {
              const m = markets.get(line)
              const over = m?.overPool ?? 0n
              const under = m?.underPool ?? 0n
              const total = over + under
              const overPct = total > 0n ? Number((over * 1000n) / total) / 10 : 50
              const selected = !pick?.ai && pick?.line === line
              return (
                <li key={line} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-28 shrink-0">
                      <div className="display text-base font-semibold">{lineLabel(line)}</div>
                      <div className="text-xs text-faint num">{tags.get(line) ?? 'Custom line'}</div>
                      <div className="text-xs text-faint num">{total > 0n ? `${fmtEth(total)} ETH in` : 'No bets yet'}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                        <div className="bg-up" style={{ width: `${overPct}%` }} />
                        <div className="bg-down" style={{ width: `${100 - overPct}%`, opacity: total > 0n ? 1 : 0.25 }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-faint num">
                        <span>Over {fmtEth(over)}</span>
                        <span>Under {fmtEth(under)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        disabled={closed}
                        onClick={() => choose(line, true, false)}
                        className={clsx('h-11 min-w-[64px] rounded-lg border text-sm font-semibold disabled:opacity-40', selected && pick?.over ? 'border-up bg-up/15 text-up' : 'border-line text-up hover:bg-up/10')}
                      >
                        Over
                      </button>
                      <button
                        disabled={closed}
                        onClick={() => choose(line, false, false)}
                        className={clsx('h-11 min-w-[64px] rounded-lg border text-sm font-semibold disabled:opacity-40', selected && !pick?.over ? 'border-down bg-down/15 text-down' : 'border-line text-down hover:bg-down/10')}
                      >
                        Under
                      </button>
                    </div>
                  </div>
                  {selected && round !== undefined && pick && (
                    <div className="mt-3">
                      <BetPanel
                        key={`${round}:${line}`}
                        round={round}
                        line={line}
                        over={pick.over}
                        market={m}
                        closed={closed}
                        onSide={(o) => choose(line, o, false)}
                        onClose={() => setPick(null)}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addCustom()
            }}
          >
            <label className="sr-only" htmlFor="custom-line">
              Custom line
            </label>
            <input
              id="custom-line"
              inputMode="numeric"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value.replace(/\D/g, ''))}
              placeholder={`Custom line (multiple of ${LINE_STEP})`}
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-white/30"
            />
            <button disabled={!customValid} className="h-11 rounded-lg border border-line px-4 text-sm text-mute hover:text-ink disabled:opacity-40">
              Add line
            </button>
          </form>
          <p className="mt-2 text-xs text-faint">
            Over wins when the round's certified work is above the line. Under wins at or below it. Line 0 asks whether the wheel runs at all.
          </p>
        </>
      )}
    </section>
  )
}
