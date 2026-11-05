import { useState } from 'react'
import { Link } from 'react-router-dom'
import TransactionGroups from '../components/TransactionGroups.jsx'
import { Icon, Spinner, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { parseDay } from '../lib/dates.js'

const PAGE = 8
const shortDate = date => parseDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function Suggestion ({ suggestion, onDone }) {
  const { cards, format, convertToTransfer, transferDismissals, showError } = useAppData()
  const [from, setFrom] = useState(suggestion.from)
  const [to, setTo] = useState(suggestion.to)
  const [busy, setBusy] = useState(false)
  const accounts = [...new Set([...cards.map(c => c.name), suggestion.from, suggestion.to].filter(Boolean))]
  const ready = from && to && from !== to

  const run = async action => {
    setBusy(true)
    try {
      await action()
      onDone?.()
    } catch (error) {
      showError(error)
      setBusy(false)
    }
  }

  const select = (label, value, onChange) => (
    <label className='flex min-w-0 flex-1 basis-36 flex-col gap-1 text-xs text-muted'>
      {label}
      <select aria-label={`${label} account`} value={value} onChange={e => onChange(e.target.value)} className={`${inputClass} h-9.5 bg-rail px-2.5`}>
        <option value=''>Choose an account</option>
        {accounts.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
    </label>
  )

  return (
    <div className='flex flex-col gap-3 rounded-[14px] border border-line bg-rail p-3.5'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-0.75'>
          {suggestion.items.map(t => (
            <span key={t.id} className='truncate text-[13px]'>
              <span className='font-medium'>{t.name}</span>
              <span className='text-faint'> · {t.category}{t.card ? ` · ${t.card}` : ''} · {shortDate(t.date)}</span>
            </span>
          ))}
        </div>
        <span className='flex-none font-semibold tabular-nums'>{format.money(suggestion.amount)}</span>
      </div>
      <div className='flex flex-wrap items-end gap-2'>
        {select('From', from, setFrom)}
        {select('To', to, setTo)}
        <button
          type='button'
          disabled={busy}
          onClick={() => run(() => transferDismissals.create({ key: suggestion.key }))}
          className='h-9.5 rounded-[10px] border border-line-3 px-3 text-ink hover:bg-hover disabled:opacity-60'
        >
          Not a transfer
        </button>
        <button
          type='button'
          disabled={busy || !ready}
          title={ready ? undefined : 'Choose two different accounts'}
          onClick={() => run(() => convertToTransfer(suggestion.ids, { from, to }))}
          className='h-9.5 rounded-[10px] bg-accent px-3.5 font-semibold text-accent-ink disabled:opacity-50'
        >
          It’s a transfer
        </button>
      </div>
    </div>
  )
}

export default function Transfers () {
  const { loading, transferList, transferHints, transfers, cards, format, openNew } = useAppData()
  const [limit, setLimit] = useState(PAGE)
  const [historyLimit, setHistoryLimit] = useState(25)

  if (loading || transfers.loading) return <Spinner />

  const year = new Date().getFullYear()
  const movedThisYear = transferList
    .filter(t => t.date.startsWith(String(year)))
    .reduce((total, t) => total + t.value, 0)

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='m-0 max-w-140 text-[13px] leading-relaxed text-muted'>
          Money you move between your own accounts, like paying a credit card or adding to your investments. It doesn’t count as income or spending.
        </p>
        <button type='button' onClick={() => openNew({ transfer: true })} className='flex h-10 items-center gap-1.5 rounded-[11px] border border-accent/40 bg-accent-soft px-3.5 font-semibold text-accent'>
          <Icon name='add' />New transfer
        </button>
      </div>

      {cards.length < 2 && (
        <p className='m-0 rounded-[14px] border border-dashed border-line-3 p-4 text-[13px] text-muted'>
          You need at least two accounts for a transfer. <Link to='/cards'>Add them in Cards</Link>.
        </p>
      )}

      {transferHints.length > 0 && (
        <section className={`${panelClass} flex flex-col gap-3.5 p-5`}>
          <div className='flex flex-col gap-1'>
            <h2 className='m-0 text-[15px] font-semibold'>Possible transfers <span className='font-mono text-xs font-normal text-faint'>{transferHints.length}</span></h2>
            <span className='text-xs text-faint'>These look like money moving between your accounts. Nothing changes until you confirm.</span>
          </div>
          {transferHints.slice(0, limit).map(s => <Suggestion key={s.key} suggestion={s} />)}
          {transferHints.length > limit && (
            <button type='button' onClick={() => setLimit(limit + PAGE)} className='h-10 rounded-[11px] border border-dashed border-line-3 text-muted hover:border-accent hover:text-ink'>
              Show {Math.min(PAGE, transferHints.length - limit)} more
            </button>
          )}
        </section>
      )}

      <section className={`${panelClass} flex flex-col gap-2 p-5`}>
        <div className='flex items-baseline justify-between gap-3'>
          <h2 className='m-0 text-[15px] font-semibold'>History</h2>
          {transferList.length > 0 && <span className='text-xs text-faint'>{format.money(movedThisYear)} moved in {year}</span>}
        </div>
        {transferList.length === 0
          ? <p className='m-0 py-6 text-center text-[13px] text-muted'>No transfers yet.</p>
          : <TransactionGroups items={transferList.slice(0, historyLimit)} />}
        {transferList.length > historyLimit && (
          <button type='button' onClick={() => setHistoryLimit(historyLimit + 25)} className='h-10 rounded-[11px] border border-dashed border-line-3 text-muted hover:border-accent hover:text-ink'>
            Show {Math.min(25, transferList.length - historyLimit)} more
          </button>
        )}
      </section>
    </div>
  )
}
