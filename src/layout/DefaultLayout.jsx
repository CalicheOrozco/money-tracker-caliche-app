/* eslint-disable react/prop-types */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaSignInAlt } from 'react-icons/fa'
import { FaUserPlus } from 'react-icons/fa'
import { FaChartLine } from 'react-icons/fa'
import { FaFileInvoiceDollar } from 'react-icons/fa'
import { IoIosMenu } from 'react-icons/io'
import { IoCloseOutline } from 'react-icons/io5'

export default function DefaultLayout ({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  function handleMenu () {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <header className='bg-blue-600 text-white shadow-lg'>
        <nav className='container mx-auto p-4 flex justify-between items-center'>
          {!isOpen ? (
            <>
              <ul className='flex w-full justify-end'>
                <li>
                  <IoIosMenu
                    className='text-3xl cursor-pointer'
                    onClick={handleMenu}
                  />
                </li>
              </ul>
            </>
          ) : (
            <div className='flex w-full justify-between'>
              <ul className='flex flex-col lg:flex-row lg:gap-x-4 gap-y-4  justify-start items-start'>
                <li>
                  <Link
                    to='/guest'
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <FaFileInvoiceDollar className='text-2xl' />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to='/guest-charts'
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <FaChartLine className='text-2xl' />
                    Charts
                  </Link>
                </li>

                <li>
                  <Link
                    to='/signup'
                    className='flex justify-center items-center gap-x-3 text-white hover:text-gray-300 text-lg transition duration-300 ease-in-out'
                  >
                    <FaUserPlus className='text-2xl' />
                    Signup
                  </Link>
                </li>
                <li className='mr-6'>
                  <Link
                    to='/login'
                    className='flex justify-center items-center gap-x-3 text-white hover:text-gray-300 text-lg transition duration-300 ease-in-out'
                  >
                    <FaSignInAlt className='text-2xl' />
                    Login
                  </Link>
                </li>
              </ul>

              <IoCloseOutline
                className='text-3xl cursor-pointer'
                onClick={handleMenu}
              />
            </div>
          )}
        </nav>
      </header>

      <main className='min-h-[calc(100vh-60px)] flex justify-center items-center flex-col'>
        {children}
      </main>
    </>
  )
}
