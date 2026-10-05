import { useEffect, useState } from 'react'
import { listSubjects } from '../services/subjectService.js'

export default function useSubjects() {
  const [subjects, setSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    listSubjects()
      .then((rows) => { if (isActive) setSubjects(rows) })
      .catch((loadError) => {
        if (import.meta.env.DEV) console.error('Unable to load subjects.', loadError)
        if (isActive) setError(loadError)
      })
      .finally(() => { if (isActive) setIsLoading(false) })

    return () => { isActive = false }
  }, [reloadToken])

  function refresh() {
    setIsLoading(true)
    setError(null)
    setReloadToken((token) => token + 1)
  }

  return { subjects, isLoading, error, refresh }
}