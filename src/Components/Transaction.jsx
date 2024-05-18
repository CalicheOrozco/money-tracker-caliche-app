/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import categories from '../constants/data.jsx'
 
function Transaction ({
  name,
  description,
  price,
  datetime,
  category,
  card,
  icon
}) {
  // eliminar T00:00:00Z de la fecha y convertir a formato legible
  let date = new Date(datetime).toISOString().split('T')[0]
  // separar por -
  const dateParts = date.split('-')
  const year = dateParts[0]
  const month = dateParts[1]
  // obtener el nombre del mes
  const monthName = getMonthName(parseInt(month))
  const day = dateParts[2]
  date = `${monthName} ${day} ${year}`
  const priceIndicator = price.slice(0, 1)
  let numberPrice = price.slice(1)
  //  si el precio tiene mil o millones, agregar una coma
  if (numberPrice.length > 6) {
    numberPrice = `${numberPrice.slice(0, -6)},${numberPrice.slice(-6)}`
  } else if (numberPrice.length > 3) {
    numberPrice = `${numberPrice.slice(0, -3)},${numberPrice.slice(-3)}`
  }

  const formattedPrice = `${priceIndicator} $${numberPrice}`
  const priceClass = priceIndicator === '+' ? 'text-green-400' : 'text-red-400'

  // buscar la categoría en el arreglo de categorías y tomar el label
  const categoryLabel = categories.find(cat => cat.value === category)
  const formattedCategory = categoryLabel ? categoryLabel.label : null

  // capatializar la primera letra del name
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  // Capitalizar la priemra letra de la descripción si existe
  description = description
    ? description.charAt(0).toUpperCase() + description.slice(1).toLowerCase()
    : description

  category = formattedCategory

  function getMonthName (monthNumber) {
    const date = new Date(Date.UTC(2020, monthNumber, 1))

    return date.toLocaleString('en-US', { month: 'long' })
  }

  return (
    <div className='transaction w-full flex justify-between py-1 border-b border-custom'>
      <div className='text-left flex flex-col gap-y-2'>
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
          <div className='card text-xs text-gray-500'>
            {icon ? (
              <div className='flex justify-start items-center gap-x-2'>
                <img
                  src={`${icon}.png`}
                  alt={`${icon} Logo`}
                  className='w-8 h-8 bg-white rounded-md p-0.5'
                />
                {card}
              </div>
            ) : (
              card
            )}
          </div>
        )}
      </div>
      <div className='text-right flex flex-col justify-center'>
        <div className={`price text-base font-semibold ${priceClass}`}>
          {formattedPrice}
        </div>
        <div className='date text-xs text-gray-500'>{date}</div>
      </div>
    </div>
  )
}

export default Transaction
