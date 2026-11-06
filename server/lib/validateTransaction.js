import { splitProblem } from '../../src/lib/splits.js'
import { normalizePrice, priceProblem, priceValue } from './price.js'

export { normalizePrice }

const LIMITS = { name: 120, description: 500, category: 60, card: 60 }

// A bundled logo key like VisaIcon, or a domain for a searched logo.
export const validIcon = icon =>
  icon === undefined || icon === '' || (typeof icon === 'string' && (/^[A-Za-z]{2,40}Icon$/.test(icon) || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(icon)))

// Shared by the create and update endpoints, which accept the same fields.
export function validateTransactionBody (body) {
  const { name, price, datetime } = body
  if (typeof name !== 'string' || !name.trim()) return 'The name must not be empty.'
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = body[field]
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > max)) {
      return `The ${field} can have up to ${max} characters.`
    }
  }
  if (!validIcon(body.icon)) return 'The logo is not valid.'

  const priceError = priceProblem(price)
  if (priceError) return priceError

  if (!datetime) return 'The date must not be empty.'
  if (isNaN(new Date(datetime))) return 'The date must be a valid date.'

  if (body.splits !== undefined) return splitProblem(body.splits, priceValue(normalizePrice(price)))

  return null
}

// Only the fields a part keeps, with clean text.
export const cleanSplits = splits =>
  Array.isArray(splits) ? splits.map(part => ({ category: part.category.trim(), amount: part.amount })) : []
