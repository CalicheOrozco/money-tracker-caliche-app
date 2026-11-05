import { useState } from 'react'
import { Icon, MoneyInput, Spinner, Stat, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useCollection } from '../data/useCollection.js'
import { GOAL_ICONS } from '../lib/constants.js'
import { parseDay, toISODate } from '../lib/dates.js'
import { decimalOnly, toNumber } from '../lib/numbers.js'

const RING = 2 * Math.PI * 26

function monthsUntil (due) {
  if (!due) return 12
  const date = parseDay(due)
  const now = new Date()
  return Math.max(1, (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth())
}

const emptyGoal = () => {
  const due = new Date()
  due.setFullYear(due.getFullYear() + 1)
  return { name: '', target: '', due: toISODate(due), icon: 'savings' }
}

export default function Goals () {
  const { format, showToast, showError } = useAppData()
  const goals = useCollection('goals', { onError: showError })
  const [form, setForm] = useState(null)
  const [adding, setAdding] = useState('')

  if (goals.loading) return <Spinner />

  const saved = goals.items.reduce((a, g) => a + g.saved, 0)
  const target = goals.items.reduce((a, g) => a + g.target, 0)
  const needed = goals.items.reduce((a, g) => a + Math.max(0, g.target - g.saved) / monthsUntil(g.due), 0)

  async function addTo (goal, amount) {
    if (adding) return
    setAdding(goal._id)
    try {
      await goals.update(goal._id, { saved: goal.saved + amount })
      showToast(`${format.plain(amount)} added to ${goal.name}`)
    } catch (error) {
      showError(error)
    } finally {
      setAdding('')
    }
  }

  async function create () {
    if (!form.name.trim() || !(toNumber(form.target) > 0)) {
      showError(new Error('Add a name and a target amount.'))
      return
    }
    try {
      await goals.create({ name: form.name.trim(), target: toNumber(form.target), saved: 0, due: form.due, icon: form.icon })
      setForm(null)
      showToast('Goal created')
    } catch (error) {
      showError(error)
    }
  }

  const quick = 'h-8 rounded-[9px] border border-line-3 px-2.5 text-[13px] text-ink hover:border-accent'

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4'>
        <Stat label='Saved toward goals' value={format.money(saved)} note={`${target ? Math.round((saved / target) * 100) : 0}% of ${format.money(target)}`} />
        <Stat label='To stay on schedule' value={`${format.money(needed)}/mo`} note='across all goals' valueClass='text-accent' />
      </div>

      <div className='grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4'>
        {goals.items.map(goal => {
          const progress = Math.min(1, goal.saved / goal.target)
          const remaining = Math.max(0, goal.target - goal.saved)
          const months = monthsUntil(goal.due)
          return (
            <section key={goal._id} className={`flex flex-col gap-4 p-5 ${panelClass}`}>
              <div className='flex items-center gap-3.5'>
                <div className='relative h-16 w-16 flex-none'>
                  <svg viewBox='0 0 64 64' className='h-16 w-16 -rotate-90' aria-hidden='true'>
                    <circle cx='32' cy='32' r='26' fill='none' stroke='#1a211d' strokeWidth='6' />
                    <circle cx='32' cy='32' r='26' fill='none' stroke='#34d27b' strokeWidth='6' strokeLinecap='round' strokeDasharray={`${(RING * progress).toFixed(1)} ${RING.toFixed(1)}`} />
                  </svg>
                  <span className='absolute inset-0 grid place-items-center text-accent'><Icon name={goal.icon} size={22} /></span>
                </div>
                <div className='flex min-w-0 flex-1 flex-col gap-0.75'>
                  <span className='truncate text-base font-semibold'>{goal.name}</span>
                  <span className='text-xs text-faint'>
                    {goal.due && `By ${parseDay(goal.due).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · `}
                    {months} {months === 1 ? 'month' : 'months'} left
                  </span>
                </div>
                <span className='font-mono text-[13px] text-accent'>{Math.round(progress * 100)}%</span>
              </div>
              <div className='flex items-baseline justify-between'>
                <span className='text-xl font-semibold tabular-nums'>{format.money(goal.saved)}</span>
                <span className='text-xs text-faint'>of {format.money(goal.target)}</span>
              </div>
              {remaining > 0 ? (
                <div className='rounded-[11px] border border-line bg-rail px-3 py-2.5 text-[13px] text-ink-2'>
                  Save <span className='font-semibold text-accent'>{format.money(remaining / months)}</span> a month to make it · {format.money(remaining)} to go
                </div>
              ) : (
                <div className='rounded-[11px] bg-accent-soft px-3 py-2.5 text-[13px] font-medium text-accent'>Goal reached. Nice work.</div>
              )}
              <div className='flex flex-wrap gap-1.5'>
                {[500, 1000, 5000].map(amount => (
                  <button key={amount} type='button' disabled={adding === goal._id} onClick={() => addTo(goal, amount)} className={`${quick} disabled:opacity-50`}>
                    +{amount.toLocaleString('en-US')}
                  </button>
                ))}
                <button
                  type='button'
                  title='Delete goal'
                  aria-label={`Delete ${goal.name}`}
                  onClick={() => goals.remove(goal._id).catch(showError)}
                  className='ml-auto grid h-8 w-8 place-items-center rounded-[9px] text-[#4a524c] hover:text-danger'
                >
                  <Icon name='delete' size={18} />
                </button>
              </div>
            </section>
          )
        })}

        {form ? (
          <section className={`flex flex-col gap-3 border-[#2c5a3d]! p-5 ${panelClass}`}>
            <span className='font-semibold'>New goal</span>
            <input
              aria-label='Goal name'
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder='What are you saving for?'
              className={`${inputClass} h-10.5 rounded-[10px] bg-rail`}
            />
            <div className='grid grid-cols-2 gap-2'>
              <MoneyInput
                symbol={format.symbol}
                aria-label='Target'
                value={form.target}
                onChange={e => setForm({ ...form, target: decimalOnly(e.target.value) })}
                placeholder='Target'
                className='h-10.5'
              />
              <input
                type='date'
                aria-label='Due date'
                value={form.due}
                onChange={e => setForm({ ...form, due: e.target.value })}
                className={`${inputClass} h-10.5 rounded-[10px] bg-rail px-2.5 text-[13px]`}
              />
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {GOAL_ICONS.map(icon => (
                <button
                  key={icon}
                  type='button'
                  aria-label={icon.replace(/_/g, ' ')}
                  aria-pressed={form.icon === icon}
                  onClick={() => setForm({ ...form, icon })}
                  className={`grid h-9.5 w-9.5 place-items-center rounded-[10px] border ${
                    form.icon === icon ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-rail text-muted'
                  }`}
                >
                  <Icon name={icon} size={19} />
                </button>
              ))}
            </div>
            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => setForm(null)} className='h-9.5 rounded-[10px] border border-line-3 px-3.5 text-ink'>Cancel</button>
              <button type='button' onClick={create} className='h-9.5 rounded-[10px] bg-accent px-3.5 font-semibold text-accent-ink'>Create goal</button>
            </div>
          </section>
        ) : (
          <button
            type='button'
            onClick={() => setForm(emptyGoal())}
            className='flex min-h-60 flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-[#2a332e] text-muted hover:border-accent hover:text-accent'
          >
            <Icon name='add_circle' size={30} />New goal
          </button>
        )}
      </div>
    </div>
  )
}
