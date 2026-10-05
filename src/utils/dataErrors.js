export function getDataErrorMessage(error, itemName = 'data') {
  if (error?.code === 'PGRST205' || error?.code === '42P01') {
    return 'The Supabase tables are not available yet. Apply the database migration, then refresh this page.'
  }
  if (error?.code === '23505') return 'That subject name is already in use.'
  if (error?.code === '42501' || error?.code === 'PGRST301') {
    return 'Supabase denied this request. Confirm you are signed in and that the table RLS policies are installed.'
  }
  return `We couldn't load or update ${itemName}. Check your connection and try again.`
}

export function formatFileSize(value) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) return 'Size unavailable'
  const bytes = Number(value)
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`
}

export function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}