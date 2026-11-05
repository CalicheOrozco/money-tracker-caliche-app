const escape = value => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// A transfer uses Card as its origin and "Transfer to" as its destination, so the file
// can be imported back. Its amount is positive and its category is Transfer.
const toRow = t => (t.transfer
  ? [t.date, t.name, t.note, `+${t.value.toFixed(2)}`, t.from, 'Transfer', t.to]
  : [t.date, t.name, t.desc, (t.amount >= 0 ? '+' : '-') + Math.abs(t.amount).toFixed(2), t.card, t.category, ''])

export function downloadTransactionsCsv (list) {
  const rows = [['Date', 'Name', 'Description', 'Amount', 'Card', 'Category', 'Transfer to'], ...list.map(toRow)]
  const csv = rows.map(row => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'transactions.csv'
  link.click()
  URL.revokeObjectURL(url)
}
