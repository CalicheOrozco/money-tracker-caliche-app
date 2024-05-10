import React, { useState } from 'react'
import { Select, Option } from '@material-tailwind/react'
import Datepicker from 'react-tailwindcss-datepicker'
import {
  Accordion,
  AccordionHeader,
  AccordionBody
} from '@material-tailwind/react'

function Icon ({ id, open }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={2}
      stroke='currentColor'
      className={`${
        id === open ? 'rotate-180' : ''
      } h-5 w-5 transition-transform`}
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M19.5 8.25l-7.5 7.5-7.5-7.5'
      />
    </svg>
  )
}

export default function Filter ({ userID, setTransactions, cards }) {
  const [selectedCardFilter, setSelectedCardFilter] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [open, setOpen] = React.useState(0)
  const [datetimeFilter, setDatetimeFilter] = useState({
    startDate: null,
    endDate: null
  })

  const handleOpen = value => setOpen(open === value ? 0 : value)

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
        setTransactions(json.reverse())
      } else {
        const json = await response.json()
        console.error('Failed to fetch transactions:', json)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  return (
    <div class='w-full pb-6'>
      <Accordion open={open === 1} icon={<Icon id={1} open={open} />}>
        <AccordionHeader
          className='text-white hover:text-gray-400'
          onClick={() => handleOpen(1)}
        >
          Filter
        </AccordionHeader>
        <AccordionBody>
          <div class='flex pt-2 flex-col 2xl:flex-row gap-4 justify-center items-center'>
            <div class='flex w-full 2xl:w-60 flex-col'>
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

            <div class='flex w-full 2xl:w-60 flex-col'>
              <Select
                label='Category'
                color='blue'
                className='text-white'
                labelProps={{ style: { color: 'white' } }}
                onChange={handleChangeCategoryFilter}
                value={categoryFilter}
              >
                <Option value='Salary'>Salary</Option>
                <Option value='Hourly Wages'>Hourly Wages</Option>
                <Option value='Business Income'>Business Income</Option>
                <Option value='Freelance Income'>Freelance Income</Option>
                <Option value='Bonuses and Commissions'>
                  Bonuses and Commissions
                </Option>
                <Option value='Investment Income'>Investment Income</Option>
                <Option value='Rental Income'>Rental Income</Option>
                <Option value='Retirement Income'>Retirement Income</Option>
                <Option value='Passive Income'>Passive Income</Option>
                <Option value='Side Hustles'>Side Hustles</Option>
                <Option value='Gifts Received'>Gifts Received</Option>
                <Option value='Tax Refund'>Tax Refund</Option>

                <Option value='Housing'>Housing</Option>
                <Option value='Utilities'>Utilities</Option>
                <Option value='Food'>Food</Option>
                <Option value='Transportation'>Transportation</Option>
                <Option value='Medical & Healthcare'>
                  Medical & Healthcare
                </Option>
                <Option value='Insurance'>Insurance</Option>
                <Option value='Savings & Investments'>
                  Savings & Investments
                </Option>
                <Option value='Personal Spending'>Personal Spending</Option>
                <Option value='Debts'>Debts</Option>
                <Option value='Education & Training'>
                  Education & Training
                </Option>
                <Option value='Personal Care'>Personal Care</Option>
                <Option value='Clothing'>Clothing</Option>
                <Option value='Streaming Service'>Streaming Service</Option>
                <Option value='Recreation & Entertainment'>
                  Recreation & Entertainment
                </Option>
                <Option value='Travel'>Travel</Option>
                <Option value='Gifts & Donations'>Gifts & Donations</Option>
                <Option value='Pets'>Pets</Option>
                <Option value='Other'>Other</Option>
              </Select>
            </div>

            <div class='flex w-full 2xl:w-60 flex-col'>
              <Select
                label='Cards'
                color='blue'
                className='text-white'
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

            <div class='flex flex-row gap-4'>
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
        </AccordionBody>
      </Accordion>
    </div>
  )
}
