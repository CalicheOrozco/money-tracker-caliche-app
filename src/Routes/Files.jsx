import React, { useEffect, useState } from 'react'
import PortalLayout from '../layout/PortalLayout.jsx'
import * as XLSX from 'xlsx'
import { FaFileCsv } from 'react-icons/fa'
import Datepicker from 'react-tailwindcss-datepicker'
import { Select, Option, Input } from '@material-tailwind/react'
import categories from '../constants/data.jsx' 

function Files () {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'))

  const [userID, setUserID] = useState(userInfo.id)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [info, setInfo] = useState([])
  const [checked, setChecked] = useState(true)
  const [cards, setCards] = useState([])
  const [dateIndex, setDateIndex] = useState()
  const [NameIndex, setNameIndex] = useState(0)
  const [amountIndex, setAmountIndex] = useState(0)
  const [descriptionIndex, setDescriptionIndex] = useState(0)
  const [cardIndex, setCardIndex] = useState(0)
  const [finished, setFinished] = useState(false)


  const handleFileChange = event => {
    const files = event.target.files
    setFinished(false)
    processFiles(files)
  }

  async function getCards () {
    const urlCards = import.meta.env.VITE_API_URL + `/cards/${userID}`
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

  const handleSubmit = async event => {
    event.preventDefault()
    const transactions = info.map(transaction => {
      const cardName = transaction[cardIndex]
      const findCard = cards.find(card => card.name === cardName)
      const Icon = findCard ? findCard.icon : null
      const category = transaction['category']

      return [
        transaction[dateIndex],
        transaction[NameIndex],
        transaction[descriptionIndex],
        transaction[amountIndex],
        cardName || '',
        category || '',
        Icon || ''
      ]
    })

    const url = import.meta.env.VITE_API_URL + `/transactions/multi/${userID}`
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactions)
      })

      if (response.ok) {
        const result = await response.json()
        setInfo([])
        setFinished(true)
      } else {
        const error = await response.json()
        console.error('Error saving transactions:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleChangeAmount = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index][amountIndex] = value
    setInfo(updatedInfo)
  }

  const handleChangeDescription = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index][descriptionIndex] = value
    setInfo(updatedInfo)
  }

  const handleChangeName = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index][NameIndex] = value
    setInfo(updatedInfo)
  }

  const handleChangeDatetime = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index][dateIndex] = value
    setInfo(updatedInfo)
  }

  const handleChangeCategory = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index]['category'] = value // Assuming you add a category property
    setInfo(updatedInfo)
  }

  const handleChangeCard = (index, value) => {
    const updatedInfo = [...info]
    updatedInfo[index][cardIndex] = value
    setInfo(updatedInfo)
  }

  const handleDrop = event => {
    event.preventDefault()
    setIsDragOver(false)
    setFinished(false)

    const files = event.dataTransfer.files
    processFiles(files)
    setIsDragOver(false)
  }

  const handleDragLeave = event => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDragOver = event => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleCancel = () => {
    setInfo([])
  }

  useEffect(() => {
    getCards()
  }, [])

  useEffect(() => {
    if (userInfo) {
      setUserID(userInfo.id)
    }
  }, [userInfo])

  const processFiles = files => {
    const filteredFiles = Array.from(files).filter(file =>
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ].includes(file.type)
    )
    setSelectedFiles(filteredFiles)
  }

  const compareFiles = async () => {
    if (selectedFiles.length > 1) {
      alert('Por favor, selecciona solo 1 archivo')
      return
    }

    setFinished(false)

    const file = selectedFiles[0]
    let info = await readExcelFile(file)
    // remplazar los " " por ""
    info[0].data = info[0].data.map(row =>
      row.map(cell => (cell === ' ' ? '' : cell))
    )
    const header = info[0].data[0]

    setDateIndex(header.indexOf('Date'))
    setNameIndex(header.indexOf('Name'))
    setAmountIndex(header.indexOf('Amount'))
    setCardIndex(header.indexOf('Card'))
    setDescriptionIndex(header.indexOf('Description'))

    info[0].data.shift()
    setInfo(info[0].data)
  }

  const readExcelFile = file => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.readAsArrayBuffer(file)
      fileReader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'buffer' })
        resolve(
          wb.SheetNames.map(sheetName => ({
            sheetName,
            data: XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
              header: 1,
              defval: ' '
            })
          }))
        )
      }
      fileReader.onerror = reject
    })
  }

  return (
    <PortalLayout>
      {finished && (
        <div className='flex flex-col  pt-5 items-center justify-center w-full'>
          <h1 className='text-2xl font-bold text-green-400 text-center'>
            Your transactions have been uploaded successfully!
          </h1>
        </div>
      )}
      {info.length > 0 ? (
        <div>
          <form className='mt-5' onSubmit={handleSubmit}>
            {info.map((transaction, index) => (
              <div key={index} className='py-5'>
                <div className='basic flex flex-col xl:flex-row gap-3 mb-1'>
                  <Input
                    value={transaction[amountIndex]}
                    onChange={e => handleChangeAmount(index, e.target.value)}
                    label='Price'
                    color='white'
                  />
                  <Input
                    value={transaction[NameIndex]}
                    onChange={e => handleChangeName(index, e.target.value)}
                    label='Name'
                    color='white'
                  />
                  <Datepicker
                    useRange={false}
                    asSingle={true}
                    value={{
                      startDate: transaction[dateIndex],
                      endDate: transaction[dateIndex]
                    }}
                    placeholder={'Date'}
                    onChange={value =>
                      handleChangeDatetime(index, value.startDate)
                    }
                    readOnly={true}
                    displayFormat={'DD/MM/YYYY'}
                    inputClassName='peer h-full w-full rounded-[7px] border border-blue-gray-200 bg-transparent text-white px-3 py-2.5 font-sans text-sm font-normal text-blue-gray-700'
                  />
                </div>

                <div className='flex w-full flex-col lg:flex-row justify-between items-center text-white py-1.5'>
                  <Input
                    value={transaction[descriptionIndex]}
                    onChange={value =>
                      handleChangeDescription(index, value.target.value)
                    }
                    color='white'
                    label='Description'
                  />
                </div>

                <div className='flex w-full flex-col lg:flex-row justify-between items-center text-white py-1.5'>
                  <div className='w-72'>
                    <Select
                      label='Category'
                      color='blue'
                      className='text-white'
                      labelProps={{ style: { color: 'white' } }}
                      onChange={value => handleChangeCategory(index, value)}
                    >
                      {categories.map((category, idx) => (
                        <Option
                          value={category.value}
                          key={idx}
                          disabled={category.disabled}
                        >
                          {category.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className='flex w-full justify-between items-center text-white py-1.5'>
                  <div className='w-full'>
                    <Select
                      label='Card'
                      value={transaction[cardIndex]}
                      color='blue'
                      className='text-white'
                      labelProps={{ style: { color: 'white' } }}
                      onChange={value => handleChangeCard(index, value)}
                    >
                      {cards.map((card, idx) => (
                        <Option value={card.name} key={idx}>
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
                  </div>
                </div>
                {/* una linea negra */}
                <hr className='border border-gray-600 dark:border-gray-400' />
              </div>
            ))}
            <div className='flex justify-center items-center w-full gap-10 py-5'>
              <button
                type='submit'
                className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className='flex flex-col items-center w-full justify-center p-10'>
          <div
            className={`flex items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg ${
              isDragOver ? 'dark:bg-gray-700 bg-gray-200' : 'dark:bg-gray-800'
            } hover:bg-gray-700 `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              padding: '10px'
            }}
          >
            <label
              htmlFor='dropzone-file'
              className='flex flex-col items-center cursor-pointer justify-center w-full h-64'
            >
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <FaFileCsv className='text-3xl' />
                <p className='mb-2 text-xl'>
                  <span className='font-semibold'>Click to upload</span> or
                  drag-and-drop files
                </p>
                <p className='text-xl'>just files .csv, .xlsx</p>
              </div>
              <input
                id='dropzone-file'
                type='file'
                multiple
                accept='.csv, .xlsx'
                onChange={handleFileChange}
                className='hidden'
              />
            </label>
          </div>

          <div className='mt-4'>
            <strong>Valid selected files:</strong>
            <ul>
              {selectedFiles.map((file, index) => (
                <li
                  key={index}
                  className='text-sm text-gray-600 dark:text-gray-400'
                >
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={compareFiles}
            className='mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white font-bold rounded'
          >
            Upload file
          </button>
        </div>
      )}
    </PortalLayout>
  )
}

export default Files
