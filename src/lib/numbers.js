export const decimalOnly = value => String(value).replace(/[^0-9.,]/g, '')

export const toNumber = value => parseFloat(String(value ?? '').replace(/,/g, '')) || 0
