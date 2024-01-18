import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MdLogout } from 'react-icons/md'
import { FaFileInvoiceDollar } from 'react-icons/fa'

export default function PortalLayout ({ children }) {
  const auth = useAuth()
  const userInfo = JSON.parse(localStorage.getItem('userInfo'))

  async function handleSignOut (e) {
    e.preventDefault()
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
      }
    } catch (error) {
      console.log(error)
    }
  }
  return (
    <>
      <header className='bg-blue-600 text-white shadow-lg'>
        <nav className='container mx-auto p-4 flex justify-between items-center'>
          <ul className='flex w-full justify-between'>
            <div>
              <li className='mr-6'>
                <Link
                  to='/'
                  className='flex justify-center items-center gap-x-3 hover:text-blue-200 transition duration-300'
                >
                  <FaFileInvoiceDollar className='text-2xl' />
                  Dashboard
                </Link>
              </li>
            </div>

            <div className='flex'>
              <li className='mr-6'>
                Welcome{' '}
                {userInfo.username.charAt(0).toUpperCase() +
                  userInfo.username.slice(1)}{' '}
                !
              </li>
              <li>
                <a
                  href='#'
                  onClick={handleSignOut}
                  className='flex justify-center items-center gap-x-3 hover:text-blue-200 transition duration-300'
                >
                  <MdLogout className='text-2xl' />
                  Sign out
                </a>
              </li>
            </div>
          </ul>
        </nav>
      </header>

      <main className='min-h-[calc(100vh-60px)] flex justify-center items-center flex-col'>
        {children}
      </main>
    </>
  )
}
