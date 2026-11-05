import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  api,
  clearSession,
  getRefreshToken,
  publicRequest,
  refreshAccessToken,
  setSession
} from '../lib/api.js'
import { disablePush } from '../lib/push.js'

const AuthContext = createContext(null)

export function AuthProvider ({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getRefreshToken()) {
      setReady(true)
      return
    }

    refreshAccessToken()
      .then(() => api('/profile'))
      .then(setUser)
      .catch(error => {
        // Offline or a slow server keeps the session for the next try.
        if (error.status === 401 || error.status === 403) clearSession()
      })
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (username, password) => {
    const { body } = await publicRequest('/login', {
      method: 'POST',
      body: { username, password }
    })
    setSession(body.accessToken, body.refreshToken)
    setUser(await api('/profile'))
  }, [])

  const signup = useCallback(fields => {
    return publicRequest('/signup', { method: 'POST', body: fields })
  }, [])

  const endLocalSession = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // The local session always ends, even if the server could not be reached.
  const signout = useCallback(async () => {
    await disablePush().catch(() => {})
    const token = getRefreshToken()
    if (token) {
      await publicRequest('/signout', { method: 'DELETE', token }).catch(() => {})
    }
    endLocalSession()
  }, [endLocalSession])

  const updateProfile = useCallback(async patch => {
    const updated = await api('/profile', { method: 'PATCH', body: patch })
    setUser(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ user, ready, setUser, login, signup, signout, endLocalSession, updateProfile }),
    [user, ready, login, signup, signout, endLocalSession, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
