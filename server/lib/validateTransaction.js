// Spreadsheet uploads can send prices as numbers, so the value is normalized
// to a string before any string handling.
export function normalizePrice (price) {
  return String(price ?? '').replace(/\s/g, '')
}

// Validators return an error message, or null when the value is fine.
export function validatePrice (priceTrim) {
  if (!priceTrim.includes('-') && !priceTrim.includes('+')) {
    return 'The price must include a - or + sign.'
  }

  const digits = priceTrim.replace('-', '').replace('+', '')
  if (digits === '' || isNaN(Number(digits))) {
    return 'The price must be a number.'
  }

  const decimals = priceTrim.split('.')
  if (decimals.length > 1 && decimals[1].length > 2) {
    return 'The price must have a maximum of 2 decimals.'
  }

  return null
}

// Shared by the create and update endpoints, which accept the same fields.
export function validateTransactionBody ({ name, price, datetime }) {
  if (!name) return 'The name must not be empty.'

  const priceError = validatePrice(normalizePrice(price))
  if (priceError) return priceError

  if (!datetime) return 'The date must not be empty.'
  if (isNaN(new Date(datetime))) return 'The date must be a valid date.'

  return null
}
