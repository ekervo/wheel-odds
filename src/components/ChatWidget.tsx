import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import clsx from 'clsx'
import { apiFetch } from '@/lib/api'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = ['How do I place a bet?', 'What is Beat the AI?', 'Why can I not claim yet?', 'Cách thắng cược là gì?']

async function ask(messages: Msg[]): Promise<{ ok: true; reply: string } | { ok: false; text: string }> {
  try {
    const res = await apiFetch('/ai/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const body: unknown = await res.json().catch(() => null)
    const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
    if (b.status === 'ok' && typeof b.reply === 'string') return { ok: true, reply: b.reply }
    if (b.status === 'unconfigured') return { ok: false, text: 'The assistant is switched off on this server. Everything else on the page still works.' }
    if (res.status === 429 || b.status === 'busy') return { ok: false, text: 'The assistant is busy. Try again in a minute.' }
    return { ok: false, text: 'The assistant could not answer just now. Please try again.' }
  } catch {
    return { ok: false, text: 'The assistant is unreachable right now.' }
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])

  const send = async (text: string) => {
    const content = text.trim().slice(0, 600)
    if (!content || busy) return
    const next: Msg[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setError(null)
    setBusy(true)
    const result = await ask(next)
    setBusy(false)
    if (result.ok) setMessages([...next, { role: 'assistant', content: result.reply }])
    else setError(result.text)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-bg shadow-lg shadow-black/40"
          aria-label="Open the Wheel Odds assistant"
        >
          <MessageCircle size={18} aria-hidden /> Ask AI
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Wheel Odds assistant"
          className="fixed inset-x-3 bottom-4 z-40 flex max-h-[min(34rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-4 sm:w-[24rem]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="display text-base font-semibold">Ask about Wheel Odds</div>
              <div className="text-xs text-faint">Answers come from this site's rules and live wheel data.</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-10 w-10 place-items-center rounded-lg text-mute hover:bg-white/5">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-mute text-pretty">Ask how betting, settling, claiming, the AI line or the leaderboard work. English or Vietnamese.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => void send(s)} className="min-h-[40px] rounded-full border border-line px-3 text-xs text-mute hover:text-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={clsx('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm text-pretty', m.role === 'user' ? 'bg-gold text-bg' : 'bg-panel2 text-ink')}>{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-mute">
                <Loader2 size={14} className="animate-spin" /> Thinking...
              </div>
            )}
            {error && <p className="text-xs text-down">{error}</p>}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <label className="sr-only" htmlFor="chat-input">
              Your question
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask a question..."
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-gold/60"
            />
            <button disabled={busy || input.trim() === ''} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-lg bg-gold text-bg disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
