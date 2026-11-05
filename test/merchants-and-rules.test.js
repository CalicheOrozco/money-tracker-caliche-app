import assert from 'node:assert/strict'
import { test } from 'node:test'
import { patternMatch, resolveMerchant } from '../src/lib/merchants.js'
import { passwordProblem, usernameProblem } from '../server/lib/accountRules.js'
import { validIcon, validateTransactionBody } from '../server/lib/validateTransaction.js'

test('the longest merchant pattern wins and spelling is ignored', () => {
  const merchants = [{ _id: '1', name: 'Uber', patterns: ['uber'] }, { _id: '2', name: 'Uber Eats', patterns: ['uber eats'] }]
  assert.equal(patternMatch(merchants, 'UBER *EATS 123')?.name, 'Uber Eats')
  assert.equal(patternMatch(merchants, 'Uber trip')?.name, 'Uber')
  assert.equal(patternMatch([{ _id: '3', name: 'Walmart', patterns: ['walmart'] }], 'WAL-MART #22')?.name, 'Walmart')
  assert.equal(resolveMerchant(merchants, { name: 'Uber', desc: '', merchant: 'none' }), null)
})

test('a new merchant list is matched again, not from the old cache', () => {
  const first = [{ _id: '1', name: 'Oxxo', patterns: ['oxxo'] }]
  assert.equal(patternMatch(first, 'oxxo centro')?.name, 'Oxxo')
  assert.equal(patternMatch([{ _id: '2', name: 'Oxxo Gas', patterns: ['oxxo centro'] }], 'oxxo centro')?.name, 'Oxxo Gas')
})

test('account rules', () => {
  assert.ok(passwordProblem('short'))
  assert.ok(passwordProblem('x'.repeat(73)))
  assert.equal(passwordProblem('secret-123'), null)
  assert.ok(usernameProblem('x'.repeat(41)))
  assert.equal(usernameProblem('caliche'), null)
})

test('transactions only accept known logos and reasonable text', () => {
  assert.ok(validIcon('VisaIcon') && validIcon('nu.com.mx') && validIcon(''))
  assert.ok(!validIcon('/2130706433/x') && !validIcon('javascript:alert(1)'))
  const base = { name: 'Cafe', price: '-5.00', datetime: '2026-01-01' }
  assert.equal(validateTransactionBody(base), null)
  assert.ok(validateTransactionBody({ ...base, name: 'x'.repeat(121) }))
  assert.ok(validateTransactionBody({ ...base, price: '+Infinity' }))
  assert.ok(validateTransactionBody({ ...base, icon: '//evil.example' }))
})
