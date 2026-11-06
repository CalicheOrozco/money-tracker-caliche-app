import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import TransactionGroups from '../components/TransactionGroups.jsx'
import { Icon, Spinner } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { CATEGORY_ICON, RANGE_LABEL } from '../lib/constants.js'
import { monthlyCashflow } from '../lib/metrics.js'
import { byCategoryEntries } from '../lib/splits.js'

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler, LineElement, LinearScale, PointElement, Tooltip
)

const GREEN = '#34d27b'
const RED = '#f26d6d'
const MONO = { family: "'Geist Mono', monospace", size: 11 }

const panelClass =
  'flex min-w-0 flex-col gap-4 rounded-[20px] border border-line bg-panel p-5'

function tooltip (label) {
  return {
    backgroundColor: '#121714',
    borderColor: '#232b26',
    borderWidth: 1,
    titleColor: '#8b958e',
    bodyColor: '#e9efea',
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
    callbacks: { label }
  }
}

function IncomeVsExpenses () {
  const { metrics, format } = useAppData()
  const [type, setType] = useState('donut')
  const { income, expense, net } = metrics
  const hasData = income + expense > 0
  const label = ctx => `${ctx.label}: ${format.money(ctx.raw)}`

  const data = {
    labels: ['Income', 'Expenses'],
    datasets: [{
      data: hasData ? [income, expense] : [1, 0],
      backgroundColor: hasData ? [GREEN, RED] : ['#1a211d', '#1a211d'],
      borderWidth: 0
    }]
  }

  return (
    <section className={panelClass}>
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <h2 className='m-0 text-[15px] font-semibold'>Income vs expenses</h2>
        <div className='flex rounded-[9px] border border-line bg-rail p-0.5'>
          {[['donut', 'Donut', 'donut_large'], ['bars', 'Bars', 'bar_chart']].map(([key, name, icon]) => (
            <button
              key={key}
              type='button'
              title={name}
              aria-label={name}
              aria-pressed={type === key}
              onClick={() => setType(key)}
              className={`grid h-7 w-8 place-items-center rounded-[7px] ${
                type === key ? 'bg-[#1f2a23] text-accent' : 'text-muted'
              }`}
            >
              <Icon name={icon} size={18} />
            </button>
          ))}
        </div>
      </div>

      {type === 'donut' ? (
        <div className='relative mx-auto my-1 h-50 w-50'>
          <Doughnut
            data={data}
            options={{
              cutout: '78%',
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: hasData ? tooltip(label) : { enabled: false } }
            }}
          />
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-5 text-center'>
            <div className='text-xs text-muted'>Net</div>
            <div className={`text-lg font-semibold tabular-nums ${net >= 0 ? 'text-accent' : 'text-danger'}`}>
              {format.signed(net)}
            </div>
          </div>
        </div>
      ) : (
        <div className='h-52'>
          <Bar
            data={{
              labels: data.labels,
              datasets: [{
                data: [income, expense],
                backgroundColor: [GREEN, RED],
                borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 4, bottomRight: 4 },
                borderSkipped: false,
                maxBarThickness: 64
              }]
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: tooltip(label) },
              scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8b958e' } },
                y: { display: false, beginAtZero: true }
              }
            }}
          />
        </div>
      )}

      <div className='grid grid-cols-2 gap-2.5'>
        {[['Income', GREEN, income], ['Expenses', RED, expense]].map(([name, color, value]) => (
          <div key={name} className='flex min-w-0 flex-col gap-1'>
            <span className='flex items-center gap-1.5 text-xs text-muted'>
              <span className='h-2 w-2 rounded-[3px]' style={{ background: color }} />
              {name}
            </span>
            <span className='truncate font-semibold tabular-nums'>{format.money(value)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MonthlyCashflow () {
  const { transactions, format } = useAppData()
  const months = useMemo(() => monthlyCashflow(transactions), [transactions])

  return (
    <section className={panelClass}>
      <div className='flex items-center justify-between'>
        <h2 className='m-0 text-[15px] font-semibold'>Monthly cashflow</h2>
        <span className='font-mono text-[11px] text-faint'>LAST 6 MONTHS</span>
      </div>
      <div className='h-55'>
        <Bar
          data={{
            labels: months.map(m => m.label),
            datasets: [
              { label: 'Income', data: months.map(m => m.income), backgroundColor: GREEN, borderRadius: 5, maxBarThickness: 22 },
              { label: 'Expenses', data: months.map(m => m.expense), backgroundColor: 'rgba(242,109,109,.85)', borderRadius: 5, maxBarThickness: 22 }
            ]
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: tooltip(ctx => `${ctx.dataset.label}: ${format.money(ctx.raw)}`)
            },
            scales: {
              x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8b958e', font: MONO } },
              y: { display: false, beginAtZero: true }
            }
          }}
        />
      </div>
      <div className='grid grid-cols-6 gap-2.5 text-center text-[11px] tabular-nums'>
        {months.map(m => {
          const net = m.income - m.expense
          return (
            <span key={m.label} className={net >= 0 ? 'text-accent' : 'text-danger'}>
              {format.short(net)}
            </span>
          )
        })}
      </div>
    </section>
  )
}

// Phones get a simpler axis: dates would overlap, so only a few amounts are shown.
const NARROW = '(max-width: 859.98px)'
function useNarrow () {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const query = window.matchMedia(NARROW)
    const update = () => setNarrow(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return narrow
}

function BalanceOverTime () {
  const { metrics, format, privacy, range } = useAppData()
  const narrow = useNarrow()
  const { series } = metrics
  // Same objects between renders, so the chart only redraws when its data changes.
  const data = useMemo(() => ({
    labels: series.map(p => p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      data: series.map(p => p.value),
      borderColor: GREEN,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHoverBackgroundColor: GREEN,
      cubicInterpolationMode: 'monotone',
      fill: true,
      backgroundColor: ({ chart }) => {
        const { ctx, chartArea } = chart
        if (!chartArea) return 'rgba(52,210,123,.1)'
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(52,210,123,.28)')
        gradient.addColorStop(1, 'rgba(52,210,123,0)')
        return gradient
      }
    }]
  }), [series])
  const options = useMemo(() => ({
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: tooltip(ctx => (ctx.raw < 0 ? '−' : '') + format.money(ctx.raw))
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: '#1f2622' },
        ticks: { display: !narrow, color: '#5d6660', font: MONO, maxTicksLimit: 7, maxRotation: 0 }
      },
      y: {
        grid: { color: '#161c18' },
        border: { display: false },
        ticks: {
          color: '#5d6660',
          font: MONO,
          maxTicksLimit: narrow ? 3 : 5,
          callback: value => (privacy ? '•••' : (value < 0 ? '−' : '') + format.plain(value))
        }
      }
    }
  }), [format, privacy, narrow])

  return (
    <section className={`${panelClass} wide:col-span-2`}>
      <div className='flex flex-wrap items-baseline justify-between gap-2'>
        <h2 className='m-0 text-[15px] font-semibold'>Balance over time</h2>
        <span className='text-xs text-faint'>{RANGE_LABEL[range]}</span>
      </div>
      <div className='h-60'>
        <Line data={data} options={options} />
      </div>
    </section>
  )
}

const PAGE = 25

function SpendingByCategory () {
  const { metrics, format, range } = useAppData()
  const { categories, expense } = metrics
  const max = categories[0]?.amount || 1
  const [selected, setSelected] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const listRef = useRef(null)

  // Same rule as the totals above: expenses of this category in the selected range,
  // with the matching part of a split transaction.
  const list = useMemo(
    () => byCategoryEntries(metrics.inRange).filter(t => t.category === selected && t.amount < 0),
    [metrics.inRange, selected]
  )
  const open = list.length > 0

  useEffect(() => {
    if (selected) listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])

  const toggle = name => {
    setSelected(selected === name ? '' : name)
    setLimit(PAGE)
  }

  return (
    <section className={`${panelClass} gap-3.5 wide:col-span-2`}>
      <div className='flex items-baseline justify-between'>
        <h2 className='m-0 text-[15px] font-semibold'>Spending by category</h2>
        <span className='text-xs text-faint'>{format.money(expense)} total</span>
      </div>
      {categories.length === 0 && <p className='m-0 text-[13px] text-muted'>No expenses in this period.</p>}
      <div className='grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-7 gap-y-2.5'>
        {categories.map(c => (
          <button
            key={c.name}
            type='button'
            title={`See ${c.name} transactions`}
            aria-pressed={selected === c.name}
            onClick={() => toggle(c.name)}
            className={`-mx-2 flex flex-col gap-1.75 rounded-lg px-2 py-1.5 text-left text-ink hover:bg-hover ${selected === c.name ? 'bg-hover' : ''}`}
          >
            <span className='flex w-full items-center gap-2.5'>
              <Icon name={CATEGORY_ICON[c.name] || 'category'} size={18} className='flex-none' />
              <span className='min-w-0 flex-1 truncate'>{c.name}</span>
              <span className='tabular-nums'>{format.money(c.amount)}</span>
            </span>
            <span className='block h-1.25 w-full overflow-hidden rounded-full bg-line'>
              <span className='block h-full rounded-full' style={{ width: `${Math.round((c.amount / max) * 100)}%`, background: c.color }} />
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div ref={listRef} className='flex scroll-mt-4 flex-col border-t border-line pt-3.5'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex min-w-0 items-baseline gap-2'>
              <h3 className='m-0 truncate text-[15px] font-semibold'>{selected}</h3>
              <span className='flex-none text-xs text-faint'>{list.length} · {RANGE_LABEL[range]}</span>
            </div>
            <button
              type='button'
              aria-label={`Close ${selected} transactions`}
              title='Close'
              onClick={() => toggle(selected)}
              className='grid h-7.5 w-7.5 flex-none place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink'
            >
              <Icon name='close' size={18} />
            </button>
          </div>
          <TransactionGroups items={list.slice(0, limit)} />
          {list.length > limit && (
            <button
              type='button'
              onClick={() => setLimit(limit + PAGE)}
              className='mt-2 h-10 rounded-[11px] border border-dashed border-line-3 text-muted hover:border-accent hover:text-ink'
            >
              Show {Math.min(PAGE, list.length - limit)} more
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default function Charts () {
  const { loading } = useAppData()
  if (loading) return <Spinner />

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-5 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'>
      <IncomeVsExpenses />
      <MonthlyCashflow />
      <BalanceOverTime />
      <SpendingByCategory />
    </div>
  )
}
