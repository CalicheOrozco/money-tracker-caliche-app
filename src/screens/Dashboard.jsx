import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TxIcon from '../components/TxIcon.jsx'
import { CardLogo, HideButton, Icon, Section, Spinner } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { downloadTransactionsCsv } from '../lib/csv.js'
import { CATEGORY_ICON, EXPENSE, INCOME, RANGE_LABEL, SECTIONS } from '../lib/constants.js'
import { dayLabel } from '../lib/dates.js'
import { sparkPaths } from '../lib/metrics.js'

const PAGE = 25

function Balance ({ onHide }) {
  const { metrics, format, range } = useAppData()
  const { line, area } = sparkPaths(metrics.series)
  const positive = metrics.net >= 0

  return (
    <section className='relative overflow-hidden rounded-[20px] border border-line bg-panel px-6 pt-6'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_85%_0%,rgba(52,210,123,.12),transparent_70%)]' />
      <div className='relative flex items-start justify-between gap-3'>
        <div className='flex flex-col gap-2.5'>
          <div className='flex items-center gap-2 text-[13px] text-muted'>
            Net balance
            <span className='font-mono text-[11px] text-faint'>ALL ACCOUNTS</span>
          </div>
          <div className='font-semibold leading-none tracking-[-.04em] tabular-nums text-[clamp(36px,4.2vw,56px)]'>
            {metrics.balance < 0 ? '−' : ''}{format.money(metrics.balance)}
          </div>
          <div className='flex flex-wrap items-center gap-2 text-[13px]'>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.25 py-1 font-medium tabular-nums ${
              positive ? 'bg-accent-soft text-accent' : 'bg-[#2a1617] text-danger-soft'
            }`}>
              <Icon name={positive ? 'trending_up' : 'trending_down'} size={16} />
              {format.signed(metrics.net)}
            </span>
            <span className='text-faint'>Net · {RANGE_LABEL[range]}</span>
          </div>
        </div>
        <HideButton onClick={onHide} />
      </div>
      <svg
        role='img'
        aria-label={`Balance trend, ${RANGE_LABEL[range]}`}
        viewBox='0 0 600 150'
        preserveAspectRatio='none'
        className='relative -mx-6 mt-4.5 block h-37.5 w-[calc(100%+48px)] max-w-none'
      >
        <defs>
          <linearGradient id='balance-area' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#34d27b' stopOpacity='.32' />
            <stop offset='1' stopColor='#34d27b' stopOpacity='0' />
          </linearGradient>
        </defs>
        <path d={area} fill='url(#balance-area)' />
        <path d={line} fill='none' stroke='#34d27b' strokeWidth='2' vectorEffect='non-scaling-stroke' />
      </svg>
    </section>
  )
}

function Stats ({ onHide }) {
  const { metrics, format, range } = useAppData()
  const { income, expense, net, inRange } = metrics
  const rate = income ? Math.max(0, Math.min(100, Math.round((net / income) * 100))) : 0

  const tile = (label, icon, color, value) => (
    <div className='flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-rail p-3.5'>
      <div className='flex items-center gap-1.5 text-xs text-muted'>
        <Icon name={icon} size={16} className={color} />
        {label}
      </div>
      <div className='truncate text-[19px] font-semibold tracking-[-.02em] tabular-nums'>{value}</div>
    </div>
  )

  return (
    <Section title='Period summary' onHide={onHide} className='gap-4'>
      <div className='grid grid-cols-2 gap-2.5'>
        {tile('Income', 'south_west', 'text-accent', format.money(income))}
        {tile('Expenses', 'north_east', 'text-danger', format.money(expense))}
      </div>
      <div className='flex flex-col gap-2'>
        <div className='flex justify-between text-xs'>
          <span className='text-muted'>Savings rate</span>
          <span className='font-mono text-accent'>{rate}%</span>
        </div>
        <div className='h-2 overflow-hidden rounded-full bg-line'>
          <div className='h-full rounded-full bg-accent' style={{ width: `${rate}%` }} />
        </div>
        <div className='text-xs text-faint'>{inRange.length} transactions · {RANGE_LABEL[range]}</div>
      </div>
    </Section>
  )
}

function Cards ({ onHide, onPick }) {
  const { cards, metrics, format } = useAppData()
  const rows = cards.map(card => ({
    ...card,
    spent: -metrics.inRange
      .filter(t => t.card === card.name && t.amount < 0)
      .reduce((total, t) => total + t.amount, 0)
  }))
  const max = Math.max(1, ...rows.map(r => r.spent))

  return (
    <Section title='Cards' onHide={onHide}>
      {rows.length === 0 && <p className='m-0 text-[13px] text-muted'>Cards you pay with show up here.</p>}
      <div className='flex flex-col gap-3'>
        {rows.map(card => (
          <button key={card.name} type='button' onClick={() => onPick(card.name)} className='flex flex-col gap-2 text-left'>
            <div className='flex w-full items-center gap-2.5'>
              <CardLogo icon={card.icon} />
              <span className='min-w-0 flex-1 truncate font-medium'>{card.name}</span>
              <span className='text-ink-2 tabular-nums'>{format.money(card.spent)}</span>
            </div>
            <div className='h-1 w-full overflow-hidden rounded-full bg-line'>
              <div className='h-full rounded-full bg-accent' style={{ width: `${Math.round((card.spent / max) * 100)}%` }} />
            </div>
          </button>
        ))}
      </div>
    </Section>
  )
}

function Categories ({ onHide, chartsPath }) {
  const { metrics, format } = useAppData()
  const { categories, expense } = metrics

  const top = categories.slice(0, 5)
  const rest = categories.slice(5).reduce((total, c) => total + c.amount, 0)
  const rows = rest ? [...top, { name: 'Everything else', amount: rest, color: '#3a443d', icon: 'more_horiz' }] : top
  const pct = amount => (expense ? `${Math.round((amount / expense) * 100)}%` : '0%')

  return (
    <Section title='Where it went' onHide={onHide}>
      {rows.length === 0 ? (
        <p className='m-0 text-[13px] text-muted'>No expenses in this period.</p>
      ) : (
        <>
          <div className='flex h-2.5 gap-0.5 overflow-hidden rounded-full'>
            {rows.map(c => <div key={c.name} style={{ width: pct(c.amount), background: c.color }} />)}
          </div>
          <div className='flex flex-col gap-2.5'>
            {rows.map(c => (
              <div key={c.name} className='flex items-center gap-2.5'>
                <span className='h-2 w-2 flex-none rounded-[3px]' style={{ background: c.color }} />
                <Icon name={c.icon || CATEGORY_ICON[c.name] || 'category'} size={18} className='text-muted' />
                <span className='min-w-0 flex-1 truncate'>{c.name}</span>
                <span className='font-mono text-xs text-faint'>{pct(c.amount)}</span>
                <span className='w-23 text-right tabular-nums'>{format.money(c.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <Link to={chartsPath} className='flex items-center gap-1 self-start text-[13px]'>
        See all charts <Icon name='arrow_forward' size={16} />
      </Link>
    </Section>
  )
}

function TransactionRow ({ t }) {
  const { openEdit, removeTransaction, cards, format, showError } = useAppData()
  const income = t.amount > 0
  const logo = cards.find(c => c.name === t.card)?.icon || t.icon

  return (
    <div className='flex items-center gap-1 rounded-xl hover:bg-[#141a16]'>
      <button
        type='button'
        onClick={() => openEdit(t)}
        className='flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left'
      >
        <TxIcon t={t} />
        <span className='flex min-w-0 flex-1 flex-col gap-0.75'>
          <span className='truncate font-medium'>{t.name}</span>
          <span className='flex min-w-0 items-center gap-1.5 text-xs text-faint'>
            <span className='truncate'>
              {t.desc ? `${t.category} · ${t.desc}` : t.category}
              {t.tags.length > 0 && ` · ${t.tags.map(tag => '#' + tag).join(' ')}`}
            </span>
            {t.card && (
              <span className='inline-flex flex-none items-center gap-1.25'>
                <span>·</span>
                <CardLogo icon={logo} className='h-3.25 w-4.5 rounded-[3px]! p-px!' />
                <span>{t.card}</span>
              </span>
            )}
          </span>
        </span>
        <span className={`whitespace-nowrap font-semibold tabular-nums ${income ? 'text-accent' : 'text-ink'}`}>
          {format.signed(t.amount)}
        </span>
      </button>
      <button
        type='button'
        title='Delete'
        aria-label={`Delete ${t.name}`}
        onClick={() => removeTransaction(t).catch(showError)}
        className='mr-2 grid h-7.5 w-7.5 flex-none place-items-center rounded-lg text-[#4a524c] hover:bg-danger/10 hover:text-danger'
      >
        <Icon name='delete' size={18} />
      </button>
    </div>
  )
}

function Transactions ({ onHide }) {
  const { metrics, format, showToast, cards, cardFilter, setCardFilter } = useAppData()
  const location = useLocation()
  const [search, setSearch] = useState(location.state?.search || '')
  const [category, setCategory] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    if (cardFilter) setFiltersOpen(true)
  }, [cardFilter])

  const list = useMemo(() => {
    const query = search.trim().toLowerCase()
    return metrics.inRange.filter(t =>
      (!query || `${t.name} ${t.desc} ${t.category} ${t.tags.map(tag => '#' + tag).join(' ')}`.toLowerCase().includes(query)) &&
      (!category || t.category === category) &&
      (!cardFilter || (cardFilter === '__none' ? !t.card : t.card === cardFilter))
    )
  }, [metrics.inRange, search, category, cardFilter])

  const groups = useMemo(() => {
    const result = []
    for (const t of list.slice(0, limit)) {
      const last = result[result.length - 1]
      if (last?.date === t.date) last.items.push(t)
      else result.push({ date: t.date, items: [t] })
    }
    return result
  }, [list, limit])

  const hasFilters = !!(category || cardFilter)
  const clear = () => {
    setSearch('')
    setCategory('')
    setCardFilter('')
  }
  const selectClass = 'h-9 min-w-40 flex-1 rounded-[9px] border border-line-3 bg-raised px-2.5 text-ink'

  return (
    <section className='flex flex-col gap-3.5 rounded-[20px] border border-line bg-panel px-5 pb-2 pt-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-baseline gap-2.5'>
          <h2 className='m-0 text-[17px] font-semibold tracking-[-.01em]'>Transactions</h2>
          <span className='font-mono text-xs text-faint'>{list.length}</span>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex h-9 min-w-45 items-center gap-2 rounded-[10px] border border-line-2 bg-rail px-3'>
            <Icon name='search' size={18} className='text-faint' />
            <input
              aria-label='Search transactions'
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setLimit(PAGE)
              }}
              placeholder='Search'
              className='min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-hidden'
            />
          </div>
          <button
            type='button'
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] text-ink-2 ${
              filtersOpen ? 'border-line-3 bg-raised' : 'border-line-2'
            }`}
          >
            <Icon name='tune' size={18} />
            Filter
            {hasFilters && <span className='h-1.5 w-1.5 rounded-full bg-accent' />}
          </button>
          <button
            type='button'
            title='Export CSV'
            onClick={() => {
              downloadTransactionsCsv(list)
              showToast(`${list.length} transactions exported`)
            }}
            className='flex h-9 items-center gap-1.5 rounded-[10px] border border-line-2 px-3 text-[13px] text-ink-2 hover:bg-raised'
          >
            <Icon name='download' size={18} />
            Export
          </button>
          <HideButton onClick={onHide} />
        </div>
      </div>

      {filtersOpen && (
        <div className='flex flex-wrap gap-2 rounded-xl border border-line bg-rail p-3'>
          <select aria-label='Filter by category' value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
            <option value=''>All categories</option>
            <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
            <optgroup label='Bills'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
          </select>
          <select aria-label='Filter by card' value={cardFilter} onChange={e => setCardFilter(e.target.value)} className={selectClass}>
            <option value=''>All cards</option>
            <option value='__none'>Cash / no card</option>
            {cards.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button type='button' onClick={clear} className='h-9 rounded-[9px] px-3.5 text-accent'>Reset</button>
        </div>
      )}

      {list.length === 0 && (
        <div className='flex flex-col items-center gap-2.5 px-5 py-12 text-center text-muted'>
          <Icon name='receipt_long' size={34} className='text-[#2a332e]' />
          {metrics.inRange.length ? 'No transactions match these filters.' : 'No transactions in this period yet.'}
          {metrics.inRange.length > 0 && (
            <button type='button' onClick={clear} className='text-accent'>Clear filters</button>
          )}
        </div>
      )}

      <div className='flex flex-col'>
        {groups.map(group => (
          <div key={group.date} className='flex flex-col'>
            <div className='flex justify-between px-1 pb-1.5 pt-3 text-xs font-medium text-faint'>
              <span>{dayLabel(group.date)}</span>
              <span className='tabular-nums'>
                {format.signed(group.items.reduce((total, t) => total + t.amount, 0))}
              </span>
            </div>
            {group.items.map(t => <TransactionRow key={t.id} t={t} />)}
          </div>
        ))}
      </div>

      {list.length > limit && (
        <button
          type='button'
          onClick={() => setLimit(limit + PAGE)}
          className='mb-3 mt-1 h-10 rounded-[11px] border border-dashed border-line-3 text-muted hover:border-accent hover:text-ink'
        >
          Show {Math.min(PAGE, list.length - limit)} more
        </button>
      )}
    </section>
  )
}

export default function Dashboard () {
  const { loading, hidden, setHidden, guest, setCardFilter } = useAppData()
  if (loading) return <Spinner />

  const hide = key => () => setHidden({ ...hidden, [key]: true })
  const allHidden = SECTIONS.every(([key]) => hidden[key])

  if (allHidden) {
    return (
      <div className='flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-line-3 px-5 py-15 text-center text-muted'>
        Every section is hidden.
        <button type='button' onClick={() => setHidden({})} className='h-9.5 rounded-[10px] bg-accent-soft px-4 font-medium text-accent'>
          Show all sections
        </button>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        {!hidden.balance && <Balance onHide={hide('balance')} />}
        {!hidden.tx && <Transactions onHide={hide('tx')} />}
      </div>
      <div className='flex min-w-0 flex-col gap-5'>
        {!hidden.stats && <Stats onHide={hide('stats')} />}
        {!hidden.cards && (
          <Cards
            onHide={hide('cards')}
            onPick={name => {
              setCardFilter(name)
              if (hidden.tx) setHidden({ ...hidden, tx: false })
            }}
          />
        )}
        {!hidden.categories && <Categories onHide={hide('categories')} chartsPath={guest ? '/guest/charts' : '/charts'} />}
      </div>
    </div>
  )
}
