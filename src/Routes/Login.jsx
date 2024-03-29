import { useState } from 'react'
import DefaultLayout from '../layout/DefaultLayout'
import { Input } from '@material-tailwind/react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button } from '@material-tailwind/react'
import { MdError } from 'react-icons/md'

export default function Login () {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorResponse, setErrorResponse] = useState('')

  const auth = useAuth()

  async function handleSubmit (e) {
    e.preventDefault()
    const url = import.meta.env.VITE_API_URL + '/login'
    // auth.setIsAuthenticated(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (response.ok) {
        const json = await response.json()

        if (json.body.accessToken && json.body.refreshToken) {
          auth.saveUser(json)
          
        }
      } else {
        const json = await response.json()

        setErrorResponse(json.body.error)
      }
    } catch (error) {
      console.log(error)
    }
  }
  if (auth.isAuthenticated) {
    return <Navigate to='/' />
  }
  return (
    <DefaultLayout>
      <h1 className='text-4xl font-bold pb-10'>Login</h1>
      <form
        onSubmit={handleSubmit}
        className='form flex justify-center items-center flex-col gap-y-8 px-80  w-full'
      >
        {!!errorResponse && (
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
        )}
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          label='Username'
          color='white'
        />

        <Input
          value={password}
          onChange={e => setPassword(e.target.value)}
          label='Password'
          color='white'
          type='password'
        />

        <button className='gap-x-2 w-full my-1 bg-blue-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'>
          <span className='relative'>Login</span>
        </button>
      </form>
    </DefaultLayout>
  )
}
