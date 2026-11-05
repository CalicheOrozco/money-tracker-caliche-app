import { useState } from 'react'
import { Icon, RowIcon, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { CATEGORY_ICON } from '../lib/constants.js'
import { daysAgo, parseDay, startOfToday, toISODate } from '../lib/dates.js'
import { monthKey } from '../lib/periods.js'
import { dueDatesInMonth } from '../lib/recurring.js'

export default function Calendar () {
  const { transactions, recurring, format, loading } = useAppData()
  const today = startOfToday()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(toISODate(today))

  if (loading) return <Spinner />

  const { year, month } = view
  const prefix = monthKey(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = new Date(year, month, 1).getDay()
  const monthTx = transactions.filter(t => t.date.startsWith(prefix))
  const past = monthTx.filter(t => daysAgo(t.date) >= 0)

  const spentBy = {}
  const incomeBy = {}
  for (const t of monthTx) {
    const day = Number(t.date.slice(8))
    if (t.amount < 0) spentBy[day] = (spentBy[day] || 0) - t.amount
    else incomeBy[day] = (incomeBy[day] || 0) + t.amount
  }

  const dues = {}
  for (const r of recurring.active) {
    for (const date of dueDatesInMonth(r, year, month)) (dues[date.getDate()] ||= []).push(r)
  }

  const maxSpent = Math.max(1, ...Object.values(spentBy))
  const pastDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter(day => new Date(year, month, day) <= today)
  const noSpend = pastDays.filter(day => !spentBy[day]).length
  const total = (list, sign) => Math.abs(list.filter(t => Math.sign(t.amount) === sign).reduce((a, t) => a + t.amount, 0))

  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const selectedDay = selected.startsWith(prefix) ? Number(selected.slice(8)) : null
  const dayTx = selectedDay ? transactions.filter(t => t.date === selected) : []
  const dayDues = selectedDay ? dues[selectedDay] || [] : []
  const shift = delta => setView(({ year: y, month: m }) => {
    const date = new Date(y, m + delta, 1)
    return { year: date.getFullYear(), month: date.getMonth() }
  })
  const navButton = 'grid h-8.5 w-8.5 place-items-center rounded-[9px] border border-line-2 text-ink-2'

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
      <section className={`flex min-w-0 flex-col gap-3.5 p-5 ${panelClass}`}>
        <div className='flex flex-wrap items-center justify-between gap-2.5'>
          <div className='flex items-center gap-1.5'>
            <button type='button' aria-label='Previous month' onClick={() => shift(-1)} className={navButton}><Icon name='chevron_left' /></button>
            <h2 className='m-0 min-w-35 px-1.5 text-center text-[17px] font-semibold'>
              {new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button type='button' aria-label='Next month' onClick={() => shift(1)} className={navButton}><Icon name='chevron_right' /></button>
            <button
              type='button'
              onClick={() => {
                setView({ year: today.getFullYear(), month: today.getMonth() })
                setSelected(toISODate(today))
              }}
              className='h-8.5 rounded-[9px] px-3 text-accent'
            >
              Today
            </button>
          </div>
          <div className='flex flex-wrap gap-3.5 text-xs text-muted'>
            <span>Spent <span className='text-ink tabular-nums'>{format.money(total(past, -1))}</span></span>
            <span>In <span className='text-accent tabular-nums'>{format.money(total(past, 1))}</span></span>
            <span>{noSpend} no-spend {noSpend === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        <div className='grid grid-cols-7 gap-1.5'>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className='pb-0.5 text-center font-mono text-[11px] text-faint'>{d}</span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} className='min-h-19' />
            const iso = `${prefix}-${String(day).padStart(2, '0')}`
            const spent = spentBy[day] || 0
            const isToday = iso === toISODate(today)
            const isSelected = iso === selected
            return (
              <button
                key={iso}
                type='button'
                aria-pressed={isSelected}
                aria-label={parseDay(iso).toDateString()}
                onClick={() => setSelected(iso)}
                className={`flex min-h-19 min-w-0 flex-col justify-between rounded-[11px] border-[1.5px] p-1 text-left text-ink nav:p-1.75 ${
                  isSelected ? 'border-accent' : isToday ? 'border-[#3a5a45]' : 'border-line-4'
                }`}
                style={{ background: spent ? `rgba(52,210,123,${(0.07 + (0.45 * spent) / maxSpent).toFixed(2)})` : '#0b0e0c' }}
              >
                <span className='flex items-center justify-between'>
                  <span className={`text-xs font-semibold ${parseDay(iso) > today ? 'text-faint' : ''}`}>{day}</span>
                  {incomeBy[day] && <span className='h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_2px_rgba(52,210,123,.2)]' />}
                </span>
                <span className='flex min-w-0 flex-col gap-0.75'>
                  {spent > 0 && (
                    <span className='truncate text-[10px] tabular-nums nav:text-[11px]'>
                      <span className='hidden nav:inline'>{format.compact(spent)}</span>
                      <span className='nav:hidden'>{format.compact(spent).replace(format.symbol, '')}</span>
                    </span>
                  )}
                  {dues[day] && (
                    <span className='flex items-center gap-0.75 truncate text-[10px] text-[#e0c45a]'>
                      <Icon name='event_repeat' size={12} />
                      {dues[day].length}<span className='hidden nav:inline'>&nbsp;due</span>
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className='flex flex-wrap gap-3.5 text-[11px] text-faint'>
          <span className='flex items-center gap-1.5'><span className='h-2 w-7 rounded-[3px] bg-linear-to-r from-accent/10 to-accent/50' />Less → more spent</span>
          <span className='flex items-center gap-1.5'><span className='h-1.5 w-1.5 rounded-full bg-accent' />Income</span>
          <span className='flex items-center gap-1 text-[#e0c45a]'><Icon name='event_repeat' size={13} />Recurring due</span>
        </div>
      </section>

      <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
        {selectedDay ? (
          <>
            <div className='flex items-baseline justify-between gap-2'>
              <h2 className='m-0 text-[15px] font-semibold'>
                {parseDay(selected).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
              </h2>
              {dayTx.length > 0 && (
                <span className='text-muted tabular-nums'>{format.signed(dayTx.reduce((a, t) => a + t.amount, 0))}</span>
              )}
            </div>
            {dayTx.length === 0 && dayDues.length === 0 && (
              <div className='py-6 text-center text-muted'>Nothing on this day. A no-spend day!</div>
            )}
            {dayTx.map(t => (
              <div key={t.id} className='flex items-center gap-2.5 py-1.5'>
                <RowIcon name={CATEGORY_ICON[t.category] || 'category'} />
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='truncate font-medium'>{t.name}</span>
                  <span className='text-xs text-faint'>{t.category}</span>
                </div>
                <span className={`tabular-nums ${t.amount > 0 ? 'text-accent' : ''}`}>{format.signed(t.amount)}</span>
              </div>
            ))}
            {dayDues.length > 0 && (
              <>
                <div className='pt-1.5 text-xs text-[#e0c45a]'>Expected recurring charges</div>
                {dayDues.map(r => (
                  <div key={r.key} className='flex items-center gap-2.5 py-1.5'>
                    <RowIcon name={CATEGORY_ICON[r.category] || 'category'} className='bg-[#1d1b12] text-[#e0c45a]' />
                    <span className='min-w-0 flex-1 truncate font-medium'>{r.name}</span>
                    <span className='text-ink-2 tabular-nums'>{format.money(r.avg)}</span>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div className='py-6 text-center text-muted'>Pick a day to see what happened.</div>
        )}
      </section>
    </div>
  )
}
