import PortalLayout from '../layout/PortalLayout.jsx'
import { useState } from 'react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

function BBVA () {
  const [filas1, setFilas1] = useState('')
  const [transactions, setTransactions] = useState([])
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ]
  let date = ''
  let name = ''
  let amount = ''
  let moves = []

  const handleChange1 = e => {
    setFilas1(e.target.value)
  }

  const parseInputData = data => {
    let parseInputData = data
    // Eliminar las palabras Movimiento BBVA, En tránsito, Promoción aplicada, Financiado, Quiero y Transferencia interbancaria recibida
    parseInputData = parseInputData.replace(/Movimiento BBVA/g, '')
    parseInputData = parseInputData.replace(
      /Transferencia interbancaria recibida/g,
      ''
    )
    parseInputData = parseInputData.replace(/En tránsito/g, '')
    parseInputData = parseInputData.replace(/Promoción aplicada/g, '')
    parseInputData = parseInputData.replace(/Financiado/g, '')
    parseInputData = parseInputData.replace(/Quiero/g, '')
    // Eliminar las comas
    parseInputData = parseInputData.replace(/,/g, '')
    // Split por cada salto de linea
    parseInputData = parseInputData.split('\n')
    // Eliminar las que estan en blanco
    parseInputData = parseInputData.filter(line => line !== '')

    parseInputData.forEach(line => {
      // Validar si es una fecha revisando si el texto incluye un mes
      if (meses.some(mes => line.includes(mes)) && line.match(/\d{4}/)) {
        // convertir a formato de fecha 2024-05-12 tomando en cuenta que voy a recibir algo como  30 abril 2024
        const [day, month, year] = line.split(' ')
        const monthIndex = meses.indexOf(month) + 1
        // si el mes es menor a 10 agregar un 0
        if (monthIndex < 10) {
          date = `${year}-0${monthIndex}-${day.padStart(2, '0')}`
        } else {
          date = `${year}-${monthIndex}-${day.padStart(2, '0')}`
        }
      }
      // Validar si es mayormente texto
      else if (line.match(/[a-zA-Z]/)) {
        name = line
      }
      // Validar si es un monto
      else if (line.includes('$')) {
        // Eliminar el signo de pesos
        line = line.replace('$', '')
        // Agregar un punto antes de las ultimas dos cifras
        line = line.replace(/(\d{2})$/, '.$1')
        // Si no tiene signo negativo, agregar un signo positivo
        if (!line.includes('-')) {
          line = `+${line}`
        }
        amount = line
      }

      // Validar que date, name y amount tengan valores
      if (date && name && amount) {
        // Generar un objeto con los valores
        const obj = {
          date,
          name,
          amount
        }
        // Agregar el objeto al array transactions manteniendo los valores anteriores
        moves = [...moves, obj]
        // Poner los valores en blanco
        name = ''
        amount = ''
      }
    })

    return moves
  }

  const handleSubmit = e => {
    e.preventDefault()
    const finalData = parseInputData(filas1)
    setTransactions(finalData)
  }

  const handleCopyToClipboard = () => {
    // copiar al clipboard lista para excel
    const data = transactions
      .map(obj => Object.values(obj).join('\t'))
      .join('\n')
    navigator.clipboard.writeText(data)
    alert('Copiado al clipboard')
  }

  const handleGenerateExcel = () => {
    console.log('Generando excel')
    // generar un archivo excel con los datos de transactions
    // https://www.npmjs.com/package/exceljs

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Comparacion')
    //separar valor de data por cada objeto
    const values = transactions.map(obj => Object.values(obj))
    //agregar los valores a la hoja de excel
    worksheet.addRows(values)
    // Generar los headers
    worksheet.getRow(1).values = ['Date', 'Name', 'Amount', 'Card']
    // agregar espaciado
    worksheet.columns = [
      { key: 'date', width: 20 },
      { key: 'name', width: 40 },
      { key: 'amount', width: 20 }
    ]

    // Descargar el archivo
    workbook.xlsx.writeBuffer().then(data => {
      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, 'Comparacion.xlsx')
    })
  }
  return (
    <PortalLayout>
      <div className='px-10 w-full h-full'>
        <h1 className='text-3xl font-bold py-2'>Data BBVA</h1>

        <form onSubmit={handleSubmit}>
          <div className='flex gap-x-5'>
            <div className='w-full'>
              <textarea
                value={filas1}
                onChange={handleChange1}
                className='mb-2 p-2 border border-gray-300 w-full h-40 rounded-md text-black '
                placeholder='Primera lista de filas'
              ></textarea>
            </div>
          </div>
          <button
            type='submit'
            className='px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded'
          >
            Comparar
          </button>
        </form>
        {transactions.length > 0 && (
          <>
            <div className='flex gap-x-5'>
              <button
                onClick={handleCopyToClipboard}
                className='px-4 py-2 mt-2 bg-gray-500 hover:bg-gray-400 text-white rounded'
              >
                Copiar al clipboard
              </button>

              <button
                onClick={handleGenerateExcel}
                className='px-4 py-2 mt-2 bg-teal-500 hover:bg-teal-400 text-white rounded'
              >
                Generar Excel
              </button>
            </div>

            <div className='my-4'>
              <h1 className='font-bold'>These transactions were found</h1>
              {transactions.map((transaction, index) => (
                <div key={index} className='border p-2 mt-2'>
                  <p>
                    <span className='font-bold'>Date:</span> {transaction.date}
                  </p>
                  <p>
                    <span className='font-bold'>Name:</span> {transaction.name}
                  </p>
                  <p>
                    <span className='font-bold'>Amount:</span>{' '}
                    {transaction.amount}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  )
}

export default BBVA
