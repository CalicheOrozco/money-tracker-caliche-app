import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueDatesInMonth, monthlyAmount, recurringState } from '../src/lib/recurring.js'

const pad = n => String(n).padStart(2, '0')
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
const manual = (fields) => ({ _id: 'a'.repeat(24), name: 'Gym', amount: 100, type: 'sub', frequency: 'monthly', next: inDays(1), active: true, ...fields })

test('monthly cost by frequency', () => {
  const [weekly, biweekly, yearly] = ['weekly', 'biweekly', 'yearly'].map(frequency =>
    recurringState([], [], [manual({ frequency })]).all[0])
  assert.equal(Math.round(monthlyAmount(weekly) * 100) / 100, 433.33)
  assert.equal(Math.round(monthlyAmount(biweekly) * 100) / 100, 216.67)
  assert.equal(Math.round(monthlyAmount(yearly) * 100) / 100, 8.33)
})

test('the next 30 days include every charge of a weekly payment', () => {
  const { upcoming } = recurringState([], [], [manual({ frequency: 'weekly' })])
  assert.ok(upcoming.length >= 4 && upcoming.length <= 5)
  assert.equal(new Set(upcoming.map(r => r.key)).size, upcoming.length)
})

test('a charge on the 31st falls on the last day of shorter months', () => {
  const year = new Date().getFullYear() + 1
  const r = recurringState([], [], [manual({ next: `${year}-01-31` })]).all[0]
  assert.deepEqual(dueDatesInMonth(r, year, 1).map(iso), [`${year}-02-${new Date(year, 2, 0).getDate()}`])
})

test('biweekly charges are 14 days apart', () => {
  const year = new Date().getFullYear() + 1
  const r = recurringState([], [], [manual({ frequency: 'biweekly', next: `${year}-03-02` })]).all[0]
  assert.deepEqual(dueDatesInMonth(r, year, 2).map(iso), [`${year}-03-02`, `${year}-03-16`, `${year}-03-30`])
})

test('a short or paused manual payment does not hide a detected one', () => {
  const tx = n => ({ id: `n${n}`, name: 'Netflix', desc: '', amount: -15, date: inDays(-n * 30 - 5), category: 'Streaming Service', card: '', tags: [] })
  const charges = [tx(0), tx(1), tx(2)]
  const detectedNetflix = state => state.all.some(r => !r.manual && r.name === 'Netflix')
  assert.ok(detectedNetflix(recurringState(charges, [], [manual({ name: 'Net', active: false })])))
  assert.ok(detectedNetflix(recurringState(charges, [], [manual({ name: 'Net', active: true })])))
  assert.ok(!detectedNetflix(recurringState(charges, [], [manual({ name: 'Netflix' })])))
})
