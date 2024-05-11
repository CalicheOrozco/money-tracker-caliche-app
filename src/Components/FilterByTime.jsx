import React, { useEffect, useState } from 'react'
import { Select, Option } from '@material-tailwind/react'

export default function FilterByTime ({ userID, setTransactions, setLoading }) {
  const [datetimeFilter, setDatetimeFilter] = useState({
    startDate: null,
    endDate: null
  })
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('')

  const handleChangeDatetimeFilter = newValue => {
    if (newValue === '1 Year') {
      const now = new Date()
      const lastYear = new Date(now.setFullYear(now.getFullYear() - 1))
      setDatetimeFilter({
        startDate: lastYear,
        endDate: new Date()
      })
    }
    if (newValue === '6 Months') {
      const now = new Date()
      const last6Months = new Date(now.setMonth(now.getMonth() - 6))
      setDatetimeFilter({
        startDate: last6Months,
        endDate: new Date()
      })
    }
    if (newValue === '1 Month') {
      const now = new Date()
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1))
      setDatetimeFilter({
        startDate: lastMonth,
        endDate: new Date()
      })
    }
    if (newValue === '15 Days') {
      const now = new Date()
      const last15Days = new Date(now.setDate(now.getDate() - 15))
      setDatetimeFilter({
        startDate: last15Days,
        endDate: new Date()
      })
    }
    if (newValue === '7 Days') {
      const now = new Date()
      const last7Days = new Date(now.setDate(now.getDate() - 7))
      setDatetimeFilter({
        startDate: last7Days,
        endDate: new Date()
      })
    }
    if (newValue === 'All') {
      setDatetimeFilter({
        startDate: null,
        endDate: null
      })
    }
    setSelectedTimeFilter(newValue)
  }

  useEffect(() => {
    if (selectedTimeFilter) {
      getUserTransactionsFilter()
    }
  }, [selectedTimeFilter])

  async function getUserTransactionsFilter () {
    setLoading(true)
    const queryParams = new URLSearchParams({
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
    <div>
      <Select
        label='By time'
        color='blue'
        className='text-white w-full relative'
        labelProps={{ style: { color: 'white' } }}
        onChange={handleChangeDatetimeFilter}
        value={selectedTimeFilter}
      >
        <Option value='1 Year'>1 Year</Option>
        <Option value='6 Months'>6 Months</Option>
        <Option value='1 Month'>1 Month</Option>
        <Option value='15 Days'>15 Days</Option>
        <Option value='7 Days'>7 Days</Option>
        <Option value='All'>All</Option>
      </Select>
    </div>
  )
}
