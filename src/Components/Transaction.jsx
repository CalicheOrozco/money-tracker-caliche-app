/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
function Transaction ({ name, description, price, datetime, category, card }) {
  const priceIndicator = price.slice(0, 1)
  const formattedPrice = `${priceIndicator} $${price.slice(1)}`
  const priceClass = priceIndicator === '+' ? 'text-green-400' : 'text-red-400'

  return (
    <div className='transaction w-full flex justify-between py-1 border-b border-custom'>
      <div className='text-left'>
        <div className='name text-base font-semibold'>{name}</div>
        <div className='description text-xs text-gray-500'>{description}</div>
        {/* Mostrar la categoría si existe */}
        {category && (
          <div className='category text-xs text-gray-500'>
            Category: {category}
          </div>
        )}
        {/* Mostrar la información de la tarjeta si existe */}
        {card && (
          <div className='card text-xs text-gray-500'>Card Used: {card}</div>
        )}
      </div>
      <div className='text-right'>
        <div className={`price text-base font-semibold ${priceClass}`}>
          {formattedPrice}
        </div>
        <div className='date text-xs text-gray-500'>{datetime}</div>
      </div>
    </div>
  )
}

export default Transaction
