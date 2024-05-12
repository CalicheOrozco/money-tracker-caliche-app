import React, { useState } from 'react'
import { Select, Option } from '@material-tailwind/react'
import Datepicker from 'react-tailwindcss-datepicker'
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md'

export default function Filter ({
  userID,
  setTransactions,
  cards,
  setLoading,
  categories
}) {
  const [selectedCardFilter, setSelectedCardFilter] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = React.useState(false)
  const [datetimeFilter, setDatetimeFilter] = useState({
    startDate: null,
    endDate: null
  })

  //   handleOpen va a invertir el valor de open
  const handleOpen = () => {
    setOpen(!open)
  }

  const handleChangeCategoryFilter = value => {
    setCategoryFilter(value)
  }

  const handleChangeDatetimeFilter = newValue => {
    setDatetimeFilter(newValue)
  }

  const handleChangeCardFilter = value => {
    setSelectedCardFilter(value)
  }

  const handleReset = () => {
    setCategoryFilter('')
    setDatetimeFilter({
      startDate: null,
      endDate: null
    })
    setSelectedCardFilter([])
  }

  const handleSearch = () => {
    getUserTransactionsFilter()
  }

  async function getUserTransactionsFilter () {
    setLoading(true)
    const queryParams = new URLSearchParams({
      ...(categoryFilter && { category: categoryFilter }),
      ...(selectedCardFilter && { card: selectedCardFilter }),
      ...(datetimeFilter.startDate && {
        startDate: new Date(datetimeFilter.startDate)
          .toISOString()
          .split('T')[0]
      }),
      ...(datetimeFilter.endDate && {
        endDate: new Date(datetimeFilter.endDate).toISOString().split('T')[0]
      })
    }).toString()

    // Construir la URL dependiendo de si userID es proporcionado o no
    const baseApiUrl = import.meta.env.VITE_API_URL
    const url = userID
      ? `${baseApiUrl}/transactions/${userID}?${queryParams}`
      : `${baseApiUrl}/transactions?${queryParams}`

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
        setLoading(false)
      } else {
        const json = await response.json()
        console.error('Failed to fetch transactions:', json)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setLoading(false)
    }
  }

  return (
    <div className='w-full'>
      <div className='flex flex-row justify-end items-center gap-4'>
        <button
          onClick={handleOpen}
          className='flex flex-row justify-center items-center my-4 btn-default overflow-hidden relative bg-stone-50 text-white py-3 px-3 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'
        >
          <span className='relative'>Filter</span>
          {open ? (
            <MdKeyboardArrowUp className='text-3xl' />
          ) : (
            <MdKeyboardArrowDown className='text-3xl' />
          )}
        </button>
      </div>
      {open ? (
        <div className='flex pt-2 flex-col 2xl:flex-row gap-4 justify-center items-center'>
          <div className='flex w-full 2xl:w-60 flex-col'>
            <Datepicker
              useRange={false}
              asSingle={false}
              value={datetimeFilter}
              placeholder={'Select Date'}
              onChange={handleChangeDatetimeFilter}
              readOnly={true}
              displayFormat={'DD/MM/YYYY'}
              inputClassName='peer h-full w-full rounded-[7px] border border-blue-gray-200 bg-transparent text-white px-3 py-2.5 font-sans text-sm font-normal text-blue-gray-700'
            />
          </div>

          <div className='flex w-full 2xl:w-60 flex-col'>
            <Select
              label='Category'
              color='blue'
              className='text-white relative z-50'
              labelProps={{ style: { color: 'white' } }}
              onChange={handleChangeCategoryFilter}
              value={categoryFilter}
            >
              {/* Grupo de Ingresos */}
              {categories.map((category, index) => {
                if (category.disabled) {
                  return (
                    <Option key={index} disabled={true} value={category.value}>
                      {category.label}
                    </Option>
                  )
                } else {
                  return (
                    <Option key={index} value={category.value}>
                      {category.label}
                    </Option>
                  )
                }
              })}
            </Select>
          </div>

          <div className='flex w-full 2xl:w-60 flex-col'>
            <Select
              label='Cards'
              color='blue'
              className='text-white relative z-50'
              labelProps={{ style: { color: 'white' } }}
              onChange={handleChangeCardFilter}
              value={selectedCardFilter}
            >
              {cards.length > 0 &&
              cards[0] !== 'No cards found. Add a new card' ? (
                cards.map((card, index) => (
                  <Option key={index} value={card}>
                    {card}
                  </Option>
                ))
              ) : (
                <Option disabled={true} value=''>
                  No cards found. Add a new card
                </Option>
              )}
            </Select>
          </div>

          <div className='flex flex-row gap-4'>
            <button
              onClick={handleReset}
              className='flex flex-row justify-center items-center gap-x-2 my-3 bg-gray-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'
            >
              <span className='relative'>Reset</span>
            </button>

            <button
              onClick={handleSearch}
              className='flex flex-row justify-center items-center gap-x-2 my-3 bg-blue-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'
            >
              <span className='relative'>Search</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
