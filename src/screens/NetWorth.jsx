import { useEffect, useState } from 'react'
import { Icon, MoneyInput, Segmented, Spinner, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useCollection } from '../data/useCollection.js'
import { PALETTE } from '../lib/constants.js'
import { daysAgo, parseDay, toISODate } from '../lib/dates.js'
import { sparkPaths } from '../lib/metrics.js'
import { decimalOnly, toNumber } from '../lib/numbers.js'
import { creditCardEstimate } from '../lib/transfers.js'

function HoldingRow ({ item, color, share, onSave, onRemove }) {
  const { format } = useAppData()
  const [value, setValue] = useState(String(item.value))
  return (
    <div className='flex items-center gap-2.5 border-t border-line-4 py-1.5'>
      {color ? <span className='h-2 w-2 flex-none rounded-[3px]' style={{ background: color }} /> : <Icon name='account_balance' size={18} className='text-muted' />}
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate font-medium'>{item.name}</span>
        <span className='text-xs text-faint'>{item.kind || (item.side === 'asset' ? 'Asset' : 'Debt')}{share && ` · ${share}`}</span>
      </div>
      <MoneyInput
        symbol={format.symbol}
        aria-label={`${item.name} value`}
        value={value}
        onChange={e => setValue(decimalOnly(e.target.value))}
        onBlur={() => {
          if (toNumber(value) !== item.value) onSave(toNumber(value))
        }}
        className='h-8.5 w-32.5 rounded-[9px] [&_input]:text-right [&_input]:text-[13px]'
      />
      <button type='button' aria-label={`Remove ${item.name}`} onClick={onRemove} className='grid h-7 w-7 place-items-center rounded-lg text-[#4a524c] hover:text-danger'>
        <Icon name='close' size={17} />
      </button>
    </div>
  )
}

export default function NetWorth () {
  const { transactions, transferList, cards, format, privacy, showError } = useAppData()
  const holdings = useCollection('holdings', { onError: showError })
  const snapshots = useCollection('networth-snapshots', { onError: showError })
  const [form, setForm] = useState({ side: 'asset', name: '', value: '' })

  const assets = holdings.items.filter(h => h.side === 'asset')
  const liabilities = holdings.items.filter(h => h.side === 'liab')
  const cardDebt = creditCardEstimate(transactions, transferList, cards)
  const totalAssets = assets.reduce((a, h) => a + h.value, 0)
  const totalDebts = liabilities.reduce((a, h) => a + h.value, 0) + cardDebt
  const net = totalAssets - totalDebts
  const ready = !holdings.loading && !snapshots.loading
  const today = toISODate(new Date())
  const todaySnapshot = snapshots.items.find(s => s.date === today)
  const { create: saveSnapshot } = snapshots

  // Today's value is saved once per day so the chart is built from real history.
  useEffect(() => {
    if (!ready || holdings.items.length === 0) return
    if (todaySnapshot && Math.abs(todaySnapshot.value - net) < 0.005) return
    saveSnapshot({ date: today, value: Math.round(net * 100) / 100 }).catch(showError)
  }, [ready, holdings.items.length, todaySnapshot, net, today, saveSnapshot, showError])

  if (!ready) return <Spinner />

  const history = snapshots.items
    .filter(s => daysAgo(s.date) < 365)
    .sort((a, b) => a.date.localeCompare(b.date))
  const series = history.map(s => ({ value: s.value }))
  const change = history.length > 1 ? net - history[0].value : 0
  const paths = series.length > 1 ? sparkPaths(series) : null

  async function add () {
    if (!form.name.trim() || !(toNumber(form.value) > 0)) return
    try {
      await holdings.create({ side: form.side, name: form.name.trim(), kind: form.side === 'asset' ? 'Other' : 'Debt', value: toNumber(form.value) })
      setForm({ side: form.side, name: '', value: '' })
    } catch (error) {
      showError(error)
    }
  }

  const save = item => value => holdings.update(item._id, { value }).catch(showError)
  const remove = item => () => holdings.remove(item._id).catch(showError)

  return (
    <div className='flex flex-col gap-5'>
      <section className={`relative flex flex-col gap-2.5 overflow-hidden px-6 pt-6 ${paths ? '' : 'pb-6'} ${panelClass}`}>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_85%_0%,rgba(52,210,123,.12),transparent_70%)]' />
        <span className='relative text-[13px] text-muted'>Net worth</span>
        <span className='relative text-[clamp(36px,4.2vw,56px)] font-semibold leading-none tracking-[-.04em] tabular-nums'>
          {privacy ? `${format.symbol} ••••••` : `${net < 0 ? '−' : ''}${format.symbol}${Math.abs(net).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </span>
        <div className='relative flex flex-wrap gap-4 text-[13px]'>
          {history.length > 1 && (
            <span className={`font-medium tabular-nums ${change >= 0 ? 'text-accent' : 'text-danger'}`}>
              {format.signed(change)} since {parseDay(history[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span className='text-muted'>Assets <span className='text-ink tabular-nums'>{format.money(totalAssets)}</span></span>
          <span className='text-muted'>Debts <span className='text-danger-soft tabular-nums'>{format.money(totalDebts)}</span></span>
        </div>
        {paths ? (
          <svg viewBox='0 0 600 150' preserveAspectRatio='none' role='img' aria-label='Net worth history' className='relative -mx-6 mt-2.5 block h-37.5 w-[calc(100%+48px)] max-w-none'>
            <defs>
              <linearGradient id='networth-area' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0' stopColor='#34d27b' stopOpacity='.3' />
                <stop offset='1' stopColor='#34d27b' stopOpacity='0' />
              </linearGradient>
            </defs>
            <path d={paths.area} fill='url(#networth-area)' />
            <path d={paths.line} fill='none' stroke='#34d27b' strokeWidth='2' vectorEffect='non-scaling-stroke' />
          </svg>
        ) : (
          <span className='relative text-xs text-faint'>
            {holdings.items.length
              ? 'Your history starts today. The chart fills in as your values change over the coming days.'
              : 'Add what you own and what you owe to see your net worth.'}
          </span>
        )}
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-2'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex items-baseline justify-between'>
            <h2 className='m-0 text-[15px] font-semibold'>Assets</h2>
            <span className='tabular-nums'>{format.money(totalAssets)}</span>
          </div>
          {assets.length > 0 && (
            <div className='flex h-2.5 gap-0.5 overflow-hidden rounded-full'>
              {assets.map((a, i) => <div key={a._id} style={{ width: `${(a.value / (totalAssets || 1)) * 100}%`, background: PALETTE[i % PALETTE.length] }} />)}
            </div>
          )}
          {assets.length === 0 && <div className='py-3 text-center text-muted'>No assets yet.</div>}
          {assets.map((a, i) => (
            <HoldingRow
              key={a._id}
              item={a}
              color={PALETTE[i % PALETTE.length]}
              share={totalAssets ? `${Math.round((a.value / totalAssets) * 100)}%` : ''}
              onSave={save(a)}
              onRemove={remove(a)}
            />
          ))}
        </section>

        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex items-baseline justify-between'>
            <h2 className='m-0 text-[15px] font-semibold'>Debts</h2>
            <span className='text-danger-soft tabular-nums'>{format.money(totalDebts)}</span>
          </div>
          <div className='flex items-center gap-2.5 border-t border-line-4 py-1.5'>
            <Icon name='credit_card' size={18} className='text-muted' />
            <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
              <span className='font-medium'>Credit card balances</span>
              <span className='text-xs text-faint'>From your card balances, or estimated from the last 30 days</span>
            </div>
            <span className='tabular-nums'>{format.money(cardDebt)}</span>
          </div>
          {liabilities.map(l => <HoldingRow key={l._id} item={l} onSave={save(l)} onRemove={remove(l)} />)}
          <div className='flex flex-wrap gap-2 border-t border-line pt-2.5'>
            <Segmented
              label='Asset or debt'
              value={form.side}
              onChange={side => setForm({ ...form, side })}
              options={[['asset', 'Asset'], ['liab', 'Debt']]}
              buttonClass='h-7.5 px-2.5 text-[13px]'
            />
            <input aria-label='Name' value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder='Name' className={`${inputClass} h-9.5 min-w-25 flex-1 rounded-[10px] bg-rail text-[13px]`} />
            <MoneyInput symbol={format.symbol} aria-label='Value' value={form.value} onChange={e => setForm({ ...form, value: decimalOnly(e.target.value) })} placeholder='Value' className='h-9.5 w-30' />
            <button type='button' onClick={add} className='h-9.5 rounded-[10px] bg-accent-soft px-3.5 font-semibold text-accent'>Add</button>
          </div>
        </section>
      </div>
    </div>
  )
}
