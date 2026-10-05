export default function StudyProgress({ current, total, label = 'Progress' }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="study-progress" aria-label={`${label}: ${current} of ${total}`}>
      <div className="study-progress-label"><span>{label}</span><strong>{current} / {total}</strong></div>
      <progress max={total || 1} value={current}>{percentage}%</progress>
    </div>
  )
}