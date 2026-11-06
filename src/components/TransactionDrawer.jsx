import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData, useAppUI } from '../data/AppData.jsx'
import { EXPENSE, INCOME } from '../lib/constants.js'
import { toISODate } from '../lib/dates.js'
import { toNumber } from '../lib/numbers.js'
import { MAX_SPLITS } from '../lib/splits.js'
import { parseTags } from '../lib/tags.js'
import BrandPicker from './BrandPicker.jsx'
import { MerchantTile } from './TxIcon.jsx'
import { CardLogo, Field, Icon, Switch, inputClass } from './ui.jsx'

const emptyForm = () => ({
  type: 'expense', amount: '', name: '', date: toISODate(new Date()), desc: '', category: '', tags: '', merchant: '', splits: [],
  useCard: false, card: '', addingCard: false, newCard: '', newIcon: 'VisaIcon', from: '', to: ''
})

function formFrom (t) {
  if (t.transfer) {
    return { ...emptyForm(), type: 'transfer', amount: String(t.value), date: t.date, desc: t.note, from: t.from, to: t.to }
  }
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
    splits: (t.splits || []).map(part => ({ category: part.category, amount: String(part.amount) })),
    useCard: !!t.card,
    card: t.card
  }
}

const cents = value => Math.round(toNumber(value) * 100)

// Divides the amount between categories. The parts must add up to the total.
function SplitEditor ({ form, patch, total, categories, error }) {
  const { format } = useAppData()
  const parts = form.splits
  const left = cents(total) - parts.reduce((sum, part) => sum + cents(part.amount), 0)
  const change = (index, values) => patch({ splits: parts.map((part, i) => (i === index ? { ...part, ...values } : part)) })
  const remove = index => patch({ splits: parts.length > 2 ? parts.filter((_, i) => i !== index) : [] })
  // A new part starts with whatever is still unassigned.
  const add = () => patch({ splits: [...parts, { category: '', amount: left > 0 ? (left / 100).toFixed(2) : '' }] })
  const status = left === 0
    ? ['Adds up to the total', 'text-accent']
    : left > 0 ? [`${format.plain(left / 100)} left to assign`, 'text-[#e0c45a]'] : [`${format.plain(-left / 100)} over the total`, 'text-danger']

  return (
    <div className='flex flex-col gap-2.5 rounded-[14px] border border-line bg-field p-3.5'>
      <div className='flex items-center justify-between'>
        <span className='flex items-center gap-2 font-medium'><Icon name='call_split' size={19} className='text-muted' />Split across categories</span>
        <button type='button' onClick={() => patch({ splits: [] })} className='text-[13px] text-muted hover:text-ink'>Remove split</button>
      </div>
      {parts.map((part, index) => (
        <div key={index} className='grid grid-cols-[minmax(0,1fr)_7rem_2rem] items-center gap-2'>
          <select
            aria-label={`Part ${index + 1} category`}
            value={part.category}
            onChange={e => change(index, { category: e.target.value })}
            className={`${inputClass} h-10 bg-rail px-2.5`}
          >
            <option value=''>Category</option>
            {categories.map(([label]) => <option key={label} value={label}>{label}</option>)}
          </select>
          <input
            aria-label={`Part ${index + 1} amount`}
            value={part.amount}
            onChange={e => change(index, { amount: e.target.value.replace(/[^0-9.,]/g, '') })}
            inputMode='decimal'
            placeholder='0.00'
            className={`${inputClass} h-10 bg-rail text-right tabular-nums`}
          />
          <button type='button' aria-label={`Remove part ${index + 1}`} onClick={() => remove(index)} className='grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-raised hover:text-ink'>
            <Icon name='close' size={18} />
          </button>
        </div>
      ))}
      <div className='flex items-center justify-between text-[13px]'>
        {parts.length < MAX_SPLITS ? <button type='button' onClick={add} className='flex items-center gap-1 text-accent'><Icon name='add' size={17} />Add part</button> : <span />}
        <span className={status[1]}>{status[0]}</span>
      </div>
      {error && <span role='alert' className='text-xs text-danger'>{error}</span>}
    </div>
  )
}

// Shows the transaction's merchant and why it has it, and lets the user pick another.
function MerchantPicker ({ form, patch }) {
  const { merchants, autoMatch, closeDrawer } = useAppData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const auto = autoMatch(`${form.name} ${form.desc}`)
  const chosen = form.merchant && form.merchant !== 'none' ? merchants.items.find(m => m._id === form.merchant) : null
  const current = form.merchant === 'none' ? null : chosen || auto?.merchant || null
  const sub = form.merchant === 'none'
    ? 'Shows the category icon'
    : chosen ? 'Chosen manually' : auto ? `Matched automatically by “${auto.pattern}”` : 'No pattern matches this name yet'
  const pick = merchant => {
    patch({ merchant })
    setOpen(false)
  }
  const go = state => {
    closeDrawer()
    navigate('/merchants', state ? { state } : undefined)
  }
  const options = merchants.items.filter(m => !query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase()))
  const row = 'flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left text-ink hover:bg-[#141a16]'

  return (
    <div className='flex flex-col gap-2 rounded-[14px] border border-line bg-field p-3'>
      <button type='button' aria-expanded={open} onClick={() => { setOpen(!open); setQuery('') }} className='flex items-center gap-3 text-left text-ink'>
        <MerchantTile merchant={current} category={form.category} size={38} />
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='text-xs font-medium text-muted'>Merchant</span>
          <span className='truncate font-medium'>{current ? current.name : 'No merchant'}</span>
          <span className='truncate text-xs text-faint'>{sub}</span>
        </span>
        <span className='flex flex-none items-center gap-0.5 text-[13px] text-accent'>Change<Icon name={open ? 'expand_less' : 'expand_more'} size={18} /></span>
      </button>
      {open && (
        <div className='flex flex-col gap-1 border-t border-line-4 pt-2'>
          <div className='flex h-9 items-center gap-2 rounded-[10px] border border-line-2 bg-rail px-2.5'>
            <Icon name='search' size={17} className='text-faint' />
            <input aria-label='Find a merchant' value={query} onChange={e => setQuery(e.target.value)} placeholder='Find a merchant' className='min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-hidden' />
          </div>
          <button type='button' onClick={() => pick('')} className={`${row} ${!form.merchant ? 'bg-[#122219]' : ''}`}>
            <span className='grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent'><Icon name='auto_awesome' size={16} /></span>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='text-[13px] font-medium'>Match automatically</span>
              <span className='truncate text-xs text-faint'>{auto ? `Currently ${auto.merchant.name}` : 'Nothing matches right now'}</span>
            </span>
            {!form.merchant && <Icon name='check' size={18} className='text-accent' />}
          </button>
          <div className='flex max-h-52 flex-col overflow-y-auto'>
            {options.map(m => (
              <button key={m._id} type='button' onClick={() => pick(m._id)} className={`${row} ${form.merchant === m._id ? 'bg-[#122219]' : ''}`}>
                <MerchantTile merchant={m} size={28} />
                <span className='min-w-0 flex-1 truncate text-[13px]'>{m.name}</span>
                {form.merchant === m._id && <Icon name='check' size={18} className='text-accent' />}
              </button>
            ))}
          </div>
          <button type='button' onClick={() => pick('none')} className={`${row} ${form.merchant === 'none' ? 'bg-[#122219]' : ''}`}>
            <span className='grid h-7 w-7 place-items-center rounded-lg bg-line-4 text-[#aab3ac]'><Icon name='block' size={16} /></span>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='text-[13px] font-medium'>No merchant</span>
              <span className='text-xs text-faint'>Show the category icon instead</span>
            </span>
            {form.merchant === 'none' && <Icon name='check' size={18} className='text-accent' />}
          </button>
          <div className='flex flex-wrap justify-between gap-2 px-1 pt-1 text-[13px]'>
            {current ? <button type='button' onClick={() => go({ edit: current._id })} className='text-accent'>Edit {current.name}</button> : <span />}
            <button type='button' onClick={() => go()} className='text-accent'>Manage merchants →</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TransactionDrawer () {
  const { closeDrawer, cards, saveTransaction, removeTransaction, showToast, showError, format, ruleFor, guest, merchants, merchantFor, saveTransfer, removeTransfer, revertTransfer, convertToTransfer } = useAppData()
  const { drawer } = useAppUI()
  const { open, editing, preset } = drawer
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const isIncome = form.type === 'income'
  const isTransfer = form.type === 'transfer'
  const editingTransfer = !!editing?.transfer
  const converting = isTransfer && editing && !editingTransfer
  const noun = isTransfer ? 'transfer' : 'transaction'

  useEffect(() => {
    if (!open) return
    if (editing) setForm(formFrom(editing))
    else if (preset?.transfer) setForm({ ...emptyForm(), type: 'transfer', to: preset.to || '', amount: preset.amount ? String(preset.amount) : '', desc: preset.to ? `${preset.to} payment` : '' })
    else if (preset?.card) setForm({ ...emptyForm(), useCard: true, card: preset.card })
    else setForm({ ...emptyForm(), ...(preset?.date && { date: preset.date }) })
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

  async function submitTransfer (amount) {
    const nextErrors = {}
    if (!(amount > 0)) nextErrors.amount = true
    if (!form.date) nextErrors.date = true
    if (!form.from) nextErrors.from = 'Choose an account'
    if (!form.to) nextErrors.to = 'Choose an account'
    if (form.from && form.from === form.to) nextErrors.to = 'Choose a different account'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    const details = { from: form.from, to: form.to, date: form.date, note: form.desc.trim() }
    setBusy(true)
    try {
      if (converting) {
        await convertToTransfer([editing.id], { ...details, amount })
      } else {
        await saveTransfer({ ...details, value: amount }, editing?.id)
        showToast(editing ? 'Transfer updated' : 'Transfer added')
      }
      closeDrawer()
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function restoreOriginal () {
    setBusy(true)
    try {
      await revertTransfer(editing.id)
      closeDrawer()
      showToast('Original transactions restored')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function submit (event) {
    event?.preventDefault()
    const amount = toNumber(form.amount)
    if (isTransfer) return submitTransfer(amount)

    const nextErrors = {}
    if (!(amount > 0)) nextErrors.amount = true
    if (!form.name.trim()) nextErrors.name = true
    if (!form.date) nextErrors.date = true
    const splitting = form.splits.length > 0
    const splits = form.splits.map(part => ({ category: part.category, amount: cents(part.amount) / 100 }))
    if (splitting) {
      if (splits.some(part => !part.category)) nextErrors.split = 'Choose a category for every part.'
      else if (splits.some(part => !(part.amount > 0))) nextErrors.split = 'Every part needs an amount.'
      else if (splits.reduce((sum, part) => sum + cents(part.amount), 0) !== cents(amount)) nextErrors.split = 'The parts must add up to the total.'
    }
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
          // A split shows under its largest part.
          category: splitting
            ? [...splits].sort((a, b) => b.amount - a.amount)[0].category
            : form.category || rule?.category || pickedMerchant?.category || 'Other',
          splits: splitting ? splits : [],
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
      await (editingTransfer ? removeTransfer(editing) : removeTransaction(editing))
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
        aria-label={`${editing ? 'Edit' : 'New'} ${noun}`}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-41 flex w-full flex-col border-l border-line-2 bg-[#0d110f] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] nav:w-115 ${
          open ? 'translate-x-0' : 'translate-x-[105%]'
        }`}
      >
        <div className='flex items-center justify-between border-b border-line-4 px-5 py-4.5'>
          <h2 className='m-0 text-[17px] font-semibold'>{editing ? 'Edit' : 'New'} {noun}</h2>
          <button type='button' aria-label='Close' onClick={closeDrawer} className='grid h-8.5 w-8.5 place-items-center rounded-[9px] text-muted hover:bg-raised hover:text-ink'>
            <Icon name='close' />
          </button>
        </div>

        <form id='transaction-form' onSubmit={submit} noValidate className='flex flex-1 flex-col gap-4.5 overflow-y-auto p-5'>
          <div className={`grid rounded-xl border border-line-2 bg-field p-1 ${guest ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <button
              type='button'
              aria-pressed={form.type === 'expense'}
              disabled={editingTransfer}
              onClick={() => patch({ type: 'expense', category: '', splits: [] })}
              className={`h-9 rounded-[9px] font-medium disabled:opacity-40 ${form.type === 'expense' ? 'bg-[#2a1617] text-danger-soft' : 'text-muted'}`}
            >
              Expense
            </button>
            <button
              type='button'
              aria-pressed={isIncome}
              disabled={editingTransfer}
              onClick={() => patch({ type: 'income', category: '', splits: [] })}
              className={`h-9 rounded-[9px] font-medium disabled:opacity-40 ${isIncome ? 'bg-accent-soft text-accent' : 'text-muted'}`}
            >
              Income
            </button>
            {!guest && (
              <button
                type='button'
                aria-pressed={isTransfer}
                onClick={() => patch({
                  type: 'transfer',
                  ...(editing && !editingTransfer && {
                    from: form.from || (editing.amount < 0 ? editing.card : ''),
                    to: form.to || (editing.amount > 0 ? editing.card : ''),
                    desc: form.desc || editing.name
                  })
                })}
                className={`h-9 rounded-[9px] font-medium ${isTransfer ? 'bg-[#16262a] text-[#5fc9e0]' : 'text-muted'}`}
              >
                Transfer
              </button>
            )}
          </div>

          <div className='flex flex-col items-center gap-1.5 pb-1 pt-3'>
            <div className={`flex items-center justify-center gap-1 text-[44px] font-semibold tracking-[-.03em] ${isIncome ? 'text-accent' : 'text-ink'}`}>
              <span>{isTransfer ? '' : isIncome ? '+' : '−'}{format.symbol}</span>
              <input
                aria-label='Amount'
                value={form.amount}
                onChange={e => patch({ amount: e.target.value.replace(/[^0-9.,]/g, '') })}
                inputMode='decimal'
                placeholder='0.00'
                style={{ width: `${Math.max(4, (form.amount || '0.00').length + 0.5)}ch` }}
                className='min-w-[2ch] max-w-65 border-0 bg-transparent text-left tabular-nums outline-hidden'
              />
            </div>
            {errors.amount && <span className='text-xs text-danger'>Enter an amount greater than 0</span>}
          </div>

          {isTransfer && (
            <>
              {converting && (
                <p className='m-0 rounded-[11px] border border-line-3 bg-field p-3 text-xs leading-relaxed text-muted'>
                  This {editing.amount < 0 ? 'expense' : 'income'} will become a transfer and stop counting in your totals. You can restore it later.
                </p>
              )}
              <div className='grid grid-cols-2 gap-2.5'>
                {[['from', 'From'], ['to', 'To']].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <select
                      aria-label={`${label} account`}
                      value={form[key]}
                      onChange={e => patch({ [key]: e.target.value })}
                      aria-invalid={!!errors[key]}
                      className={`${inputClass} px-2.5 ${errors[key] ? 'border-danger' : ''}`}
                    >
                      <option value=''>Choose an account</option>
                      {[...new Set([...cards.map(c => c.name), form[key]].filter(Boolean))].map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    {errors[key] && <span className='text-xs text-danger'>{errors[key]}</span>}
                  </Field>
                ))}
              </div>
              {cards.length < 2 && <span className='text-xs text-muted'>Add your accounts in Cards to move money between them.</span>}
              <Field label='Date'>
                <input
                  type='date'
                  value={form.date}
                  onChange={e => patch({ date: e.target.value })}
                  aria-invalid={!!errors.date}
                  className={`${inputClass} px-2.5 ${errors.date ? 'border-danger' : ''}`}
                />
              </Field>
              <Field label='Note' hint='optional'>
                <input value={form.desc} onChange={e => patch({ desc: e.target.value })} placeholder='e.g. Credit card payment' className={inputClass} />
              </Field>
              <span className='text-xs leading-relaxed text-faint'>A transfer doesn’t count as income or spending.</span>
              {editingTransfer && editing.restorable && (
                <button type='button' disabled={busy} onClick={restoreOriginal} className='self-start text-[13px] text-accent'>
                  Restore the original transactions
                </button>
              )}
            </>
          )}

          {!isTransfer && (
          <>
          {!guest && <MerchantPicker form={form} patch={patch} />}

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

          <Field label='Tags' hint='comma separated'>
            <input value={form.tags} onChange={e => patch({ tags: e.target.value })} placeholder='viaje-cancún, regalo' className={inputClass} />
          </Field>

          {form.splits.length > 0 ? (
            <SplitEditor form={form} patch={patch} total={form.amount} categories={isIncome ? INCOME : EXPENSE} error={errors.split} />
          ) : (
          <div className='flex flex-col gap-2.25'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium text-muted'>Category</span>
              <button
                type='button'
                onClick={() => patch({ splits: [{ category: form.category, amount: form.amount }, { category: '', amount: '' }] })}
                className='flex items-center gap-1 text-[13px] text-accent'
              >
                <Icon name='call_split' size={16} />Split
              </button>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {(isIncome ? INCOME : EXPENSE).map(([label, icon]) => {
                const selected = form.category === label
                return (
                  <button
                    key={label}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => patch({ category: selected ? '' : label })}
                    className={`flex h-8.5 items-center gap-1.5 rounded-[10px] border pl-2.25 pr-2.75 text-[13px] ${
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
          )}

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
              <span className='flex flex-1 flex-col'>
                <span className='font-medium'>{isIncome ? 'Received on a card or account' : 'Paid with a card'}</span>
                {!form.useCard && <span className='text-xs text-faint'>Off means cash</span>}
              </span>
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
                      <CardLogo icon={card.icon} className='h-5.25 w-7.5' />
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
                  className={`${inputClass} h-10.5 bg-rail`}
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
          </>
          )}
        </form>

        {guest && (
          <p className='m-0 border-t border-line-4 px-5 pt-3 text-xs text-faint'>
            Guest demo: your changes stay in this tab and disappear when you reload.
          </p>
        )}
        <div className={`flex gap-2 px-5 py-4 ${guest ? '' : 'border-t border-line-4'}`}>
          {editing && (
            <button
              type='button'
              aria-label={`Delete ${noun}`}
              disabled={busy}
              onClick={handleDelete}
              className='grid h-11.5 place-items-center rounded-xl border border-danger/30 px-3.5 text-danger hover:bg-danger/10'
            >
              <Icon name='delete' />
            </button>
          )}
          <button type='button' onClick={closeDrawer} className='h-11.5 rounded-xl border border-line-3 px-4.5 text-ink'>
            Cancel
          </button>
          <button
            type='submit'
            form='transaction-form'
            disabled={busy}
            className='h-11.5 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60'
          >
            {busy ? 'Saving...' : converting ? 'Save as transfer' : editing ? 'Save changes' : `Add ${noun}`}
          </button>
        </div>
      </aside>
    </>
  )
}
