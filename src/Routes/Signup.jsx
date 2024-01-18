import { useState } from 'react'
import DefaultLayout from '../layout/DefaultLayout'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Input } from '@material-tailwind/react'
import { Alert, Button } from '@material-tailwind/react'
import { MdError } from 'react-icons/md'

export default function Signup () {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorResponse, setErrorResponse] = useState('')

  const auth = useAuth()
  const goTo = useNavigate()

  async function handleSubmit (e) {
    e.preventDefault()
    console.log(username, password, name)
    const url = import.meta.env.VITE_API_URL + '/signup'

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name })
      })
      if (response.ok) {
        const json = await response.json()
        setUsername('')
        setPassword('')
        setName('')
        goTo('/login')
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
      <form
        onSubmit={handleSubmit}
        className='form flex justify-center items-center flex-col gap-y-8 px-80  w-full'
      >
        <h1 className='text-4xl font-bold pb-10'>Signup</h1>
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
          value={name}
          onChange={e => setName(e.target.value)}
          label='Name'
          color='white'
        />

        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          label='username'
          color='white'
        />

        <Input
          value={password}
          onChange={e => setPassword(e.target.value)}
          label='password'
          color='white'
          type='password'
        />

        <button className='gap-x-2 w-full my-1 bg-blue-300 btn-default overflow-hidden relative bg-stone-50 text-gray-900 py-4 px-4 rounded-xl font-bold uppercase transition-all duration-100 -- hover:shadow-md border border-stone-100 hover:bg-gradient-to-t hover:from-stone-100 before:to-stone-50 hover:-translate-y-[3px]'>
          <span className='relative'>Create account</span>
        </button>
      </form>
    </DefaultLayout>
  )
}
