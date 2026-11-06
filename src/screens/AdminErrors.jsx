import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { ConfirmDialog, Icon, Spinner, panelClass } from '../components/ui.jsx'
import { useAppData } from '../data/AppData.jsx'
import { api } from '../lib/api.js'
import { relativeTime } from '../lib/dates.js'

const SOURCE = { server: ['Server', 'dns'], client: ['App', 'devices'], cron: ['Scheduled job', 'schedule'] }

function Report ({ report, onResolve }) {
  const [open, setOpen] = useState(false)
  const [label, icon] = SOURCE[report.source] || SOURCE.server

  return (
    <div className='flex flex-col gap-2 border-b border-line-4 px-1 py-3 last:border-b-0'>
      <div className='flex items-start gap-3'>
        <span className='grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-danger/10 text-danger'><Icon name={icon} size={19} /></span>
        <button type='button' aria-expanded={open} onClick={() => setOpen(!open)} className='flex min-w-0 flex-1 flex-col gap-0.75 text-left text-ink'>
          <span className='break-words font-medium'>{report.message}</span>
          <span className='text-xs text-faint'>
            {label}{report.path && ` · ${report.path}`} · {report.count} {report.count === 1 ? 'time' : 'times'} · last {relativeTime(report.lastAt)}
          </span>
        </button>
        <button type='button' onClick={() => onResolve(report)} className='h-8 flex-none rounded-[9px] border border-line-3 px-2.5 text-[13px] text-ink hover:border-accent hover:text-accent'>
          Resolve
        </button>
      </div>
      {open && (
        <div className='ml-12 flex flex-col gap-1.5'>
          <span className='text-xs text-faint'>
            First seen {new Date(report.firstAt).toLocaleString('en-US')} · last {new Date(report.lastAt).toLocaleString('en-US')}
            {report.userID && ` · user ${report.userID}`}
          </span>
          {report.stack
            ? <pre className='m-0 max-h-72 overflow-auto rounded-[10px] border border-line bg-rail p-3 font-mono text-[11px] leading-relaxed text-muted'>{report.stack}</pre>
            : <span className='text-xs text-faint'>No stack trace was sent.</span>}
        </div>
      )}
    </div>
  )
}

// Errors the server and the app have reported. Only the admin can open it.
export default function AdminErrors () {
  const { user } = useAuth()
  const { showToast, showError } = useAppData()
  const [reports, setReports] = useState(null)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(() => api('/admin/errors').then(setReports).catch(showError), [showError])

  useEffect(() => {
    if (user?.admin) load()
  }, [user, load])

  if (!user?.admin) return <Navigate to='/' replace />
  if (!reports) return <Spinner />

  async function resolve (report) {
    try {
      await api(`/admin/errors/${report._id}`, { method: 'DELETE' })
      setReports(list => list.filter(r => r._id !== report._id))
      showToast('Marked as resolved')
    } catch (error) {
      showError(error)
    }
  }

  async function clearAll () {
    try {
      await api('/admin/errors', { method: 'DELETE' })
      setReports([])
      setClearing(false)
      showToast('All errors cleared')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='m-0 max-w-150 text-[13px] leading-relaxed text-muted'>
          Errors from the server, the app and the daily jobs. You get a notification the first time each one happens, then at most once a day while it continues. They are removed 30 days after they last happen.
        </p>
        <div className='flex gap-2'>
          <button type='button' onClick={load} className='flex h-9 items-center gap-1.5 rounded-[10px] border border-line-3 px-3 text-ink'><Icon name='refresh' size={18} />Refresh</button>
          {reports.length > 0 && <button type='button' onClick={() => setClearing(true)} className='h-9 rounded-[10px] border border-line-3 px-3 text-ink hover:border-danger hover:text-danger'>Clear all</button>}
        </div>
      </div>
      <section className={`flex flex-col p-4 ${panelClass}`}>
        {reports.length === 0
          ? (
            <div className='flex flex-col items-center gap-2 py-10 text-center text-muted'>
              <Icon name='check_circle' size={30} className='text-accent' />
              No errors. Everything is running fine.
            </div>
            )
          : reports.map(report => <Report key={report._id} report={report} onResolve={resolve} />)}
      </section>
      {clearing && (
        <ConfirmDialog title='Clear every error?' confirmLabel='Clear all' onCancel={() => setClearing(false)} onConfirm={clearAll}>
          The list will be empty. Errors that happen again will show up as new.
        </ConfirmDialog>
      )}
    </div>
  )
}
