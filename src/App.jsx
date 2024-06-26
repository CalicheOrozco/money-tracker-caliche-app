// TO DO:
// arreglar el webapp para que se pueda instalar en el telefonoxxxxx|

import { useEffect, useState } from 'react'
import PortalLayout from './layout/PortalLayout.jsx'
import { Input } from '@material-tailwind/react'
import Datepicker from 'react-tailwindcss-datepicker'
import { MdEditSquare } from 'react-icons/md'
import { MdDelete } from 'react-icons/md'
import { GrUpdate } from 'react-icons/gr'
import { FaPlus } from 'react-icons/fa6'
import { Alert, Button } from '@material-tailwind/react'
import { MdError } from 'react-icons/md'
import { Checkbox, Typography } from '@material-tailwind/react'
import { Select, Option } from '@material-tailwind/react'
import Transaction from './Components/Transaction.jsx'
import SwipeableListItem from './Components/SwipeableListItem'
import Filter from './Components/Filter.jsx'
import FilterByTime from './Components/FilterByTime.jsx'
import SelectIcon from './Components/SelectIcon.jsx'
import categories from './constants/data.jsx'
import Export from './Components/Export.jsx'

export default function App () {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'))

  const [name, setName] = useState('')
  const [userID, setUserID] = useState(userInfo.id)
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
  const [cards, setCards] = useState('')
  const [selectedCard, setSelectedCard] = useState()
  const [selectedIcon, setSelectedIcon] = useState()
  const [addingCard, setAddingCard] = useState(false)
  const [loading, setLoading] = useState(false)

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

  async function getUserTransactions () {
    const url = import.meta.env.VITE_API_URL + `/transactions/${userID}`
    const urlCards = import.meta.env.VITE_API_URL + `/cards/${userID}`

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
          getUserTransactions()
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
    getUserTransactions()
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
      : `${import.meta.env.VITE_API_URL}/transaction/${userID}`

    const method = editingTransactionId ? 'PUT' : 'POST' // Usar PUT para editar, POST para agregar

    //  buscar el icon en cards apartir del selectedCard
    console.log(selectedCard)
    const findCard = cards.find(card => card.name === selectedCard)
    console.log('findCard', findCard)
    const findIcon = findCard ? findCard.icon : null
    console.log('findIcon', findIcon)

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
          userID: userID,
          description: description,
          category: category,
          card: selectedCard,
          icon: FinalIcon,
          cards: cards
        })
      })
      if (response.ok) {
        const json = await response.json()

        getUserTransactions()
        cancelEdit()
        setErrorResponse('')
        setLoading(false)
      } else {
        const json = await response.json()
        setErrorResponse(json.error)
        setLoading(false)
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

  useEffect(() => {
    getUserTransactions()
  }, [])

  useEffect(() => {
    if (userInfo) {
      setUserID(userInfo.id)
    }
  }, [userInfo])

  return (
    <PortalLayout>
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
              <div className='basic flex flex-col xl:flex-row gap-3 mb-1'>
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
            <div className='flex flex-row justify-center items-center'>
              <Export transactions={transactions} />
              {/* Mostrar unicamente filter en caso de que cards no sea vacio un array vacio [] */}
              {cards.length > 0 && (
                <Filter
                  userID={userID}
                  cards={cards}
                  setTransactions={setTransactions}
                  setLoading={setLoading}
                  categories={categories}
                />
              )}
            </div>

            <div className='flex w-full flex-col lg:flex-row justify-between items-start lg:items-center gap-y-4'>
              <h1 className='text-3xl font-bold'>Transactions</h1>
              <FilterByTime
                setTransactions={setTransactions}
                setLoading={setLoading}
                userID={userID}
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
    </PortalLayout>
  )
}
