import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MerchantLogo, MerchantTile } from '../components/TxIcon.jsx'
import { ConfirmDialog, Icon, Spinner, Switch, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useBrandSearch } from '../data/useBrandSearch.js'
import { logoSearchEnabled, useLogoConfig } from '../lib/brandfetch.js'
import { CATEGORY_ICON, EXPENSE, INCOME } from '../lib/constants.js'
import { daysAgo, parseDay } from '../lib/dates.js'
import { matchAll, merchantKey, suggestPattern, titleCase } from '../lib/merchants.js'

const PAGE = 10
const shortDate = date => parseDay(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const textOf = t => `${t.name} ${t.desc || ''}`
const BLANK = { _id: '', name: '', domain: '', patterns: [], category: '', pinned: false }
const mostCommon = counts => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

function Skeleton () {
  return (
    <div className='flex items-center gap-2.5 rounded-[11px] border border-line-2 bg-rail p-2'>
      <span className='h-8 w-8 animate-pulse rounded-[9px] bg-line-3' />
      <span className='flex flex-1 flex-col gap-1.5'>
        <span className='h-2.5 w-28 animate-pulse rounded bg-line-3' />
        <span className='h-2 w-20 animate-pulse rounded bg-line-4' />
      </span>
    </div>
  )
}

function Option ({ on, onClick, children }) {
  return (
    <button
      type='button'
      aria-pressed={on}
      onClick={onClick}
      className={`flex w-full min-w-0 items-center gap-2.5 rounded-[11px] border p-2 text-left text-ink ${on ? 'border-accent bg-[#122219]' : 'border-line-2 bg-rail hover:border-line-3'}`}
    >
      {children}
      <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} size={19} className={on ? 'text-accent' : 'text-[#4a524c]'} />
    </button>
  )
}

// Side panel to create or edit a merchant, with a live preview of what it matches.
function MerchantEditor ({ initial, onClose }) {
  const { transactions, merchants, format, showToast, showError } = useAppData()
  const [name, setName] = useState(initial.name)
  const [query, setQuery] = useState(initial.name)
  const [domain, setDomain] = useState(initial.domain)
  const [patterns, setPatterns] = useState(initial.patterns)
  const [patternInput, setPatternInput] = useState('')
  const [category, setCategory] = useState(initial.category)
  const [pinned, setPinned] = useState(!!initial.pinned)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const search = useBrandSearch(query)

  const typed = patternInput.trim().toLowerCase()
  const allPatterns = typed && !patterns.includes(typed) ? [...patterns, typed] : patterns
  // A stable key, so the preview only recalculates when the patterns really change.
  const patternKey = allPatterns.join('\n')
  const draft = useMemo(
    () => ({ _id: initial._id || '__draft', name: name.trim() || 'This merchant', patterns: patternKey ? patternKey.split('\n') : [], pinned, domain, category }),
    [initial._id, name, patternKey, pinned, domain, category]
  )
  const everyone = useMemo(
    () => (initial._id ? merchants.items.map(m => (m._id === initial._id ? draft : m)) : [...merchants.items, draft]),
    [merchants.items, initial._id, draft]
  )

  // What this merchant would match, and who keeps each transaction when several match.
  const { hits, conflicts, lost } = useMemo(() => {
    const hits = draft.patterns.length
      ? transactions.filter(t => daysAgo(t.date) >= 0 && !t.merchant && matchAll([draft], textOf(t)).length)
      : []
    const conflicts = {}
    const lost = {}
    for (const t of hits) {
      const ranked = matchAll(everyone, textOf(t))
      const mine = ranked.find(r => r.merchant === draft)
      const wins = ranked[0].merchant === draft
      if (!wins) lost[ranked[0].merchant.name] = (lost[ranked[0].merchant.name] || 0) + 1
      for (const r of ranked) {
        if (r.merchant === draft) continue
        const c = (conflicts[r.merchant._id] ||= { merchant: r.merchant, theirs: r.pattern, mine: mine.pattern, count: 0, won: 0 })
        c.count++
        if (wins) c.won++
      }
    }
    return { hits, conflicts: Object.values(conflicts), lost }
  }, [transactions, draft, everyone])

  const why = (a, aPattern, b, bPattern) => (a.pinned && !b.pinned
    ? 'it’s set to always win'
    : aPattern.length > bPattern.length ? `“${aPattern}” is more specific than “${bPattern}”` : 'it was added first')

  const first = hits[0]
  const lostText = Object.entries(lost).map(([other, n]) => `${n} go to ${other}`).join(' · ')

  function addPattern () {
    if (typed && !patterns.includes(typed)) setPatterns([...patterns, typed])
    setPatternInput('')
    setError('')
  }

  async function save (withoutLogo = false) {
    if (!name.trim()) return setError('Give the merchant a name.')
    if (!allPatterns.length) return setError('Add at least one pattern so transactions can match.')
    const body = { name: name.trim(), domain: withoutLogo ? '' : domain, patterns: allPatterns, category, pinned }
    setBusy(true)
    try {
      if (initial._id) await merchants.update(initial._id, body)
      else await merchants.create(body)
      const won = hits.filter(t => matchAll(everyone, textOf(t))[0]?.merchant === draft).length
      showToast(`${body.name} saved · ${won} ${won === 1 ? 'transaction' : 'transactions'}`)
      onClose()
    } catch (failure) {
      showError(failure)
      setBusy(false)
    }
  }

  async function remove () {
    try {
      await merchants.remove(initial._id)
      showToast(`${initial.name} deleted`)
      onClose()
    } catch (failure) {
      showError(failure)
    }
  }

  const text = query.trim()
  const ready = name.trim() && allPatterns.length

  return (
    <>
      <div onClick={onClose} className='fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]' />
      <aside role='dialog' aria-modal='true' aria-label={initial._id ? 'Edit merchant' : 'New merchant'} className='fixed inset-y-0 right-0 z-41 flex w-full flex-col border-l border-line-2 bg-[#0d110f] nav:w-125'>
        <div className='flex items-center justify-between border-b border-line-4 px-5 py-4.5'>
          <h2 className='m-0 text-[17px] font-semibold'>{initial._id ? 'Edit merchant' : 'New merchant'}</h2>
          <button type='button' aria-label='Close' onClick={onClose} className='grid h-8.5 w-8.5 place-items-center rounded-[9px] text-muted hover:bg-raised hover:text-ink'>
            <Icon name='close' />
          </button>
        </div>

        <div className='flex flex-1 flex-col gap-5 overflow-y-auto p-5'>
          <div className='flex flex-col gap-3 rounded-2xl border border-line bg-rail p-4'>
            <div className='flex items-center gap-3'>
              <MerchantTile merchant={draft} category={first?.category} size={44} />
              <span className='flex min-w-0 flex-col gap-0.5'>
                <span className='truncate text-base font-semibold'>{name.trim() || 'Merchant name'}</span>
                <span className='truncate text-xs text-faint'>{domain || 'No logo · uses the category icon'}</span>
              </span>
            </div>
            <div className='flex flex-col gap-1.5 border-t border-line-4 pt-3'>
              <span className='font-mono text-[10px] uppercase tracking-widest text-faint'>In your feed</span>
              <div className='flex items-center gap-2.5'>
                <MerchantTile merchant={draft} category={first?.category} size={34} />
                <span className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate font-medium'>{name.trim() || 'Merchant name'}</span>
                  <span className='truncate text-xs text-faint'>{category || first?.category || 'Category'}{first ? ` · ${shortDate(first.date)}` : ''}</span>
                </span>
                {first && <span className='tabular-nums'>{format.signed(first.amount)}</span>}
              </div>
            </div>
          </div>

          <label className='flex flex-col gap-1.75'>
            <span className='text-xs font-medium text-muted'>Display name</span>
            <input
              value={name}
              onChange={e => {
                setName(e.target.value)
                setQuery(e.target.value)
                setError('')
              }}
              placeholder='e.g. Walmart'
              className={inputClass}
            />
          </label>

          <div className='flex flex-col gap-2'>
            <div className='flex items-baseline justify-between'>
              <span className='text-xs font-medium text-muted'>Logo</span>
              <span className='font-mono text-[10px] uppercase tracking-widest text-faint'>Brand search</span>
            </div>
            {!logoSearchEnabled && (
              <>
                <span className='text-xs text-faint'>Logo search is not set up. You can type the website instead.</span>
                <input
                  aria-label='Website'
                  value={domain}
                  onChange={e => setDomain(e.target.value.trim().toLowerCase())}
                  placeholder='website, e.g. walmart.com.mx'
                  className={`${inputClass} font-mono text-[13px]`}
                />
              </>
            )}
            {logoSearchEnabled && text.length < 2 && <div className='text-xs text-faint'>Type a name to search for its logo.</div>}
            {logoSearchEnabled && text.length >= 2 && search.loading && (
              <div className='flex flex-col gap-2'>
                <span className='flex items-center gap-1.5 text-xs text-faint'><Icon name='travel_explore' size={16} />Searching brands for “{text}”…</span>
                <Skeleton /><Skeleton /><Skeleton />
              </div>
            )}
            {logoSearchEnabled && text.length >= 2 && !search.loading && search.error && (
              <div role='alert' className='flex flex-col gap-3 rounded-xl border border-[#3a3420] bg-[#14130d] p-3'>
                <div className='flex items-start gap-2.5'>
                  <Icon name='cloud_off' className='text-[#e0c45a]' />
                  <span className='flex flex-col gap-0.5'>
                    <span className='font-medium'>Brand search isn’t responding</span>
                    <span className='text-xs text-muted'>You can save this merchant without a logo and add one later.</span>
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <button type='button' onClick={search.retry} className='flex h-8.5 items-center gap-1.5 rounded-[9px] border border-line-3 px-3 text-[13px] text-ink'>
                    <Icon name='refresh' size={17} />Try again
                  </button>
                  <button type='button' disabled={busy} onClick={() => save(true)} className='h-8.5 rounded-[9px] bg-accent px-3 text-[13px] font-semibold text-accent-ink'>
                    Save without logo
                  </button>
                </div>
              </div>
            )}
            {logoSearchEnabled && text.length >= 2 && !search.loading && !search.error && search.results.length === 0 && (
              <div className='flex items-start gap-2.5 rounded-xl border border-line-2 bg-rail p-3'>
                <Icon name='search_off' className='text-faint' />
                <span className='flex flex-col gap-0.5'>
                  <span className='font-medium'>No brands found for “{text}”</span>
                  <span className='text-xs text-muted'>Small businesses usually don’t have one. The category icon will be used.</span>
                </span>
              </div>
            )}
            {!search.loading && !search.error && search.results.map(result => (
              <Option
                key={result.brandId || result.domain}
                on={domain === result.domain}
                onClick={() => {
                  setDomain(result.domain)
                  if (!name.trim()) setName(result.name || '')
                }}
              >
                <MerchantLogo domain={result.domain} size={32} />
                <span className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate text-[13px] font-medium'>{result.name || result.domain}</span>
                  <span className='truncate font-mono text-[11px] text-faint'>{result.domain}</span>
                </span>
              </Option>
            ))}
            <Option on={!domain} onClick={() => setDomain('')}>
              <span className='grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-line-4 text-[#aab3ac]'>
                <Icon name={CATEGORY_ICON[category] || 'storefront'} size={17} />
              </span>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='text-[13px] font-medium'>No logo</span>
                <span className='text-[11px] text-faint'>Use the category icon</span>
              </span>
            </Option>
          </div>

          <div className='flex flex-col gap-2.5'>
            <div className='flex flex-col gap-0.5'>
              <span className='text-xs font-medium text-muted'>Match patterns</span>
              <span className='text-xs text-faint'>If any of these appear in a transaction’s name or description, it belongs to this merchant. Not case-sensitive.</span>
            </div>
            {patterns.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {patterns.map(pattern => (
                  <span key={pattern} className='flex items-center gap-1 rounded-[7px] border border-[#2c5a3d] bg-accent-soft py-1 pl-2 pr-1 font-mono text-[13px] text-accent'>
                    {pattern}
                    <button type='button' title='Remove pattern' aria-label={`Remove pattern ${pattern}`} onClick={() => setPatterns(patterns.filter(p => p !== pattern))} className='grid h-5 w-5 place-items-center rounded hover:bg-accent/15'>
                      <Icon name='close' size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className='flex gap-2'>
              <input
                aria-label='New pattern'
                value={patternInput}
                onChange={e => {
                  setPatternInput(e.target.value)
                  setError('')
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addPattern()
                  }
                }}
                placeholder='Add a pattern, e.g. wm supercenter'
                className={`${inputClass} h-10 min-w-0 flex-1 rounded-[10px] font-mono`}
              />
              <button type='button' onClick={addPattern} className='h-10 rounded-[10px] bg-accent-soft px-3.5 font-semibold text-accent'>Add</button>
            </div>

            <div className='flex flex-col gap-2 rounded-xl border border-line bg-rail p-3'>
              {allPatterns.length === 0 && <span className='text-xs text-faint'>Add a pattern to preview which transactions match.</span>}
              {allPatterns.length > 0 && hits.length === 0 && (
                <span className='flex items-center gap-1.5 text-xs text-faint'><Icon name='info' size={16} />No transactions match yet. New ones will as they come in.</span>
              )}
              {hits.length > 0 && (
                <>
                  <div className='flex flex-wrap items-baseline justify-between gap-2'>
                    <span className='text-[13px] font-medium'>Matches {hits.length} {hits.length === 1 ? 'transaction' : 'transactions'}</span>
                    {lostText && <span className='text-xs text-[#e0c45a]'>{lostText}</span>}
                  </div>
                  {hits.slice(0, 5).map(t => {
                    const winner = matchAll(everyone, textOf(t))[0]?.merchant
                    const at = allPatterns.map(p => t.name.toLowerCase().indexOf(p)).find(i => i >= 0) ?? -1
                    const hit = at >= 0 ? allPatterns.find(p => t.name.toLowerCase().indexOf(p) === at) : ''
                    return (
                      <div key={t.id} className='flex items-center gap-2 text-xs'>
                        <span className='min-w-0 flex-1 truncate font-mono text-ink-2'>
                          {at >= 0
                            ? <>{t.name.slice(0, at)}<span className='rounded bg-accent/20 text-accent'>{t.name.slice(at, at + hit.length)}</span>{t.name.slice(at + hit.length)}</>
                            : t.name}
                        </span>
                        {winner !== draft && <span className='flex-none text-[#e0c45a]'>→ {winner?.name}</span>}
                        <span className='flex-none text-faint'>{shortDate(t.date)}</span>
                        <span className='flex-none tabular-nums'>{format.signed(t.amount)}</span>
                      </div>
                    )
                  })}
                  {hits.length > 5 && <span className='text-xs text-faint'>+ {hits.length - 5} more</span>}
                </>
              )}
            </div>

            {conflicts.map(c => {
              const all = c.won === c.count
              const verdict = all
                ? `${draft.name} wins: ${why(draft, c.mine, c.merchant, c.theirs)}.`
                : c.won === 0
                  ? `${c.merchant.name} keeps them: ${why(c.merchant, c.theirs, draft, c.mine)}.`
                  : `${c.won} go to ${draft.name}, ${c.count - c.won} stay with ${c.merchant.name}.`
              return (
                <div key={c.merchant._id} className='flex flex-col gap-2 rounded-xl border border-line-3 bg-rail p-3'>
                  <div className='flex items-start gap-2.5'>
                    <Icon name='call_split' className='text-[#e0c45a]' />
                    <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='text-[13px] font-medium'>{c.count} {c.count === 1 ? 'transaction also matches' : 'transactions also match'} {c.merchant.name}</span>
                      <span className='font-mono text-[11px] text-faint'>“{c.mine}” vs “{c.theirs}”</span>
                    </span>
                    <MerchantTile merchant={c.merchant} size={28} />
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className={`text-xs ${all ? 'text-accent' : 'text-[#e0c45a]'}`}>{verdict}</span>
                    {!all && !pinned && (
                      <button type='button' onClick={() => setPinned(true)} className='h-8 rounded-[9px] border border-line-3 px-3 text-[13px] text-ink'>
                        Always prefer {draft.name}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <button type='button' role='switch' aria-checked={pinned} onClick={() => setPinned(!pinned)} className='flex items-center gap-3 rounded-xl border border-line bg-rail p-3 text-left text-ink'>
              <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='text-[13px] font-medium'>Always win conflicts</span>
                <span className='text-xs text-faint'>Otherwise the most specific pattern wins, then the oldest merchant.</span>
              </span>
              <Switch on={pinned} />
            </button>
          </div>

          <label className='flex flex-col gap-1.75'>
            <span className='text-xs font-medium text-muted'>Default category <span className='font-normal text-faint'>· optional</span></span>
            <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClass} px-2.5`}>
              <option value=''>None, keep each transaction’s category</option>
              <optgroup label='Expenses'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
              <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
            </select>
            <span className='text-xs text-faint'>Applied to new transactions from this merchant.</span>
          </label>

          {error && <div role='alert' className='rounded-[10px] border border-danger/25 bg-danger/10 px-3 py-2.5 text-[13px] text-danger-soft'>{error}</div>}
        </div>

        <div className='flex gap-2 border-t border-line-4 px-5 py-4'>
          {initial._id && (
            <button type='button' title='Delete merchant' aria-label='Delete merchant' onClick={() => setConfirmDelete(true)} className='grid h-11.5 place-items-center rounded-xl border border-line-3 px-3.5 text-muted hover:border-danger hover:text-danger'>
              <Icon name='delete' />
            </button>
          )}
          <button type='button' onClick={onClose} className='h-11.5 rounded-xl border border-line-3 px-4.5 text-ink'>Cancel</button>
          <button
            type='button'
            disabled={busy}
            onClick={() => save()}
            className={`h-11.5 flex-1 rounded-xl text-[15px] font-semibold disabled:opacity-60 ${ready ? 'bg-accent text-accent-ink hover:bg-accent-hover' : 'bg-raised text-faint'}`}
          >
            {initial._id ? 'Save changes' : 'Create merchant'}
          </button>
        </div>
      </aside>
      {confirmDelete && (
        <ConfirmDialog title={`Delete ${initial.name}?`} confirmLabel='Delete merchant' onCancel={() => setConfirmDelete(false)} onConfirm={remove}>
          Its transactions keep their data and go back to the category icon.
        </ConfirmDialog>
      )}
    </>
  )
}

export default function Merchants () {
  useLogoConfig()
  const { transactions, merchants, merchantIgnores, merchantOf, format, loading, showToast, showError } = useAppData()
  const location = useLocation()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')
  const [shown, setShown] = useState(PAGE)

  const ignored = useMemo(() => new Set(merchantIgnores.items.map(i => i.key)), [merchantIgnores.items])

  const { stats, needs, recognized, total } = useMemo(() => {
    const stats = {}
    const groups = {}
    let recognized = 0
    let total = 0
    for (const t of transactions) {
      if (daysAgo(t.date) < 0) continue
      total++
      const merchant = merchantOf(t)
      if (merchant) {
        recognized++
        const entry = (stats[merchant._id] ||= { count: 0, spent: 0 })
        entry.count++
        if (t.amount < 0) entry.spent -= t.amount
        continue
      }
      if (t.amount >= 0 || t.merchant === 'none') continue
      const key = merchantKey(t.name)
      if (!key || ignored.has(key)) continue
      const group = (groups[key] ||= { key, raws: {}, cats: {}, count: 0, spent: 0 })
      group.raws[t.name] = (group.raws[t.name] || 0) + 1
      group.cats[t.category] = (group.cats[t.category] || 0) + 1
      group.count++
      group.spent -= t.amount
    }
    const needs = Object.values(groups).sort((a, b) => b.count - a.count || b.spent - a.spent)
    return { stats, needs, recognized, total }
  }, [transactions, merchantOf, ignored])

  const blank = BLANK
  const openNew = () => setEditing({ ...blank })
  const openFrom = group => setEditing({
    ...blank,
    name: titleCase(group.key.split(' ').slice(0, 3).join(' ')),
    patterns: [suggestPattern(group.key)],
    category: mostCommon(group.cats)
  })

  // Other screens can ask to open the editor for one merchant.
  useEffect(() => {
    const id = location.state?.edit
    if (!id || merchants.loading) return
    const merchant = merchants.items.find(m => m._id === id)
    if (merchant) setEditing({ ...BLANK, ...merchant })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, merchants.loading, merchants.items, navigate])

  if (loading || merchants.loading) return <Spinner />

  const query = filter.trim().toLowerCase()
  const list = merchants.items
    .filter(m => !query || m.name.toLowerCase().includes(query) || m.patterns.some(p => p.includes(query)))
    .sort((a, b) => (stats[b._id]?.spent || 0) - (stats[a._id]?.spent || 0))
  const empty = merchants.items.length === 0
  const percent = total ? Math.round((recognized / total) * 100) : 0

  async function addTo (merchantId, group) {
    const merchant = merchants.items.find(m => m._id === merchantId)
    if (!merchant) return
    const pattern = suggestPattern(group.key)
    try {
      await merchants.update(merchantId, { patterns: [...new Set([...merchant.patterns, pattern])] })
      showToast(`Added “${pattern}” to ${merchant.name} · ${group.count} ${group.count === 1 ? 'transaction' : 'transactions'}`)
    } catch (error) {
      showError(error)
    }
  }

  const restoreIgnored = () => Promise.all(merchantIgnores.items.map(i => merchantIgnores.remove(i._id))).catch(showError)

  return (
    <div className='flex flex-col gap-5'>
      {empty && (
        <section className={`relative flex flex-col items-start gap-4 overflow-hidden p-6 ${panelClass}`}>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(420px_200px_at_0%_0%,rgba(52,210,123,.12),transparent_70%)]' />
          <span className='relative grid h-12 w-12 place-items-center rounded-[14px] bg-accent-soft text-accent'><Icon name='storefront' size={26} /></span>
          <div className='relative flex max-w-140 flex-col gap-1.5'>
            <span className='text-lg font-semibold'>No merchants yet</span>
            <span className='text-muted'>Teach Money Tracker who you pay. Each merchant puts its logo on your transactions and can set the category of new ones automatically.</span>
          </div>
          <div className='relative flex flex-wrap gap-2'>
            <button type='button' onClick={() => (needs[0] ? openFrom(needs[0]) : openNew())} className='flex h-10 items-center gap-1.5 rounded-[11px] bg-accent px-4 font-semibold text-accent-ink'>
              <Icon name='add_business' />{needs[0] ? `Start with ${mostCommon(needs[0].raws)}` : 'Create a merchant'}
            </button>
            <button type='button' onClick={openNew} className='h-10 rounded-[11px] border border-line-3 px-4 text-ink'>New merchant</button>
          </div>
        </section>
      )}

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]'>
        <section className={`flex min-w-0 flex-col gap-3 p-5 ${panelClass}`}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-baseline gap-2'>
              <h2 className='m-0 text-[15px] font-semibold'>Merchants</h2>
              <span className='font-mono text-xs text-faint'>{merchants.items.length} {merchants.items.length === 1 ? 'merchant' : 'merchants'}</span>
            </div>
            <button type='button' onClick={openNew} className='flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2c5a3d] bg-accent-soft pl-2.5 pr-3.5 font-semibold text-accent'>
              <Icon name='add' />New merchant
            </button>
          </div>
          <div className='flex h-10 items-center gap-2 rounded-[11px] border border-line-2 bg-rail px-3'>
            <Icon name='search' size={18} className='text-faint' />
            <input aria-label='Search merchants' value={filter} onChange={e => setFilter(e.target.value)} placeholder='Search by name or pattern' className='min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-hidden' />
          </div>
          {!empty && list.length === 0 && (
            <div className='flex flex-col items-center gap-2 py-8 text-center text-muted'>
              <Icon name='search_off' size={28} className='text-[#2a332e]' />
              <span>No merchants match “{filter}”</span>
              <button type='button' onClick={() => setEditing({ ...blank, name: filter.trim() })} className='text-[13px] text-accent'>Create it as a new merchant</button>
            </div>
          )}
          {empty && <div className='py-8 text-center text-muted'>Merchants you create will show up here.</div>}
          <div className='flex flex-col'>
            {list.map(m => {
              const stat = stats[m._id] || { count: 0, spent: 0 }
              return (
                <button key={m._id} type='button' onClick={() => setEditing({ ...blank, ...m })} className='-mx-2 flex items-center gap-3 rounded-xl p-2.5 text-left text-ink hover:bg-[#141a16]'>
                  <MerchantTile merchant={m} />
                  <span className='flex min-w-0 flex-1 flex-col gap-1.5'>
                    <span className='flex min-w-0 items-center gap-1.5'>
                      <span className='truncate font-medium'>{m.name}</span>
                      {m.pinned && <Icon name='push_pin' size={15} className='flex-none text-accent' />}
                      {m.category && <span className='truncate text-xs text-faint'>{m.category}</span>}
                    </span>
                    <span className='flex flex-wrap gap-1'>
                      {m.patterns.slice(0, 3).map(p => (
                        <span key={p} className='rounded-md border border-line-3 bg-raised px-1.5 py-px font-mono text-[11px] text-ink-2'>{p}</span>
                      ))}
                      {m.patterns.length > 3 && <span className='px-1 font-mono text-[11px] text-faint'>+{m.patterns.length - 3}</span>}
                    </span>
                  </span>
                  <span className='flex flex-none flex-col items-end gap-0.5'>
                    <span className='tabular-nums'>{format.money(stat.spent)}</span>
                    <span className='text-xs text-faint'>{stat.count} {stat.count === 1 ? 'transaction' : 'transactions'}</span>
                  </span>
                  <Icon name='chevron_right' size={18} className='text-faint' />
                </button>
              )
            })}
          </div>
        </section>

        {/* On phones this comes first: it is where most merchants get created. */}
        <section className={`order-first flex min-w-0 flex-col gap-3 border-[#23402e]! p-5 dash:order-none ${panelClass}`}>
          <div className='flex items-center gap-2'>
            <span className='grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent'><Icon name='auto_awesome' size={17} /></span>
            <h2 className='m-0 text-[15px] font-semibold'>Needs a merchant</h2>
            <span className='rounded-md bg-raised px-1.5 py-px font-mono text-[11px] text-faint'>{needs.length}</span>
          </div>
          <span className='text-xs text-faint'>Names from your transactions that don’t match any merchant yet. Most frequent first.</span>
          <div className='flex flex-col gap-1.5'>
            <div className='h-1.5 overflow-hidden rounded-full bg-line'><div className='h-full rounded-full bg-accent' style={{ width: `${percent}%` }} /></div>
            <div className='flex justify-between text-xs text-faint'>
              <span>{recognized} of {total} transactions recognized</span>
              <span className='tabular-nums'>{percent}%</span>
            </div>
          </div>
          {needs.length === 0 && (
            <div className='flex flex-col items-center gap-1 py-6 text-center'>
              <Icon name='check_circle' size={28} className='text-accent' />
              <span className='font-medium'>Every expense has a merchant</span>
              <span className='text-xs text-faint'>New names will show up here.</span>
            </div>
          )}
          <div className='flex flex-col'>
            {needs.slice(0, shown).map(group => {
              const similar = Object.keys(group.raws).length - 1
              return (
                <div key={group.key} className='flex flex-col gap-2.5 border-t border-line-4 py-3'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <span className='grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-line-4 text-[#aab3ac]'><Icon name={CATEGORY_ICON[mostCommon(group.cats)] || 'storefront'} size={17} /></span>
                    <span className='flex min-w-0 flex-col gap-0.5'>
                      <span className='truncate font-mono text-[13px] uppercase'>{mostCommon(group.raws)}</span>
                      <span className='text-xs text-faint'>
                        {group.count} {group.count === 1 ? 'transaction' : 'transactions'} · {format.money(group.spent)}{similar ? ` · +${similar} similar` : ''}
                      </span>
                    </span>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    <button type='button' onClick={() => openFrom(group)} className='flex h-8 items-center gap-1 rounded-[9px] border border-[#2c5a3d] bg-accent-soft px-2.5 text-[13px] font-medium text-accent'>
                      <Icon name='add_business' size={16} />Create merchant
                    </button>
                    {!empty && (
                      <select
                        aria-label={`Add ${mostCommon(group.raws)} to a merchant`}
                        value=''
                        onChange={e => e.target.value && addTo(e.target.value, group)}
                        className='h-8 max-w-40 rounded-[9px] border border-line-3 bg-raised px-2 text-[13px] text-ink'
                      >
                        <option value=''>Add to…</option>
                        {[...merchants.items].sort((a, b) => a.name.localeCompare(b.name)).map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    )}
                    <button type='button' title='Hide from this list' onClick={() => merchantIgnores.create({ key: group.key }).catch(showError)} className='flex h-8 items-center gap-1 rounded-[9px] px-2 text-[13px] text-muted hover:text-ink'>
                      <Icon name='visibility_off' size={16} />Ignore
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            {needs.length > shown && (
              <button type='button' onClick={() => setShown(shown + PAGE)} className='h-9 rounded-[10px] border border-dashed border-line-3 px-3 text-[13px] text-muted hover:text-ink'>
                Show {Math.min(PAGE, needs.length - shown)} more
              </button>
            )}
            {merchantIgnores.items.length > 0 && (
              <button type='button' onClick={restoreIgnored} className='text-xs text-faint hover:text-ink'>
                {merchantIgnores.items.length} hidden · <span className='text-accent'>Show again</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {editing && <MerchantEditor key={editing._id || editing.name || 'new'} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
