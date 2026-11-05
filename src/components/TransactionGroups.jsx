import TxIcon from './TxIcon.jsx'
import { CardLogo, Icon } from './ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { dayLabel } from '../lib/dates.js'

function TransactionRow ({ t }) {
  const { openEdit, removeTransaction, cards, format, showError } = useAppData()
  const income = t.amount > 0
  const logo = cards.find(c => c.name === t.card)?.icon || t.icon

  return (
    <div className='flex items-center gap-1 rounded-xl hover:bg-[#141a16]'>
      <button
        type='button'
        onClick={() => openEdit(t)}
        className='flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left'
      >
        <TxIcon t={t} />
        <span className='flex min-w-0 flex-1 flex-col gap-0.75'>
          <span className='truncate font-medium'>{t.name}</span>
          <span className='flex min-w-0 items-center gap-1.5 text-xs text-faint'>
            <span className='truncate'>
              {t.desc ? `${t.category} · ${t.desc}` : t.category}
              {t.tags.length > 0 && ` · ${t.tags.map(tag => '#' + tag).join(' ')}`}
            </span>
            {t.card && (
              <span className='inline-flex flex-none items-center gap-1.25'>
                <span>·</span>
                <CardLogo icon={logo} className='h-3.25 w-4.5 rounded-[3px]! p-px!' />
                <span>{t.card}</span>
              </span>
            )}
          </span>
        </span>
        <span className={`whitespace-nowrap font-semibold tabular-nums ${income ? 'text-accent' : 'text-ink'}`}>
          {format.signed(t.amount)}
        </span>
      </button>
      <button
        type='button'
        title='Delete'
        aria-label={`Delete ${t.name}`}
        onClick={() => removeTransaction(t).catch(showError)}
        className='mr-2 grid h-7.5 w-7.5 flex-none place-items-center rounded-lg text-[#4a524c] hover:bg-danger/10 hover:text-danger'
      >
        <Icon name='delete' size={18} />
      </button>
    </div>
  )
}

// Transactions grouped under a header per day. Expects them sorted by date.
export default function TransactionGroups ({ items }) {
  const { format } = useAppData()

  const groups = []
  for (const t of items) {
    const last = groups[groups.length - 1]
    if (last?.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }

  return (
    <div className='flex flex-col'>
      {groups.map(group => (
        <div key={group.date} className='flex flex-col'>
          <div className='flex justify-between px-1 pb-1.5 pt-3 text-xs font-medium text-faint'>
            <span>{dayLabel(group.date)}</span>
            <span className='tabular-nums'>
              {format.signed(group.items.reduce((total, t) => total + t.amount, 0))}
            </span>
          </div>
          {group.items.map(t => <TransactionRow key={t.id} t={t} />)}
        </div>
      ))}
    </div>
  )
}
