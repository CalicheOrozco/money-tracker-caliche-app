import React from 'react'
import * as XLSX from 'xlsx'
import { FaFileExport } from 'react-icons/fa'

function Export ({ transactions }) {
  const exportToCSV = () => {
    // eliminar _id, userID, icon, __v
    transactions.forEach(transaction => {
      delete transaction._id
      delete transaction.userID
      delete transaction.icon
      delete transaction.__v
      //   eliminar T00:00:00.000Z de datatime
      transaction.datetime = transaction.datetime.slice(0, 10)
    })
    const fileType =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    const fileExtension = '.xlsx'
    const fileName = 'transactions'
    const ws = XLSX.utils.json_to_sheet(transactions)
    const wb = { Sheets: { data: ws }, SheetNames: ['data'] }
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: fileType })
    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName + fileExtension
    a.click()
  }

  return (
    <div>
      <div
        onClick={exportToCSV}
        className='flex flex-row items-center gap-x-2 cursor-pointer'
      >
        <FaFileExport />
        <a>Export</a>
      </div>
    </div>
  )
}

export default Export
