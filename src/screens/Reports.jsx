import { useState } from 'react'
import { Icon, RowIcon, Segmented, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { downloadTransactionsCsv } from '../lib/csv.js'
import { CATEGORY_ICON, PALETTE } from '../lib/constants.js'
import { parseDay } from '../lib/dates.js'
import {
  currentMonthKey,
  deltaPill,
  expensesOf,
  inMonth,
  incomeOf,
  monthLabel,
  percentChange,
  shiftMonth
} from '../lib/periods.js'

const tileClass = 'flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-rail p-4'

export default function Reports () {
  const { transactions, format, loading } = useAppData()
  const [selected, setSelected] = useState(currentMonthKey)

  if (loading) return <Spinner />

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(currentMonthKey(), i - 5))
  const previous = shiftMonth(selected, -1)
  const prevName = monthLabel(previous, 'short')
  const current = inMonth(transactions, selected)
  const before = inMonth(transactions, previous)

  const income = incomeOf(current)
  const expense = expensesOf(current)
  const net = income - expense
  const prevNet = incomeOf(before) - expensesOf(before)
  const incomePill = deltaPill(percentChange(income, incomeOf(before)))
  const expensePill = deltaPill(percentChange(expense, expensesOf(before)), true)

  const [year, month] = selected.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const daily = Array.from({ length: daysInMonth }, (_, i) =>
    expensesOf(current.filter(t => Number(t.date.slice(8)) === i + 1))
  )
  const dailyMax = Math.max(1, ...daily)
  const isCurrent = selected === currentMonthKey()

  const categories = [...new Set(current.filter(t => t.amount < 0).map(t => t.category))]
    .map(c => [c, expensesOf(current, c), expensesOf(before, c)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const top = current.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 5)

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-2.5 print:hidden'>
        <Segmented
          label='Month'
          options={months.map(key => [key, monthLabel(key, 'short')])}
          value={selected}
          onChange={setSelected}
          buttonClass='h-[30px] px-3 font-mono text-xs'
        />
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => downloadTransactionsCsv(current)}
            className='flex h-9 items-center gap-1.5 rounded-[10px] border border-line-2 px-3 text-ink-2'
          >
            <Icon name='download' size={18} />CSV
          </button>
          <button
            type='button'
            onClick={() => window.print()}
            className='flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 font-semibold text-accent-ink'
          >
            <Icon name='picture_as_pdf' size={18} />Save as PDF
          </button>
        </div>
      </div>

      <section className={`relative flex flex-col gap-5 overflow-hidden p-6 ${panelClass}`}>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_100%_0%,rgba(52,210,123,.1),transparent_70%)]' />
        <div className='relative flex flex-col gap-1'>
          <span className='font-mono text-[11px] uppercase tracking-[.12em] text-muted'>Monthly report</span>
          <h2 className='m-0 text-[30px] font-semibold tracking-[-.03em]'>{monthLabel(selected)} {year}</h2>
          {isCurrent && (
            <span className='text-xs text-[#e0c45a]'>Month in progress · {new Date().getDate()} days so far</span>
          )}
        </div>
        <div className='relative grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3'>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Income</span>
            <span className='truncate text-[22px] font-semibold tabular-nums'>{format.money(income)}</span>
            <span className={`self-start whitespace-nowrap rounded-full px-[7px] py-[3px] text-[11px] ${incomePill.className}`}>{incomePill.text} vs {prevName}</span>
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Expenses</span>
            <span className='truncate text-[22px] font-semibold tabular-nums'>{format.money(expense)}</span>
            <span className={`self-start whitespace-nowrap rounded-full px-[7px] py-[3px] text-[11px] ${expensePill.className}`}>{expensePill.text} vs {prevName}</span>
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Net</span>
            <span className={`truncate text-[22px] font-semibold tabular-nums ${net >= 0 ? 'text-accent' : 'text-danger'}`}>{format.signed(net)}</span>
            <span className='text-[11px] text-faint'>vs {format.signed(prevNet)} in {prevName}</span>
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Savings rate</span>
            <span className='text-[22px] font-semibold text-accent tabular-nums'>
              {income ? Math.max(0, Math.round((net / income) * 100)) : 0}%
            </span>
            <span className='text-[11px] text-faint'>of income kept</span>
          </div>
        </div>
        <div className='relative flex flex-col gap-2'>
          <span className='text-xs text-muted'>Daily spending</span>
          <div className='flex h-20 items-end gap-[3px]'>
            {daily.map((value, i) => (
              <div
                key={i}
                title={`${i + 1}: ${format.money(value)}`}
                className={`flex-1 rounded-t-[3px] rounded-b-[1px] ${value ? 'bg-accent' : 'bg-line'}`}
                style={{ height: `${Math.max(2, Math.round((value / dailyMax) * 100))}%` }}
              />
            ))}
          </div>
        </div>
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <h2 className='m-0 text-[15px] font-semibold'>Biggest expenses</h2>
          {top.length === 0 && <div className='py-4 text-center text-muted'>No expenses this month.</div>}
          {top.map(t => (
            <div key={t.id} className='flex items-center gap-2.5 py-1'>
              <RowIcon name={CATEGORY_ICON[t.category] || 'category'} />
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate font-medium'>{t.name}</span>
                <span className='text-xs text-faint'>
                  {t.category} · {parseDay(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <span className='tabular-nums'>{format.money(-t.amount)}</span>
            </div>
          ))}
        </section>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex items-baseline justify-between'>
            <h2 className='m-0 text-[15px] font-semibold'>By category</h2>
            <span className='text-xs text-faint'>vs {prevName}</span>
          </div>
          {categories.length === 0 && <div className='py-4 text-center text-muted'>No expenses this month.</div>}
          {categories.map(([name, amount, last], i) => {
            const pill = deltaPill(percentChange(amount, last), true)
            return (
              <div key={name} className='flex flex-col gap-1.5 py-1'>
                <div className='flex items-center gap-2.5'>
                  <Icon name={CATEGORY_ICON[name] || 'category'} size={18} className='flex-none' />
                  <span className='min-w-0 flex-1 truncate'>{name}</span>
                  <span className={`min-w-11 text-right font-mono text-[11px] ${last ? pill.className.split(' ').pop() : 'text-[#5fc9e0]'}`}>
                    {last ? pill.text : 'new'}
                  </span>
                  <span className='min-w-[92px] text-right tabular-nums'>{format.money(amount)}</span>
                </div>
                <div className='h-[5px] overflow-hidden rounded-full bg-line'>
                  <div
                    className='h-full rounded-full'
                    style={{ width: `${Math.round((amount / categories[0][1]) * 100)}%`, background: PALETTE[Math.min(i, 5)] }}
                  />
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
