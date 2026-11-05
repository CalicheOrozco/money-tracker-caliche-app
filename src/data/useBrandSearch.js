import { useEffect, useState } from 'react'
import { logoSearchEnabled, searchBrands, useLogoConfig } from '../lib/brandfetch.js'

// Results are only kept while the search is on screen, as the logo service asks.
export function useBrandSearch (query) {
  const [state, setState] = useState({ results: [], loading: false, error: '' })
  const clientId = useLogoConfig()

  useEffect(() => {
    const text = query.trim()
    if (!logoSearchEnabled || text.length < 2) {
      setState({ results: [], loading: false, error: '' })
      return
    }

    const controller = new AbortController()
    setState(current => ({ ...current, loading: true, error: '' }))
    // Waits for a pause in typing so each keystroke is not a request.
    const timer = setTimeout(() => {
      searchBrands(text, controller.signal)
        .then(results => setState({ results, loading: false, error: '' }))
        .catch(error => {
          if (error.name !== 'AbortError') setState({ results: [], loading: false, error: error.message })
        })
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, clientId])

  return state
}
