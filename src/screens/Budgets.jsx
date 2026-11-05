import { useState } from 'react'
import { Icon, MoneyInput, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useCollection } from '../data/useCollection.js'
import { CATEGORY_ICON, EXPENSE } from '../lib/constants.js'
import { decimalOnly, toNumber } from '../lib/numbers.js'
import { currentMonthKey, expensesOf, inMonth, monthLabel, shiftMonth } from '../lib/periods.js'

function BudgetCard ({ budget, spent, last, projection, onSave, onRemove }) {
  const { format } = useAppData()
  const [limit, setLimit] = useState(String(budget.limit))
  const value = toNumber(limit) || budget.limit
  const ratio = value ? spent / value : 0
  const projected = value ? projection / value : 0
  const bar = ratio > 1 ? 'bg-danger' : ratio > 0.8 ? 'bg-[#e0c45a]' : 'bg-accent'

  return (
    <section className={`flex flex-col gap-3 p-4.5 ${panelClass}`}>
      <div className='flex items-center gap-2.5'>
        <span className='grid h-9 w-9 place-items-center rounded-[10px] bg-line-4 text-ink-2'><Icon name={CATEGORY_ICON[budget.category] || 'category'} size={19} /></span>
        <span className='min-w-0 flex-1 truncate font-semibold'>{budget.category}</span>
        <button type='button' title='Remove budget' aria-label={`Remove ${budget.category} budget`} onClick={onRemove} className='grid h-7 w-7 place-items-center rounded-lg text-[#4a524c] hover:text-danger'>
          <Icon name='close' size={17} />
        </button>
      </div>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='text-xl font-semibold tabular-nums'>{format.money(spent)}</span>
        <span className='flex items-center gap-1 text-xs text-faint'>
          of {format.symbol}
          <input
            aria-label={`${budget.category} monthly limit`}
            value={limit}
            onChange={e => setLimit(decimalOnly(e.target.value))}
            onBlur={() => {
              if (toNumber(limit) > 0 && toNumber(limit) !== budget.limit) onSave(toNumber(limit))
              else setLimit(String(budget.limit))
            }}
            inputMode='decimal'
            className='h-6.5 w-19 rounded-[7px] border border-line-2 bg-rail px-1.5 text-xs text-ink outline-hidden tabular-nums focus:border-accent'
          />
        </span>
      </div>
      <div className='relative h-2 overflow-hidden rounded-full bg-line'>
        <div className='absolute inset-y-0 left-0 bg-white/5' style={{ width: `${Math.min(100, Math.round(projected * 100))}%` }} />
        <div className={`absolute inset-y-0 left-0 rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }} />
      </div>
      <div className='flex justify-between gap-2 text-xs'>
        <span className={spent > value ? 'text-danger' : 'text-ink-2'}>
          {spent > value ? `Over by ${format.money(spent - value)}` : `${format.money(value - spent)} left`}
        </span>
        <span className='text-faint'>{last.label} {format.money(last.value)}</span>
      </div>
      <span className={`text-xs ${projected > 1 ? 'text-[#e0c45a]' : 'text-faint'}`}>On pace for {format.money(projection)}</span>
    </section>
  )
}

export default function Budgets () {
  const { transactions, format, loading, showToast, showError } = useAppData()
  const budgets = useCollection('budgets', { onError: showError })
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')

  if (loading || budgets.loading) return <Spinner />

  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const thisKey = currentMonthKey()
  const lastKey = shiftMonth(thisKey, -1)
  const thisMonth = inMonth(transactions, thisKey)
  const lastMonth = inMonth(transactions, lastKey)
  const pace = spent => (spent / day) * daysInMonth

  const rows = budgets.items.map(b => {
    const spent = expensesOf(thisMonth, b.category)
    return { budget: b, spent, projection: pace(spent), last: expensesOf(lastMonth, b.category) }
  })
  const totalLimit = budgets.items.reduce((a, b) => a + b.limit, 0)
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0)
  const atRisk = rows.filter(r => r.projection > r.budget.limit).length
  const monthName = monthLabel(thisKey)
  const options = EXPENSE.filter(([c]) => !budgets.items.some(b => b.category === c))
  const canAdd = category && toNumber(amount) > 0

  async function add () {
    if (!canAdd) return
    try {
      await budgets.create({ category, limit: toNumber(amount) })
      showToast(`Budget added for ${category}`)
      setCategory('')
      setAmount('')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <section className={`relative flex flex-col gap-3.5 overflow-hidden p-6 ${panelClass}`}>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_100%_0%,rgba(52,210,123,.1),transparent_70%)]' />
        <div className='relative flex flex-wrap items-end justify-between gap-3'>
          <div className='flex flex-col gap-1.5'>
            <span className='text-[13px] text-muted'>Spent across budgets · {monthName}</span>
            <span className='flex flex-wrap items-baseline gap-1.5 leading-[1.1]'>
              <span className='text-4xl font-semibold tracking-[-.03em] tabular-nums'>{format.money(totalSpent)}</span>
              <span className='text-base font-medium text-faint tabular-nums'>/ {format.money(totalLimit)}</span>
            </span>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <span className={`text-[13px] font-medium ${atRisk ? 'text-[#e0c45a]' : 'text-accent'}`}>
              {budgets.items.length === 0 ? 'No budgets yet' : atRisk ? `${atRisk} on pace to go over` : 'All on track'}
            </span>
            <span className='text-xs text-faint'>{day} of {daysInMonth} days into {monthName}</span>
          </div>
        </div>
        <div className='relative h-2.5 overflow-hidden rounded-full bg-line'>
          <div className='absolute inset-y-0 left-0 rounded-full bg-accent/20' style={{ width: `${Math.min(100, Math.round((pace(totalSpent) / (totalLimit || 1)) * 100))}%` }} />
          <div className='absolute inset-y-0 left-0 rounded-full bg-accent' style={{ width: `${Math.min(100, Math.round((totalSpent / (totalLimit || 1)) * 100))}%` }} />
        </div>
        <span className='relative text-xs text-faint'>On pace for {format.money(pace(totalSpent))} by the end of {monthName}</span>
      </section>

      <div className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4'>
        {rows.map(({ budget, spent, projection, last }) => (
          <BudgetCard
            key={budget._id}
            budget={budget}
            spent={spent}
            projection={projection}
            last={{ label: monthLabel(lastKey), value: last }}
            onSave={limit => budgets.update(budget._id, { limit }).catch(showError)}
            onRemove={() => budgets.remove(budget._id).catch(showError)}
          />
        ))}
        <section className='flex flex-col justify-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-[#2a332e] p-4.5'>
          <span className='font-semibold'>New budget</span>
          <select
            aria-label='Budget category'
            value={category}
            onChange={e => setCategory(e.target.value)}
            className='h-10 rounded-[10px] border border-line-3 bg-rail px-2.5 text-ink'
          >
            <option value=''>Pick a category</option>
            {options.map(([c]) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className='flex gap-2'>
            <MoneyInput
              symbol={format.symbol}
              aria-label='Monthly limit'
              value={amount}
              onChange={e => setAmount(decimalOnly(e.target.value))}
              placeholder='Monthly limit'
              className='flex-1'
            />
            <button
              type='button'
              disabled={!canAdd}
              onClick={add}
              className={`h-10 rounded-[10px] px-3.5 font-semibold ${canAdd ? 'bg-accent text-accent-ink' : 'bg-raised text-faint'}`}
            >
              Add
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
