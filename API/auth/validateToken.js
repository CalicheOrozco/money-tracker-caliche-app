const validateToken = header => {
  if (!header.authorization) {
    console.log('3. There is no token.', header)
    throw new Error('Token not provided')
  }

  const [bearer, token] = header.authorization.split(' ')

  if (bearer !== 'Bearer') {
    console.log('4. There is no token.', token)
    throw new Error('Token format invalid')
  }

  return token
}

export default validateToken
