import { useEffect, useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { getShareBase } from '@/lib/share'
import { inviteQuery } from '@/lib/invite'

/** Copies (or natively shares) a link that opens this round, line and side for a friend. */
export function ShareButton({ round, line, over, ai, label = 'Invite a friend' }: { round: bigint; line?: number; over?: boolean; ai?: boolean; label?: string }) {
  const [base, setBase] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    void getShareBase().then((b) => {
      if (live) setBase(b)
    })
    return () => {
      live = false
    }
  }, [])

  const share = async () => {
    if (base === null) return
    const url = `${base}/${inviteQuery({ round, line, over, ai })}`
    const text = `Bet against the Squeekchain hamster on round ${round.toString()}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Wheel Odds', text, url })
        return
      }
    } catch {
      // Cancelled or unsupported: fall through to copying.
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Invite link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the address bar link instead.')
    }
  }

  return (
    <button
      type="button"
      disabled={base === null}
      onClick={() => void share()}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-mute hover:text-ink disabled:opacity-40"
    >
      {copied ? <Check size={14} className="text-up" /> : <Link2 size={14} />}
      {copied ? 'Link copied' : label}
    </button>
  )
}
