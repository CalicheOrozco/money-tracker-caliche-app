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

import Transaction from './Components/Transaction.jsx'
import SwipeableListItem from './Components/SwipeableListItem'

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

  const handleChangeName = event => {
    setName(event.target.value)
  }

  const handleChangePrice = event => {
    setPrice(event.target.value)
  }

  const handleChangeDescription = event => {
    setDescription(event.target.value)
  }

  const handleChangeDatetime = newValue => {
    setDatetime(newValue)
  }

  async function getUserTransactions () {
    const url = import.meta.env.VITE_API_URL + `/transactions/${userID}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const json = await response.json()

        setTransactions(json.reverse())
      } else {
        const json = await response.json()
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
  }

  async function handleSubmit (event) {
    event.preventDefault()
    const url = editingTransactionId
      ? `${
          import.meta.env.VITE_API_URL
        }/transaction/update/${editingTransactionId}`
      : `${import.meta.env.VITE_API_URL}/transaction/${userID}`

    const method = editingTransactionId ? 'PUT' : 'POST' // Usar PUT para editar, POST para agregar

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
          userID: userID
        })
      })
      if (response.ok) {
        const json = await response.json()

        getUserTransactions()
        cancelEdit()
        setErrorResponse('')
      } else {
        const json = await response.json()
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
      <main className='w-full h-full px-10 xl:px-80 my-7'>
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
        <h1 className='text-6xl font-bold text-center text-white m-0'>
          {`$${balance}`}
        </h1>
        <form className='mt-5' onSubmit={handleSubmit}>
          <div className='basic flex gap-3 mb-1'>
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

            {/* <input type='text' placeholder='Category' /> */}
          </div>

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
                  {...transaction}
                />
              </SwipeableListItem>
            ))}
          </div>
        </div>
      </main>
    </PortalLayout>
  )
}
