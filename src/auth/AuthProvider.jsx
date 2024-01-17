import { useContext, createContext, useState, useEffect } from 'react'
import requestNewAccessToken from './requestNewAccessToken'

const AuthContext = createContext({
  isAuthenticated: false,
  getAccessToken: () => {},
  setAccessTokenAndRefreshToken: (_accessToken, _refreshToken) => {},
  getRefreshToken: () => {},
  saveUser: _userData => {},
  signout: () => {}
})

export function AuthProvider ({ children }) {
  const [user, setUser] = useState({})
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isloading, setIsLoading] = useState(true)

  function getAccessToken () {
    return accessToken
  }

  function saveUser (userData) {
    setAccessTokenAndRefreshToken(
      userData.body.accessToken,
      userData.body.refreshToken
    )
    const userInfo = userData.body.user
    setUser(userInfo)
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
    setIsAuthenticated(true)
  }

  function setAccessTokenAndRefreshToken (accessToken, refreshToken) {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    localStorage.setItem('token', JSON.stringify({ refreshToken }))
  }

  function getRefreshToken () {
    // Intenta obtener el refreshToken del estado
    if (refreshToken) {
      return refreshToken
    }
    // Si no está en el estado, busca en localStorage
    const token = localStorage.getItem('token')
    if (token) {
      const { refreshToken } = JSON.parse(token)
      setRefreshToken(refreshToken)
      return refreshToken
    }
    return null
  }

  async function getNewAccessToken (refreshToken) {
    const token = await requestNewAccessToken(refreshToken)
    if (token) {
      return token
    }
  }

  function getUser () {
    return user
  }

  function signout () {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    setAccessToken('')
    setRefreshToken('')
    setUser(undefined)
    setIsAuthenticated(false)
  }

  async function checkAuth () {
    try {
      if (accessToken !== '' && refreshToken !== '') {
        //existe access token
        // console.log('Existe access token')

        setAccessToken(accessToken)
        setIsAuthenticated(true)
        setIsLoading(false)
      } else {
        //no existe access token
        // console.log('No existe access token')
        const token = localStorage.getItem('token')
        if (token) {
          const refreshToken = JSON.parse(token).refreshToken
          //pedir nuevo access token
          getNewAccessToken(refreshToken)
            .then(async newToken => {
              setAccessToken(newToken)
              setIsAuthenticated(true)
              setIsLoading(false)
            })
            .catch(error => {
              console.log(error)
              setIsLoading(false)
            })
        } else {
          setIsLoading(false)
        }
      }
    } catch (error) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        getAccessToken,
        setAccessTokenAndRefreshToken,
        getRefreshToken,
        saveUser,
        getUser,
        signout
      }}
    >
      {isloading ? (
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
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
