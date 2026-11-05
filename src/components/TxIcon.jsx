import { useState } from 'react'
import { useAppData } from '../data/AppData.jsx'
import { logoUrl } from '../lib/brandfetch.js'
import { CATEGORY_ICON } from '../lib/constants.js'
import { Icon } from './ui.jsx'

export function MerchantLogo ({ domain, size = 38, fallback = 'storefront', className = '' }) {
  const [failed, setFailed] = useState('')
  const url = logoUrl(domain, size * 2)

  if (!url || failed === domain) {
    return (
      <span className={`grid flex-none place-items-center rounded-[11px] bg-line-4 text-[#aab3ac] ${className}`} style={{ width: size, height: size }}>
        <Icon name={fallback} size={Math.round(size * 0.5)} />
      </span>
    )
  }

  return (
    <img
      src={url}
      alt=''
      width={size}
      height={size}
      loading='lazy'
      onError={() => setFailed(domain)}
      className={`flex-none rounded-[11px] bg-white object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// Shows the merchant's logo when it has one, otherwise the category icon.
export default function TxIcon ({ t, size = 38 }) {
  const { merchantOf } = useAppData()
  const merchant = merchantOf(t)
  const income = t.amount > 0

  if (merchant?.domain) {
    return <MerchantLogo domain={merchant.domain} size={size} fallback={CATEGORY_ICON[t.category] || 'category'} />
  }

  return (
    <span
      className={`grid flex-none place-items-center rounded-[11px] ${income ? 'bg-accent/10 text-accent' : 'bg-line-4 text-[#aab3ac]'}`}
      style={{ width: size, height: size }}
    >
      <Icon name={CATEGORY_ICON[t.category] || 'category'} size={Math.round(size * 0.52)} />
    </span>
  )
}
