/**
 * Calls the AI backend. It lives on the same origin when the app runs on Vercel or locally.
 * When the site is served from static hosting (for example IPFS) there is no /api, so the
 * request falls back to the public Vercel deployment, which allows cross-origin calls.
 */
const FALLBACK_ORIGIN = 'https://wheel-odds.vercel.app'

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const isJson = (r: Response) => r.headers.get('content-type')?.includes('application/json') ?? false
  try {
    const res = await fetch(`/api${path}`, init)
    if (isJson(res)) return res
  } catch {
    // No same-origin backend: try the public one.
  }
  if (window.location.origin === FALLBACK_ORIGIN) throw new Error('backend_unreachable')
  return fetch(`${FALLBACK_ORIGIN}/api${path}`, init)
}
