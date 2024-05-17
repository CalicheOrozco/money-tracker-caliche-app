import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MdLogout } from 'react-icons/md'
import { FaFileInvoiceDollar } from 'react-icons/fa'
import { IoIosMenu } from 'react-icons/io'
import { IoCloseOutline } from 'react-icons/io5'
import { FaChartLine } from 'react-icons/fa'
import { FaFileCsv } from 'react-icons/fa'

export default function PortalLayout ({ children }) {
  const auth = useAuth()
  const userInfo = JSON.parse(localStorage.getItem('userInfo'))
  const [isOpen, setIsOpen] = useState(false)
  const [isSignOut, setIsSignOut] = useState(false)

  async function handleSignOut (e) {
    e.preventDefault()
    setIsSignOut(true)
    const url = import.meta.env.VITE_API_URL + '/signout'
    const refreshToken = auth.getRefreshToken()

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`
        }
      })
      if (response.ok) {
        auth.signout()
        setIsSignOut(false)
      }
    } catch (error) {
      console.log(error)
      setIsSignOut(false)
    }
  }

  function handleMenu () {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <header className='bg-blue-600 text-white shadow-lg'>
        <nav className='container mx-auto p-4 flex justify-between items-center'>
          {!isOpen ? (
            <>
              <ul className='flex w-full justify-between'>
                <li className='mr-6'>
                  Welcome{' '}
                  {userInfo.username.charAt(0).toUpperCase() +
                    userInfo.username.slice(1)}{' '}
                  !
                </li>
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
                    to='/'
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <FaFileInvoiceDollar className='text-2xl' />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to='/charts'
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <FaChartLine className='text-2xl' />
                    Charts
                  </Link>
                </li>
                <li>
                  <Link
                    to='/files'
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <FaFileCsv className='text-2xl' />
                    Import
                  </Link>
                </li>

                <li>
                  <a
                    href='#'
                    onClick={handleSignOut}
                    className='flex justify-center items-center  hover:text-blue-200 transition duration-300'
                  >
                    <MdLogout className='text-2xl' />
                    Sign out
                  </a>
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
        {isSignOut ? (
          <div className='flex flex-col gap-5 justify-center items-center h-screen'>
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
        ) : (
          children
        )}
      </main>
    </>
  )
}
