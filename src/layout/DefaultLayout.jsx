/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom'
import { FaSignInAlt } from 'react-icons/fa'
import { FaUserPlus } from 'react-icons/fa'

export default function DefaultLayout ({ children }) {
  return (
    <>
      <header className='bg-blue-600 text-white shadow-lg'>
        <nav className='container mx-auto p-4'>
          <ul className='flex justify-between items-center'>
            <li className='mr-6'>
              <Link
                to='/login'
                className='flex justify-center items-center gap-x-3 text-white hover:text-gray-300 text-lg transition duration-300 ease-in-out'
              >
                <FaSignInAlt className='text-2xl' />
                Login
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
          </ul>
        </nav>
      </header>

      <main className='min-h-[calc(100vh-60px)] flex justify-center items-center flex-col'>
        {children}
      </main>
    </>
  )
}
