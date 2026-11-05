export function normalizeTag (value) {
  return String(value ?? '')
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, 40)
}

export function normalizeTags (value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(normalizeTag).filter(Boolean))].slice(0, 20)
}
