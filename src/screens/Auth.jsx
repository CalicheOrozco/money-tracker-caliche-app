import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { Field, Icon, Logo, PasswordInput, inputClass } from '../components/ui.jsx'

const tabClass = active =>
  `flex items-center justify-center rounded-[9px] p-2.25 font-medium ${
    active ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'
  }`

export default function Auth ({ mode }) {
  const { user, login, signup } = useAuth()
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to='/' replace />

  async function handleSubmit (event) {
    event.preventDefault()
    setError('')
    setCreated(false)

    if (!username.trim() || !password || (!isLogin && !name.trim())) {
      setError(isLogin ? 'Enter your username and password.' : 'Fill in every field.')
      return
    }
    if (!isLogin && password.length < 8) {
      setError('The password needs at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      if (isLogin) {
        await login(username.trim(), password)
      } else {
        await signup({ name: name.trim(), username: username.trim(), password })
        setUsername(username.trim().toLowerCase())
        setPassword('')
        setCreated(true)
        navigate('/login')
      }
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  const switchClears = () => {
    setError('')
    setCreated(false)
  }

  return (
    <div className='grid min-h-screen grid-cols-[minmax(0,1fr)] nav:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]'>
      <div className='relative hidden flex-col justify-between overflow-hidden border-r border-line bg-[#0c120e] p-12 nav:flex'>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_20%_110%,rgba(52,210,123,.18),transparent_70%)]' />
        <div className='relative flex items-center gap-2.5'>
          <Logo size={32} />
          <span className='text-[17px] font-semibold tracking-[-.01em]'>Caliche</span>
        </div>
        <div className='relative flex max-w-115 flex-col gap-5'>
          <div className='font-mono text-xs uppercase tracking-[.12em] text-accent'>Money tracker</div>
          <h1 className='m-0 text-[52px] font-semibold leading-[1.02] tracking-[-.035em] text-pretty'>
            Every peso, accounted for.
          </h1>
          <p className='m-0 text-base leading-[1.55] text-muted text-pretty'>
            Log income and expenses, track every card, move money between accounts and see exactly where your money goes.
          </p>
        </div>
        <div className='relative flex gap-7 font-mono text-xs text-faint'>
          <span>CSV · XLSX import</span>
          <span>Multi-card</span>
          <span>Charts</span>
        </div>
      </div>

      <div className='grid place-items-center px-5 py-8'>
        <form onSubmit={handleSubmit} noValidate className='flex w-full max-w-95 flex-col gap-4.5'>
          <div className='flex flex-col gap-1.5'>
            <h2 className='m-0 text-[28px] font-semibold tracking-[-.02em]'>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className='m-0 text-muted'>
              {isLogin ? 'Log in to see your balance.' : 'Start tracking in under a minute.'}
            </p>
          </div>

          <div className='grid grid-cols-2 rounded-xl border border-line-2 bg-field p-1'>
            <Link to='/login' onClick={switchClears} className={tabClass(isLogin)}>Log in</Link>
            <Link to='/signup' onClick={switchClears} className={tabClass(!isLogin)}>Sign up</Link>
          </div>

          {created && (
            <div role='status' className='flex items-center gap-2.5 rounded-[10px] border border-accent/25 bg-accent/10 px-3.5 py-3 text-accent'>
              <Icon name='check_circle' fill={1} />
              Account created. Enter your password to log in.
            </div>
          )}

          {error && (
            <div role='alert' className='flex items-center gap-2.5 rounded-[10px] border border-danger/25 bg-danger/10 px-3.5 py-3 text-danger-soft'>
              <Icon name='error' />
              {error}
            </div>
          )}

          {!isLogin && (
            <Field label='Name'>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete='name'
                placeholder='User'
                className={`h-11.5 text-[15px] ${inputClass}`}
              />
            </Field>
          )}

          <Field label='Username'>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete='username'
              autoCapitalize='none'
              placeholder='User'
              className={`h-11.5 text-[15px] ${inputClass}`}
            />
          </Field>

          <Field label='Password'>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder='••••••••'
              className='h-11.5 text-[15px]'
            />
          </Field>
          {isLogin && <p className='-mt-2 text-xs text-faint'>Forgot your password? Ask the app admin to reset it.</p>}

          <button
            type='submit'
            disabled={busy}
            className='h-12 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60'
          >
            {busy
              ? isLogin ? 'Logging in...' : 'Creating account...'
              : isLogin ? 'Log in' : 'Create account'}
          </button>

          <div className='flex items-center gap-3 text-xs text-faint'>
            <div className='h-px flex-1 bg-line-2' />or<div className='h-px flex-1 bg-line-2' />
          </div>

          <Link
            to='/guest'
            className='grid h-11.5 place-items-center rounded-xl border border-line-3 font-medium text-ink hover:bg-field hover:text-ink'
          >
            Continue as guest
          </Link>
        </form>
      </div>
    </div>
  )
}
