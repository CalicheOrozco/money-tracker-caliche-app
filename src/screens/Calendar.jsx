import { useState } from 'react'
import TxIcon from '../components/TxIcon.jsx'
import { Icon, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { CATEGORY_ICON } from '../lib/constants.js'
import { parseDay, startOfToday, toISODate } from '../lib/dates.js'
import { monthKey } from '../lib/periods.js'
import { dueDatesInMonth } from '../lib/recurring.js'

// Four spending levels by quartile of the month's days, so one huge day doesn't wash
// out the rest.
const HEAT = ['#0d110f', 'rgba(52,210,123,.09)', 'rgba(52,210,123,.17)', 'rgba(52,210,123,.28)', 'rgba(52,210,123,.44)']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const tile = 'flex min-w-32.5 flex-1 flex-col gap-1.5 rounded-[14px] border border-[#161c18] bg-[#0b0e0c] px-4 py-3.5'
const navButton = 'grid h-9 w-9 place-items-center rounded-[10px] border border-line-2 bg-[#0b0e0c] text-ink-2 hover:border-accent hover:text-accent'

function levels (amounts) {
  const sorted = amounts.filter(v => v > 0).sort((a, b) => a - b)
  const at = p => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0)
  const [q1, q2, q3] = [at(0.25), at(0.5), at(0.8)]
  return spent => (!spent ? 0 : spent > q3 ? 4 : spent > q2 ? 3 : spent > q1 ? 2 : 1)
}

function Day ({ day, iso, spent, level, income, due, isToday, isSelected, future, onPick, format }) {
  const border = isSelected ? 'border-accent shadow-[0_0_0_3px_rgba(52,210,123,.15)]' : isToday ? 'border-[#2c5a3d]' : future ? 'border-dashed border-[#161c18]' : 'border-transparent'
  const number = isToday ? 'bg-accent text-accent-ink' : future ? 'text-[#4a524c]' : level >= 3 ? 'text-ink' : 'text-[#aab3ac]'
  const label = [
    parseDay(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    spent && `spent ${format.plain(spent)}`,
    income && `income ${format.plain(income)}`,
    due && `due: ${due.map(r => r.name).join(', ')}`
  ].filter(Boolean).join(' · ')

  return (
    <button
      type='button'
      aria-pressed={isSelected}
      aria-label={label}
      title={label}
      onClick={() => onPick(iso)}
      className={`flex h-12.5 min-w-0 flex-col items-stretch justify-between rounded-xl border-[1.5px] p-1 text-left text-ink transition-[border-color,box-shadow] hover:border-[#3a5a45] nav:h-24 nav:p-2 ${border}`}
      style={{ background: future ? 'transparent' : HEAT[level] }}
    >
      <span className='flex items-center justify-between gap-0.5'>
        <span className={`grid h-5.5 min-w-5.5 place-items-center rounded-full px-0.75 text-[11px] font-semibold tabular-nums nav:text-xs ${number}`}>{day}</span>
        <span className='flex items-center gap-0.75'>
          {income > 0 && <span className='h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_2px_rgba(52,210,123,.22)]' />}
          {due && <span className='h-1.5 w-1.5 rounded-full bg-[#e0c45a] shadow-[0_0_0_2px_rgba(224,196,90,.2)]' />}
        </span>
      </span>
      {spent > 0 && (
        <span className={`hidden truncate text-xs font-medium tabular-nums nav:block ${level >= 3 ? 'text-ink' : 'text-muted'}`}>{format.compact(spent)}</span>
      )}
      <span className='h-0.75 self-start rounded-[2px] bg-accent nav:hidden' style={{ width: spent ? `${level * 25}%` : 0 }} />
    </button>
  )
}

export default function Calendar () {
  const { transactions, transferList, recurring, format, loading, openEdit, openNew, guest } = useAppData()
  const today = startOfToday()
  const todayIso = toISODate(today)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(todayIso)

  if (loading) return <Spinner />

  const { year, month } = view
  const prefix = monthKey(year, month)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = new Date(year, month, 1).getDay()
  const isFuture = iso => iso > todayIso

  // Future-dated transactions wait for their day, like everywhere else.
  const spentBy = {}
  const incomeBy = {}
  for (const t of transactions) {
    if (!t.date.startsWith(prefix) || isFuture(t.date)) continue
    const day = Number(t.date.slice(8))
    if (t.amount < 0) spentBy[day] = (spentBy[day] || 0) - t.amount
    else incomeBy[day] = (incomeBy[day] || 0) + t.amount
  }

  const dues = {}
  for (const r of recurring.active) {
    for (const date of dueDatesInMonth(r, year, month)) (dues[date.getDate()] ||= []).push(r)
  }

  const levelOf = levels(Object.values(spentBy))
  const elapsed = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(day => !isFuture(`${prefix}-${String(day).padStart(2, '0')}`))
  const spent = Object.values(spentBy).reduce((a, v) => a + v, 0)
  const income = Object.values(incomeBy).reduce((a, v) => a + v, 0)
  const noSpend = elapsed.filter(day => !spentBy[day]).length
  const isNow = year === today.getFullYear() && month === today.getMonth()

  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  const selectedDay = selected.startsWith(prefix) ? Number(selected.slice(8)) : null
  const dayTx = selectedDay ? transactions.filter(t => t.date === selected) : []
  const dayTransfers = selectedDay ? transferList.filter(t => t.date === selected) : []
  const dayDues = selectedDay ? dues[selectedDay] || [] : []
  const selectedFuture = selectedDay && isFuture(selected)
  const dayTotal = dayTx.reduce((a, t) => a + t.amount, 0)
  const selectedDate = selectedDay ? parseDay(selected) : null

  const topDays = Object.entries(spentBy).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topMax = topDays[0]?.[1] || 1

  const shift = delta => setView(({ year: y, month: m }) => {
    const date = new Date(y, m + delta, 1)
    return { year: date.getFullYear(), month: date.getMonth() }
  })
  const isoOf = day => `${prefix}-${String(day).padStart(2, '0')}`

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
      <section className={`flex min-w-0 flex-col gap-4.5 p-5 ${panelClass}`}>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-baseline gap-2.5'>
            <h2 className='m-0 text-[26px] font-semibold tracking-[-.03em]'>{new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' })}</h2>
            <span className='font-mono text-sm text-faint'>{year}</span>
          </div>
          <div className='flex items-center gap-1.5'>
            {isNow && <span className='flex h-9 items-center gap-1.5 px-3 text-xs text-accent'><span className='h-1.5 w-1.5 rounded-full bg-accent' />This month</span>}
            <button type='button' aria-label='Previous month' onClick={() => shift(-1)} className={navButton}><Icon name='chevron_left' size={20} /></button>
            <button
              type='button'
              onClick={() => {
                setView({ year: today.getFullYear(), month: today.getMonth() })
                setSelected(todayIso)
              }}
              className='h-9 rounded-[10px] border border-line-2 bg-[#0b0e0c] px-3.5 text-[13px] text-ink hover:border-accent'
            >
              Today
            </button>
            <button type='button' aria-label='Next month' onClick={() => shift(1)} className={navButton}><Icon name='chevron_right' size={20} /></button>
          </div>
        </div>

        <div className='flex flex-wrap gap-2.5'>
          <div className={tile}>
            <span className='text-xs text-muted'>Spent</span>
            <span className='whitespace-nowrap text-[19px] font-semibold tracking-[-.01em] tabular-nums'>{format.money(spent)}</span>
            <span className='text-[11px] text-faint'>{format.money(elapsed.length ? spent / elapsed.length : 0)} a day</span>
          </div>
          <div className={tile}>
            <span className='text-xs text-muted'>Income</span>
            <span className='whitespace-nowrap text-[19px] font-semibold tracking-[-.01em] text-accent tabular-nums'>{format.money(income)}</span>
          </div>
          <div className={tile}>
            <span className='text-xs text-muted'>Net</span>
            <span className={`whitespace-nowrap text-[19px] font-semibold tracking-[-.01em] tabular-nums ${income - spent >= 0 ? 'text-accent' : 'text-danger'}`}>{format.signed(income - spent)}</span>
          </div>
          <div className={tile}>
            <span className='text-xs text-muted'>No-spend days</span>
            <span className='text-[19px] font-semibold tracking-[-.01em] tabular-nums'>{noSpend}</span>
            <span className='text-[11px] text-faint'>of {elapsed.length} {elapsed.length === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        <div className='flex flex-col gap-1 nav:gap-1.5'>
          <div className='grid grid-cols-7 gap-1 nav:grid-cols-[repeat(7,minmax(0,1fr))_64px] nav:gap-1.5'>
            {DOW.map(d => (
              <span key={d} className='pb-1 pt-0.5 text-center font-mono text-[10.5px] uppercase tracking-[.08em] text-faint'>
                <span className='nav:hidden'>{d[0]}</span><span className='hidden nav:inline'>{d}</span>
              </span>
            ))}
            <span className='hidden px-1 pb-1 pt-0.5 text-right font-mono text-[10.5px] uppercase tracking-[.08em] text-[#3a423d] nav:block'>Week</span>
          </div>
          {weeks.map((week, w) => {
            const total = week.reduce((a, day) => a + (day ? spentBy[day] || 0 : 0), 0)
            return (
              <div key={w} className='grid grid-cols-7 gap-1 nav:grid-cols-[repeat(7,minmax(0,1fr))_64px] nav:gap-1.5'>
                {week.map((day, i) => day
                  ? (
                    <Day
                      key={day}
                      day={day}
                      iso={isoOf(day)}
                      spent={spentBy[day] || 0}
                      level={levelOf(spentBy[day] || 0)}
                      income={incomeBy[day] || 0}
                      due={dues[day]}
                      isToday={isoOf(day) === todayIso}
                      isSelected={isoOf(day) === selected}
                      future={isFuture(isoOf(day))}
                      onPick={setSelected}
                      format={format}
                    />
                    )
                  : <div key={`blank-${i}`} className='h-12.5 nav:h-24' />)}
                <div className={`hidden items-center justify-end whitespace-nowrap px-1 text-xs tabular-nums nav:flex ${total ? 'text-ink-2' : 'text-[#3a423d]'}`}>
                  {total ? format.compact(total) : '·'}
                </div>
              </div>
            )
          })}
        </div>

        <div className='flex flex-wrap items-center gap-4 text-[11px] text-faint'>
          <span className='flex items-center gap-1.5'>
            Less
            <span className='flex gap-0.75'>{HEAT.slice(1).map(color => <span key={color} className='h-3 w-3 rounded-[3px]' style={{ background: color }} />)}</span>
            More spent
          </span>
          <span className='flex items-center gap-1.5'><span className='h-1.5 w-1.5 rounded-full bg-accent' />Income</span>
          <span className='flex items-center gap-1.5'><span className='h-1.5 w-1.5 rounded-full bg-[#e0c45a]' />Recurring due</span>
        </div>
      </section>

      <div className='flex min-w-0 flex-col gap-5'>
        <section className={`flex min-w-0 flex-col gap-3.5 p-5 ${panelClass}`}>
          {selectedDay
            ? (
              <>
                <div className='flex items-start justify-between gap-2.5'>
                  <div className='flex flex-col gap-1'>
                    <span className='font-mono text-[11px] uppercase tracking-[.12em] text-accent'>
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                    <h2 className='m-0 text-[22px] font-semibold tracking-[-.02em]'>
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </h2>
                  </div>
                  {dayTx.length > 0 && (
                    <div className='flex flex-col items-end gap-1'>
                      <span className='text-lg font-semibold tabular-nums'>{format.signed(dayTotal)}</span>
                      <span className='text-[11px] text-faint'>{dayTx.length} {dayTx.length === 1 ? 'transaction' : 'transactions'}</span>
                    </div>
                  )}
                </div>

                {dayTx.length === 0 && dayDues.length === 0 && dayTransfers.length === 0 && (
                  <div className='flex flex-col items-center gap-1.5 rounded-[14px] border border-dashed border-line-2 bg-[#0b0e0c] px-3 py-5.5 text-center'>
                    <Icon name={selectedFuture ? 'event_available' : 'savings'} size={28} className='text-accent' />
                    <span className='font-medium'>{selectedFuture ? 'Nothing scheduled' : 'No-spend day'}</span>
                    <span className='text-xs text-faint'>{selectedFuture ? 'No recurring charges expected on this day.' : 'You didn’t spend anything. Nice.'}</span>
                  </div>
                )}

                {(dayTx.length > 0 || dayTransfers.length > 0) && (
                  <div className='flex flex-col'>
                    {dayTx.map(t => (
                      <button key={t.id} type='button' onClick={() => openEdit(t)} className='flex items-center gap-3 rounded-xl px-1.5 py-2.25 text-left text-ink hover:bg-hover'>
                        <TxIcon t={t} size={36} />
                        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                          <span className='truncate font-medium'>{t.name}</span>
                          <span className='truncate text-xs text-faint'>{t.category}{t.card ? ` · ${t.card}` : ''}</span>
                        </span>
                        <span className={`whitespace-nowrap font-semibold tabular-nums ${t.amount > 0 ? 'text-accent' : ''}`}>{format.signed(t.amount)}</span>
                      </button>
                    ))}
                    {dayTransfers.map(t => (
                      <button key={t.id} type='button' onClick={() => openEdit(t)} disabled={guest} className='flex items-center gap-3 rounded-xl px-1.5 py-2.25 text-left text-ink hover:bg-hover'>
                        <TxIcon t={t} size={36} />
                        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                          <span className='truncate font-medium'>{t.note || 'Transfer'}</span>
                          <span className='truncate text-xs text-faint'>{t.from} to {t.to}</span>
                        </span>
                        <span className='whitespace-nowrap tabular-nums text-ink-2'>{format.money(t.value)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {dayDues.length > 0 && (
                  <div className='flex flex-col gap-1 rounded-[14px] border border-[#3a3420] bg-[#14130d] p-3'>
                    <span className='flex items-center gap-1.5 pb-1 text-xs font-medium text-[#e0c45a]'><Icon name='event_repeat' size={16} />Expected recurring charges</span>
                    {dayDues.map(r => (
                      <div key={r.key} className='flex items-center gap-2.5 py-1.25'>
                        <span className='grid h-7.5 w-7.5 flex-none place-items-center rounded-[9px] bg-[#1d1b12] text-[#e0c45a]'><Icon name={CATEGORY_ICON[r.category] || 'category'} size={16} /></span>
                        <span className='min-w-0 flex-1 truncate font-medium'>{r.name}</span>
                        <span className='tabular-nums text-ink-2'>{format.money(r.avg)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!selectedFuture && (
                  <button
                    type='button'
                    onClick={() => openNew({ date: selected })}
                    className='flex h-9.5 items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-[#2a332e] text-[13px] text-muted hover:border-accent hover:text-accent'
                  >
                    <Icon name='add' size={18} />Add transaction on this day
                  </button>
                )}
              </>
              )
            : (
              <div className='flex flex-col items-center gap-1.5 px-3 py-5.5 text-center'>
                <Icon name='touch_app' size={28} className='text-[#4a524c]' />
                <span className='font-medium'>Pick a day</span>
                <span className='text-xs text-faint'>Tap any day to see its transactions.</span>
              </div>
              )}
        </section>

        {topDays.length > 0 && (
          <section className={`flex min-w-0 flex-col gap-2.5 p-5 ${panelClass}`}>
            <h2 className='m-0 mb-0.5 text-[15px] font-semibold'>Biggest days</h2>
            {topDays.map(([day, amount]) => {
              const iso = isoOf(Number(day))
              return (
                <button
                  key={day}
                  type='button'
                  onClick={() => setSelected(iso)}
                  className={`flex flex-col gap-1.5 rounded-[10px] p-2 text-left text-ink hover:bg-hover ${iso === selected ? 'bg-hover' : ''}`}
                >
                  <span className='flex w-full justify-between text-[13px]'>
                    <span className='text-ink-2'>{DOW[parseDay(iso).getDay()]} {day}</span>
                    <span className='font-medium tabular-nums'>{format.money(amount)}</span>
                  </span>
                  <span className='block h-1.25 w-full overflow-hidden rounded-[5px] bg-line'>
                    <span className='block h-full rounded-[5px] bg-accent' style={{ width: `${Math.round((amount / topMax) * 100)}%` }} />
                  </span>
                </button>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
