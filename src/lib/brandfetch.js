// Brandfetch requires its client id on every request and is meant to be called
// from the browser. Search results are only used live for autocomplete and logos
// are always hotlinked, as its terms ask; only the chosen domain is stored.
// The id comes from the server at startup instead of being built into the app.
let CLIENT_ID = ''

export let logoSearchEnabled = false

export async function loadLogoConfig () {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const response = await fetch('/api/config', { signal: controller.signal })
    clearTimeout(timer)
    const { brandfetchClientId } = await response.json()
    CLIENT_ID = brandfetchClientId || ''
  } catch {
    // Without it the app works the same, just with category icons instead of logos.
    CLIENT_ID = ''
  }
  logoSearchEnabled = Boolean(CLIENT_ID)
}

export function logoUrl (domain, size = 64) {
  if (!domain || !CLIENT_ID) return ''
  // fallback/404 makes unknown brands fail, so the app shows its own icon instead
  // of Brandfetch's generic placeholder.
  return `https://cdn.brandfetch.io/${encodeURIComponent(domain)}/w/${size}/h/${size}/fallback/404/icon?c=${CLIENT_ID}`
}

export async function searchBrands (query, signal) {
  const text = query.trim()
  if (!text || !CLIENT_ID) return []

  const response = await fetch(
    `https://api.brandfetch.io/v2/search/${encodeURIComponent(text)}?c=${CLIENT_ID}`,
    { signal }
  )
  if (response.status === 429) throw new Error('Too many logo searches. Wait a minute and try again.')
  if (!response.ok) throw new Error('Logo search is not available right now.')

  const results = await response.json()
  return results.filter(r => r.domain).slice(0, 6)
}
