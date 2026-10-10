import { useEffect, useState } from 'react'
import { Activity, BookOpenCheck, BrainCircuit, Clock3, FileQuestion, Target } from 'lucide-react'
import { WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import { getStudyAnalytics } from '../services/analyticsService.js'
import './Analytics.css'

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  if (hours === 0) return `${minutes} min`
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`
}

function formatDay(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
}

function Stat({ icon: Icon, label, value, detail }) {
  return <article className="analytics-stat"><span className="analytics-stat-icon"><Icon size={17} aria-hidden="true" /></span><span className="analytics-stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function ActivityChart({ days }) {
  const maxSeconds = Math.max(60, ...days.map((item) => item.duration_seconds || 0))
  return <div className="activity-chart" role="img" aria-label="Study time by day for the past seven days">
    {days.map((item) => {
      const seconds = item.duration_seconds || 0
      const height = seconds ? Math.max(5, (seconds / maxSeconds) * 100) : 0
      return <div className="activity-day" key={item.date}>
        <span className="activity-day-value">{seconds ? formatDuration(seconds) : '—'}</span>
        <div className="activity-bar-track"><span className="activity-bar" style={{ height: `${height}%` }} /></div>
        <span className="activity-day-label">{formatDay(item.date)}</span>
      </div>
    })}
  </div>
}

export default function Analytics() {
  const [result, setResult] = useState({ data: null, isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true
    getStudyAnalytics(30)
      .then((data) => { if (isActive) setResult({ data, isLoading: false, error: null }) })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to load study analytics.', error)
        if (isActive) setResult({ data: null, isLoading: false, error })
      })
    return () => { isActive = false }
  }, [reloadToken])

  function retry() {
    setResult({ data: null, isLoading: true, error: null })
    setReloadToken((token) => token + 1)
  }

  const data = result.data
  const hasActivity = Boolean(data && (data.total_sessions > 0 || data.quizzes_completed > 0 || data.flashcards_reviewed > 0))

  return <div className="workspace-content analytics-page">
    <section className="workspace-page-heading"><div><p className="workspace-eyebrow">YOUR STUDY DESK / ANALYTICS</p><h1>Study analytics</h1><p>Activity and results from your saved study sessions and quiz attempts.</p></div></section>
    {result.isLoading ? (
      <div className="workspace-skeleton" aria-label="Loading study analytics" />
    ) : result.error ? (
      <section className="workspace-panel"><WorkspaceError error={result.error} itemName="study analytics" onRetry={retry} /></section>
    ) : !hasActivity ? (
      <section className="workspace-panel"><div className="workspace-state"><span className="workspace-state-icon"><Activity size={20} aria-hidden="true" /></span><h3>Your analytics will grow with your study activity</h3><p>Finish a timed study session, review flashcards, or submit a quiz to see real progress here.</p></div></section>
    ) : (
      <>
        <p className="analytics-period-note">Recent activity: past {data.days} days · Flashcard review total is lifetime.</p>
        <section className="analytics-stats" aria-label="Study metrics">
          <Stat icon={Clock3} label="Study time" value={formatDuration(data.total_study_seconds)} detail={`Across ${data.total_sessions} completed sessions`} />
          <Stat icon={FileQuestion} label="Quizzes completed" value={data.quizzes_completed} detail={`Past ${data.days} days`} />
          <Stat icon={Target} label="Average quiz score" value={data.average_quiz_score == null ? '—' : `${Number(data.average_quiz_score).toFixed(1)}%`} detail="Mean of saved attempts" />
          <Stat icon={BrainCircuit} label="Flashcards reviewed" value={data.flashcards_reviewed} detail="Lifetime review count" />
        </section>

        <div className="analytics-grid">
          <section className="workspace-panel analytics-panel" aria-labelledby="activity-heading">
            <div className="workspace-panel-heading"><div><h2 id="activity-heading">Daily study activity</h2><p>Completed sessions over the past 7 days</p></div><Activity size={16} aria-hidden="true" /></div>
            <ActivityChart days={data.daily_activity || []} />
          </section>
          <section className="workspace-panel analytics-panel" aria-labelledby="subject-heading">
            <div className="workspace-panel-heading"><div><h2 id="subject-heading">Most studied subject</h2><p>Based on completed session time</p></div><BookOpenCheck size={16} aria-hidden="true" /></div>
            {data.most_studied_subject ? <div className="analytics-subject"><span style={{ backgroundColor: data.most_studied_subject.color }} /><div><strong>{data.most_studied_subject.name}</strong><small>{formatDuration(data.most_studied_subject.duration_seconds)} logged</small></div></div> : <p className="analytics-panel-empty">No subject-linked study sessions yet.</p>}
          </section>
        </div>

        <section className="workspace-panel weak-topics-panel" aria-labelledby="weak-topics-heading">
          <div className="workspace-panel-heading"><div><h2 id="weak-topics-heading">Topics to revisit</h2><p>Topics missed across your saved quiz attempts</p></div><Target size={16} aria-hidden="true" /></div>
          {data.weak_topics?.length ? <ol className="weak-topic-list">{data.weak_topics.map((topic, index) => <li key={topic.name}><span>{String(index + 1).padStart(2, '0')}</span><strong>{topic.name}</strong><small>{topic.misses} missed</small></li>)}</ol> : <p className="analytics-panel-empty">No weak-topic data yet. Take a quiz to see topics to revisit.</p>}
        </section>
      </>
    )}
  </div>
}
