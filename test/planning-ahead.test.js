import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cardDue, nextOnDay, previousOnDay } from '../src/lib/cardCycle.js'
import { safeToSpend } from '../src/lib/forecast.js'
import { byCategoryEntries, categoryLabel, inCategory, splitParts, splitProblem } from '../src/lib/splits.js'

const tx = (id, amount, card, date, extra = {}) => ({ id, name: id, desc: '', amount, date, card, category: 'Other', tags: [], ...extra })
const old = new Date('2026-01-01T00:00:00Z').toISOString()

test('days of the month clamp to short months and roll over the year', () => {
  assert.equal(nextOnDay('2026-02-10', 31), '2026-02-28')
  assert.equal(nextOnDay('2026-02-28', 31), '2026-02-28')
  assert.equal(nextOnDay('2026-12-20', 5), '2027-01-05')
  assert.equal(previousOnDay('2026-01-21', 28), '2025-12-28')
  assert.equal(previousOnDay('2026-03-15', 15), '2026-02-15')
})

test('an issued statement on an untracked card is its spending minus later payments', () => {
  const visa = { name: 'Visa', type: 'credit', statementDay: 28, dueDay: 18 }
  const list = [
    tx('old', -999, 'Visa', '2026-09-20'),
    tx('food', -300, 'Visa', '2026-10-05'),
    tx('gas', -200, 'Visa', '2026-10-28'),
    tx('after', -80, 'Visa', '2026-10-30'),
    tx('partial', 100, 'Visa', '2026-11-01')
  ]
  const due = cardDue(visa, list, [{ from: 'Debit', to: 'Visa', value: 150, date: '2026-11-02', transfer: true }], '2026-11-05')
  assert.deepEqual(
    { dueDate: due.dueDate, closeDate: due.closeDate, issued: due.issued, amountDue: due.amountDue, daysLeft: due.daysLeft },
    { dueDate: '2026-11-18', closeDate: '2026-10-28', issued: true, amountDue: 250, daysLeft: 13 }
  )
})

test('a tracked card owes its balance minus spending after the statement', () => {
  const visa = { name: 'Visa', type: 'credit', statementDay: 28, dueDay: 18, balance: 1000, balanceDate: '2026-10-30', balanceSetAt: old }
  const list = [tx('after', -80, 'Visa', '2026-11-01')]
  const due = cardDue(visa, list, [], '2026-11-05')
  // Owes 1080 today; the 80 spent after the 28th belongs to the next statement.
  assert.equal(due.amountDue, 1000)
  const paid = cardDue(visa, list, [{ from: 'Debit', to: 'Visa', value: 1000, date: '2026-11-03', transfer: true }], '2026-11-05')
  assert.equal(paid.amountDue, 0)
  assert.equal(paid.paid, true)
})

test('before the statement closes, the amount is what the cycle has so far', () => {
  const visa = { name: 'Visa', type: 'credit', statementDay: 28, dueDay: 18 }
  const due = cardDue(visa, [tx('a', -40, 'Visa', '2026-10-29'), tx('b', -60, 'Visa', '2026-11-20')], [], '2026-11-20')
  assert.equal(due.issued, false)
  assert.equal(due.dueDate, '2026-12-18')
  assert.equal(due.amountDue, 100)
  assert.equal(cardDue({ name: 'Debit', type: 'debit', dueDay: 3 }, [], [], '2026-11-20'), null)
})

test('safe to spend subtracts bills and card payments before the next pay', () => {
  const at = day => new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8)))
  const cards = [
    { name: 'Debit', type: 'debit', balance: 1000, balanceDate: '2026-11-01', balanceSetAt: old },
    { name: 'Ahorro', type: 'savings', balance: 9000, balanceDate: '2026-11-01', balanceSetAt: old },
    { name: 'Visa', type: 'credit', dueDay: 8, balance: 300, balanceDate: '2026-11-01', balanceSetAt: old }
  ]
  const recurring = {
    upcoming: [
      { name: 'Rent', avg: 600, card: 'Debit', next: at('2026-11-06') },
      { name: 'Netflix', avg: 15, card: 'Visa', next: at('2026-11-07') },
      { name: 'Gym', avg: 50, card: '', next: at('2026-11-20') }
    ],
    upcomingIncome: [{ name: 'Salary', avg: 2000, card: 'Debit', next: at('2026-11-14') }]
  }
  const result = safeToSpend({ cards, transactions: [], transfers: [], recurring, today: '2026-11-05' })
  assert.equal(result.cash, 1000)
  assert.equal(result.until, '2026-11-14')
  assert.deepEqual(result.upcoming.map(u => u.name), ['Rent', 'Visa'])
  assert.equal(result.safe, 100)
  assert.equal(result.daysLeft, 9)
  assert.equal(result.firstNegative, null)
  assert.deepEqual(result.lowest, { date: '2026-11-08', balance: 100 })

  const tight = safeToSpend({ cards: [{ ...cards[0], balance: 500 }, cards[2]], transactions: [], transfers: [], recurring, today: '2026-11-05' })
  assert.equal(tight.safe, -400)
  assert.equal(tight.perDay, 0)
  assert.deepEqual(tight.firstNegative, { date: '2026-11-06', balance: -100, after: 'Rent' })
  assert.equal(safeToSpend({ cards: [cards[2]], transactions: [], transfers: [], recurring, today: '2026-11-05' }).ready, false)
})

test('split parts count in their own categories and point to the whole', () => {
  const costco = tx('costco', -200, 'Visa', '2026-11-01', { category: 'Food', splits: [{ category: 'Food', amount: 120 }, { category: 'Personal Spending', amount: 80 }] })
  const parts = splitParts(costco)
  assert.deepEqual(parts.map(p => [p.category, p.amount]), [['Food', -120], ['Personal Spending', -80]])
  assert.equal(parts[1].parent, costco)
  assert.equal(byCategoryEntries([costco, tx('x', -5, '', '2026-11-01')]).length, 3)
  assert.equal(inCategory(costco, 'Personal Spending'), true)
  assert.equal(categoryLabel(costco), 'Split · Food, Personal Spending')
})

test('a split must have valid parts that add up to the total', () => {
  assert.equal(splitProblem([], 50), null)
  assert.equal(splitProblem([{ category: 'Food', amount: 30 }, { category: 'Pets', amount: 20 }], -50), null)
  assert.match(splitProblem([{ category: 'Food', amount: 50 }], 50), /at least two/)
  assert.match(splitProblem([{ category: 'Food', amount: 30 }, { category: 'Pets', amount: 10 }], 50), /add up/)
  assert.match(splitProblem([{ category: '', amount: 30 }, { category: 'Pets', amount: 20 }], 50), /category/)
  assert.match(splitProblem([{ category: 'Food', amount: 30.001 }, { category: 'Pets', amount: 19.999 }], 50), /amount/)
  assert.equal(splitProblem([{ category: 'Food', amount: 0.1 }, { category: 'Pets', amount: 0.2 }], 0.3), null)
})
