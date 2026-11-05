import { useState } from 'react'
import { Icon, MoneyInput, Segmented, Spinner, Stat, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { useCollection } from '../data/useCollection.js'
import { parseDay, toISODate } from '../lib/dates.js'
import { decimalOnly, toNumber } from '../lib/numbers.js'

export default function Debts () {
  const { format, saveTransaction, showToast, showError } = useAppData()
  const debts = useCollection('debts', { onError: showError })
  const [form, setForm] = useState({ person: '', dir: 'owed', amount: '', note: '' })

  if (debts.loading) return <Spinner />

  const open = debts.items.filter(d => !d.settled)
  const owedToMe = open.filter(d => d.dir === 'owed').reduce((a, d) => a + d.amount, 0)
  const iOwe = open.filter(d => d.dir === 'owe').reduce((a, d) => a + d.amount, 0)
  const date = value => (value ? parseDay(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

  async function add () {
    if (!form.person.trim() || !(toNumber(form.amount) > 0)) {
      showError(new Error('Add a name and an amount.'))
      return
    }
    try {
      await debts.create({ person: form.person.trim(), dir: form.dir, amount: toNumber(form.amount), note: form.note.trim(), date: toISODate(new Date()) })
      setForm({ person: '', dir: form.dir, amount: '', note: '' })
      showToast('Added')
    } catch (error) {
      showError(error)
    }
  }

  // Settling records the money as a real transaction so the balance stays right.
  async function settle (debt) {
    try {
      await saveTransaction({
        name: debt.person,
        desc: debt.note,
        amount: debt.dir === 'owed' ? debt.amount : -debt.amount,
        date: toISODate(new Date()),
        category: debt.dir === 'owed' ? 'Loaned Money Received' : 'Debts to Friends',
        card: '',
        icon: '',
        tags: []
      })
      await debts.update(debt._id, { settled: true })
      showToast(`Settled with ${debt.person} · added to transactions`)
    } catch (error) {
      showError(error)
    }
  }

  async function remind (debt) {
    const text = `Hi ${debt.person}, a friendly reminder about ${format.plain(debt.amount)}${debt.note ? ` for ${debt.note}` : ''}.`
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        showToast('Reminder copied, paste it in a message')
      }
    } catch (error) {
      if (error.name !== 'AbortError') showError(new Error('Could not share the reminder.'))
    }
  }

  const row = debt => {
    const owed = debt.dir === 'owed'
    return (
      <div key={debt._id} className='flex flex-wrap items-center gap-3 border-t border-line-4 py-2.5'>
        <span className={`grid h-[38px] w-[38px] flex-none place-items-center rounded-full font-semibold ${owed ? 'bg-accent-soft text-accent' : 'bg-[#2a1617] text-danger-soft'}`}>
          {debt.person.charAt(0).toUpperCase()}
        </span>
        <div className='flex min-w-[120px] flex-1 flex-col gap-0.5'>
          <span className='font-medium'>{debt.person}</span>
          <span className='text-xs text-faint'>{debt.note || 'No note'}{debt.date && ` · ${date(debt.date)}`}</span>
        </div>
        <span className={`font-semibold tabular-nums ${owed ? 'text-accent' : 'text-danger-soft'}`}>{format.money(debt.amount)}</span>
        <div className='flex gap-1.5'>
          {owed && (
            <button type='button' title='Send reminder' aria-label={`Remind ${debt.person}`} onClick={() => remind(debt)} className='grid h-8 w-8 place-items-center rounded-[9px] border border-line-3 text-ink-2'>
              <Icon name='notifications' size={17} />
            </button>
          )}
          <button
            type='button'
            onClick={() => settle(debt)}
            className={`h-8 whitespace-nowrap rounded-[9px] px-2.5 text-[13px] font-medium ${owed ? 'bg-accent-soft text-accent' : 'border border-line-3 text-ink'}`}
          >
            {owed ? 'Mark as paid' : 'I paid'}
          </button>
          <button type='button' title='Delete' aria-label={`Delete debt with ${debt.person}`} onClick={() => debts.remove(debt._id).catch(showError)} className='grid h-8 w-8 place-items-center rounded-[9px] text-[#4a524c] hover:text-danger'>
            <Icon name='delete' size={17} />
          </button>
        </div>
      </div>
    )
  }

  const settled = debts.items.filter(d => d.settled)

  return (
    <div className='flex flex-col gap-5'>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4'>
        <Stat label='Owed to you' value={format.money(owedToMe)} valueClass='text-accent' />
        <Stat label='You owe' value={format.money(iOwe)} valueClass='text-danger-soft' />
        <Stat label='Balance' value={format.signed(owedToMe - iOwe)} valueClass={owedToMe - iOwe >= 0 ? 'text-accent' : 'text-danger'} />
      </div>

      <section className={`flex flex-wrap items-center gap-2 px-5 py-4 ${panelClass}`}>
        <Segmented
          label='Direction'
          value={form.dir}
          onChange={dir => setForm({ ...form, dir })}
          options={[['owed', 'They owe me', 'bg-accent-soft text-accent'], ['owe', 'I owe them', 'bg-[#2a1617] text-danger-soft']]}
        />
        <input aria-label='Who' value={form.person} onChange={e => setForm({ ...form, person: e.target.value })} placeholder='Who?' className={`${inputClass} h-10 min-w-[110px] flex-1 rounded-[10px] bg-rail`} />
        <MoneyInput symbol={format.symbol} aria-label='Amount' value={form.amount} onChange={e => setForm({ ...form, amount: decimalOnly(e.target.value) })} placeholder='0' className='w-[130px]' />
        <input aria-label='What for' value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder='What for?' className={`${inputClass} h-10 min-w-[130px] flex-[1.4] rounded-[10px] bg-rail`} />
        <button type='button' onClick={add} className='h-10 rounded-[10px] bg-accent px-4 font-semibold text-accent-ink'>Add</button>
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-2'>
        <section className={`flex min-w-0 flex-col gap-1.5 p-5 ${panelClass}`}>
          <h2 className='m-0 mb-1.5 flex items-center gap-2 text-[15px] font-semibold'><span className='h-2 w-2 rounded-[3px] bg-accent' />They owe you</h2>
          {open.some(d => d.dir === 'owed') ? open.filter(d => d.dir === 'owed').map(row) : <div className='py-5 text-center text-muted'>Nobody owes you anything.</div>}
        </section>
        <section className={`flex min-w-0 flex-col gap-1.5 p-5 ${panelClass}`}>
          <h2 className='m-0 mb-1.5 flex items-center gap-2 text-[15px] font-semibold'><span className='h-2 w-2 rounded-[3px] bg-danger' />You owe</h2>
          {open.some(d => d.dir === 'owe') ? open.filter(d => d.dir === 'owe').map(row) : <div className='py-5 text-center text-muted'>You’re all square.</div>}
          {settled.length > 0 && (
            <>
              <div className='pb-1 pt-3.5 text-xs text-faint'>Settled</div>
              {settled.map(d => (
                <div key={d._id} className='flex items-center gap-2.5 py-1.5 opacity-60'>
                  <Icon name='check_circle' size={18} className='text-accent' />
                  <span className='min-w-0 flex-1 truncate'>{d.person}{d.note && ` · ${d.note}`}</span>
                  <span className='line-through tabular-nums'>{format.money(d.amount)}</span>
                  <button type='button' aria-label={`Delete settled debt with ${d.person}`} onClick={() => debts.remove(d._id).catch(showError)} className='grid h-7 w-7 place-items-center rounded-lg text-faint hover:text-danger'>
                    <Icon name='close' size={16} />
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
