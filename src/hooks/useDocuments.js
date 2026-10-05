import { useEffect, useState } from 'react'
import { listDocuments } from '../services/documentService.js'

export default function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    listDocuments()
      .then((rows) => { if (isActive) setDocuments(rows) })
      .catch((loadError) => {
        if (import.meta.env.DEV) console.error('Unable to load documents.', loadError)
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

  return { documents, isLoading, error, refresh }
}