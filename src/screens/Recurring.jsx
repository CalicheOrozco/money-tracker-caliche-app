import { useState } from 'react'
import { Icon, Segmented, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { CATEGORY_ICON } from '../lib/constants.js'
import { parseDay } from '../lib/dates.js'
import { daysUntil, monthlyAmount } from '../lib/recurring.js'

const shortDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function RecurringRow ({ r, open, onToggle }) {
  const { format, privacy, overrides, showToast, showError } = useAppData()
  const varies = r.max - r.min > r.avg * 0.04
  const due = daysUntil(r.next)
  const history = r.list.slice(-6)
  const historyMax = Math.max(...history.map(t => Math.abs(t.amount)))
  const amount = privacy
    ? '••••'
    : varies
      ? `${format.symbol}${Math.round(r.min).toLocaleString('en-US')}–${Math.round(r.max).toLocaleString('en-US')}`
      : format.money(r.avg)

  const status = r.cancelled ? 'Cancelled' : r.inactive ? 'Inactive' : due <= 0 ? 'Due today' : `Next ${shortDate(r.next)}`
  const statusClass = r.inactive ? 'bg-[#1a1d1b] text-muted' : due <= 3 ? 'bg-[#e0c45a]/10 text-[#e0c45a]' : 'bg-accent/10 text-accent'
  const iconClass = r.inactive ? 'bg-[#141816] text-faint' : r.type === 'sub' ? 'bg-accent/10 text-accent' : 'bg-line-4 text-[#aab3ac]'

  const set = async (values, message) => {
    try {
      await overrides.create({ key: r.key, ...values })
      if (message) showToast(message)
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className='border-t border-line-4'>
      <button type='button' aria-expanded={open} onClick={onToggle} className='flex w-full items-center gap-3 rounded-xl px-1.5 py-3 text-left'>
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-[11px] ${iconClass}`}><Icon name={CATEGORY_ICON[r.category] || 'category'} /></span>
        <span className='flex min-w-0 flex-1 flex-col gap-[3px]'>
          <span className={`truncate font-medium ${r.inactive ? 'text-muted' : ''}`}>{r.name}</span>
          <span className='truncate text-xs text-faint'>{r.category}{r.card ? ` · ${r.card}` : ''}</span>
        </span>
        <span className={`hidden whitespace-nowrap rounded-full px-2 py-1 text-[11px] sm:inline ${statusClass}`}>{status}</span>
        <span className='flex min-w-[90px] flex-col items-end gap-0.5'>
          <span className='font-semibold tabular-nums'>{amount}</span>
          <span className='text-[11px] text-faint tabular-nums'>{format.money(monthlyAmount(r) * 12)}/yr</span>
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className='text-faint' />
      </button>
      {open && (
        <div className='mb-3.5 flex flex-col gap-3.5 rounded-[14px] border border-line bg-rail p-3.5 sm:ml-[58px]'>
          <div className='flex flex-wrap justify-between gap-1.5 text-xs text-muted'>
            <span>Monthly · around day {Number(r.last.date.slice(8))}</span>
            <span>
              {r.inactive && !r.cancelled
                ? `No charge since ${shortDate(parseDay(r.last.date))}`
                : `Last charged ${shortDate(parseDay(r.last.date))} · ${r.list.length} charges found`}
            </span>
          </div>
          <div className='flex h-[90px] items-end gap-2'>
            {history.map(t => (
              <div key={t.id} className='flex h-full flex-1 flex-col items-center justify-end gap-[5px]'>
                <span className='text-[10px] text-muted tabular-nums'>{format.compact(Math.abs(t.amount))}</span>
                <div
                  className={`w-full max-w-[30px] rounded-t-[5px] rounded-b-sm opacity-85 ${r.type === 'sub' && !r.inactive ? 'bg-accent' : 'bg-[#aab3ac]'}`}
                  style={{ height: `${Math.max(8, Math.round((Math.abs(t.amount) / historyMax) * 100))}%` }}
                />
                <span className='font-mono text-[10px] text-faint'>{parseDay(t.date).toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
            ))}
          </div>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => set({ status: r.cancelled ? 'confirmed' : 'cancelled' }, `${r.name} ${r.cancelled ? 'reactivated' : 'marked as cancelled'}`)}
              className='h-8 rounded-[9px] border border-line-3 px-3 text-[13px] text-ink'
            >
              {r.cancelled ? 'Mark as active' : 'Mark as cancelled'}
            </button>
            <button
              type='button'
              onClick={() => set({ type: r.type === 'sub' ? 'bill' : 'sub' })}
              className='h-8 rounded-[9px] border border-line-3 px-3 text-[13px] text-ink'
            >
              {r.type === 'sub' ? 'Move to bills' : 'Move to subscriptions'}
            </button>
            <button type='button' onClick={() => set({ status: 'dismissed' })} className='h-8 rounded-[9px] px-3 text-[13px] text-muted'>
              Not recurring
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Recurring () {
  const { recurring, format, loading, overrides, showToast, showError } = useAppData()
  const [tab, setTab] = useState('subs')
  const [open, setOpen] = useState(null)

  if (loading || overrides.loading) return <Spinner />

  const { lists, review, upcoming, income } = recurring
  const total = list => list.reduce((sum, r) => sum + monthlyAmount(r), 0)
  const subs = total(lists.subs)
  const bills = total(lists.bills)
  const fixed = subs + bills
  const pending = total(review)
  const rows = [...lists[tab]].sort((a, b) => b.avg - a.avg)

  const decide = async (r, status) => {
    try {
      await overrides.create({ key: r.key, status })
      if (status === 'confirmed') showToast(`${r.name} added to recurring`)
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4'>
        <section className={`relative flex flex-col gap-2.5 overflow-hidden p-5 ${panelClass}`}>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(360px_180px_at_100%_0%,rgba(52,210,123,.12),transparent_70%)]' />
          <span className='relative text-[13px] text-muted'>Fixed every month</span>
          <span className='relative text-4xl font-semibold leading-none tracking-[-.03em] tabular-nums'>{format.money(fixed)}</span>
          <span className='relative text-xs text-faint'>
            {income ? `${Math.round((fixed / income) * 100)}% of your recurring income` : 'No recurring income detected yet'}
          </span>
          <div className='relative flex h-2 gap-0.5 overflow-hidden rounded-full bg-line'>
            <div className='bg-accent' style={{ width: `${fixed ? (subs / fixed) * 100 : 0}%` }} />
            <div className='bg-[#2bb3a3]' style={{ width: `${fixed ? (bills / fixed) * 100 : 0}%` }} />
          </div>
          {pending > 0 && <span className='relative text-xs text-[#e0c45a]'>+ {format.money(pending)} waiting for review</span>}
        </section>
        {[['Subscriptions', 'bg-accent', subs, lists.subs.length], ['Bills & fixed payments', 'bg-[#2bb3a3]', bills, lists.bills.length]].map(([label, dot, value, count]) => (
          <section key={label} className={`flex flex-col gap-2.5 p-5 ${panelClass}`}>
            <span className='flex items-center gap-2 text-[13px] text-muted'>
              <span className={`h-2 w-2 rounded-[3px] ${dot}`} />{label}
              <span className='ml-auto font-mono text-[11px] text-faint'>{count} active</span>
            </span>
            <span className='text-2xl font-semibold tracking-[-.02em] tabular-nums'>
              {format.money(value)}<span className='text-[13px] font-normal text-faint'> /mo</span>
            </span>
            <span className='text-xs text-faint'>{format.money(value * 12)} a year</span>
          </section>
        ))}
      </div>

      {review.length > 0 && (
        <section className='flex flex-col gap-2.5 rounded-[20px] border border-[#3a3420] bg-[#14130d] px-5 py-4'>
          <div className='flex flex-wrap items-center gap-2.5'>
            <Icon name='auto_awesome' className='text-[#e0c45a]' />
            <span className='font-semibold'>We found {review.length} possible recurring {review.length === 1 ? 'payment' : 'payments'}</span>
            <span className='text-xs text-muted'>The amount changes, so please confirm</span>
          </div>
          {review.map(r => (
            <div key={r.key} className='flex flex-wrap items-center gap-3 border-t border-[#2a2618] py-2'>
              <span className='grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] bg-[#1d1b12] text-[#e0c45a]'>
                <Icon name={CATEGORY_ICON[r.category] || 'category'} size={18} />
              </span>
              <div className='flex min-w-40 flex-1 flex-col gap-0.5'>
                <span className='font-medium'>{r.name}</span>
                <span className='text-xs text-muted'>
                  Monthly · around day {Number(r.last.date.slice(8))} · {format.symbol}{Math.round(r.min).toLocaleString('en-US')}–{Math.round(r.max).toLocaleString('en-US')}
                </span>
              </div>
              <div className='flex gap-1.5'>
                <button type='button' onClick={() => decide(r, 'dismissed')} className='h-8 rounded-[9px] border border-[#3a3420] px-3 text-[13px] text-ink-2'>Not recurring</button>
                <button type='button' onClick={() => decide(r, 'confirmed')} className='h-8 rounded-[9px] bg-[#e0c45a] px-3 text-[13px] font-semibold text-[#151208]'>Confirm</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <Segmented
              label='Recurring type'
              value={tab}
              onChange={key => {
                setTab(key)
                setOpen(null)
              }}
              options={[['subs', 'Subscriptions'], ['bills', 'Bills'], ['inactive', 'Inactive']].map(([key, label]) => [
                key,
                <span key={key} className='flex items-center gap-1.5'>
                  {label}
                  <span className={`rounded-[5px] px-1.5 py-px font-mono text-[11px] ${tab === key ? 'bg-accent-soft text-accent' : 'bg-raised text-faint'}`}>{lists[key].length}</span>
                </span>,
                'bg-[#1f2a23] text-ink'
              ])}
            />
            <span className='flex items-center gap-1.5 text-xs text-faint'><Icon name='auto_awesome' size={16} />Detected from your transactions</span>
          </div>
          {rows.length === 0 ? (
            <div className='px-5 py-10 text-center text-muted'>
              {tab === 'inactive'
                ? 'Nothing inactive.'
                : 'Nothing detected yet. Payments show up here once they repeat about monthly at least three times.'}
            </div>
          ) : (
            <div className='flex flex-col'>
              {rows.map(r => (
                <RecurringRow key={r.key} r={r} open={open === r.key} onToggle={() => setOpen(open === r.key ? null : r.key)} />
              ))}
            </div>
          )}
        </section>

        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex items-baseline justify-between gap-2'>
            <h2 className='m-0 text-[15px] font-semibold'>Coming up</h2>
            <span className='text-xs text-faint'>
              Next 30 days · <span className='text-ink tabular-nums'>{format.money(upcoming.reduce((a, r) => a + r.avg, 0))}</span>
            </span>
          </div>
          {upcoming.length === 0 && <div className='p-6 text-center text-muted'>No charges expected in the next 30 days.</div>}
          <div className='flex flex-col gap-1'>
            {upcoming.map(r => {
              const days = daysUntil(r.next)
              return (
                <div key={r.key} className='flex items-center gap-3 px-1 py-2'>
                  <div className='flex w-[42px] flex-none flex-col items-center rounded-[10px] border border-line bg-rail py-[5px]'>
                    <span className='font-mono text-[9px] uppercase text-faint'>{r.next.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className='text-base font-semibold leading-[1.1]'>{r.next.getDate()}</span>
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <span className='truncate font-medium'>{r.name}</span>
                    <span className={`text-xs ${days <= 3 ? 'text-[#e0c45a]' : 'text-faint'}`}>
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
                    </span>
                  </div>
                  <span className='tabular-nums'>{format.money(r.avg)}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
