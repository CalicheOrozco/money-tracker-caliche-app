import { toISODate } from './dates.js'

function normalizeDate (value) {
  const text = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)

  const dayFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dayFirst) {
    const [, day, month, year] = dayFirst
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(text)
  return text && !isNaN(parsed) ? toISODate(parsed) : ''
}

export function parseAmount (value) {
  const amount = parseFloat(String(value ?? '').replace(/[\s,$+]/g, ''))
  return Number.isFinite(amount) ? amount : null
}

export const isTransferRow = row => row.category === 'Transfer' || !!row.transferTo

export function rowProblem (row) {
  if (!row.date) return 'date'
  if (isTransferRow(row)) {
    if (!parseAmount(row.amount)) return 'amount'
    if (!row.card) return 'from'
    if (!row.transferTo || row.transferTo === row.card) return 'to'
    return null
  }
  if (!row.name.trim()) return 'name'
  if (!parseAmount(row.amount)) return 'amount'
  return null
}

// Reads the real file, CSV or Excel. The library is loaded on demand because it
// is only needed on this screen.
export async function readStatement (file) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const table = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
    defval: ''
  })

  if (table.length < 2) {
    throw new Error('That file has no rows to import.')
  }

  const header = table[0].map(cell => String(cell).trim().toLowerCase())
  const column = name => header.indexOf(name)
  const missing = ['date', 'name', 'amount'].filter(name => column(name) < 0)
  if (missing.length) {
    throw new Error(`Missing columns: ${missing.join(', ')}.`)
  }

  const cell = (row, name) => {
    const index = column(name)
    return index < 0 ? '' : String(row[index] ?? '').trim()
  }

  return table
    .slice(1)
    .filter(row => row.some(value => String(value).trim()))
    .map(row => ({
      date: normalizeDate(cell(row, 'date')),
      name: cell(row, 'name'),
      desc: cell(row, 'description'),
      amount: cell(row, 'amount'),
      card: cell(row, 'card'),
      category: cell(row, 'category'),
      transferTo: cell(row, 'transfer to')
    }))
}
