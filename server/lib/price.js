// Prices are stored as text with an explicit sign and up to two decimals, like
// "-12.50" or "+300.00". These are the only helpers that read or check them.
const PRICE = /^[+-]\d{1,12}(\.\d{1,2})?$/

export const normalizePrice = price => String(price ?? '').replace(/[\s,]/g, '')

export function priceProblem (price) {
  const text = normalizePrice(price)
  if (!/^[+-]/.test(text)) return 'The price must include a - or + sign.'
  if (!PRICE.test(text)) return 'The price must be a number with up to 2 decimals.'
  return null
}

export const priceValue = price => {
  const value = Number(normalizePrice(price))
  return Number.isFinite(value) ? value : 0
}
