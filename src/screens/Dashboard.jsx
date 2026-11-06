import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import TransactionGroups from '../components/TransactionGroups.jsx'
import { CardLogo, ConfirmDialog, HideButton, Icon, Section, Spinner } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { downloadTransactionsCsv } from '../lib/csv.js'
import { CATEGORY_ICON, EXPENSE, INCOME, RANGE_LABEL, SECTIONS } from '../lib/constants.js'
import { sparkPaths } from '../lib/metrics.js'
import { transfersInRange } from '../lib/transfers.js'

const PAGE = 25
const TRANSFERS = '__transfers'

// Sizes compare without the sign, so the biggest expense and the biggest income both
// come first. Transfers count by the amount moved.
const size = t => Math.abs(t.transfer ? t.value : t.amount)
const SORTS = {
  newest: ['Newest first', (a, b) => b.date.localeCompare(a.date)],
  oldest: ['Oldest first', (a, b) => a.date.localeCompare(b.date)],
  largest: ['Largest amount', (a, b) => size(b) - size(a) || b.date.localeCompare(a.date)],
  smallest: ['Smallest amount', (a, b) => size(a) - size(b) || b.date.localeCompare(a.date)]
}

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

function Categories ({ onHide, chartsPath, onPick }) {
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
            {rows.map(c => {
              const content = (
                <>
                  <span className='h-2 w-2 flex-none rounded-[3px]' style={{ background: c.color }} />
                  <Icon name={c.icon || CATEGORY_ICON[c.name] || 'category'} size={18} className='text-muted' />
                  <span className='min-w-0 flex-1 truncate'>{c.name}</span>
                  <span className='font-mono text-xs text-faint'>{pct(c.amount)}</span>
                  <span className='w-23 text-right tabular-nums'>{format.money(c.amount)}</span>
                </>
              )
              // "Everything else" groups several categories, so it has nothing single to open.
              return c.icon === 'more_horiz' ? (
                <div key={c.name} className='flex items-center gap-2.5 px-1.5'>{content}</div>
              ) : (
                <button
                  key={c.name}
                  type='button'
                  title={`See ${c.name} transactions`}
                  onClick={() => onPick(c.name)}
                  className='-my-1 flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-ink hover:bg-hover'
                >
                  {content}
                </button>
              )
            })}
          </div>
        </>
      )}
      <Link to={chartsPath} className='flex items-center gap-1 self-start text-[13px]'>
        See all charts <Icon name='arrow_forward' size={16} />
      </Link>
    </Section>
  )
}

function Transactions ({ onHide, category, setCategory }) {
  const { metrics, range, transferList, guest, showToast, cards, cardFilter, setCardFilter } = useAppData()
  const location = useLocation()
  const [search, setSearch] = useState(location.state?.search || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('newest')
  const [limit, setLimit] = useState(PAGE)
  const sectionRef = useRef(null)

  useEffect(() => {
    if (cardFilter) setFiltersOpen(true)
  }, [cardFilter])

  // Picking a category in Where it went opens its transactions here.
  useEffect(() => {
    if (!category) return
    setFiltersOpen(true)
    setLimit(PAGE)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [category])

  const cashNames = useMemo(() => new Set(cards.filter(c => c.type === 'cash').map(c => c.name)), [cards])
  const list = useMemo(() => {
    const query = search.trim().toLowerCase()
    const moved = transfersInRange(transferList, range).filter(t =>
      (!query || `transfer ${t.from} ${t.to} ${t.note}`.toLowerCase().includes(query)) &&
      (!category || category === TRANSFERS) &&
      (!cardFilter || t.from === cardFilter || t.to === cardFilter)
    )
    if (category === TRANSFERS) return [...moved].sort(SORTS[sort][1])
    return [...metrics.inRange.filter(t =>
      (!query || `${t.name} ${t.desc} ${t.category} ${t.tags.map(tag => '#' + tag).join(' ')}`.toLowerCase().includes(query)) &&
      (!category || t.category === category) &&
      (!cardFilter || (cardFilter === '__none' ? !t.card || cashNames.has(t.card) : t.card === cardFilter || (!t.card && cashNames.has(cardFilter))))
    ), ...moved].sort(SORTS[sort][1])
  }, [metrics.inRange, transferList, range, search, category, cardFilter, sort, cashNames])

  const hasFilters = !!(category || cardFilter || sort !== 'newest')
  const clear = () => {
    setSearch('')
    setCategory('')
    setCardFilter('')
    setSort('newest')
  }
  const selectClass = 'h-9 min-w-40 flex-1 rounded-[9px] border border-line-3 bg-raised px-2.5 text-ink'

  return (
    <section ref={sectionRef} className='flex scroll-mt-4 flex-col gap-3.5 rounded-[20px] border border-line bg-panel px-5 pb-2 pt-5'>
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
              showToast(`${list.length} rows exported`)
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
            {!guest && <option value={TRANSFERS}>Transfers</option>}
            <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
            <optgroup label='Bills'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
          </select>
          <select aria-label='Filter by card' value={cardFilter} onChange={e => setCardFilter(e.target.value)} className={selectClass}>
            <option value=''>All cards</option>
            <option value='__none'>Cash</option>
            {cards.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <select aria-label='Sort transactions' value={sort} onChange={e => { setSort(e.target.value); setLimit(PAGE) }} className={selectClass}>
            {Object.entries(SORTS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
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

      <TransactionGroups items={list.slice(0, limit)} />

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
  const { loading, hidden, setHidden, guest, setCardFilter, transferHints } = useAppData()
  const [category, setCategory] = useState('')
  const [hiding, setHiding] = useState(null)
  if (loading) return <Spinner />

  // Hide buttons are easy to hit by accident, so they ask first.
  const hide = key => () => setHiding(SECTIONS.find(([section]) => section === key))
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
        {transferHints.length > 0 && (
          <Link to='/transfers' className='flex items-center gap-2.5 rounded-[14px] border border-line-3 bg-panel px-4 py-3 text-[13px] text-ink hover:bg-raised'>
            <Icon name='swap_horiz' className='text-[#5fc9e0]' />
            <span className='flex-1'>
              {transferHints.length} possible {transferHints.length === 1 ? 'transfer' : 'transfers'} between your accounts to review
            </span>
            <Icon name='arrow_forward' size={16} className='text-accent' />
          </Link>
        )}
        {!hidden.balance && <Balance onHide={hide('balance')} />}
        {!hidden.tx && <Transactions onHide={hide('tx')} category={category} setCategory={setCategory} />}
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
        {!hidden.categories && (
          <Categories
            onHide={hide('categories')}
            chartsPath={guest ? '/guest/charts' : '/charts'}
            onPick={name => {
              setCategory(name)
              if (hidden.tx) setHidden({ ...hidden, tx: false })
            }}
          />
        )}
      </div>
      {hiding && (
        <ConfirmDialog
          title={`Hide ${hiding[1]}?`}
          confirmLabel='Hide section'
          onCancel={() => setHiding(null)}
          onConfirm={() => {
            setHidden({ ...hidden, [hiding[0]]: true })
            setHiding(null)
          }}
        >
          It will disappear from your dashboard. Nothing is deleted, and you can bring it back anytime from Layout at the top of the dashboard.
        </ConfirmDialog>
      )}
    </div>
  )
}
