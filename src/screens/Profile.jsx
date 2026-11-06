import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandPicker from '../components/BrandPicker.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { CardLogo, Field, Icon, PasswordInput, Switch, inputClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { api, setSession } from '../lib/api.js'
import { downloadTransactionsCsv } from '../lib/csv.js'
import { CURRENCIES, RANGES } from '../lib/constants.js'
import { relativeTime } from '../lib/dates.js'
import { currentMonth } from '../lib/metrics.js'
import { disablePush, enablePush } from '../lib/push.js'

const NOTIFICATIONS = [
  ['daily', 'Daily reminder', 'A nudge in the evening if you haven’t logged anything today.'],
  ['weekly', 'Weekly summary', 'Every Sunday evening: income, expenses and your top category.'],
  ['cardDue', 'Card payment reminders', 'Three days before and on the day a credit card payment is due, with the amount.'],
  ['large', 'Large expense alert', 'Get notified when a single expense goes over a limit.']
]

const panelClass = 'flex flex-col gap-3.5 rounded-[20px] border border-line bg-panel p-5'
const darkInput = `${inputClass} bg-rail`

function Heading ({ icon, children }) {
  return (
    <div className='flex items-center gap-2'>
      <Icon name={icon} className='text-accent' />
      <h2 className='m-0 text-[15px] font-semibold'>{children}</h2>
    </div>
  )
}

// Avatars are stored with the profile, so they are shrunk before upload.
function resizePhoto (file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const scale = Math.max(size / image.width, size / image.height)
      const width = image.width * scale
      const height = image.height * scale
      canvas.getContext('2d').drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be read.'))
    }
    image.src = url
  })
}

function PersonalInfo () {
  const { user, updateProfile } = useAuth()
  const { showError } = useAppData()
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)

  async function commit (field, value, reset) {
    if (value.trim() === user[field]) return
    try {
      const updated = await updateProfile({ [field]: value.trim() })
      reset(updated[field])
    } catch (error) {
      reset(user[field])
      showError(error)
    }
  }

  return (
    <section className={panelClass}>
      <Heading icon='badge'>Personal info</Heading>
      <Field label='Display name'>
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => commit('name', name, setName)} className={darkInput} />
      </Field>
      <div className='grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5'>
        <Field label='Username'>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onBlur={() => commit('username', username, setUsername)}
            autoCapitalize='none'
            className={darkInput}
          />
        </Field>
        <Field label='Email'>
          <input type='email' value={email} onChange={e => setEmail(e.target.value)} onBlur={() => commit('email', email, setEmail)} className={darkInput} />
        </Field>
      </div>
      <div className='text-xs text-faint'>Changes save automatically.</div>
    </section>
  )
}

function CurrencyDisplay () {
  const { user, updateProfile } = useAuth()
  const { format, showError } = useAppData()
  const { settings } = user
  const save = patch => updateProfile({ settings: patch }).catch(showError)

  return (
    <section className={panelClass}>
      <Heading icon='currency_exchange'>Currency &amp; display</Heading>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2'>
        {Object.entries(CURRENCIES).map(([code, currency]) => {
          const selected = settings.currency === code
          return (
            <button
              key={code}
              type='button'
              aria-pressed={selected}
              onClick={() => save({ currency: code })}
              className={`flex flex-col gap-0.75 rounded-xl border px-3 py-2.5 text-left text-ink ${
                selected ? 'border-accent bg-accent-soft' : 'border-line-2 bg-rail'
              }`}
            >
              <span className='flex w-full items-baseline justify-between'>
                <span className={`font-mono font-semibold ${selected ? 'text-accent' : ''}`}>{code}</span>
                <span className='text-[13px] text-muted'>{currency.symbol}</span>
              </span>
              <span className='text-xs text-faint'>{currency.name}</span>
            </button>
          )
        })}
      </div>
      <div className='flex items-center justify-between gap-3 rounded-xl border border-line bg-rail px-3.5 py-3'>
        <span className='text-xs text-muted'>Preview</span>
        <span className='text-lg font-semibold tabular-nums'>{format.plain(12480.5)}</span>
      </div>
      <div className='text-xs leading-normal text-faint'>Only changes how amounts are shown. Existing amounts are not converted.</div>
      <div className='h-px bg-line' />
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <div className='flex flex-col gap-0.75'>
          <span className='font-medium'>Default time range</span>
          <span className='text-xs text-faint'>What the dashboard shows when you open it</span>
        </div>
        <div className='flex rounded-[10px] border border-line bg-rail p-0.75'>
          {Object.keys(RANGES).map(key => (
            <button
              key={key}
              type='button'
              aria-pressed={settings.defaultRange === key}
              onClick={() => save({ defaultRange: key })}
              className={`h-7 rounded-[7px] px-2.25 font-mono text-xs ${
                settings.defaultRange === key ? 'bg-accent-soft text-accent' : 'text-muted'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={settings.privacyOnOpen}
        onClick={() => save({ privacyOnOpen: !settings.privacyOnOpen })}
        className='flex items-center gap-3 text-left text-ink'
      >
        <span className='flex flex-1 flex-col gap-0.75'>
          <span className='font-medium'>Hide amounts when the app opens</span>
          <span className='text-xs text-faint'>Useful if you check your balance in public</span>
        </span>
        <Switch on={settings.privacyOnOpen} />
      </button>
    </section>
  )
}

function Budget () {
  const { user, updateProfile } = useAuth()
  const { transactions, format, showError } = useAppData()
  const [value, setValue] = useState(user.settings.budget ? String(user.settings.budget) : '')
  const budget = parseFloat(value.replace(/,/g, '')) || 0
  const month = currentMonth(transactions)
  const over = budget && month.expense > budget
  const pct = budget ? Math.min(100, Math.round((month.expense / budget) * 100)) : 0

  return (
    <section className={panelClass}>
      <Heading icon='savings'>Monthly budget</Heading>
      <Field label='Spending limit per month'>
        <div className='flex h-11 items-center gap-1.5 rounded-[11px] border border-line-3 bg-rail px-3'>
          <span className='text-faint'>{format.symbol}</span>
          <input
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
            onBlur={() => updateProfile({ settings: { budget } }).catch(showError)}
            inputMode='decimal'
            className='min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-hidden tabular-nums'
          />
        </div>
      </Field>
      <div className='flex flex-col gap-2'>
        <div className='flex justify-between text-[13px]'>
          <span className='text-muted'>{month.name}</span>
          <span className='tabular-nums'>
            {format.money(month.expense)} <span className='text-faint'>/ {format.money(budget)}</span>
          </span>
        </div>
        <div className='h-2 overflow-hidden rounded-full bg-line'>
          <div className={`h-full rounded-full transition-[width] duration-300 ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className='text-xs text-faint'>
          {!budget
            ? 'Set a limit to track it here.'
            : over
              ? `${format.money(month.expense - budget)} over budget · resets ${month.resets}`
              : `${format.money(budget - month.expense)} left · resets ${month.resets}`}
        </div>
      </div>
    </section>
  )
}

function Notifications () {
  const { user, updateProfile } = useAuth()
  const { format, showError } = useAppData()
  const { notifications, largeAmount } = user.settings
  const [limit, setLimit] = useState(String(largeAmount))
  const [busy, setBusy] = useState(false)

  async function toggle (key) {
    const next = { ...notifications, [key]: !notifications[key] }
    setBusy(true)
    try {
      if (next[key]) await enablePush()
      await updateProfile({ settings: { notifications: next } })
      if (!Object.values(next).some(Boolean)) await disablePush()
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={panelClass}>
      <Heading icon='notifications'>Notifications</Heading>
      {NOTIFICATIONS.map(([key, title, description]) => (
        <button
          key={key}
          type='button'
          role='switch'
          aria-checked={notifications[key]}
          disabled={busy}
          onClick={() => toggle(key)}
          className='flex items-center gap-3 text-left text-ink disabled:opacity-60'
        >
          <span className='flex flex-1 flex-col gap-0.75'>
            <span className='font-medium'>{title}</span>
            <span className='text-xs leading-[1.45] text-faint'>{description}</span>
          </span>
          <Switch on={notifications[key]} />
        </button>
      ))}
      {notifications.large && (
        <div className='flex items-center gap-2.5 rounded-[11px] border border-line bg-rail px-3 py-2.5'>
          <span className='flex-1 text-[13px] text-muted'>Alert me above</span>
          <span className='text-faint'>{format.symbol}</span>
          <input
            aria-label='Alert limit'
            value={limit}
            onChange={e => setLimit(e.target.value.replace(/[^0-9.,]/g, ''))}
            onBlur={() =>
              updateProfile({ settings: { largeAmount: parseFloat(limit.replace(/,/g, '')) || 0 } }).catch(showError)
            }
            inputMode='decimal'
            className='w-25 border-0 bg-transparent text-right text-sm text-ink outline-hidden tabular-nums'
          />
        </div>
      )}
      <div className='text-xs leading-normal text-faint'>Sent to this device through the installed app. On iPhone, add it to your Home Screen first.</div>
    </section>
  )
}

function MyCards () {
  const { cards, transactions, saveCard, removeCard, showToast, showError } = useAppData()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('VisaIcon')
  const canAdd = name.trim() && !cards.some(c => c.name === name.trim())

  async function add () {
    if (!canAdd) return
    try {
      await saveCard({ name: name.trim(), icon })
      showToast(`${name.trim()} added`)
      setName('')
    } catch (error) {
      showError(error)
    }
  }

  async function remove (card) {
    try {
      await removeCard(card)
      showToast(`${card} removed`)
    } catch (error) {
      showError(error)
    }
  }

  return (
    <section className={`${panelClass} gap-3`}>
      <Heading icon='credit_card'>My cards</Heading>
      {cards.length === 0 && <p className='m-0 text-[13px] text-muted'>No cards yet.</p>}
      {cards.map(card => (
        <div key={card.name} className='flex items-center gap-3 border-b border-line-4 py-2'>
          <CardLogo icon={card.icon} className='h-7 w-10' />
          <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
            <span className='truncate font-medium'>{card.name}</span>
            <span className='text-xs text-faint'>{transactions.filter(t => t.card === card.name).length} transactions</span>
          </span>
          <button
            type='button'
            title='Remove card'
            aria-label={`Remove ${card.name}`}
            onClick={() => remove(card.name)}
            className='grid h-7.5 w-7.5 place-items-center rounded-lg text-faint hover:bg-danger/10 hover:text-danger'
          >
            <Icon name='delete' size={18} />
          </button>
        </div>
      ))}
      <div className='flex flex-wrap gap-2 pt-1'>
        <input
          aria-label='New card name'
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='New card name'
          className={`${darkInput} h-10 min-w-35 flex-1 rounded-[10px]`}
        />
        <button
          type='button'
          disabled={!canAdd}
          onClick={add}
          className={`h-10 rounded-[10px] px-3.5 font-semibold ${canAdd ? 'bg-accent text-accent-ink' : 'bg-raised text-faint'}`}
        >
          Add
        </button>
      </div>
      <BrandPicker value={icon} onChange={setIcon} />
    </section>
  )
}

function Security () {
  const { user, setUser } = useAuth()
  const { showToast } = useAppData()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const strength = next.length >= 12 ? ['100%', 'bg-accent'] : next.length >= 8 ? ['66%', 'bg-[#e0c45a]'] : next.length ? ['33%', 'bg-danger'] : ['0%', 'bg-danger']

  function close () {
    setOpen(false)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }

  async function save () {
    if (!current) return setError('Enter your current password.')
    if (next.length < 8) return setError('New password needs at least 8 characters.')
    if (next !== confirm) return setError('Passwords don’t match.')

    setBusy(true)
    try {
      const { session, ...profile } = await api('/profile/password', { method: 'POST', body: { current, next } })
      setSession(session.accessToken, session.refreshToken)
      setUser(profile)
      close()
      showToast('Password updated. Other devices and connected apps were signed out.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={panelClass}>
      <Heading icon='lock'>Security</Heading>
      {!open ? (
        <div className='flex items-center justify-between gap-3'>
          <span className='flex flex-col gap-0.75'>
            <span className='font-medium'>Password</span>
            <span className='text-xs text-faint'>
              {user.passwordChangedAt ? `Last changed ${relativeTime(user.passwordChangedAt)}` : 'Not changed since you signed up'}
            </span>
          </span>
          <button type='button' onClick={() => setOpen(true)} className='h-9 rounded-[10px] border border-line-3 px-3.5 text-ink'>Change</button>
        </div>
      ) : (
        <div className='flex flex-col gap-2.5'>
          <PasswordInput aria-label='Current password' value={current} onChange={e => setCurrent(e.target.value)} autoComplete='current-password' placeholder='Current password' className='h-10.5 rounded-[10px] bg-rail' />
          <PasswordInput aria-label='New password' value={next} onChange={e => setNext(e.target.value)} autoComplete='new-password' placeholder='New password · 8+ characters' className='h-10.5 rounded-[10px] bg-rail' />
          <div className='h-1 overflow-hidden rounded-full bg-line'>
            <div className={`h-full transition-[width] duration-200 ${strength[1]}`} style={{ width: strength[0] }} />
          </div>
          <PasswordInput aria-label='Confirm new password' value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete='new-password' placeholder='Confirm new password' className='h-10.5 rounded-[10px] bg-rail' />
          {error && <div role='alert' className='text-xs text-danger'>{error}</div>}
          <div className='flex justify-end gap-2'>
            <button type='button' onClick={close} className='h-9.5 rounded-[10px] border border-line-3 px-3.5 text-ink'>Cancel</button>
            <button type='button' disabled={busy} onClick={save} className='h-9.5 rounded-[10px] bg-accent px-3.5 font-semibold text-accent-ink disabled:opacity-60'>Update password</button>
          </div>
        </div>
      )}
    </section>
  )
}

function YourData () {
  const { endLocalSession } = useAuth()
  const { transactions, transferList, deleteAllTransactions, showToast, showError } = useAppData()
  const movements = `${transactions.length} transactions${transferList.length ? ` and ${transferList.length} transfers` : ''}`
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(null)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const ask = kind => {
    setPassword('')
    setConfirming(kind)
  }
  const passwordField = (
    <PasswordInput
      aria-label='Your password'
      value={password}
      onChange={e => setPassword(e.target.value)}
      autoComplete='current-password'
      placeholder='Your password to confirm'
      className='h-9 min-w-0 flex-1 basis-48 rounded-[9px]'
    />
  )

  const dangerButton = 'h-8.5 rounded-[9px] border border-danger/35 px-3 text-danger'
  const confirmButton = 'h-8.5 rounded-[9px] bg-danger px-3 font-semibold text-[#1a0808] disabled:opacity-60'
  const keepButton = 'h-8.5 rounded-[9px] border border-line-3 px-3 text-ink'

  async function deleteTransactions () {
    setBusy(true)
    try {
      await deleteAllTransactions(password)
      setConfirming(null)
      showToast('All transactions and transfers deleted')
    } catch (error) {
      showError(error)
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount () {
    setBusy(true)
    try {
      await api('/profile', { method: 'DELETE', body: { password } })
      endLocalSession()
      navigate('/login')
    } catch (error) {
      showError(error)
      setBusy(false)
    }
  }

  return (
    <section className={panelClass}>
      <Heading icon='database'>Your data</Heading>
      <div className='flex items-center justify-between gap-3'>
        <span className='flex flex-col gap-0.75'>
          <span className='font-medium'>Export everything</span>
          <span className='text-xs text-faint'>{movements} as CSV</span>
        </span>
        <button
          type='button'
          onClick={() => {
            downloadTransactionsCsv([...transactions, ...transferList].sort((a, b) => b.date.localeCompare(a.date)))
            showToast(`${movements} exported`)
          }}
          className='flex h-9 items-center gap-1.5 rounded-[10px] border border-line-3 px-3.5 text-ink'
        >
          <Icon name='download' size={18} />
          Export
        </button>
      </div>
      <div className='flex flex-col gap-2.5 rounded-[14px] border border-danger/20 bg-danger/5 p-3.5'>
        <div className='text-xs font-semibold uppercase tracking-[.04em] text-danger'>Danger zone</div>
        {confirming === 'tx' ? (
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <span className='text-[13px] text-danger-soft'>Delete {movements}? This can’t be undone.</span>
            {passwordField}
            <span className='flex gap-1.5'>
              <button type='button' onClick={() => setConfirming(null)} className={keepButton}>Keep</button>
              <button type='button' disabled={busy || !password} onClick={deleteTransactions} className={confirmButton}>Yes, delete</button>
            </span>
          </div>
        ) : (
          <div className='flex items-center justify-between gap-3'>
            <span className='text-[13px]'>Delete all transactions and transfers</span>
            <button type='button' onClick={() => ask('tx')} className={dangerButton}>Delete</button>
          </div>
        )}
        {confirming === 'account' ? (
          <div className='flex flex-wrap items-center justify-between gap-2.5'>
            <span className='text-[13px] text-danger-soft'>Your account and all data will be erased.</span>
            {passwordField}
            <span className='flex gap-1.5'>
              <button type='button' onClick={() => setConfirming(null)} className={keepButton}>Cancel</button>
              <button type='button' disabled={busy || !password} onClick={deleteAccount} className={confirmButton}>Delete account</button>
            </span>
          </div>
        ) : (
          <div className='flex items-center justify-between gap-3'>
            <span className='text-[13px]'>Delete account</span>
            <button type='button' onClick={() => ask('account')} className={dangerButton}>Delete</button>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Profile () {
  const { user, updateProfile, signout } = useAuth()
  const { transactions, showToast, showError } = useAppData()
  const navigate = useNavigate()
  async function onPhoto (event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    try {
      await updateProfile({ photo: await resizePhoto(file) })
      showToast('Photo updated')
    } catch (error) {
      showError(error)
    }
  }

  const memberSince = new Date(user.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const tagClass = 'whitespace-nowrap rounded-md px-2 py-1 font-mono text-[11px]'

  return (
    <div className='flex flex-col gap-5'>
      <section className='relative flex flex-wrap items-center gap-5 overflow-hidden rounded-[20px] border border-line bg-panel p-6'>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_0%_0%,rgba(52,210,123,.12),transparent_70%)]' />
        <label title='Change photo' className='relative h-22 w-22 flex-none cursor-pointer'>
          {user.photo ? (
            <img src={user.photo} alt='' className='h-22 w-22 rounded-full border-2 border-[#1f2a23] object-cover' />
          ) : (
            <span className='grid h-22 w-22 place-items-center rounded-full border-2 border-[#1f2a23] bg-accent-soft text-[34px] font-semibold text-accent'>
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className='absolute -bottom-0.5 -right-0.5 grid h-7.5 w-7.5 place-items-center rounded-full border-[3px] border-panel bg-accent text-accent-ink'>
            <Icon name='photo_camera' size={16} fill={1} />
          </span>
          <input type='file' accept='image/*' aria-label='Change photo' onChange={onPhoto} className='sr-only' />
        </label>
        <div className='relative flex min-w-50 flex-1 flex-col gap-1.5'>
          <div className='text-2xl font-semibold tracking-[-.02em]'>{user.name}</div>
          <div className='text-muted'>@{user.username}{user.email ? ` · ${user.email}` : ''}</div>
          <div className='mt-1 flex flex-wrap gap-1.5'>
            <span className={`${tagClass} bg-accent-soft text-accent`}>{user.settings.currency}</span>
            <span className={`${tagClass} bg-raised text-muted`}>{transactions.length} transactions</span>
            <span className={`${tagClass} bg-raised text-muted`}>Member since {memberSince}</span>
          </div>
        </div>
        <div className='relative flex flex-wrap gap-2'>
          <label className='flex h-9.5 cursor-pointer items-center gap-1.5 rounded-[11px] border border-line-3 bg-field px-3.5 font-medium'>
            <Icon name='upload' size={18} />
            Upload photo
            <input type='file' accept='image/*' aria-label='Upload photo' onChange={onPhoto} className='sr-only' />
          </label>
          {user.photo && (
            <button type='button' onClick={() => updateProfile({ photo: '' }).catch(showError)} className='h-9.5 rounded-[11px] border border-line-3 px-3.5 text-muted'>
              Remove
            </button>
          )}
          <button
            type='button'
            onClick={async () => {
              await signout()
              navigate('/login')
            }}
            className='flex h-9.5 items-center gap-1.5 rounded-[11px] border border-line-3 px-3.5 text-ink hover:border-danger hover:text-danger'
          >
            <Icon name='logout' size={18} />
            Sign out
          </button>
        </div>
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-5 wide:grid-cols-2'>
        <div className='flex min-w-0 flex-col gap-5'>
          <PersonalInfo />
          <CurrencyDisplay />
          <Budget />
        </div>
        <div className='flex min-w-0 flex-col gap-5'>
          <Notifications />
          <MyCards />
          <Security />
          <YourData />
        </div>
      </div>
    </div>
  )
}
