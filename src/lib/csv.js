// Text starting with = + - @ would run as a formula in Excel or Sheets, so it gets a
// leading apostrophe. Amounts are written separately and keep their sign.
const neutralize = value => (/^[=+\-@\t\r]/.test(String(value ?? '')) ? `'${value}` : value)

const escape = value => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// A split transaction lists each part with its amount in the Category column.
const categoryText = t => (t.splits?.length >= 2 ? t.splits.map(part => `${part.category} ${part.amount.toFixed(2)}`).join('; ') : t.category)

// A transfer uses Card as its origin and "Transfer to" as its destination. Its amount
// is positive and its category is Transfer.
const toRow = t => {
  const [date, name, desc, amount, card, category, to] = t.transfer
    ? [t.date, t.name, t.note, `+${t.value.toFixed(2)}`, t.from, 'Transfer', t.to]
    : [t.date, t.name, t.desc, (t.amount >= 0 ? '+' : '-') + Math.abs(t.amount).toFixed(2), t.card, categoryText(t), '']
  return [date, neutralize(name), neutralize(desc), amount, neutralize(card), neutralize(category), neutralize(to)]
}

export function toCsv (list) {
  const rows = [['Date', 'Name', 'Description', 'Amount', 'Card', 'Category', 'Transfer to'], ...list.map(toRow)]
  return rows.map(row => row.map(escape).join(',')).join('\n')
}

export function downloadTransactionsCsv (list, filename = 'transactions.csv') {
  const csv = toCsv(list)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
