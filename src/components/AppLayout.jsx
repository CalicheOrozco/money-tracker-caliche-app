import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { AppDataProvider, useAppData, useAppUI } from '../data/AppData.jsx'
import { RANGES, SECTIONS } from '../lib/constants.js'
import { currentMonth } from '../lib/metrics.js'
import TransactionDrawer from './TransactionDrawer.jsx'
import { Icon, Logo, Switch } from './ui.jsx'

const OVERVIEW = [
  ['', 'Dashboard', 'space_dashboard'], ['/insights', 'Insights', 'auto_awesome'],
  ['/calendar', 'Calendar', 'calendar_month'], ['/charts', 'Charts', 'monitoring'],
  ['/reports', 'Reports', 'summarize'], ['/year', 'Year in review', 'celebration']
]

const USER_GROUPS = [
  ['Overview', OVERVIEW.map(([path, ...rest]) => [path || '/', ...rest])],
  ['Money', [
    ['/cards', 'Cards', 'credit_card'], ['/transfers', 'Transfers', 'swap_horiz'], ['/recurring', 'Recurring', 'event_repeat'],
    ['/budgets', 'Budgets', 'donut_small'], ['/goals', 'Goals', 'flag'],
    ['/debts', 'Debts', 'handshake'], ['/net-worth', 'Net worth', 'account_balance']
  ]],
  ['Tools', [
    ['/rules', 'Rules & tags', 'rule'],
    ['/merchants', 'Merchants', 'storefront']
  ]]
]

const GUEST_GROUPS = [['Overview', OVERVIEW.map(([path, ...rest]) => [`/guest${path}`, ...rest])]]

const TITLES = {
  insights: 'Insights', calendar: 'Calendar', charts: 'Charts', reports: 'Monthly report',
  cards: 'Cards', transfers: 'Transfers', recurring: 'Recurring payments', budgets: 'Budgets', goals: 'Savings goals',
  debts: 'Debts & loans', 'net-worth': 'Net worth',
  rules: 'Rules & tags', merchants: 'Merchants', profile: 'Profile & settings', year: 'Year in review'
}


const WITH_RANGE = ['dashboard', 'charts', 'cards']

function Avatar ({ user, guest, size = 32, className = '' }) {
  if (!guest && user?.photo) {
    return (
      <img
        src={user.photo}
        alt=''
        className={`flex-none rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = guest ? 'G' : (user?.name || 'U').charAt(0).toUpperCase()
  return (
    <span
      className={`grid flex-none place-items-center rounded-full bg-accent-soft font-semibold text-accent ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}

function Sidebar ({ groups, pathname }) {
  const { user, signout } = useAuth()
  const { guest, transactions, format } = useAppData()
  const navigate = useNavigate()
  const month = currentMonth(transactions)
  const saved = month.income - month.expense
  const pct = month.income ? Math.max(0, Math.min(100, Math.round((saved / month.income) * 100))) : 0

  return (
    <aside className='sticky top-0 hidden h-screen w-58 flex-none flex-col gap-5 border-r border-line-4 bg-rail px-3.5 py-5 print:hidden nav:flex'>
      <div className='flex items-center gap-2.5 px-2 py-1'>
        <Logo />
        <span className='text-base font-semibold tracking-[-.01em]'>Caliche</span>
      </div>
      <nav className='-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1'>
        {groups.map(([title, items]) => (
          <div key={title} className='flex flex-col gap-0.5'>
            <div className='px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-faint'>{title}</div>
            {items.map(([to, label, icon]) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9.25 flex-none items-center gap-3 rounded-[10px] px-3 font-medium hover:text-ink ${
                    active ? 'bg-raised text-ink' : 'text-muted'
                  }`}
                >
                  <Icon name={icon} fill={active ? 1 : 0} className={active ? 'text-accent' : 'text-faint'} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-2 rounded-xl border border-line bg-field p-3.5'>
          <div className='text-xs text-muted'>Saved this month</div>
          <div className={`text-lg font-semibold tabular-nums ${saved < 0 ? 'text-danger' : 'text-accent'}`}>
            {format.signed(saved)}
          </div>
          <div className='h-1 overflow-hidden rounded-full bg-line'>
            <div className='h-full rounded-full bg-accent' style={{ width: `${pct}%` }} />
          </div>
          <div className='text-[11px] text-faint'>
            {month.income ? `${pct}% of ${month.name} income` : `No income logged yet in ${month.name}`}
          </div>
        </div>
        {guest ? (
          <div className='flex items-center gap-2.5 px-2 py-1.5'>
            <Avatar guest />
            <span className='min-w-0 flex-1'>
              <span className='block font-medium'>Guest</span>
              <span className='block text-xs text-faint'>Guest session</span>
            </span>
            <Link to='/login' title='Log in' aria-label='Log in' className='grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink'>
              <Icon name='login' />
            </Link>
          </div>
        ) : (
          <div className='flex items-center gap-1'>
            <Link
              to='/profile'
              title='Profile & settings'
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-ink hover:bg-raised hover:text-ink ${
                pathname === '/profile' ? 'bg-raised' : ''
              }`}
            >
              <Avatar user={user} />
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate font-medium'>{user?.name}</span>
                <span className='truncate text-xs text-faint'>@{user?.username}</span>
              </span>
            </Link>
            <button
              type='button'
              onClick={async () => {
                await signout()
                navigate('/login')
              }}
              title='Sign out'
              aria-label='Sign out'
              className='grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-raised hover:text-danger'
            >
              <Icon name='logout' />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function LayoutMenu () {
  const { hidden, setHidden } = useAppData()
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const hiddenCount = SECTIONS.filter(([key]) => hidden[key]).length

  useEffect(() => {
    if (!open) return
    const close = event => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={root} className='relative'>
      <button
        type='button'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className='flex h-9.5 items-center gap-1.75 rounded-[11px] border border-line bg-field px-3 font-medium text-ink-2 hover:border-line-3'
      >
        <Icon name='dashboard_customize' size={19} />
        Layout
        {hiddenCount > 0 && (
          <span className='rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent'>
            {hiddenCount} hidden
          </span>
        )}
      </button>
      {open && (
        <div className='absolute left-0 top-11.5 z-30 w-67.5 rounded-[14px] border border-line-3 bg-[#121714] p-2 shadow-[0_20px_50px_rgba(0,0,0,.5)] nav:left-auto nav:right-0'>
          <div className='px-2.5 pb-2.5 pt-2 text-xs text-muted'>Show sections</div>
          {SECTIONS.map(([key, label, icon]) => (
            <button
              key={key}
              type='button'
              role='switch'
              aria-checked={!hidden[key]}
              onClick={() => setHidden({ ...hidden, [key]: !hidden[key] })}
              className='flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2.25 text-left text-ink hover:bg-hover'
            >
              <Icon name={icon} size={19} className='text-muted' />
              <span className='flex-1'>{label}</span>
              <Switch on={!hidden[key]} />
            </button>
          ))}
          <div className='mt-1.5 flex justify-between border-t border-line-2 px-2.5 pb-1 pt-2 text-[13px]'>
            <button type='button' onClick={() => setHidden({})} className='text-accent'>Show all</button>
            <button type='button' onClick={() => setOpen(false)} className='text-muted'>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Header ({ title, screen }) {
  const { range, setRange, privacy, setPrivacy, openNew } = useAppData()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const showRange = WITH_RANGE.includes(screen)

  return (
    <header className='flex flex-wrap items-center justify-between gap-4'>
      <div className='flex flex-col gap-1'>
        <div className='text-[13px] text-faint'>{today}</div>
        <h1 className='m-0 text-[26px] font-semibold tracking-tight'>{title}</h1>
      </div>
      <div className='flex flex-wrap items-center gap-2 print:hidden'>
        {showRange && (
          <div className='flex rounded-[11px] border border-line bg-field p-0.75'>
            {Object.keys(RANGES).map(key => (
              <button
                key={key}
                type='button'
                aria-pressed={range === key}
                onClick={() => setRange(key)}
                className={`h-7.5 rounded-lg px-2.75 font-mono text-xs font-medium ${
                  range === key ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        )}
        <button
          type='button'
          aria-pressed={privacy}
          aria-label={privacy ? 'Show amounts' : 'Hide amounts'}
          title={privacy ? 'Show amounts' : 'Hide amounts'}
          onClick={() => setPrivacy(!privacy)}
          className={`grid h-9.5 w-9.5 place-items-center rounded-[11px] border border-line bg-field hover:border-line-3 ${
            privacy ? 'text-accent' : 'text-muted'
          }`}
        >
          <Icon name={privacy ? 'visibility_off' : 'visibility'} />
        </button>
        {screen === 'dashboard' && <LayoutMenu />}
        <button
          type='button'
          onClick={() => openNew()}
          className='flex h-9.5 items-center gap-1.5 rounded-[11px] bg-accent pl-3 pr-4 font-semibold text-accent-ink hover:bg-accent-hover'
        >
          <Icon name='add' weight={600} />
          New transaction
        </button>
      </div>
    </header>
  )
}

function Toast () {
  const { toast, setToast } = useAppUI()
  if (!toast) return null

  return (
    <div
      role={toast.error ? 'alert' : 'status'}
      className='fixed bottom-23 left-1/2 print:hidden z-60 flex max-w-[calc(100vw-32px)] items-center gap-3.5 rounded-[14px] bg-ink py-3 pl-4 pr-3.5 font-medium text-rail shadow-[0_16px_40px_rgba(0,0,0,.45)] animate-[toast-up_.25s_ease-out] transform-[translateX(-50%)] nav:bottom-7'
    >
      <Icon
        name={toast.error ? 'error' : 'check_circle'}
        fill={1}
        className={toast.error ? 'text-[#c23b3b]' : 'text-[#1f8f55]'}
      />
      <span className='min-w-0'>{toast.message}</span>
      {toast.undo && (
        <button type='button' onClick={toast.undo} className='h-7.5 flex-none rounded-lg bg-rail px-3 font-medium text-ink'>
          Undo
        </button>
      )}
      <button type='button' aria-label='Dismiss' onClick={() => setToast(null)} className='grid flex-none place-items-center text-faint'>
        <Icon name='close' size={18} />
      </button>
    </div>
  )
}

function Shell () {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { guest } = useAppData()
  const groups = guest ? GUEST_GROUPS : USER_GROUPS
  const mobileNav = [
    ...groups.flatMap(([, items]) => items),
    guest ? ['/signup', 'Sign up', 'person_add'] : ['/profile', 'Profile', 'person']
  ]

  const screen = pathname.replace(/^\/guest/, '').split('/')[1] || 'dashboard'
  const title = TITLES[screen] || `Hi, ${guest ? 'there' : user?.name || 'there'}`

  return (
    <div className='flex min-h-screen'>
      <Sidebar groups={groups} pathname={pathname} />
      <main className='min-w-0 flex-1 px-4 pb-24 pt-5 nav:px-9 nav:pb-12 nav:pt-7 print:p-0'>
        <div className='mx-auto flex max-w-310 flex-col gap-6'>
          <Header title={title} screen={screen} />
          <Outlet />
        </div>
      </main>

      <nav className='fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-line bg-rail/90 px-1.5 pb-2.5 pt-1.5 backdrop-blur-md print:hidden nav:hidden'>
        {mobileNav.map(([to, label, icon]) => {
          const active = pathname === to
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex h-13 min-w-17.5 flex-none flex-col items-center justify-center gap-0.75 px-1 text-[11px] hover:text-ink ${
                active ? 'text-ink' : 'text-faint'
              }`}
            >
              <Icon name={icon} size={22} fill={active ? 1 : 0} className={active ? 'text-accent' : ''} />
              <span className='whitespace-nowrap'>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className='print:hidden'>
        <TransactionDrawer />
      </div>
      <Toast />
    </div>
  )
}

export default function AppLayout ({ guest = false }) {
  return (
    <AppDataProvider guest={guest}>
      <Shell />
    </AppDataProvider>
  )
}
