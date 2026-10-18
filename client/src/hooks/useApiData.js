import { useCallback, useEffect, useState } from 'react'
import { apiRequest, extractData } from '../api/client'

const identity = (value) => value

export function useApiData(path, { enabled = true, initialData = null, map = identity } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!enabled || !path) return null
    setLoading(true)
    setError('')
    try {
      const payload = await apiRequest(path)
      const next = map(extractData(payload), payload)
      setData(next)
      return next
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [enabled, map, path])

  useEffect(() => {
    load()
  }, [load])

  return { data, error, loading, reload: load, setData }
}
