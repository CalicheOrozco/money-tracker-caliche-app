import { useEffect, useState } from 'react'
import { MdDelete } from 'react-icons/md'
import DefaultLayout from '../layout/DefaultLayout'
import Transaction from '../Components/Transaction.jsx'
import SwipeableListItem from '../Components/SwipeableListItem'
import Filter from '../Components/Filter.jsx'
import FilterByTime from '../Components/FilterByTime.jsx'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function GuestCharts () {
  const [transactions, setTransactions] = useState([])
  const [errorResponse, setErrorResponse] = useState('')
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [income, setIncome] = useState(0)
  const [expenses, setExpenses] = useState(0)

  const data = {
    labels: ['Incomes', 'Expenses'],
    datasets: [
      {
        data: [income, expenses],
        backgroundColor: [
          'rgba(52, 211, 153, 0.2)',
          'rgba(251, 113, 133, 0.2)'
        ],
        borderColor: ['rgba(52, 211, 153, 1)', 'rgba(251, 113, 133, 1)'],

        borderWidth: 1
      }
    ]
  }

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: tooltipItem => `$${tooltipItem.raw.toFixed(2)}`
        },
        titleColor: '#ffffff',
        bodyColor: '#ffffff'
      },
      legend: {
        labels: {
          color: '#ffffff'
        }
      }
    }
  }

  const categories = [
    { label: '📈 Incomes', value: 'disabled', disabled: true },
    { label: '💼 Salary', value: 'Salary' },
    { label: '⏰ Hourly Wages', value: 'Hourly Wages' },
    { label: '🏢 Business Income', value: 'Business Income' },
    { label: '🖋️ Freelance Income', value: 'Freelance Income' },
    { label: '💸 Bonuses and Commissions', value: 'Bonuses and Commissions' },
    { label: '📊 Investment Income', value: 'Investment Income' },
    { label: '🏠 Rental Income', value: 'Rental Income' },
    { label: '🛋️ Retirement Income', value: 'Retirement Income' },
    { label: '🌴 Passive Income', value: 'Passive Income' },
    { label: '👟 Side Hustles', value: 'Side Hustles' },
    { label: '🎁 Gifts Received', value: 'Gifts Received' },
    { label: '🧾 Tax Refund', value: 'Tax Refund' },
    {
      label: '📺 Subscription Reimbursement',
      value: 'Subscription Reimbursement'
    },
    { label: '🔄 Friend Transfers', value: 'Friend Transfers' },
    { label: '🤲 Loaned Money Received', value: 'Loaned Money Received' },

    { label: '💸 Bills', value: 'disabled', disabled: true },
    { label: '🏡 Housing', value: 'Housing' },
    { label: '💡 Utilities', value: 'Utilities' },
    { label: '🍽️ Food', value: 'Food' },
    { label: '🚗 Transportation', value: 'Transportation' },
    { label: '🏥 Medical & Healthcare', value: 'Medical & Healthcare' },
    { label: '🔒 Insurance', value: 'Insurance' },
    { label: '💰 Savings & Investments', value: 'Savings & Investments' },
    { label: '💳 Personal Spending', value: 'Personal Spending' },
    { label: '🔖 Debts', value: 'Debts' },
    { label: '🎓 Education & Training', value: 'Education & Training' },
    { label: '💅 Personal Care', value: 'Personal Care' },
    { label: '👗 Clothing', value: 'Clothing' },
    { label: '🎬 Streaming Service', value: 'Streaming Service' },
    {
      label: '🎡 Recreation & Entertainment',
      value: 'Recreation & Entertainment'
    },
    { label: '✈️ Travel', value: 'Travel' },
    { label: '🎁 Gifts & Donations', value: 'Gifts & Donations' },
    { label: '🐾 Pets', value: 'Pets' },
    { label: '💸 Money Lent to Friends', value: 'Money Lent to Friends' },
    { label: '📝 Debts to Friends', value: 'Debts to Friends' },
    { label: '❓ Other', value: 'Other' }
  ]

  async function getTransactions () {
    const url = import.meta.env.VITE_API_URL + '/transactions'
    const urlCards = import.meta.env.VITE_API_URL + `/cards`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const json = await response.json()
        // Ordenar las transacciones por la fecha
        const sortedTransactions = json.sort((a, b) => {
          // Convertir las fechas a objetos Date y comparar
          return new Date(b.datetime) - new Date(a.datetime)
        })
        setTransactions(sortedTransactions)
      } else {
        const json = await response.json()
      }
    } catch (error) {
      console.error(error)
    }

    try {
      const response = await fetch(urlCards, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        let json = await response.json()
        // Eliminar nulls
        json = json.filter(card => card)
        // en caso de que no haya tarjetas se agrega un string con un mensaje para que el usuario pueda agregar una tarjeta
        if (json.length === 0) {
          json.push('No cards found. Add a new card')
        }

        setCards(json)
      } else {
        const json = await response.json()
        console.log(json)
      }
    } catch (error) {
      console.error(error)
    }
  }

  function deleteTransaction (id) {
    const url = import.meta.env.VITE_API_URL + '/transaction/delete/' + id

    try {
      fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(() => {
          getTransactions()
        })
    } catch (error) {
      console.error(error)
    }
  }

  let balance = 0
  transactions.forEach(transaction => {
    balance += parseFloat(transaction.price)
  })

  useEffect(() => {
    let income = 0
    let expenses = 0
    transactions.forEach(transaction => {
      if (transaction.price[0] === '+') {
        income += parseFloat(transaction.price.slice(1))
      } else {
        expenses += parseFloat(transaction.price.slice(1))
      }
    })
    setIncome(income)
    setExpenses(expenses)
  }, [transactions])

  const swipeRightOptions = id => (
    <div className='flex justify-center items-center gap-x-1'>
      <div
        onClick={() => deleteTransaction(id)}
        className='flex items-center justify-center py-1 bg-red-500 hover:bg-red-300 text-white flex-col w-16 h-full rounded-lg cursor-pointer'
      >
        <MdDelete className='text-xl' />
        <span>Delete</span>
      </div>
    </div>
  )

  useEffect(() => {
    getTransactions()
  }, [])

  return (
    <DefaultLayout>
      <main className='w-full h-full px-10 xl:px-64 my-7'>
        {!!errorResponse && (
          <div className='py-5'>
            <Alert
              icon={
                <MdError className='text-2xl flex justify-center items-center bg-green' />
              }
              action={
                <Button
                  variant='text'
                  color='white'
                  size='sm'
                  className='!absolute top-3 right-3'
                  onClick={() => {
                    setErrorResponse('')
                  }}
                >
                  Close
                </Button>
              }
              className='rounded-none border-l-4 border-[#e34545] bg-[#e34545]/10 font-medium text-[#e34545]'
            >
              {errorResponse}
            </Alert>
          </div>
        )}

        <div className=' flex justify-center mb-4 lg:mb-8 items-center w-full h-96'>
          <Doughnut data={data} options={options} />
        </div>
        <h1 className='text-6xl font-bold text-center text-white m-0'>
          {balance < 0 ? '-$' + Math.abs(balance) : '$' + balance}
        </h1>

        {/* Mostrar unicamente filter en caso de que cards no sea vacio un array vacio [] */}
        {cards.length > 0 && (
          <Filter
            cards={cards}
            setTransactions={setTransactions}
            setLoading={setLoading}
            categories={categories}
          />
        )}

        <div className='flex w-full flex-col lg:flex-row justify-between items-start lg:items-center gap-y-4'>
          <h1 className='text-3xl font-bold'>Transactions</h1>
          <FilterByTime
            setTransactions={setTransactions}
            setLoading={setLoading}
          />
        </div>

        {!loading ? (
          <div className='transactions mt-2.5'>
            <div className='overflow-x-hidden'>
              {transactions.map(transaction => (
                <SwipeableListItem
                  swipeRightOptions={swipeRightOptions(transaction._id)}
                  id={transaction._id}
                  key={`SwipeableItem-${transaction._id}`} // Agregar el índice aquí
                >
                  <Transaction
                    key={`Transaction-${transaction._id}`}
                    categories={categories}
                    {...transaction}
                  />
                </SwipeableListItem>
              ))}
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-5 justify-center items-center h-40'>
            <div
              className='inline-block h-20 w-20 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]'
              role='status'
            >
              <span className='!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]'>
                Loading...
              </span>
            </div>
            <div className='text-3xl'>Loading...</div>
          </div>
        )}
      </main>
    </DefaultLayout>
  )
}
