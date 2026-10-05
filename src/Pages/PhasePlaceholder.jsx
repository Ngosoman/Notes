import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../Components/Layout/PageContainer.jsx'
import './PageStates.css'

export default function PhasePlaceholder({ title }) {
  return (
    <PageContainer className="placeholder-page">
      <div className="placeholder-icon"><Construction size={23} aria-hidden="true" /></div>
      <p className="eyebrow">AeroNotes AI / In progress</p>
      <h1>{title}</h1>
      <p className="placeholder-description">This route is in place for the next implementation phase. Accounts, study data, and document processing are not active yet.</p>
      <Link className="button button-secondary" to="/"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
    </PageContainer>
  )
}