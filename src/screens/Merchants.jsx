import { useMemo, useState } from 'react'
import { MerchantLogo } from '../components/TxIcon.jsx'
import { Field, Icon, Spinner, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useBrandSearch } from '../data/useBrandSearch.js'
import { logoSearchEnabled } from '../lib/brandfetch.js'
import { EXPENSE, INCOME } from '../lib/constants.js'
import { parseDay } from '../lib/dates.js'
import { matchesPatterns, merchantKey, titleCase } from '../lib/merchants.js'

const SUGGESTIONS = 12

function MerchantForm ({ initial, onClose }) {
  const { transactions, merchants, merchantOf, format, showToast, showError } = useAppData()
  const [name, setName] = useState(initial.name)
  const [query, setQuery] = useState(initial.searchFor || '')
  const [domain, setDomain] = useState(initial.domain)
  const [patterns, setPatterns] = useState(initial.patterns)
  const [patternInput, setPatternInput] = useState('')
  const [category, setCategory] = useState(initial.category)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const search = useBrandSearch(query)

  const matches = useMemo(
    () => transactions.filter(t => t.merchant !== 'none' && matchesPatterns(patterns, t)),
    [transactions, patterns]
  )
  const conflicts = {}
  for (const t of matches) {
    const current = merchantOf(t)
    if (current && current._id !== initial._id) conflicts[current.name] = (conflicts[current.name] || 0) + 1
  }

  function addPattern (raw) {
    const value = raw.trim().toLowerCase()
    if (value && !patterns.includes(value)) setPatterns([...patterns, value])
    setPatternInput('')
  }

  async function save () {
    if (!name.trim()) return showError(new Error('Give the merchant a name.'))
    const pending = patternInput.trim() ? [...patterns, patternInput.trim().toLowerCase()] : patterns
    const body = { name: name.trim(), domain, patterns: [...new Set(pending)], category }

    setBusy(true)
    try {
      if (initial._id) await merchants.update(initial._id, body)
      else await merchants.create(body)
      showToast(initial._id ? `${body.name} updated` : `${body.name} added`)
      onClose()
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function remove () {
    try {
      await merchants.remove(initial._id)
      showToast(`${initial.name} removed`)
      onClose()
    } catch (error) {
      showError(error)
    }
  }

  return (
    <section className={`grid grid-cols-[minmax(0,1fr)] gap-6 border-[#2c5a3d]! p-5 wide:grid-cols-2 ${panelClass}`}>
      <div className='flex min-w-0 flex-col gap-3.5'>
        <h2 className='m-0 text-[15px] font-semibold'>{initial._id ? 'Edit merchant' : 'New merchant'}</h2>
        <Field label='Name'>
          <input
            value={name}
            onChange={e => {
              setName(e.target.value)
              setQuery(e.target.value)
            }}
            placeholder='e.g. Walmart'
            className={`${inputClass} bg-rail`}
          />
        </Field>

        <div className='flex flex-col gap-2'>
          <span className='text-xs font-medium text-muted'>Logo</span>
          {!logoSearchEnabled && (
            <span className='text-xs text-faint'>Logo search is not set up yet. You can still type the website below.</span>
          )}
          {search.loading && <span className='text-xs text-faint'>Searching logos…</span>}
          {search.error && <span role='alert' className='text-xs text-danger'>{search.error}</span>}
          {!search.loading && !search.error && query.trim().length >= 2 && logoSearchEnabled && search.results.length === 0 && (
            <span className='text-xs text-faint'>No brands found. Try a shorter name, type the website, or keep it without a logo.</span>
          )}
          <div className='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2'>
            {search.results.map(result => (
              <button
                key={result.brandId || result.domain}
                type='button'
                aria-pressed={domain === result.domain}
                onClick={() => setDomain(result.domain)}
                className={`flex min-w-0 items-center gap-2.5 rounded-[11px] border p-2 text-left ${
                  domain === result.domain ? 'border-accent bg-accent-soft' : 'border-line-2 bg-rail'
                }`}
              >
                <MerchantLogo domain={result.domain} size={32} />
                <span className='flex min-w-0 flex-col'>
                  <span className='truncate text-[13px] font-medium'>{result.name || result.domain}</span>
                  <span className='truncate font-mono text-[11px] text-faint'>{result.domain}</span>
                </span>
              </button>
            ))}
            <button
              type='button'
              aria-pressed={!domain}
              onClick={() => setDomain('')}
              className={`flex items-center gap-2.5 rounded-[11px] border p-2 text-left text-[13px] ${
                !domain ? 'border-accent bg-accent-soft' : 'border-line-2 bg-rail text-muted'
              }`}
            >
              <span className='grid h-8 w-8 place-items-center rounded-[9px] bg-line-4'><Icon name='hide_image' size={17} /></span>
              No logo
            </button>
          </div>
          <div className='flex items-center gap-2.5'>
            <MerchantLogo domain={domain} size={40} />
            <input
              aria-label='Website'
              value={domain}
              onChange={e => setDomain(e.target.value.trim().toLowerCase())}
              placeholder='website, e.g. walmart.com.mx'
              className={`${inputClass} min-w-0 flex-1 bg-rail font-mono text-[13px]`}
            />
          </div>
        </div>

        <Field label='Default category' hint='optional'>
          <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputClass} bg-rail px-2.5`}>
            <option value=''>Keep each transaction’s category</option>
            <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
            <optgroup label='Bills'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
          </select>
        </Field>
      </div>

      <div className='flex min-w-0 flex-col gap-3.5'>
        <div className='flex flex-col gap-2'>
          <span className='text-xs font-medium text-muted'>Match patterns</span>
          <span className='text-xs text-faint'>
            If any of these appear in a transaction’s name or description, it belongs to this merchant.
          </span>
          <div className='flex flex-wrap gap-1.5'>
            {patterns.map(pattern => (
              <span key={pattern} className='flex items-center gap-1 rounded-[7px] border border-line-3 bg-raised py-1 pl-2 pr-1 font-mono text-[13px]'>
                {pattern}
                <button type='button' aria-label={`Remove pattern ${pattern}`} onClick={() => setPatterns(patterns.filter(p => p !== pattern))} className='grid h-5 w-5 place-items-center rounded text-faint hover:text-danger'>
                  <Icon name='close' size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className='flex gap-2'>
            <input
              aria-label='New pattern'
              value={patternInput}
              onChange={e => setPatternInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addPattern(patternInput)
                }
              }}
              placeholder='wal-mart'
              className={`${inputClass} h-10 min-w-0 flex-1 rounded-[10px] bg-rail font-mono`}
            />
            <button type='button' onClick={() => addPattern(patternInput)} className='h-10 rounded-[10px] bg-accent-soft px-3.5 font-semibold text-accent'>Add</button>
          </div>
        </div>

        <div className='flex flex-col gap-2 rounded-[14px] border border-line bg-rail p-3.5'>
          <span className='text-[13px] font-medium'>
            {patterns.length ? `Matches ${matches.length} ${matches.length === 1 ? 'transaction' : 'transactions'}` : 'Add a pattern to see what it matches'}
          </span>
          {matches.slice(0, 4).map(t => (
            <div key={t.id} className='flex items-center gap-2 text-xs'>
              <span className='min-w-0 flex-1 truncate text-ink-2'>{t.name}</span>
              <span className='text-faint'>{parseDay(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className='tabular-nums'>{format.signed(t.amount)}</span>
            </div>
          ))}
          {Object.entries(conflicts).map(([other, count]) => (
            <div key={other} role='alert' className='flex items-start gap-2 rounded-[10px] border border-[#3a3420] bg-[#14130d] p-2.5 text-xs text-[#e0c45a]'>
              <Icon name='warning' size={16} />
              <span>{count} of these currently belong to {other}. When several patterns match, the longest one wins.</span>
            </div>
          ))}
        </div>

        <div className='mt-auto flex flex-wrap items-center justify-end gap-2'>
          {initial._id && (
            confirmDelete ? (
              <span className='mr-auto flex items-center gap-1.5 text-[13px] text-danger-soft'>
                Remove this merchant?
                <button type='button' onClick={remove} className='h-8.5 rounded-[9px] bg-danger px-3 font-semibold text-[#1a0808]'>Remove</button>
                <button type='button' onClick={() => setConfirmDelete(false)} className='h-8.5 rounded-[9px] border border-line-3 px-3 text-ink'>Keep</button>
              </span>
            ) : (
              <button type='button' onClick={() => setConfirmDelete(true)} className='mr-auto h-10.5 rounded-[11px] border border-danger/30 px-3.5 text-danger'>Delete</button>
            )
          )}
          <button type='button' onClick={onClose} className='h-10.5 rounded-[11px] border border-line-3 px-4 text-ink'>Cancel</button>
          <button type='button' disabled={busy} onClick={save} className='h-10.5 rounded-[11px] bg-accent px-4.5 font-semibold text-accent-ink disabled:opacity-60'>
            Save merchant
          </button>
        </div>
      </div>
    </section>
  )
}

export default function Merchants () {
  const { transactions, merchants, merchantOf, format, loading } = useAppData()
  const [form, setForm] = useState(null)
  const [filter, setFilter] = useState('')
  const [shown, setShown] = useState(SUGGESTIONS)

  const { stats, unmatched } = useMemo(() => {
    const stats = {}
    const groups = {}
    for (const t of transactions) {
      const merchant = merchantOf(t)
      if (merchant) {
        const entry = (stats[merchant._id] ||= { count: 0, spent: 0 })
        entry.count++
        if (t.amount < 0) entry.spent -= t.amount
      } else if (t.merchant !== 'none') {
        const key = merchantKey(t.name)
        if (!key) continue
        const group = (groups[key] ||= { key, example: t.name, count: 0, spent: 0 })
        group.count++
        if (t.amount < 0) group.spent -= t.amount
      }
    }
    return { stats, unmatched: Object.values(groups).sort((a, b) => b.count - a.count || b.spent - a.spent) }
  }, [transactions, merchantOf])

  if (loading || merchants.loading) return <Spinner />

  const query = filter.trim().toLowerCase()
  const list = merchants.items
    .filter(m => !query || m.name.toLowerCase().includes(query) || m.patterns.some(p => p.includes(query)))
    .sort((a, b) => (stats[b._id]?.count || 0) - (stats[a._id]?.count || 0))

  const openNew = (preset = {}) => {
    setForm({ _id: '', name: '', domain: '', patterns: [], category: '', searchFor: '', ...preset })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-baseline gap-2.5'>
          <h2 className='m-0 text-[17px] font-semibold'>Your merchants</h2>
          <span className='font-mono text-xs text-faint'>{merchants.items.length}</span>
        </div>
        <div className='flex flex-wrap gap-2'>
          <div className='flex h-9.5 min-w-45 items-center gap-2 rounded-[11px] border border-line-2 bg-rail px-3'>
            <Icon name='search' size={18} className='text-faint' />
            <input aria-label='Search merchants' value={filter} onChange={e => setFilter(e.target.value)} placeholder='Search' className='min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-hidden' />
          </div>
          {!form && (
            <button type='button' onClick={() => openNew()} className='flex h-9.5 items-center gap-1.5 rounded-[11px] border border-[#2c5a3d] bg-accent-soft pl-2.5 pr-3.5 font-semibold text-accent'>
              <Icon name='add_business' />Add merchant
            </button>
          )}
        </div>
      </div>

      {form && <MerchantForm key={form._id || form.searchFor || 'new'} initial={form} onClose={() => setForm(null)} />}

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
        <section className={`flex min-w-0 flex-col p-2 ${panelClass}`}>
          {list.length === 0 && (
            <div className='flex flex-col items-center gap-2 px-5 py-12 text-center text-muted'>
              <Icon name='storefront' size={34} className='text-[#2a332e]' />
              {merchants.items.length
                ? 'No merchants match that search.'
                : 'No merchants yet. Pick one from “Needs a merchant”, or add one by hand.'}
            </div>
          )}
          {list.map(m => {
            const stat = stats[m._id] || { count: 0, spent: 0 }
            return (
              <button
                key={m._id}
                type='button'
                onClick={() => setForm({ ...m, searchFor: '' })}
                className='flex items-center gap-3 rounded-xl p-3 text-left hover:bg-[#141a16]'
              >
                <MerchantLogo domain={m.domain} size={40} />
                <span className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <span className='flex items-baseline gap-2'>
                    <span className='truncate font-medium'>{m.name}</span>
                    {m.category && <span className='truncate text-xs text-faint'>{m.category}</span>}
                  </span>
                  <span className='flex flex-wrap gap-1'>
                    {m.patterns.slice(0, 3).map(p => (
                      <span key={p} className='rounded-md border border-line-3 bg-raised px-1.5 py-px font-mono text-[11px] text-ink-2'>{p}</span>
                    ))}
                    {m.patterns.length > 3 && <span className='px-1 font-mono text-[11px] text-faint'>+{m.patterns.length - 3}</span>}
                    {m.patterns.length === 0 && <span className='text-[11px] text-[#e0c45a]'>No patterns, assign it by hand</span>}
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
        </section>

        <section className={`flex min-w-0 flex-col gap-2 p-5 ${panelClass}`}>
          <div className='mb-1 flex flex-col gap-0.75'>
            <h2 className='m-0 text-[15px] font-semibold'>Needs a merchant</h2>
            <span className='text-xs text-faint'>Names from your transactions that no merchant recognizes yet.</span>
          </div>
          {unmatched.length === 0 && (
            <div className='py-6 text-center text-muted'>Every transaction has a merchant. Nice.</div>
          )}
          {unmatched.slice(0, shown).map(group => (
            <div key={group.key} className='flex items-center gap-3 border-t border-line-4 py-2.5'>
              <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate font-mono text-[13px] uppercase'>{group.example}</span>
                <span className='text-xs text-faint'>
                  {group.count} {group.count === 1 ? 'transaction' : 'transactions'} · {format.money(group.spent)}
                </span>
              </div>
              <button
                type='button'
                onClick={() => openNew({ name: titleCase(group.key), searchFor: group.key, patterns: [group.key] })}
                className='h-8 flex-none rounded-[9px] border border-[#2c5a3d] px-2.5 text-[13px] text-accent'
              >
                Create
              </button>
            </div>
          ))}
          {unmatched.length > shown && (
            <button type='button' onClick={() => setShown(shown + SUGGESTIONS)} className='mt-1 h-9 rounded-[10px] border border-dashed border-line-3 text-muted hover:text-ink'>
              Show {Math.min(SUGGESTIONS, unmatched.length - shown)} more
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
