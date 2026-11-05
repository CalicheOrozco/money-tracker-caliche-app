import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { api } from '../lib/api.js'
import { CATEGORY_ICON, EXPENSE, INCOME } from '../lib/constants.js'
import { normalizeTag } from '../lib/tags.js'

const fieldClass = 'h-9.5 rounded-[9px] border border-line-3 bg-rail px-2.5 text-sm text-ink outline-hidden focus:border-accent'

export default function Rules () {
  const { transactions, rules, format, loading, reload, setRange, showToast, showError } = useAppData()
  const navigate = useNavigate()
  const [form, setForm] = useState({ match: '', category: '', tag: '' })
  const [busy, setBusy] = useState(false)

  if (loading || rules.loading) return <Spinner />

  const matches = rule => transactions.filter(t => `${t.name} ${t.desc}`.toLowerCase().includes(rule.match))
  const toFix = rule => matches(rule).filter(t => t.category !== rule.category || (rule.tag && !t.tags.includes(rule.tag)))
  const totalToFix = rules.items.reduce((a, r) => a + toFix(r).length, 0)
  const preview = form.match.trim()
    ? `${transactions.filter(t => `${t.name} ${t.desc}`.toLowerCase().includes(form.match.trim().toLowerCase())).length} existing transactions match`
    : 'Type a word that appears in the name'

  async function apply (list) {
    setBusy(true)
    try {
      let changed = 0
      for (const rule of list) {
        changed += (await api(`/me/rules/${rule._id}/apply`, { method: 'POST' })).modifiedCount
      }
      await reload()
      showToast(`${changed} ${changed === 1 ? 'transaction' : 'transactions'} updated`)
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function create () {
    if (!form.match.trim() || !form.category) return
    try {
      await rules.create({ match: form.match.trim(), category: form.category, tag: form.tag })
      setForm({ match: '', category: '', tag: '' })
      showToast('Rule created')
    } catch (error) {
      showError(error)
    }
  }

  const tags = {}
  for (const t of transactions) {
    for (const tag of t.tags) {
      tags[tag] ||= { count: 0, spent: 0 }
      tags[tag].count++
      if (t.amount < 0) tags[tag].spent -= t.amount
    }
  }
  const tagRows = Object.entries(tags).sort((a, b) => b[1].spent - a[1].spent)
  const canCreate = form.match.trim() && form.category

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 dash:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]'>
      <div className='flex min-w-0 flex-col gap-5'>
        <section className={`flex flex-col gap-3 border-[#2c5a3d]! p-5 ${panelClass}`}>
          <div className='flex items-center gap-2'>
            <Icon name='add_task' className='text-accent' />
            <h2 className='m-0 text-[15px] font-semibold'>New rule</h2>
          </div>
          <div className='flex flex-wrap items-center gap-2 text-sm text-muted'>
            <span>If the name contains</span>
            <input aria-label='Text to match' value={form.match} onChange={e => setForm({ ...form, match: e.target.value })} placeholder='oxxo' className={`${fieldClass} w-35 font-mono`} />
            <span>set category to</span>
            <select aria-label='Category' value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={`${fieldClass} max-w-55 px-2`}>
              <option value=''>Category…</option>
              <optgroup label='Incomes'>{INCOME.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
              <optgroup label='Bills'>{EXPENSE.map(([c]) => <option key={c} value={c}>{c}</option>)}</optgroup>
            </select>
            <span>and tag</span>
            <div className={`${fieldClass} flex w-32.5 items-center`}>
              <span className='text-faint'>#</span>
              <input aria-label='Tag' value={form.tag} onChange={e => setForm({ ...form, tag: normalizeTag(e.target.value) })} placeholder='optional' className='min-w-0 flex-1 border-0 bg-transparent text-ink outline-hidden' />
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <span className='text-xs text-faint'>{preview}</span>
            <button
              type='button'
              disabled={!canCreate}
              onClick={create}
              className={`h-9.5 rounded-[10px] px-4 font-semibold ${canCreate ? 'bg-accent text-accent-ink' : 'bg-raised text-faint'}`}
            >
              Create rule
            </button>
          </div>
        </section>

        <section className={`flex flex-col gap-2 p-5 ${panelClass}`}>
          <div className='mb-1 flex flex-wrap items-center justify-between gap-2.5'>
            <div className='flex flex-col gap-0.75'>
              <h2 className='m-0 text-[15px] font-semibold'>Rules</h2>
              <span className='text-xs text-faint'>Applied automatically to new and imported transactions</span>
            </div>
            {totalToFix > 0 && (
              <button type='button' disabled={busy} onClick={() => apply(rules.items.filter(r => toFix(r).length))} className='h-8.5 rounded-[9px] bg-accent-soft px-3 font-medium text-accent disabled:opacity-60'>
                Apply all to {totalToFix} past
              </button>
            )}
          </div>
          {rules.items.length === 0 && <div className='py-5 text-center text-muted'>No rules yet.</div>}
          {rules.items.map(rule => {
            const pending = toFix(rule).length
            return (
              <div key={rule._id} className='flex flex-wrap items-center gap-2.5 border-t border-line-4 py-2.5'>
                <span className='whitespace-nowrap rounded-[7px] border border-line-3 bg-raised px-2 py-1 font-mono text-[13px]'>“{rule.match}”</span>
                <Icon name='arrow_forward' size={18} className='text-faint' />
                <span className='flex items-center gap-1.5'><Icon name={CATEGORY_ICON[rule.category] || 'category'} size={17} className='text-muted' />{rule.category}</span>
                {rule.tag && <span className='rounded-full bg-accent-soft px-2 py-0.75 text-xs text-accent'>#{rule.tag}</span>}
                <span className='ml-auto text-xs text-faint'>{matches(rule).length} matches</span>
                {pending > 0 && (
                  <button type='button' disabled={busy} onClick={() => apply([rule])} className='h-7.5 rounded-lg border border-[#2c5a3d] px-2.5 text-xs text-accent disabled:opacity-60'>
                    Apply to {pending}
                  </button>
                )}
                <button type='button' aria-label={`Delete rule ${rule.match}`} onClick={() => rules.remove(rule._id).catch(showError)} className='grid h-7 w-7 place-items-center rounded-lg text-[#4a524c] hover:text-danger'>
                  <Icon name='delete' size={17} />
                </button>
              </div>
            )
          })}
        </section>
      </div>

      <section className={`flex min-w-0 flex-col gap-2 p-5 ${panelClass}`}>
        <div className='mb-1 flex flex-col gap-0.75'>
          <h2 className='m-0 text-[15px] font-semibold'>Tags</h2>
          <span className='text-xs text-faint'>Add tags when you create a transaction. Click one to see its transactions.</span>
        </div>
        {tagRows.length === 0 && <div className='py-5 text-center text-muted'>No tags yet.</div>}
        {tagRows.map(([tag, info]) => (
          <button
            key={tag}
            type='button'
            onClick={() => {
              setRange('All')
              navigate('/', { state: { search: `#${tag}` } })
            }}
            className='flex items-center gap-2.5 rounded-[11px] px-2 py-2.5 text-left text-ink hover:bg-[#141a16]'
          >
            <span className='rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent'>#{tag}</span>
            <span className='flex-1 text-xs text-faint'>{info.count} {info.count === 1 ? 'transaction' : 'transactions'}</span>
            <span className='tabular-nums'>{format.money(info.spent)}</span>
            <Icon name='chevron_right' size={17} className='text-faint' />
          </button>
        ))}
      </section>
    </div>
  )
}
