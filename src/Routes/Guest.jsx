/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { Input } from '@material-tailwind/react'
import Datepicker from 'react-tailwindcss-datepicker'
import { MdEditSquare } from 'react-icons/md'
import { MdDelete } from 'react-icons/md'
import { GrUpdate } from 'react-icons/gr'
import { FaPlus } from 'react-icons/fa6'
import DefaultLayout from '../layout/DefaultLayout'
import { Alert, Button } from '@material-tailwind/react'
import { MdError } from 'react-icons/md'
import { Checkbox, Typography } from '@material-tailwind/react'
import Transaction from '../Components/Transaction'
import SwipeableListItem from '../Components/SwipeableListItem'
import { Select, Option } from '@material-tailwind/react'
import { FaCreditCard } from 'react-icons/fa6'
import Filter from '../Components/Filter'
import FilterByTime from '../Components/FilterByTime'
import SelectIcon from '../Components/SelectIcon'

function Guest () {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [datetime, setDatetime] = useState({
    startDate: null,
    endDate: null
  })
  const [description, setDescription] = useState('')
  const [transactions, setTransactions] = useState([])
  const [editingTransactionId, setEditingTransactionId] = useState(null)
  const [errorResponse, setErrorResponse] = useState('')
  const [checked, setChecked] = useState(false)
  const [category, setCategory] = useState('')
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState()
  const [selectedIcon, setSelectedIcon] = useState()
  const [addingCard, setAddingCard] = useState(false)
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    getTransactions()
  }, [])

  const handleChangeName = event => {
    setName(event.target.value)
  }

  const handleChangePrice = event => {
    setPrice(event.target.value)
  }

  const handleChangeDescription = event => {
    setDescription(event.target.value)
  }

  const handleChangeNewCard = event => {
    setSelectedCard(event.target.value)
  }

  const handleChangeDatetime = newValue => {
    setDatetime(newValue)
  }

  const handleChangeCategory = value => {
    setCategory(value)
  }

  const handleChangeCard = value => {
    if (value !== '') {
      setSelectedCard(value)
    }
  }
  const handleCheckboxChange = event => {
    setChecked(event.target.checked)
    setAddingCard(false)
    setSelectedCard('')
  }

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
        console.log(json)
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

  function editTransaction (id) {
    const transactionToEdit = transactions.find(t => t._id === id)
    if (transactionToEdit) {
      setName(`${transactionToEdit.name}`)
      setPrice(transactionToEdit.price)
      setDatetime({
        startDate: transactionToEdit.datetime,
        endDate: null
      })
      setDescription(transactionToEdit.description)
      setEditingTransactionId(id) // Establecer la ID de la transacción que está siendo editada
      setCategory(transactionToEdit.category)
      const card = transactionToEdit.card

      if (card !== '' && card !== null && card !== undefined) {
        setChecked(true)
      }
      setSelectedCard(card)
    }
  }

  function cancelEdit () {
    setEditingTransactionId(null)
    setName('')
    setPrice('')
    setDatetime({
      startDate: null,
      endDate: null
    })
    setDescription('')
    setCategory('')
    setSelectedCard('')
    setChecked(false)
    setAddingCard(false)
    setSelectedIcon('')
  }

  async function handleSubmit (event) {
    setLoading(true)
    event.preventDefault()
    const url = editingTransactionId
      ? `${
          import.meta.env.VITE_API_URL
        }/transaction/update/${editingTransactionId}`
      : `${import.meta.env.VITE_API_URL}/transaction`

    const method = editingTransactionId ? 'PUT' : 'POST' // Usar PUT para editar, POST para agregar

    //  buscar el icon en cards apartir del selectedCard
    const findCard = cards.find(card => card.name === selectedCard)
    const findIcon = findCard ? findCard.icon : null


    const FinalIcon =
      editingTransactionId || !selectedIcon ? findIcon : selectedIcon

    // hacer el fetch
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          price: price,
          datetime: datetime.startDate,
          description: description,
          category: category,
          card: selectedCard,
          icon: FinalIcon,
          cards: cards
        })
      })
      if (response.ok) {
        const json = await response.json()
        setLoading(false)
        getTransactions()
        cancelEdit()
        setErrorResponse('')
      } else {
        const json = await response.json()
        setLoading(false)
        setErrorResponse(json.error)
      }
    } catch (error) {
      console.error(error)
    }
  }

  let balance = 0
  transactions.forEach(transaction => {
    balance += parseFloat(transaction.price)
  })

  const swipeRightOptions = id => (
    <div className='flex justify-center items-center gap-x-1'>
      <div
        onClick={() => deleteTransaction(id)}
        className='flex items-center justify-center py-1 bg-red-500 hover:bg-red-300 text-white flex-col w-16 h-full rounded-lg cursor-pointer'
      >
        <MdDelete className='text-xl' />
        <span>Delete</span>
      </div>
      <div
        onClick={() => editTransaction(id)}
        className='flex items-center justify-center py-1 bg-blue-500 hover:bg-blue-300 text-white flex-col h-full w-16 rounded-lg cursor-pointer'
      >
        <MdEditSquare className='text-xl' />
        <span>Edit</span>
      </div>
    </div>
  )

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

        {!loading ? (
          <>
            <h1 className='text-6xl font-bold text-center text-white m-0'>
              {balance < 0 ? '-$' + Math.abs(balance) : '$' + balance}
            </h1>
            <form className='mt-5' onSubmit={handleSubmit}>
              <div className='basic flex flex-col 2xl:flex-row gap-3 mb-1'>
                <Input
                  value={price}
                  onChange={handleChangePrice}
                  label='Price'
                  color='white'
                />
                <Input
                  value={name}
                  onChange={handleChangeName}
                  label='Name'
                  color='white'
                />
                <Datepicker
                  useRange={false}
                  asSingle={true}
                  value={datetime}
                  placeholder={datetime.startDate}
                  onChange={handleChangeDatetime}
                  readOnly={true}
                  displayFormat={'DD/MM/YYYY'}
                  inputClassName='peer h-full w-full rounded-[7px] border border-blue-gray-200 bg-transparent text-white px-3 py-2.5 font-sans text-sm font-normal text-blue-gray-700'
                />
              </div>
              <div className='description py-1.5'>
                <Input
                  value={description}
                  onChange={handleChangeDescription}
                  color='white'
                  label='Description'
                />
              </div>
              <div className='flex w-full flex-col lg:flex-row justify-between items-center text-white py-1.5'>
                {/* preguntar si se utilizo tarjeta */}

                <div className='w-72'>
                  <Select
                    label='Category'
                    color='blue'
                    className='text-white'
                    labelProps={{ style: { color: 'white' } }}
                    onChange={handleChangeCategory}
                    value={category}
                  >
                    {categories.map((category, index) => (
                      <Option
                        value={category.value}
                        key={index}
                        disabled={category.disabled}
                      >
                        {category.label}
                      </Option>
                    ))}
                  </Select>
                </div>

                <Checkbox
                  color='blue'
                  label={
                    <div>
                      <Typography color='white' className='font-medium'>
                        Did you use a card?
                      </Typography>
                    </div>
                  }
                  checked={checked}
                  onChange={handleCheckboxChange}
                />
              </div>

              {/* Card */}
              {/* tiene que estar check en true y addingCard false */}
              {checked && !addingCard && (
                <div className='flex w-full justify-between items-center text-white py-1.5'>
                  <div className='w-full'>
                    <Select
                      label='Card'
                      value={selectedCard}
                      color='blue'
                      className='text-white'
                      labelProps={{ style: { color: 'white' } }}
                      onChange={handleChangeCard}
                    >
                      {cards.map((card, index) => (
                        <Option value={card.name} key={index}>
                          {card.icon ? (
                            <div className='flex justify-start items-center gap-x-4'>
                              <img
                                src={`${card.icon}.png`}
                                alt={`${card.icon} Logo`}
                                className='w-8 h-6'
                              />
                              {card.name}
                            </div>
                          ) : (
                            card.name
                          )}
                        </Option>
                      ))}
                    </Select>
                    <div
                      className='py-1.5 w-full flex justify-center items-center'
                      onClick={() => {
                        setAddingCard(true)
                      }}
                    >
                      {!editingTransactionId ? (
                        <div
                          className='py-1.5 w-full flex justify-center items-center'
                          onClick={() => {
                            setAddingCard(true)
                          }}
                        >
                          <div className='flex justify-center items-center gap-x-2 cursor-pointer '>
                            <FaPlus />
                            New card
                          </div>
                        </div>
                      ) : (
                        <></>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {addingCard && (
                <div className='flex flex-col gap-y-2'>
                  <Input
                    value={selectedCard}
                    onChange={handleChangeNewCard}
                    className='py-1.5'
                    color='white'
                    label='Name of the card'
                  />
                  <SelectIcon
                    selectedIcon={selectedIcon}
                    setSelectedIcon={setSelectedIcon}
                  />
                </div>
              )}

              {!editingTransactionId ? (
                <button className='flex flex-row justify-center items-center gap-x-2 w-full my-3 bg-gray-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'>
                  <FaPlus />
                  <span className='relative'>Add new transaction</span>
                </button>
              ) : (
                <>
                  <button className='flex flex-row justify-center items-center gap-x-2 w-full my-1 bg-blue-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'>
                    <GrUpdate />
                    <span className='relative'>Update transaction</span>
                  </button>
                  <button
                    onClick={() => {
                      cancelEdit()
                    }}
                    className='w-full my-1 bg-red-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'
                  >
                    <span className='relative'>Cancel</span>
                  </button>
                </>
              )}
            </form>

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
          </>
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

export default Guest
