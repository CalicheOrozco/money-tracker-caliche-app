import { useEffect, useState } from 'react'
import { useAppData } from '../data/AppData.jsx'
import { EXPENSE, INCOME } from '../lib/constants.js'
import { toISODate } from '../lib/dates.js'
import { parseTags } from '../lib/tags.js'
import BrandPicker from './BrandPicker.jsx'
import { CardLogo, Field, Icon, Switch, inputClass } from './ui.jsx'

const emptyForm = () => ({
  type: 'expense', amount: '', name: '', date: toISODate(new Date()), desc: '', category: '', tags: '', merchant: '',
  useCard: false, card: '', addingCard: false, newCard: '', newIcon: 'VisaIcon'
})

function formFrom (t) {
  return {
    ...emptyForm(),
    type: t.amount >= 0 ? 'income' : 'expense',
    amount: String(Math.abs(t.amount)),
    name: t.name,
    date: t.date,
    desc: t.desc,
    category: t.category,
    tags: (t.tags || []).join(', '),
    merchant: t.merchant || '',
    useCard: !!t.card,
    card: t.card
  }
}

export default function TransactionDrawer () {
  const { drawer, closeDrawer, cards, saveTransaction, removeTransaction, showToast, showError, format, ruleFor, guest, merchants, merchantFor } = useAppData()
  const { open, editing, preset } = drawer
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const isIncome = form.type === 'income'

  useEffect(() => {
    if (!open) return
    if (editing) setForm(formFrom(editing))
    else if (preset?.card) setForm({ ...emptyForm(), useCard: true, card: preset.card })
    else setForm(emptyForm())
    setErrors({})
  }, [open, editing, preset])

  useEffect(() => {
    if (!open) return
    const onKey = event => {
      if (event.key === 'Escape') closeDrawer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeDrawer])

  const patch = values => {
    setForm(current => ({ ...current, ...values }))
    setErrors({})
  }

  function resolveCard () {
    if (!form.useCard) return { card: '', icon: '' }
    if (form.addingCard && form.newCard.trim()) {
      return { card: form.newCard.trim(), icon: form.newIcon }
    }
    const existing = cards.find(c => c.name === form.card)
    return { card: form.card, icon: existing?.icon || editing?.icon || '' }
  }

  async function submit (event) {
    event?.preventDefault()
    const amount = parseFloat(String(form.amount).replace(/,/g, ''))
    const nextErrors = {}
    if (!(amount > 0)) nextErrors.amount = true
    if (!form.name.trim()) nextErrors.name = true
    if (!form.date) nextErrors.date = true
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    // An empty category falls back to a matching rule, then the merchant's default, then Other.
    const rule = ruleFor(`${form.name} ${form.desc}`)
    const pickedMerchant = form.merchant && form.merchant !== 'none'
      ? merchants.items.find(m => m._id === form.merchant)
      : form.merchant === 'none' ? null : merchantFor(`${form.name} ${form.desc}`)
    const tags = parseTags(form.tags)
    if (!form.category && rule?.tag && !tags.includes(rule.tag)) tags.push(rule.tag)

    setBusy(true)
    try {
      await saveTransaction(
        {
          name: form.name.trim(),
          desc: form.desc.trim(),
          amount: isIncome ? amount : -amount,
          date: form.date,
          category: form.category || rule?.category || pickedMerchant?.category || 'Other',
          tags,
          merchant: form.merchant,
          ...resolveCard()
        },
        editing?.id
      )
      closeDrawer()
      showToast(editing ? 'Transaction updated' : 'Transaction added')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete () {
    setBusy(true)
    try {
      await removeTransaction(editing)
      closeDrawer()
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-label={editing ? 'Edit transaction' : 'New transaction'}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-[41] flex w-full flex-col border-l border-line-2 bg-[#0d110f] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] nav:w-[460px] ${
          open ? 'translate-x-0' : 'translate-x-[105%]'
        }`}
      >
        <div className='flex items-center justify-between border-b border-line-4 px-5 py-[18px]'>
          <h2 className='m-0 text-[17px] font-semibold'>{editing ? 'Edit transaction' : 'New transaction'}</h2>
          <button type='button' aria-label='Close' onClick={closeDrawer} className='grid h-[34px] w-[34px] place-items-center rounded-[9px] text-muted hover:bg-raised hover:text-ink'>
            <Icon name='close' />
          </button>
        </div>

        <form id='transaction-form' onSubmit={submit} noValidate className='flex flex-1 flex-col gap-[18px] overflow-y-auto p-5'>
          <div className='grid grid-cols-2 rounded-xl border border-line-2 bg-field p-1'>
            <button
              type='button'
              aria-pressed={!isIncome}
              onClick={() => patch({ type: 'expense', category: '' })}
              className={`h-9 rounded-[9px] font-medium ${!isIncome ? 'bg-[#2a1617] text-danger-soft' : 'text-muted'}`}
            >
              Expense
            </button>
            <button
              type='button'
              aria-pressed={isIncome}
              onClick={() => patch({ type: 'income', category: '' })}
              className={`h-9 rounded-[9px] font-medium ${isIncome ? 'bg-accent-soft text-accent' : 'text-muted'}`}
            >
              Income
            </button>
          </div>

          <div className='flex flex-col items-center gap-1.5 pb-1 pt-3'>
            <div className={`flex items-center justify-center gap-1 text-[44px] font-semibold tracking-[-.03em] ${isIncome ? 'text-accent' : 'text-ink'}`}>
              <span>{isIncome ? '+' : '−'}{format.symbol}</span>
              <input
                aria-label='Amount'
                value={form.amount}
                onChange={e => patch({ amount: e.target.value.replace(/[^0-9.,]/g, '') })}
                inputMode='decimal'
                placeholder='0.00'
                style={{ width: `${Math.max(4, (form.amount || '0.00').length + 0.5)}ch` }}
                className='min-w-[2ch] max-w-[260px] border-0 bg-transparent text-left tabular-nums outline-hidden'
              />
            </div>
            {errors.amount && <span className='text-xs text-danger'>Enter an amount greater than 0</span>}
          </div>

          <div className='grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2.5'>
            <Field label='Name'>
              <input
                value={form.name}
                onChange={e => patch({ name: e.target.value })}
                placeholder='e.g. Costco'
                aria-invalid={!!errors.name}
                className={`${inputClass} ${errors.name ? 'border-danger' : ''}`}
              />
            </Field>
            <Field label='Date'>
              <input
                type='date'
                value={form.date}
                onChange={e => patch({ date: e.target.value })}
                aria-invalid={!!errors.date}
                className={`${inputClass} px-2.5 ${errors.date ? 'border-danger' : ''}`}
              />
            </Field>
          </div>

          <Field label='Description' hint='optional'>
            <input value={form.desc} onChange={e => patch({ desc: e.target.value })} placeholder='Add a note' className={inputClass} />
          </Field>

          {!guest && (
            <Field label='Merchant' hint='sets the logo'>
              <select value={form.merchant} onChange={e => patch({ merchant: e.target.value })} className={`${inputClass} px-2.5`}>
                <option value=''>
                  Auto{(() => {
                    const auto = merchantFor(`${form.name} ${form.desc}`)
                    return auto ? ` · ${auto.name}` : ' · no match'
                  })()}
                </option>
                {merchants.items.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                <option value='none'>No merchant</option>
              </select>
            </Field>
          )}

          <Field label='Tags' hint='comma separated'>
            <input value={form.tags} onChange={e => patch({ tags: e.target.value })} placeholder='viaje-cancún, regalo' className={inputClass} />
          </Field>

          <div className='flex flex-col gap-[9px]'>
            <span className='text-xs font-medium text-muted'>Category</span>
            <div className='flex flex-wrap gap-1.5'>
              {(isIncome ? INCOME : EXPENSE).map(([label, icon]) => {
                const selected = form.category === label
                return (
                  <button
                    key={label}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => patch({ category: selected ? '' : label })}
                    className={`flex h-[34px] items-center gap-1.5 rounded-[10px] border pl-[9px] pr-[11px] text-[13px] ${
                      selected
                        ? `border-accent text-ink ${isIncome ? 'bg-accent/15' : 'bg-[#1d2420]'}`
                        : 'border-line-2 bg-field text-[#aab3ac]'
                    }`}
                  >
                    <Icon name={icon} size={17} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className='flex flex-col gap-3 rounded-[14px] border border-line bg-field p-3.5'>
            <button
              type='button'
              role='switch'
              aria-checked={form.useCard}
              onClick={() =>
                patch({
                  useCard: !form.useCard,
                  addingCard: !form.useCard && cards.length === 0,
                  card: form.useCard ? '' : form.card || cards[0]?.name || ''
                })
              }
              className='flex items-center gap-2.5 text-left text-ink'
            >
              <Icon name='credit_card' className='text-muted' />
              <span className='flex-1 font-medium'>Paid with a card</span>
              <Switch on={form.useCard} />
            </button>

            {form.useCard && !form.addingCard && (
              <div className='grid grid-cols-2 gap-2'>
                {cards.map(card => {
                  const selected = form.card === card.name
                  return (
                    <button
                      key={card.name}
                      type='button'
                      aria-pressed={selected}
                      onClick={() => patch({ card: card.name })}
                      className={`flex min-w-0 items-center gap-2 rounded-[11px] border p-2.5 text-left text-ink ${
                        selected ? 'border-accent bg-accent-soft' : 'border-line-2 bg-rail'
                      }`}
                    >
                      <CardLogo icon={card.icon} className='h-[21px] w-[30px]' />
                      <span className='truncate text-[13px]'>{card.name}</span>
                    </button>
                  )
                })}
                {!editing && (
                  <button
                    type='button'
                    onClick={() => patch({ addingCard: true })}
                    className='flex items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-[#2a332e] p-2.5 text-[13px] text-accent'
                  >
                    <Icon name='add' size={18} />
                    New card
                  </button>
                )}
              </div>
            )}

            {form.useCard && form.addingCard && (
              <div className='flex flex-col gap-2.5'>
                <input
                  value={form.newCard}
                  onChange={e => patch({ newCard: e.target.value })}
                  placeholder='Card name, e.g. Santander LikeU'
                  className={`${inputClass} h-[42px] bg-rail`}
                />
                <BrandPicker value={form.newIcon} onChange={newIcon => patch({ newIcon })} />
                {cards.length > 0 && (
                  <button type='button' onClick={() => patch({ addingCard: false })} className='self-start text-[13px] text-muted'>
                    Choose an existing card instead
                  </button>
                )}
              </div>
            )}
          </div>
        </form>

        <div className='flex gap-2 border-t border-line-4 px-5 py-4'>
          {editing && (
            <button
              type='button'
              aria-label='Delete transaction'
              disabled={busy}
              onClick={handleDelete}
              className='grid h-[46px] place-items-center rounded-xl border border-danger/30 px-3.5 text-danger hover:bg-danger/10'
            >
              <Icon name='delete' />
            </button>
          )}
          <button type='button' onClick={closeDrawer} className='h-[46px] rounded-xl border border-line-3 px-[18px] text-ink'>
            Cancel
          </button>
          <button
            type='submit'
            form='transaction-form'
            disabled={busy}
            className='h-[46px] flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60'
          >
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </aside>
    </>
  )
}
