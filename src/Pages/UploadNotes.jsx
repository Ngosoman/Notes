import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import PdfUploader from '../Components/PDF/PdfUploader.jsx'

export default function UploadNotes() {
  return (
    <div className="workspace-content">
      <Link className="workspace-back-link" to="/dashboard"><ArrowLeft size={15} aria-hidden="true" /> Dashboard</Link>
      <section className="workspace-page-heading upload-page-heading">
        <div><p className="workspace-eyebrow">LIBRARY / ADD MATERIAL</p><h1>Upload new notes</h1><p>Add a PDF to your private study library.</p></div>
      </section>
      <PdfUploader />
    </div>
  )
}