import { ArrowLeft, Plane } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <section className="auth-page">
      <div className="auth-side-panel" aria-hidden="true">
        <div className="auth-side-mark"><Plane size={20} /></div>
        <p className="auth-side-overline">AERONOTES AI / STUDY SYSTEM</p>
        <p className="auth-side-statement">Make the hard-to-revise <span>feel within reach.</span></p>
        <div className="auth-side-rule"><span />TECHNICAL STUDY, WITH STRUCTURE</div>
      </div>
      <div className="auth-main">
        <div className="auth-mobile-brand">
          <Link className="brand" to="/" aria-label="AeroNotes AI home"><span className="brand-mark"><Plane size={18} /></span><span className="brand-name">aeronotes<span>ai</span></span></Link>
        </div>
        <div className="auth-form-wrap">
          <Link className="auth-back-link" to="/"><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
        <p className="auth-legal">Your study workspace, built around your material.</p>
      </div>
    </section>
  )
}