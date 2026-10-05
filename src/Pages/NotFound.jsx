import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../Components/Layout/PageContainer.jsx'
import './PageStates.css'

export default function NotFound() {
  return (
    <PageContainer className="placeholder-page not-found-page">
      <p className="eyebrow">404 / Off course</p>
      <h1>We can’t find that page.</h1>
      <p className="placeholder-description">The address may have changed, or the page may not exist.</p>
      <Link className="button" to="/"><ArrowLeft size={16} aria-hidden="true" /> Return home</Link>
    </PageContainer>
  )
}