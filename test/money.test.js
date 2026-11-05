import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toNumber } from '../src/lib/numbers.js'
import { normalizePrice, priceProblem, priceValue } from '../server/lib/price.js'
import { toCsv } from '../src/lib/csv.js'

test('amounts typed with a decimal point or a decimal comma', () => {
  assert.equal(toNumber('12,50'), 12.5)
  assert.equal(toNumber('1.234,56'), 1234.56)
  assert.equal(toNumber('1,234.56'), 1234.56)
  assert.equal(toNumber('1,000'), 1000)
  assert.equal(toNumber(''), 0)
})

test('stored prices need a sign and at most two decimals', () => {
  for (const ok of ['-12.50', '+300', '+1,234.00', '-0.5']) assert.equal(priceProblem(ok), null, ok)
  for (const bad of ['12.50', '+Infinity', '+0x10', '5-5', '+-5', '-1.234', '+', '']) assert.ok(priceProblem(bad), bad)
  assert.equal(normalizePrice(' +1,234.00 '), '+1234.00')
  assert.equal(priceValue('-12.50'), -12.5)
  assert.equal(priceValue('garbage'), 0)
})

test('CSV neutralizes text that would run as a formula', () => {
  const csv = toCsv([{ date: '2026-01-01', name: '=HYPERLINK("x")', desc: '@cmd', amount: -5, card: '+Visa', category: 'Food' }])
  const row = csv.split('\n')[1]
  assert.match(row, /"'=HYPERLINK\(""x""\)"/)
  assert.match(row, /,'@cmd,/)
  assert.match(row, /,-5\.00,'\+Visa,/)
})

test('CSV writes transfers with their destination', () => {
  const csv = toCsv([{ transfer: true, date: '2026-01-02', name: 'Transfer to Visa', note: 'Pago', value: 400, from: 'Debit', to: 'Visa' }])
  assert.equal(csv.split('\n')[1], '2026-01-02,Transfer to Visa,Pago,+400.00,Debit,Transfer,Visa')
})
