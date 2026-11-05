import { useState } from 'react'
import { useBrandSearch } from '../data/useBrandSearch.js'
import { logoSearchEnabled, useLogoConfig } from '../lib/brandfetch.js'
import { BANKS } from '../lib/constants.js'
import { MerchantLogo } from './TxIcon.jsx'
import { Icon } from './ui.jsx'

const isDomain = value => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(value)

// Picks a card logo: either one of the bundled bank logos (stored by key) or
// any brand found through the logo search (stored by its domain).
export default function BrandPicker ({ value, onChange }) {
  useLogoConfig()
  const [query, setQuery] = useState('')
  const [website, setWebsite] = useState(value?.includes('.') ? value : '')
  const search = useBrandSearch(query)

  return (
    <div className='flex min-w-0 flex-col gap-2'>
      {logoSearchEnabled && (
        <>
          <div className='flex h-10 items-center gap-2 rounded-[10px] border border-line-3 bg-rail px-2.5 focus-within:border-accent'>
            <Icon name='search' size={18} className='text-faint' />
            <input
              aria-label='Search bank or brand logo'
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder='Search any bank, e.g. Nu, Banamex, Revolut'
              className='min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-hidden'
            />
          </div>
          {search.loading && <span className='text-xs text-faint'>Searching logos…</span>}
          {search.error && <span role='alert' className='text-xs text-danger'>{search.error}</span>}
          {!search.loading && !search.error && query.trim().length >= 2 && search.results.length === 0 && (
            <span className='text-xs text-faint'>No brands found. Try another name or type the bank’s website below.</span>
          )}
          {search.results.length > 0 && (
            <div className='grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5'>
              {search.results.map(result => (
                <button
                  key={result.brandId || result.domain}
                  type='button'
                  aria-pressed={value === result.domain}
                  onClick={() => {
                    onChange(result.domain)
                    setWebsite(result.domain)
                  }}
                  className={`flex min-w-0 items-center gap-2 rounded-[10px] border p-1.5 text-left ${
                    value === result.domain ? 'border-accent bg-accent-soft' : 'border-line-2 bg-rail'
                  }`}
                >
                  <MerchantLogo domain={result.domain} size={30} fallback='credit_card' />
                  <span className='flex min-w-0 flex-col'>
                    <span className='truncate text-[13px] font-medium'>{result.name || result.domain}</span>
                    <span className='truncate font-mono text-[10px] text-faint'>{result.domain}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <span className='text-[11px] text-faint'>{logoSearchEnabled ? 'Or pick a common one' : 'Pick a bank or network'}</span>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-1.5'>
        {BANKS.map(([key, label]) => (
          <button
            key={key}
            type='button'
            title={label}
            aria-label={label}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`flex h-10.5 items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] bg-white p-1.5 ${
              value === key ? 'border-accent' : 'border-transparent'
            }`}
          >
            <img src={`/${key}.png`} alt='' className='max-h-full max-w-full object-contain' />
          </button>
        ))}
      </div>

      {logoSearchEnabled && (
        <input
          aria-label='Bank website'
          value={website}
          onChange={e => {
            const next = e.target.value.trim().toLowerCase()
            setWebsite(next)
            if (isDomain(next)) onChange(next)
          }}
          placeholder='or type the website, e.g. nu.com.mx'
          className='h-9 min-w-0 rounded-[9px] border border-line-3 bg-rail px-2.5 font-mono text-[13px] text-ink outline-hidden focus:border-accent'
        />
      )}
    </div>
  )
}
