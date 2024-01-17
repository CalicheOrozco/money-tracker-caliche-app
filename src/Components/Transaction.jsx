/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
function Transaction ({ name, description, price, datetime, isEditing, _id }) {
  const priceIndicator = price.slice(0, 1)
  const formattedPrice = `${priceIndicator} $${price.slice(1)}`
  const priceClass = priceIndicator === '+' ? 'text-green-400' : 'text-red-400'
  return (
    <div className='transaction w-full flex justify-between py-1 border-b border-custom'>
      <div className='text-left'>
        <div className='name text-base font-semibold'>{name}</div>
        <div className='description text-xs text-gray-500'>{description}</div>
      </div>
      <div className='text-right'>
        <div className={`price text-base font-semibold ${priceClass}`}>
          {formattedPrice}
        </div>
        <div className='date'>{datetime}</div>
      </div>
    </div>
  )
}

export default Transaction
