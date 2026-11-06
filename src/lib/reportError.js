// Sends errors the app didn't handle to the server, where the admin can see them.
// Only the message, stack and screen path go out, never the data on screen.

const MAX_PER_PAGE = 10
// Noise that isn't a bug in the app: browser extensions, cross-origin scripts and a
// harmless layout warning.
const IGNORE = /ResizeObserver loop|^Script error\.?$|chrome-extension:|moz-extension:|safari-extension:/i

let sent = 0
const seen = new Set()

export function reportError (error) {
  if (import.meta.env.DEV) return
  const message = String(error?.message || error || '').slice(0, 300)
  const stack = String(error?.stack || '').slice(0, 4000)
  if (!message || IGNORE.test(message) || IGNORE.test(stack)) return
  if (seen.has(message) || sent >= MAX_PER_PAGE) return
  seen.add(message)
  sent++
  fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, stack, path: window.location.pathname }),
    keepalive: true
  }).catch(() => {})
}

export function watchErrors () {
  window.addEventListener('error', event => reportError(event.error || event.message))
  window.addEventListener('unhandledrejection', event => reportError(event.reason))
}
