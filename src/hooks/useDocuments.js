import { useEffect, useState } from 'react'
import { listDocuments } from '../services/documentService.js'

export default function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)

    listDocuments()
      .then((rows) => { if (isActive) setDocuments(rows) })
      .catch((loadError) => {
        if (import.meta.env.DEV) console.error('Unable to load documents.', loadError)
        if (isActive) setError(loadError)
      })
      .finally(() => { if (isActive) setIsLoading(false) })

    return () => { isActive = false }
  }, [reloadToken])

  return { documents, isLoading, error, refresh: () => setReloadToken((token) => token + 1) }
}