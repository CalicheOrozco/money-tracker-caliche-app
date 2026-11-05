const STORAGE_KEY = 'token'

let accessToken = ''

export function getRefreshToken () {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))?.refreshToken || null
  } catch {
    return null
  }
}

export function setSession (access, refresh) {
  accessToken = access
  if (refresh) localStorage.setItem(STORAGE_KEY, JSON.stringify({ refreshToken: refresh }))
}

export function clearSession () {
  accessToken = ''
  localStorage.removeItem(STORAGE_KEY)
}

class ApiError extends Error {
  constructor (message, status) {
    super(message)
    this.status = status
  }
}

async function request (path, { method = 'GET', body, token } = {}) {
  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0)
  }

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const message = json?.error || json?.body?.error || 'Something went wrong.'
    throw new ApiError(message, response.status)
  }
  return json
}

export async function refreshAccessToken () {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError('No session.', 401)

  const json = await request('/refresh-token', {
    method: 'POST',
    body: { refreshToken }
  })
  accessToken = json.body.accessToken
  return accessToken
}

// Access tokens live for an hour, so one expired mid-session is renewed once
// and the request retried.
export async function api (path, options = {}) {
  try {
    return await request(path, { ...options, token: accessToken })
  } catch (error) {
    const expired = error.status === 401 || error.status === 403
    if (!expired || !getRefreshToken()) throw error
  }

  let token
  try {
    token = await refreshAccessToken()
  } catch (error) {
    if (error.status === 0) throw error
    throw new ApiError('Your session expired. Please log in again.', 401)
  }
  return request(path, { ...options, token })
}

export function publicRequest (path, options) {
  return request(path, options)
}
