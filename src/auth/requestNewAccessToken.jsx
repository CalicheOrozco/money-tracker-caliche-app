export default async function requestNewAccessToken (refreshToken) {
  const url = import.meta.env.VITE_API_URL + '/refresh-token'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })

  if (response.ok) {
    const json = await response.json()

    if (json.error) {
      throw new Error(json.error)
    }
    return json.body.accessToken
  } else {
    throw new Error('Unable to refresh access token.')
  }
}
