import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandPicker from '../components/BrandPicker.jsx'
import TxIcon from '../components/TxIcon.jsx'
import { CardLogo, Field, Icon, MoneyInput, Segmented, Spinner, inputClass, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { api } from '../lib/api.js'
import { cardBackground, isLightTone } from '../lib/cardTone.js'
import { RANGE_LABEL, TONES } from '../lib/constants.js'
import { parseDay } from '../lib/dates.js'
import { decimalOnly, toNumber } from '../lib/numbers.js'
import { currentMonthKey, expensesOf, inMonth, monthLabel } from '../lib/periods.js'
import { byNewest, isCreditAccount, transfersInRange } from '../lib/transfers.js'

const NO_COLORS = []
const ACCOUNT_LABEL = { credit: 'Credit', debit: 'Debit', savings: 'Savings', investment: 'Investment' }

const emptyCard = () => ({ name: '', icon: 'VisaIcon', type: 'credit', last4: '', limit: '', tone: 'emerald', editing: false })

function CardFace ({ card, spent, selected, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      className={`relative flex aspect-[1.586] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[18px] border p-4.5 text-left ${
        isLightTone(card.tone) ? 'text-[#0b0e0c]' : 'text-ink'
      } ${selected ? 'border-accent shadow-[0_0_0_4px_rgba(52,210,123,.15)]' : 'border-white/5'}`}
      style={{ background: cardBackground(card.tone) }}
    >
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(280px_160px_at_100%_0%,rgba(255,255,255,.08),transparent_70%)]' />
      <span className='relative flex items-center justify-between'>
        <CardLogo icon={card.icon} className='h-7.5 w-11.5 rounded-[7px] p-1' />
        <span className='font-mono text-[10px] uppercase tracking-[.12em] opacity-70'>{ACCOUNT_LABEL[card.type] || 'Credit'}</span>
      </span>
      <span className='relative flex items-end justify-between gap-2.5'>
        <span className='flex min-w-0 flex-col gap-1'>
          <span className='font-mono text-sm tracking-[.12em] opacity-85'>•••• {card.last4 || ''}</span>
          <span className='truncate text-[15px] font-semibold'>{card.name || 'Card name'}</span>
        </span>
        {spent !== undefined && (
          <span className='flex flex-none flex-col items-end gap-0.5'>
            <span className='text-[10px] opacity-60'>Spent</span>
            <span className='font-semibold tabular-nums'>{spent}</span>
          </span>
        )}
      </span>
    </Tag>
  )
}

function CardForm ({ initial, onClose }) {
  const { cards, saveCard, showToast, format } = useAppData()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [brand, setBrand] = useState({ domain: '', colors: [], note: '' })
  const [toneTouched, setToneTouched] = useState(initial.editing)
  const domain = form.icon?.includes('.') ? form.icon : ''

  // Colors only exist for logos found through search, which are stored by domain.
  useEffect(() => {
    if (!domain) return
    let current = true
    api(`/brand-colors/${encodeURIComponent(domain)}`)
      .then(({ colors, enabled }) => current && setBrand({
        domain,
        colors,
        note: enabled === false
          ? 'Brand colors need BRANDFETCH_API_KEY on the server.'
          : colors.length ? '' : 'No brand colors found for this logo.'
      }))
      .catch(failure => current && setBrand({ domain, colors: [], note: failure.message }))
    return () => {
      current = false
    }
  }, [domain])

  const brandColors = brand.domain === domain ? brand.colors : NO_COLORS

  useEffect(() => {
    if (!toneTouched && brandColors.length) {
      const preferred = brandColors.find(c => c.type === 'brand' || c.type === 'accent') || brandColors[0]
      setForm(current => ({ ...current, tone: preferred.hex }))
    }
  }, [brandColors, toneTouched])

  const patch = values => {
    setForm(current => ({ ...current, ...values }))
    setError('')
  }

  async function save () {
    const name = form.name.trim()
    if (!name) return setError('Give the card a name.')
    if (!form.editing && cards.some(c => c.name === name)) return setError('You already have a card with that name.')
    if (form.last4 && form.last4.length !== 4) return setError('Last digits must be 4 numbers.')

    setBusy(true)
    try {
      await saveCard({
        name,
        icon: form.icon,
        type: form.type,
        last4: form.last4,
        limit: form.type === 'credit' ? toNumber(form.limit) : 0,
        tone: form.tone
      })
      showToast(form.editing ? `${name} updated` : `${name} added`)
      onClose(name)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`grid grid-cols-[minmax(0,1fr)] gap-6 p-5 wide:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] ${panelClass}`}>
      <div className='flex flex-col gap-3'>
        <span className='text-xs text-muted'>Preview</span>
        <div className='w-full max-w-95'>
          <CardFace card={form} />
        </div>
      </div>
      <div className='flex flex-col gap-3.5'>
        <Field label='Card name'>
          <input
            value={form.name}
            disabled={form.editing}
            onChange={e => patch({ name: e.target.value })}
            placeholder='e.g. Nu Crédito'
            className={`${inputClass} bg-rail disabled:text-muted`}
          />
        </Field>
        <div className='flex flex-col gap-1.75'>
          <span className='text-xs font-medium text-muted'>Bank logo</span>
          <BrandPicker value={form.icon} onChange={icon => patch({ icon })} />
        </div>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5'>
          <Field label='Last 4 digits'>
            <input
              value={form.last4}
              onChange={e => patch({ last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputMode='numeric'
              placeholder='1234'
              className={`${inputClass} bg-rail font-mono`}
            />
          </Field>
        </div>
        <div className='flex flex-col gap-1.75'>
          <span className='text-xs font-medium text-muted'>Type</span>
          <Segmented
            label='Card type'
            options={Object.entries(ACCOUNT_LABEL)}
            value={form.type}
            onChange={type => patch({ type })}
            buttonClass='h-8.5 flex-1'
          />
        </div>
        {form.type === 'credit' && (
          <Field label='Credit limit' hint='optional'>
            <MoneyInput
              symbol={format.symbol}
              value={form.limit}
              onChange={e => patch({ limit: decimalOnly(e.target.value) })}
              placeholder='30,000'
              className='h-11 rounded-[11px]'
            />
          </Field>
        )}
        <div className='flex flex-col gap-1.75'>
          <span className='text-xs font-medium text-muted'>Color</span>
          {brandColors.length > 0 && (
            <div className='flex flex-wrap items-center gap-2'>
              <span className='w-full text-[11px] text-faint'>From the brand</span>
              {brandColors.map(color => (
                <button
                  key={color.hex}
                  type='button'
                  title={`${color.hex}${color.type ? ` · ${color.type}` : ''}`}
                  aria-label={`Brand color ${color.hex}`}
                  aria-pressed={form.tone === color.hex}
                  onClick={() => {
                    setToneTouched(true)
                    patch({ tone: color.hex })
                  }}
                  className={`h-7 w-10 rounded-lg border-2 ${form.tone === color.hex ? 'border-accent' : 'border-white/10'}`}
                  style={{ background: cardBackground(color.hex) }}
                />
              ))}
              <span className='w-full text-[11px] text-faint'>Or a classic one</span>
            </div>
          )}
          {brand.domain === domain && brand.note && <span className='text-[11px] text-faint'>{brand.note}</span>}
          <div className='flex gap-2'>
            {Object.entries(TONES).map(([key, background]) => (
              <button
                key={key}
                type='button'
                title={key}
                aria-label={`${key} color`}
                aria-pressed={form.tone === key}
                onClick={() => {
                  setToneTouched(true)
                  patch({ tone: key })
                }}
                className={`h-7 w-10 rounded-lg border-2 ${form.tone === key ? 'border-accent' : 'border-transparent'}`}
                style={{ background }}
              />
            ))}
          </div>
        </div>
        {error && <div role='alert' className='text-xs text-danger'>{error}</div>}
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={() => onClose()} className='h-10.5 rounded-[11px] border border-line-3 px-4 text-ink'>Cancel</button>
          <button type='button' disabled={busy} onClick={save} className='h-10.5 rounded-[11px] bg-accent px-4.5 font-semibold text-accent-ink disabled:opacity-60'>
            Save card
          </button>
        </div>
      </div>
    </section>
  )
}

export default function Cards () {
  const { cards, transactions, transferList, metrics, range, format, loading, openNew, openEdit, removeCard, setCardFilter, showToast, showError } = useAppData()
  const navigate = useNavigate()
  const [selectedName, setSelectedName] = useState('')
  const [form, setForm] = useState(null)

  if (loading) return <Spinner />

  const spentOn = (list, name) => expensesOf(list.filter(t => t.card === name))
  const selected = cards.find(c => c.name === selectedName) || cards[0]
  const cardTx = selected ? metrics.inRange.filter(t => t.card === selected.name) : []
  const spent = selected ? spentOn(metrics.inRange, selected.name) : 0
  const purchases = cardTx.filter(t => t.amount < 0)
  const cardTransfers = selected ? transfersInRange(transferList, range).filter(t => t.from === selected.name || t.to === selected.name) : []
  const activity = [...cardTx, ...cardTransfers].sort(byNewest)
  const usedThisMonth = selected ? spentOn(inMonth(transactions, currentMonthKey()), selected.name) : 0
  const limit = selected?.limit || 0
  const usedPct = limit ? Math.min(100, Math.round((usedThisMonth / limit) * 100)) : 0
  const editCard = card => setForm({
    ...emptyCard(),
    ...card,
    limit: card.limit ? String(card.limit) : '',
    tone: card.tone || 'graphite',
    editing: true
  })
  const tile = 'flex min-w-0 flex-col gap-1.5 rounded-[14px] border border-line bg-rail p-3.5'

  async function remove () {
    const name = selected.name
    try {
      await removeCard(name)
      setSelectedName('')
      showToast(`${name} removed`)
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-baseline gap-2.5'>
          <h2 className='m-0 text-[17px] font-semibold'>Your wallet</h2>
          <span className='font-mono text-xs text-faint'>{cards.length} cards</span>
        </div>
        {!form && (
          <button
            type='button'
            onClick={() => setForm(emptyCard())}
            className='flex h-9.5 items-center gap-1.5 rounded-[11px] border border-[#2c5a3d] bg-accent-soft pl-2.5 pr-3.5 font-semibold text-accent'
          >
            <Icon name='add_card' />Register card
          </button>
        )}
      </div>

      {form && (
        <CardForm
          key={form.name || 'new'}
          initial={form}
          onClose={name => {
            setForm(null)
            if (name) setSelectedName(name)
          }}
        />
      )}

      <div className='grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4'>
        {cards.map(card => (
          <CardFace
            key={card.name}
            card={card}
            selected={selected?.name === card.name}
            spent={format.money(spentOn(metrics.inRange, card.name))}
            onClick={() => setSelectedName(card.name)}
          />
        ))}
        <button
          type='button'
          onClick={() => setForm(emptyCard())}
          className='flex aspect-[1.586] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#2a332e] text-muted hover:border-accent hover:text-accent'
        >
          <Icon name='add_card' size={28} />Register a card
        </button>
      </div>

      {selected && (
        <section className={`flex flex-col gap-4.5 p-5 ${panelClass}`}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-3'>
              <CardLogo icon={selected.icon} className='h-7.5 w-11 rounded-[7px]' />
              <div className='flex min-w-0 flex-col gap-0.5'>
                <span className='truncate text-[17px] font-semibold'>{selected.name}</span>
                <span className='text-xs text-faint'>
                  {{ debit: 'Debit card', savings: 'Savings account', investment: 'Investment account' }[selected.type] || 'Credit card'}
                  {selected.last4 && <span className='font-mono'> · •••• {selected.last4}</span>}
                </span>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => openNew({ card: selected.name })}
                className='flex h-9 items-center gap-1 rounded-[10px] bg-accent px-3 font-semibold text-accent-ink'
              >
                <Icon name='add' size={18} />Add expense
              </button>
              <button
                type='button'
                title='Edit card'
                aria-label='Edit card'
                onClick={() => editCard(selected)}
                className='grid h-9 w-9 place-items-center rounded-[10px] border border-line-3 text-muted hover:text-ink'
              >
                <Icon name='edit' size={18} />
              </button>
              <button
                type='button'
                title='Remove card'
                aria-label='Remove card'
                onClick={remove}
                className='grid h-9 w-9 place-items-center rounded-[10px] border border-line-3 text-muted hover:text-danger'
              >
                <Icon name='delete' size={18} />
              </button>
            </div>
          </div>

          <div className='grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5'>
            <div className={tile}><span className='text-xs text-muted'>Spent · {RANGE_LABEL[range]}</span><span className='truncate text-[19px] font-semibold tabular-nums'>{format.money(spent)}</span></div>
            <div className={tile}><span className='text-xs text-muted'>Transactions</span><span className='text-[19px] font-semibold tabular-nums'>{cardTx.length}</span></div>
            <div className={tile}><span className='text-xs text-muted'>Avg. per purchase</span><span className='truncate text-[19px] font-semibold tabular-nums'>{format.money(purchases.length ? spent / purchases.length : 0)}</span></div>
          </div>

          {isCreditAccount(selected) && (
            <div className='flex flex-col gap-2'>
              <div className='flex flex-wrap justify-between gap-1.5 text-[13px]'>
                <span className='text-muted'>Credit used in {monthLabel(currentMonthKey())}</span>
                <span className='tabular-nums'>
                  {format.money(usedThisMonth)}
                  {limit > 0 && <span className='text-faint'> / {format.money(limit)}</span>}
                </span>
              </div>
              {limit > 0 ? (
                <>
                  <div className='h-2 overflow-hidden rounded-full bg-line'>
                    <div
                      className={`h-full rounded-full ${usedPct > 90 ? 'bg-danger' : usedPct > 70 ? 'bg-[#e0c45a]' : 'bg-accent'}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <div className='text-xs text-faint'>{format.money(Math.max(0, limit - usedThisMonth))} available</div>
                </>
              ) : (
                <div className='text-xs text-faint'>Edit the card and add its credit limit to track how much is left.</div>
              )}
            </div>
          )}

          <div className='flex flex-col'>
            <div className='px-1 pb-1.5 text-xs font-medium text-faint'>Recent activity</div>
            {activity.length === 0 && <div className='p-7 text-center text-muted'>No transactions on this card for this period.</div>}
            {activity.slice(0, 12).map(t => (
              <button
                key={t.id}
                type='button'
                onClick={() => openEdit(t)}
                className='flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-[#141a16]'
              >
                <TxIcon t={t} size={36} />
                <span className='flex min-w-0 flex-1 flex-col gap-0.75'>
                  <span className='truncate font-medium'>{t.transfer ? t.note || 'Transfer' : t.name}</span>
                  <span className='text-xs text-faint'>
                    {t.transfer ? (t.from === selected.name ? `To ${t.to}` : `From ${t.from}`) : t.category} · {parseDay(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </span>
                {t.transfer
                  ? <span className='font-semibold tabular-nums text-ink-2'>{format.signed(t.from === selected.name ? -t.value : t.value)}</span>
                  : <span className={`font-semibold tabular-nums ${t.amount > 0 ? 'text-accent' : ''}`}>{format.signed(t.amount)}</span>}
              </button>
            ))}
            {activity.length > 12 && (
              <button
                type='button'
                onClick={() => {
                  setCardFilter(selected.name)
                  navigate('/')
                }}
                className='mx-2 mt-2 flex items-center gap-1 self-start text-[13px] text-accent'
              >
                View all in transactions<Icon name='arrow_forward' size={16} />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
