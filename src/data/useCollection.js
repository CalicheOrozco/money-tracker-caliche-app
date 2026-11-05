import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'

// Loads one of the per-user collections under /api/me and keeps it in sync
// after every change.
export function useCollection (name, { enabled = true, onError } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const errorHandler = useRef(onError)

  useEffect(() => {
    errorHandler.current = onError
  }, [onError])

  const reload = useCallback(async () => {
    if (enabled) setItems(await api(`/me/${name}`))
  }, [name, enabled])

  useEffect(() => {
    if (!enabled) {
      setItems([])
      setLoading(false)
      return
    }
    reload()
      .catch(error => errorHandler.current?.(error))
      .finally(() => setLoading(false))
  }, [reload, enabled])

  const create = useCallback(async body => {
    const item = await api(`/me/${name}`, { method: 'POST', body })
    await reload()
    return item
  }, [name, reload])

  const update = useCallback(async (id, body) => {
    const item = await api(`/me/${name}/${id}`, { method: 'PATCH', body })
    await reload()
    return item
  }, [name, reload])

  const remove = useCallback(async id => {
    await api(`/me/${name}/${id}`, { method: 'DELETE' })
    await reload()
  }, [name, reload])

  return useMemo(
    () => ({ items, loading, reload, create, update, remove }),
    [items, loading, reload, create, update, remove]
  )
}
