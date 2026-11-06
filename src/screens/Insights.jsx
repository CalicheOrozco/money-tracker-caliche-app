import { useMemo } from 'react'
import { Icon, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useCollection } from '../data/useCollection.js'
import { CATEGORY_ICON } from '../lib/constants.js'
import { daysAgo, parseDay } from '../lib/dates.js'
import {
  currentMonthKey,
  expensesOf,
  inMonth,
  incomeOf,
  percentChange,
  shiftMonth
} from '../lib/periods.js'
import { monthlyAmount } from '../lib/recurring.js'

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

function buildInsights ({ transactions, format, recurring, budgets }) {
  const past = transactions.filter(t => daysAgo(t.date) >= 0)
  const last30 = past.filter(t => daysAgo(t.date) < 30)
  const prev30 = past.filter(t => daysAgo(t.date) >= 30 && daysAgo(t.date) < 60)
  const spent = expensesOf(last30)
  const before = expensesOf(prev30)
  const change = percentChange(spent, before)
  const date = value => parseDay(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const categories = [...new Set([...last30, ...prev30].filter(t => t.amount < 0).map(t => t.category))]
  const diffs = categories
    .map(c => [c, expensesOf(last30, c) - expensesOf(prev30, c)])
    .sort((a, b) => b[1] - a[1])
  const up = diffs[0]
  const down = diffs[diffs.length - 1]
  const biggest = last30.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount)[0]

  const byWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const t of past) {
    if (t.amount < 0 && daysAgo(t.date) < 182) byWeekday[parseDay(t.date).getDay()] -= t.amount
  }
  const topDay = byWeekday.indexOf(Math.max(...byWeekday))

  let streak = 0
  for (let i = 1; i <= 6; i++) {
    const month = inMonth(transactions, shiftMonth(currentMonthKey(), -i))
    const income = incomeOf(month)
    if (income && (income - expensesOf(month)) / income > 0.2) streak++
    else break
  }

  const subs = recurring.lists.subs
  const subsYearly = subs.reduce((total, r) => total + monthlyAmount(r), 0) * 12

  const items = [
    {
      icon: change > 0 ? 'trending_up' : 'trending_down',
      tone: change > 0 ? 'text-danger' : 'text-accent',
      kicker: 'Last 30 days',
      big: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}% spending`,
      text: `You spent ${format.money(spent)}, compared with ${format.money(before)} in the 30 days before.`
    },
    up && up[1] > 0 && {
      icon: CATEGORY_ICON[up[0]] || 'category',
      tone: 'text-[#e0c45a]',
      kicker: 'Biggest increase',
      big: up[0],
      text: `${format.money(up[1])} more than the previous 30 days.`
    },
    down && down[1] < 0 && {
      icon: CATEGORY_ICON[down[0]] || 'category',
      tone: 'text-accent',
      kicker: 'Biggest drop',
      big: down[0],
      text: `Down ${format.money(-down[1])}. Nice.`
    },
    byWeekday[topDay] > 0 && {
      icon: 'event',
      tone: 'text-[#5fc9e0]',
      kicker: 'Most expensive day',
      big: WEEKDAYS[topDay],
      text: `About ${format.money(byWeekday[topDay] / 26)} per ${WEEKDAYS[topDay].slice(0, -1)} over the last 6 months.`
    },
    biggest && {
      icon: 'receipt_long',
      tone: 'text-[#a3e05a]',
      kicker: 'Biggest purchase',
      big: format.money(-biggest.amount),
      text: `${biggest.name} · ${date(biggest.date)}`,
      transaction: biggest
    },
    {
      icon: 'local_fire_department',
      tone: streak ? 'text-accent' : 'text-muted',
      kicker: 'Savings streak',
      big: `${streak} ${streak === 1 ? 'month' : 'months'}`,
      text: streak
        ? 'In a row saving more than 20% of your income.'
        : 'Last month you saved under 20% of your income.'
    },
    subs.length > 0 && {
      icon: 'live_tv',
      tone: 'text-[#2bb3a3]',
      kicker: 'Subscriptions',
      big: `${format.money(subsYearly)}/yr`,
      text: `${subs.length} active ${subs.length === 1 ? 'subscription' : 'subscriptions'}. Cancelling one you don’t use adds up fast.`
    },
    budgets && budgets.length > 0 && (() => {
      const now = new Date()
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const month = inMonth(transactions, currentMonthKey())
      const atRisk = budgets.filter(b => (expensesOf(month, b.category) / now.getDate()) * days > b.limit).length
      return {
        icon: 'donut_small',
        tone: atRisk ? 'text-[#e0c45a]' : 'text-accent',
        kicker: 'Budgets',
        big: `${atRisk} of ${budgets.length}`,
        text: 'budgets are on pace to go over this month.'
      }
    })(),
    {
      icon: 'today',
      tone: 'text-muted',
      kicker: 'Daily average',
      big: `${format.money(spent / 30)}/day`,
      text: 'Average spending per day over the last 30 days.'
    }
  ]
  return items.filter(Boolean)
}

// An insight about one transaction opens it when clicked.
function Card ({ item, onOpen, className, children }) {
  if (!item.transaction) return <section className={className}>{children}</section>
  return (
    <button
      type='button'
      title={`Open ${item.transaction.name}`}
      onClick={() => onOpen(item.transaction)}
      className={`${className} text-left text-ink hover:border-line-3 hover:bg-raised`}
    >
      {children}
    </button>
  )
}

export default function Insights () {
  const { transactions, loading, format, recurring, guest, showError, openEdit } = useAppData()
  const budgets = useCollection('budgets', { enabled: !guest, onError: showError })
  const insights = useMemo(
    () => (loading || budgets.loading ? [] : buildInsights({ transactions, format, recurring, budgets: guest ? null : budgets.items })),
    [loading, budgets.loading, budgets.items, transactions, format, recurring, guest]
  )

  if (loading || budgets.loading) return <Spinner />

  if (!transactions.some(t => daysAgo(t.date) >= 0)) {
    return (
      <div className={`flex flex-col items-center gap-2 px-6 py-14 text-center text-muted ${panelClass}`}>
        <Icon name='auto_awesome' size={32} className='text-[#2a332e]' />
        Add a few transactions and insights about your spending will show up here.
      </div>
    )
  }

  const [hero, ...rest] = insights

  return (
    <div className='flex flex-col gap-4'>
      <Card item={hero} onOpen={openEdit} className={`relative flex flex-wrap items-center gap-6 overflow-hidden p-7 ${panelClass}`}>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_240px_at_0%_100%,rgba(52,210,123,.14),transparent_70%)]' />
        <div className={`relative grid h-16 w-16 place-items-center rounded-[18px] bg-accent-soft ${hero.tone}`}>
          <Icon name={hero.icon} size={34} />
        </div>
        <div className='relative flex min-w-60 flex-1 flex-col gap-2'>
          <span className='font-mono text-[11px] uppercase tracking-[.12em] text-muted'>{hero.kicker}</span>
          <span className={`text-[clamp(28px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-.03em] ${hero.tone}`}>{hero.big}</span>
          <span className='text-[15px] text-ink-2 text-pretty'>{hero.text}</span>
        </div>
      </Card>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'>
        {rest.map(item => (
          <Card key={item.kicker} item={item} onOpen={openEdit} className={`flex flex-col gap-2.5 p-5 ${panelClass}`}>
            <div className='flex items-center gap-2'>
              <Icon name={item.icon} className={item.tone} />
              <span className='font-mono text-[11px] uppercase tracking-widest text-faint'>{item.kicker}</span>
            </div>
            <span className='text-[22px] font-semibold leading-[1.15] tracking-[-.02em]'>{item.big}</span>
            <span className='leading-normal text-muted text-pretty'>{item.text}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}
