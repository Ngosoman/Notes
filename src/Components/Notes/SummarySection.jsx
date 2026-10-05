import { BookOpenText, CircleAlert, ClipboardList, FileQuestion, Lightbulb, Sigma } from 'lucide-react'

const sectionIcons = {
  concepts: Lightbulb,
  topics: BookOpenText,
  definitions: ClipboardList,
  formulas: Sigma,
  alerts: CircleAlert,
  questions: FileQuestion,
}

export function SourcePages({ pages = [] }) {
  if (!pages.length) return null
  return <span className="summary-source-pages">Source pages {pages.map((page) => `p. ${page}`).join(', ')}</span>
}

export default function SummarySection({ id, title, description, count, children, emptyText }) {
  const Icon = sectionIcons[id] || BookOpenText
  return (
    <section className="summary-section" id={`summary-${id}`} aria-labelledby={`summary-${id}-heading`}>
      <div className="summary-section-heading">
        <span className={`summary-section-icon summary-icon-${id}`}><Icon size={17} aria-hidden="true" /></span>
        <div className="summary-section-title-wrap">
          <h2 id={`summary-${id}-heading`}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <span className="summary-section-count">{count}</span>
      </div>
      {count ? <div className="summary-section-content">{children}</div> : <p className="summary-empty-section">{emptyText || 'No supported material was identified in this section.'}</p>}
    </section>
  )
}