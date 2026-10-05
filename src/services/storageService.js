import * as tus from 'tus-js-client'
import { getSupabaseClient, supabasePublicKey, supabaseUrl } from './supabaseClient.js'

function safeStorageFilename(filename) {
  const cleaned = filename
    .normalize('NFKC')
    .replace(/[\\/]/g, '_')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180)

  return cleaned || 'lecture-notes.pdf'
}

export function createDocumentStoragePath(userId, documentId, filename) {
  return `${userId}/${documentId}/${safeStorageFilename(filename)}`
}

export async function uploadPdf(file, storagePath, onProgress) {
  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error('Supabase Storage is not configured.')
  }

  const client = getSupabaseClient()
  const { data: { session }, error } = await client.auth.getSession()
  if (error) throw error
  if (!session?.access_token) throw new Error('Your session has expired. Log in again to upload this PDF.')

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: 6 * 1024 * 1024,
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: supabasePublicKey,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: 'documents',
        objectName: storagePath,
        contentType: 'application/pdf',
        cacheControl: '3600',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onError: reject,
      onProgress(bytesUploaded, bytesTotal) {
        onProgress(bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0)
      },
      onSuccess() {
        onProgress(100)
        resolve(storagePath)
      },
    })

    upload.start()
  })
}