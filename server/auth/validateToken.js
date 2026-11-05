const validateToken = headers => {
  if (!headers.authorization) {
    throw new Error('Token not provided')
  }

  const [bearer, token] = headers.authorization.split(' ')

  if (bearer !== 'Bearer' || !token) {
    throw new Error('Token format invalid')
  }

  return token
}

export default validateToken
