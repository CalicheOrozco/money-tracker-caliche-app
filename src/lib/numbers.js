export const decimalOnly = value => String(value).replace(/[^0-9.,]/g, '')

// "1,234.56" and "1234.56" use a decimal point. "12,50" and "1.234,56" use a decimal
// comma, which phone keyboards in many regions type.
export function toNumber (value) {
  const text = String(value ?? '').trim()
  const decimalComma = /^\d+,\d{1,2}$/.test(text) || /^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(text)
  const normalized = decimalComma ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  return parseFloat(normalized) || 0
}
