const escape = value => {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadTransactionsCsv (list) {
  const rows = [
    ['Date', 'Name', 'Description', 'Amount', 'Card', 'Category'],
    ...list.map(t => [
      t.date,
      t.name,
      t.desc,
      (t.amount >= 0 ? '+' : '-') + Math.abs(t.amount).toFixed(2),
      t.card,
      t.category
    ])
  ]
  const csv = rows.map(row => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'transactions.csv'
  link.click()
  URL.revokeObjectURL(url)
}
