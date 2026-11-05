import { useEffect, useRef, useState } from 'react'
import { logoUrl, useLogoConfig } from '../lib/brandfetch.js'

export function Icon ({ name, size = 20, fill = 0, weight = 400, className = '' }) {
  return (
    <span
      aria-hidden='true'
      className={`icon ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}`
      }}
    >
      {name}
    </span>
  )
}

export function Logo ({ size = 30 }) {
  return (
    <div
      className='grid place-items-center rounded-[9px] bg-accent text-accent-ink'
      style={{ width: size, height: size }}
    >
      <Icon name='account_balance_wallet' size={size * 0.64} fill={1} weight={600} />
    </div>
  )
}

export function Switch ({ on }) {
  return (
    <span
      className={`relative h-5.5 w-9.5 flex-none rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-line-3'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4.5 w-4.5 rounded-full transition-transform duration-200 ${
          on ? 'translate-x-4 bg-accent-ink' : 'bg-muted'
        }`}
      />
    </span>
  )
}

// A card logo is either a bundled bank image (by key) or a brand domain whose
// logo is loaded live from the logo service.
export function CardLogo ({ icon, className = 'h-6 w-8.5' }) {
  const [failed, setFailed] = useState('')
  useLogoConfig()
  const isBrand = icon?.includes('.')
  const src = isBrand ? logoUrl(icon, 96) : /^[A-Za-z]{2,40}Icon$/.test(icon || '') ? `/${icon}.png` : ''
  const showImage = src && failed !== icon

  // Searched brand icons are square and carry their own background, so they are
  // shown edge to edge; bundled bank logos sit on a white plate.
  return (
    <span
      className={`flex flex-none items-center justify-center overflow-hidden rounded-md ${className} ${
        showImage && isBrand ? 'bg-transparent p-0!' : 'bg-white p-0.5'
      }`}
    >
      {showImage ? (
        <img
          src={src}
          alt=''
          className={`max-h-full max-w-full object-contain ${isBrand ? 'h-full rounded-[inherit]' : ''}`}
          onError={() => setFailed(icon)}
        />
      ) : (
        <Icon name='credit_card' size={14} className='text-faint' />
      )}
    </span>
  )
}

export function Section ({ title, onHide, className = '', children }) {
  return (
    <section
      className={`flex flex-col gap-3.5 rounded-[20px] border border-line bg-panel p-5 ${className}`}
    >
      <div className='flex items-center justify-between'>
        <h2 className='m-0 text-[15px] font-semibold'>{title}</h2>
        {onHide && <HideButton onClick={onHide} />}
      </div>
      {children}
    </section>
  )
}

export function HideButton ({ onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      title='Hide section'
      aria-label='Hide section'
      className='grid h-7.5 w-7.5 place-items-center rounded-lg text-faint hover:bg-hover hover:text-ink'
    >
      <Icon name='visibility_off' size={18} />
    </button>
  )
}

// Modal confirmation built on the native dialog, which handles focus and Escape.
export function ConfirmDialog ({ title, children, confirmLabel, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    ref.current.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby='confirm-title'
      onCancel={e => {
        e.preventDefault()
        onCancel()
      }}
      onClick={e => {
        if (e.target === ref.current) onCancel()
      }}
      className='m-auto w-[calc(100vw-32px)] max-w-100 rounded-[20px] border border-line-3 bg-panel p-0 text-ink backdrop:bg-black/60'
    >
      <div className='flex flex-col gap-2 p-5'>
        <h2 id='confirm-title' className='m-0 text-[15px] font-semibold'>{title}</h2>
        <p className='m-0 text-[13px] leading-relaxed text-muted'>{children}</p>
        <div className='mt-3 flex justify-end gap-2'>
          <button type='button' autoFocus onClick={onCancel} className='h-10.5 rounded-[11px] border border-line-3 px-4 text-ink hover:bg-hover'>
            Cancel
          </button>
          <button type='button' onClick={onConfirm} className='h-10.5 rounded-[11px] bg-accent px-4.5 font-semibold text-accent-ink hover:bg-accent-hover'>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export function Field ({ label, hint, children }) {
  return (
    <label className='flex min-w-0 flex-col gap-1.75'>
      <span className='text-xs font-medium text-muted'>
        {label}
        {hint && <span className='font-normal text-faint'> · {hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  'h-11 min-w-0 rounded-[11px] border border-line-3 bg-field px-3 text-sm text-ink outline-hidden focus:border-accent'

export function PasswordInput ({ className = '', ...props }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className='relative'>
      <input
        {...props}
        type={revealed ? 'text' : 'password'}
        className={`w-full pr-11 ${inputClass} ${className}`}
      />
      <button
        type='button'
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        onClick={() => setRevealed(!revealed)}
        className='absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink'
      >
        <Icon name={revealed ? 'visibility_off' : 'visibility'} size={19} />
      </button>
    </div>
  )
}

export function Spinner ({ label = 'Loading' }) {
  return (
    <div role='status' className='grid min-h-[50vh] place-items-center'>
      <span className='sr-only'>{label}</span>
      <div className='h-9 w-9 animate-spin rounded-full border-[3px] border-line-3 border-t-accent' />
    </div>
  )
}

export const panelClass = 'rounded-[20px] border border-line bg-panel'

export function Segmented ({ options, value, onChange, label, buttonClass = 'h-8 px-3' }) {
  return (
    <div role='group' aria-label={label} className='flex rounded-[10px] border border-line bg-rail p-0.75'>
      {options.map(([key, text, activeClass]) => (
        <button
          key={key}
          type='button'
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`whitespace-nowrap rounded-[7px] font-medium ${buttonClass} ${
            value === key ? activeClass || 'bg-[#1f2a23] text-accent' : 'text-muted hover:text-ink'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function MoneyInput ({ symbol, className = '', ...props }) {
  return (
    <div className={`flex h-10 min-w-0 items-center gap-1.5 rounded-[10px] border border-line-3 bg-rail px-2.5 focus-within:border-accent ${className}`}>
      <span className='text-faint'>{symbol}</span>
      <input
        inputMode='decimal'
        {...props}
        className='min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-hidden tabular-nums'
      />
    </div>
  )
}

export function Stat ({ label, value, note, valueClass = '', children }) {
  return (
    <section className={`flex min-w-0 flex-col gap-2 p-5 ${panelClass}`}>
      <span className='text-[13px] text-muted'>{label}</span>
      <span className={`truncate text-[28px] font-semibold tracking-[-.02em] tabular-nums ${valueClass}`}>{value}</span>
      {note && <span className='text-xs text-faint'>{note}</span>}
      {children}
    </section>
  )
}

export function Empty ({ children }) {
  return <div className='px-5 py-6 text-center text-muted'>{children}</div>
}

export function RowIcon ({ name, className = 'bg-line-4 text-[#aab3ac]' }) {
  return (
    <span className={`grid h-8.5 w-8.5 flex-none place-items-center rounded-[10px] ${className}`}>
      <Icon name={name} size={18} />
    </span>
  )
}
