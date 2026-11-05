import { TONES } from './constants.js'

const isHex = tone => /^#[0-9a-f]{6}$/i.test(tone || '')

const channels = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

// Mixes a brand color toward the app's background so card text stays readable.
function darken (hex, amount) {
  const base = [9, 11, 10]
  return '#' + channels(hex)
    .map((c, i) => Math.round(c + (base[i] - c) * amount).toString(16).padStart(2, '0'))
    .join('')
}

export function cardBackground (tone) {
  if (isHex(tone)) return `linear-gradient(135deg, ${tone} 0%, ${darken(tone, 0.55)} 100%)`
  return TONES[tone] || TONES.graphite
}

// Very light brand colors (white, yellow) get dark text instead of light.
export function isLightTone (tone) {
  if (!isHex(tone)) return false
  const [r, g, b] = channels(tone)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 175
}
