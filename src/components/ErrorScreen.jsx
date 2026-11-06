import { useRouteError } from 'react-router-dom'
import { useEffect } from 'react'
import { reportError } from '../lib/reportError.js'
import { Icon } from './ui.jsx'

// Shown when a screen crashes, or when a new deploy removed the files an open tab
// still asks for. Reloading picks up the current version.
export default function ErrorScreen () {
  const error = useRouteError()
  const outdated = /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(String(error?.message || error))

  // An old tab after a deploy isn't a bug, so only real crashes are reported.
  useEffect(() => {
    console.error(error)
    if (!outdated) reportError(error)
  }, [error, outdated])

  return (
    <div className='grid min-h-screen place-items-center bg-canvas px-4 text-center text-ink'>
      <div className='flex max-w-90 flex-col items-center gap-3'>
        <Icon name='warning' size={36} className='text-[#e0c45a]' />
        <h1 className='m-0 text-xl font-semibold'>{outdated ? 'A new version is available' : 'Something went wrong'}</h1>
        <p className='m-0 text-muted'>
          {outdated ? 'Reload to get the latest version of Money Tracker.' : 'Reload the page to try again. Your data is safe.'}
        </p>
        <button type='button' onClick={() => window.location.reload()} className='h-10.5 rounded-[11px] bg-accent px-4.5 font-semibold text-accent-ink'>
          Reload
        </button>
      </div>
    </div>
  )
}
