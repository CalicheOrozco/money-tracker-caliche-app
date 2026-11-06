import { useMemo, useState } from 'react'
import { MerchantTile } from '../components/TxIcon.jsx'
import { Icon, RowIcon, Segmented, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { downloadTransactionsCsv } from '../lib/csv.js'
import { CATEGORY_ICON, PALETTE } from '../lib/constants.js'
import { parseDay, toISODate } from '../lib/dates.js'
import { deltaPill } from '../lib/periods.js'
import { categoryLabel } from '../lib/splits.js'
import { yearReview, yearsWithData } from '../lib/yearReview.js'

const tileClass = 'flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-rail p-4'
const monthName = (key, style = 'short') => parseDay(`${key}-01`).toLocaleDateString('en-US', { month: style })

function Pill ({ change, invert, year }) {
  if (change === null) return <span className='text-[11px] text-faint'>No data for {year - 1}</span>
  const pill = deltaPill(change, invert)
  return <span className={`self-start whitespace-nowrap rounded-full px-1.75 py-0.75 text-[11px] ${pill.className}`}>{pill.text} vs {year - 1}</span>
}

function Moves ({ title, icon, list, format, empty }) {
  return (
    <div className='flex min-w-0 flex-col gap-2'>
      <span className='flex items-center gap-1.5 text-xs text-muted'><Icon name={icon} size={16} />{title}</span>
      {list.length === 0 && <span className='text-[13px] text-faint'>{empty}</span>}
      {list.map(c => (
        <div key={c.name} className='flex items-center gap-2.5 text-[13px]'>
          <Icon name={CATEGORY_ICON[c.name] || 'category'} size={17} className='flex-none text-muted' />
          <span className='min-w-0 flex-1 truncate'>{c.name}</span>
          <span className={`tabular-nums ${c.difference > 0 ? 'text-danger-soft' : 'text-accent'}`}>{format.signed(-c.difference)}</span>
        </div>
      ))}
    </div>
  )
}

// A whole year at a glance: totals against the year before, each month, where the
// money went and what changed, plus the figures a tax return usually asks for.
export default function YearInReview () {
  const { transactions, format, loading, openEdit, merchantOf } = useAppData()
  const today = toISODate(new Date())
  const years = useMemo(() => {
    const list = yearsWithData(transactions, today)
    return list.length ? list : [Number(today.slice(0, 4))]
  }, [transactions, today])
  const [chosen, setChosen] = useState(null)
  const year = chosen && years.includes(chosen) ? chosen : years[0]
  const review = useMemo(() => yearReview(transactions, year, today), [transactions, year, today])

  const merchants = useMemo(() => {
    const totals = new Map()
    for (const t of transactions) {
      if (t.amount >= 0 || !t.date.startsWith(`${year}-`) || t.date > today) continue
      const merchant = merchantOf(t)
      if (!merchant) continue
      const entry = totals.get(merchant._id) || { merchant, amount: 0, count: 0 }
      entry.amount -= t.amount
      entry.count++
      totals.set(merchant._id, entry)
    }
    return [...totals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [transactions, year, today, merchantOf])

  if (loading) return <Spinner />

  const { totals, months, categories, biggest, tax, bestMonth, biggestMonth } = review
  const monthMax = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)))
  const yearRows = transactions.filter(t => t.date.startsWith(`${year}-`) && t.date <= today)

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-2.5 print:hidden'>
        <Segmented
          label='Year'
          options={years.slice(0, 6).map(y => [y, String(y)])}
          value={year}
          onChange={setChosen}
          buttonClass='h-7.5 px-3 font-mono text-xs'
        />
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => downloadTransactionsCsv(yearRows, `transactions-${year}.csv`)}
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
          <span className='font-mono text-[11px] uppercase tracking-[.12em] text-muted'>Year in review</span>
          <h2 className='m-0 text-[30px] font-semibold tracking-[-.03em]'>{year}</h2>
          <span className='text-xs text-faint'>
            {review.count} transactions{review.partial && <span className='text-[#e0c45a]'> · year in progress, through {parseDay(today).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>}
          </span>
        </div>
        <div className='relative grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3'>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Earned</span>
            <span className='truncate text-[22px] font-semibold tabular-nums'>{format.money(totals.income)}</span>
            <Pill change={review.changes.income} year={year} />
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Spent</span>
            <span className='truncate text-[22px] font-semibold tabular-nums'>{format.money(totals.expense)}</span>
            <Pill change={review.changes.expense} invert year={year} />
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Saved</span>
            <span className={`truncate text-[22px] font-semibold tabular-nums ${totals.net >= 0 ? 'text-accent' : 'text-danger'}`}>{format.signed(totals.net)}</span>
            {review.previous ? <span className='text-[11px] text-faint'>vs {format.signed(review.previous.net)} in {year - 1}</span> : <span className='text-[11px] text-faint'>Income minus spending</span>}
          </div>
          <div className={tileClass}>
            <span className='text-xs text-muted'>Savings rate</span>
            <span className='text-[22px] font-semibold text-accent tabular-nums'>{totals.rate === null ? '·' : `${Math.max(0, totals.rate)}%`}</span>
            <span className='text-[11px] text-faint'>{review.previous?.rate != null ? `${Math.max(0, review.previous.rate)}% in ${year - 1}` : 'of income kept'}</span>
          </div>
        </div>
        <div className='relative flex flex-col gap-2'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted'>
            <span>Each month</span>
            <span className='flex gap-3'>
              <span className='flex items-center gap-1.5'><span className='h-2 w-2 rounded-[3px] bg-accent' />Income</span>
              <span className='flex items-center gap-1.5'><span className='h-2 w-2 rounded-[3px] bg-[#5a6b60]' />Spending</span>
            </span>
          </div>
          <div className='grid h-28 grid-cols-12 items-end gap-1.5'>
            {months.map(m => (
              <div key={m.key} className='flex h-full flex-col justify-end gap-1' title={`${monthName(m.key, 'long')}: earned ${format.money(m.income)}, spent ${format.money(m.expense)}`}>
                <div className='flex flex-1 items-end gap-0.5'>
                  <div className='flex-1 rounded-t-[3px] bg-accent' style={{ height: `${Math.round((m.income / monthMax) * 100)}%` }} />
                  <div className='flex-1 rounded-t-[3px] bg-[#5a6b60]' style={{ height: `${Math.round((m.expense / monthMax) * 100)}%` }} />
                </div>
                <span className='text-center font-mono text-[10px] text-faint'>{monthName(m.key).slice(0, 1)}</span>
              </div>
            ))}
          </div>
          {bestMonth && (
            <span className='text-xs text-faint'>
              Best month: {monthName(bestMonth.key, 'long')}, saving {format.money(Math.max(0, bestMonth.net))}.
              {biggestMonth && ` Most spending: ${monthName(biggestMonth.key, 'long')}, ${format.money(biggestMonth.expense)}.`}
            </span>
          )}
        </div>
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex items-baseline justify-between'>
            <h2 className='m-0 text-[15px] font-semibold'>Where it went</h2>
            <span className='text-xs text-faint'>share · vs {year - 1}</span>
          </div>
          {categories.length === 0 && <div className='py-4 text-center text-muted'>No expenses in {year}.</div>}
          {categories.slice(0, 10).map((c, i) => {
            const pill = c.change === null ? null : deltaPill(c.change, true)
            return (
              <div key={c.name} className='flex flex-col gap-1.5 py-1'>
                <div className='flex items-center gap-2.5'>
                  <Icon name={CATEGORY_ICON[c.name] || 'category'} size={18} className='flex-none' />
                  <span className='min-w-0 flex-1 truncate'>{c.name}</span>
                  <span className='font-mono text-[11px] text-faint'>{c.share}%</span>
                  <span className={`min-w-11 text-right font-mono text-[11px] ${pill ? pill.className.split(' ').pop() : 'text-[#5fc9e0]'}`}>
                    {pill ? pill.text : review.hasLastYear ? 'new' : ''}
                  </span>
                  <span className='min-w-23 text-right tabular-nums'>{format.money(c.amount)}</span>
                </div>
                <div className='h-1.25 overflow-hidden rounded-full bg-line'>
                  <div className='h-full rounded-full' style={{ width: `${Math.round((c.amount / categories[0].amount) * 100)}%`, background: PALETTE[Math.min(i, 5)] }} />
                </div>
              </div>
            )
          })}
        </section>

        <div className='flex min-w-0 flex-col gap-5'>
          <section className={`flex min-w-0 flex-col gap-4 p-5 ${panelClass}`}>
            <h2 className='m-0 text-[15px] font-semibold'>What changed</h2>
            {review.hasLastYear
              ? (
                <>
                  <Moves title='Grew the most' icon='trending_up' list={review.grew} format={format} empty='No category grew.' />
                  <Moves title='Shrank the most' icon='trending_down' list={review.shrank} format={format} empty='No category shrank.' />
                </>
                )
              : <p className='m-0 text-[13px] text-muted'>Comparisons appear once there is a year before {year} to compare with.</p>}
          </section>

          {merchants.length > 0 && (
            <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
              <h2 className='m-0 text-[15px] font-semibold'>Top merchants</h2>
              {merchants.map(({ merchant, amount, count }) => (
                <div key={merchant._id} className='flex items-center gap-2.5'>
                  <MerchantTile merchant={merchant} size={32} />
                  <span className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate font-medium'>{merchant.name}</span>
                    <span className='text-xs text-faint'>{count} {count === 1 ? 'purchase' : 'purchases'}</span>
                  </span>
                  <span className='tabular-nums'>{format.money(amount)}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-2'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <h2 className='m-0 text-[15px] font-semibold'>Biggest expenses</h2>
          {biggest.length === 0 && <div className='py-4 text-center text-muted'>No expenses in {year}.</div>}
          {biggest.map(t => (
            <button
              key={t.id}
              type='button'
              title={`Open ${t.name}`}
              onClick={() => openEdit(t)}
              className='-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1 text-left text-ink hover:bg-hover'
            >
              <RowIcon name={CATEGORY_ICON[t.category] || 'category'} />
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate font-medium'>{t.name}</span>
                <span className='truncate text-xs text-faint'>{categoryLabel(t)} · {parseDay(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <span className='tabular-nums'>{format.money(-t.amount)}</span>
            </button>
          ))}
        </section>

        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex flex-col gap-1'>
            <h2 className='m-0 text-[15px] font-semibold'>For your tax return</h2>
            <span className='text-xs leading-relaxed text-faint'>Totals as logged in the app. What counts depends on where you file, so check before using them.</span>
          </div>
          <span className='text-xs text-muted'>Income by type</span>
          {tax.income.length === 0 && <span className='text-[13px] text-faint'>No income logged in {year}.</span>}
          {tax.income.map(c => (
            <div key={c.name} className='flex items-center gap-2.5 text-[13px]'>
              <Icon name={CATEGORY_ICON[c.name] || 'payments'} size={17} className='flex-none text-muted' />
              <span className='min-w-0 flex-1 truncate'>{c.name}</span>
              <span className='tabular-nums'>{format.money(c.amount)}</span>
            </div>
          ))}
          <span className='pt-1 text-xs text-muted'>Expenses often asked about</span>
          {tax.expenses.length === 0 && <span className='text-[13px] text-faint'>No medical, education or donation expenses in {year}.</span>}
          {tax.expenses.map(c => (
            <div key={c.name} className='flex items-center gap-2.5 text-[13px]'>
              <Icon name={CATEGORY_ICON[c.name] || 'category'} size={17} className='flex-none text-muted' />
              <span className='min-w-0 flex-1 truncate'>{c.name}</span>
              <span className='tabular-nums'>{format.money(c.amount)}</span>
            </div>
          ))}
          {review.tags.length > 0 && (
            <>
              <span className='pt-1 text-xs text-muted'>Spending by tag</span>
              {review.tags.map(tag => (
                <div key={tag.name} className='flex items-center gap-2.5 text-[13px]'>
                  <span className='min-w-0 flex-1 truncate text-ink-2'>#{tag.name}</span>
                  <span className='tabular-nums'>{format.money(tag.amount)}</span>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
