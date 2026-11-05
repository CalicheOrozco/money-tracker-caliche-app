import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountBalance, creditCardEstimate, fromApiTransfer, transferSuggestions } from '../src/lib/transfers.js'

const pad = n => String(n).padStart(2, '0')
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const objectIdAt = seconds => seconds.toString(16).padStart(8, '0') + '0'.repeat(16)
const now = Math.floor(Date.now() / 1000)
const cards = [{ name: 'Debit', type: 'debit' }, { name: 'Visa', type: 'credit' }, { name: 'Ahorro', type: 'savings' }]
const tx = (id, amount, card, d, extra = {}) => ({ id, name: id, desc: '', amount, date: day(d), card, category: 'Other', tags: [], ...extra })

test('pairs an expense with the closest income of the same amount', () => {
  const list = [tx('out', -500, 'Debit', -2), tx('refund', 500, 'Visa', -2), tx('in', 500, 'Ahorro', -1)]
  assert.deepEqual(transferSuggestions(list, [], cards).map(s => s.key), ['pair:out:refund'])
})

test('a dismissed pair lets the other match through, and is not offered alone', () => {
  const list = [tx('out', -500, 'Debit', -2), tx('refund', 500, 'Visa', -2), tx('in', 500, 'Ahorro', -1)]
  assert.deepEqual(transferSuggestions(list, ['pair:out:refund'], cards).map(s => s.key), ['pair:out:in'])
  assert.deepEqual(transferSuggestions(list, ['pair:out:refund', 'pair:out:in'], cards), [])
})

test('a car loan in Debts is suggested without guessing the destination', () => {
  const [s] = transferSuggestions([tx('loan', -120, 'Debit', -1, { category: 'Debts' })], [], cards)
  assert.equal(s.to, '')
})

test('balance counts movements after the balance date, and same-day ones added later', () => {
  const card = { name: 'Debit', type: 'debit', balance: 1000, balanceDate: day(-5), balanceSetAt: new Date((now - 3600) * 1000).toISOString() }
  const list = [tx('before', -999, 'Debit', -6), tx('after', 2000, 'Debit', -4), tx('future', -50, 'Debit', 3)]
  const transfers = [fromApiTransfer({ _id: objectIdAt(now), from: 'Debit', to: 'Visa', amount: 400, date: day(-1) })]
  assert.equal(accountBalance(card, list, transfers), 1000 + 2000 - 400)
  assert.equal(accountBalance({ ...card, balance: null }, list, transfers), null)
})

test('a transfer converted after setting a balance is not counted twice', () => {
  const card = { name: 'Debit', type: 'debit', balance: 900, balanceDate: day(0), balanceSetAt: new Date((now - 3600) * 1000).toISOString() }
  const converted = fromApiTransfer({ _id: objectIdAt(now), from: 'Debit', to: 'Visa', amount: 100, date: day(0), source: [{ _id: objectIdAt(now - 7200) }] })
  assert.equal(accountBalance(card, [], [converted]), 900)
})

test('credit card estimate per card, with payments and refunds', () => {
  const visa = [{ name: 'Visa', type: 'credit' }]
  assert.equal(creditCardEstimate([tx('buy', -1000, 'Visa', -3), tx('pay', 1000, 'Visa', -2)], [], visa), 0)
  const two = [{ name: 'V', type: 'credit' }, { name: 'W', type: 'credit' }]
  assert.equal(creditCardEstimate([tx('buy', -1000, 'V', -3)], [fromApiTransfer({ _id: objectIdAt(now), from: 'D', to: 'W', amount: 1000, date: day(-2) })], two), 1000)
  assert.equal(creditCardEstimate([], [], [{ name: 'Visa', type: 'credit', balance: 700, balanceDate: day(0), balanceSetAt: new Date().toISOString() }]), 700)
})
