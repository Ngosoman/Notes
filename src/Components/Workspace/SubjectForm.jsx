import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function SubjectForm({ onSubmit, isSaving }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#1D4ED8')

  async function handleSubmit(event) {
    event.preventDefault()
    const saved = await onSubmit({ name, description, color })
    if (saved) {
      setName('')
      setDescription('')
      setColor('#1D4ED8')
    }
  }

  return (
    <section className="workspace-panel subject-form-panel" aria-labelledby="new-subject-heading">
      <h2 id="new-subject-heading">Add a subject</h2>
      <form className="subject-form" onSubmit={handleSubmit}>
        <div className="subject-form-field"><label htmlFor="subject-name">Subject name</label><input className="workspace-input" id="subject-name" name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Aerodynamics" /></div>
        <div className="subject-form-field subject-form-field-description"><label htmlFor="subject-description">Description <span className="optional-label">Optional</span></label><input className="workspace-input" id="subject-description" name="description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Course or topic details" /></div>
        <div className="subject-form-field"><label htmlFor="subject-color">Color</label><input className="subject-color-input" id="subject-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Subject color" /></div>
        <button className="button subject-submit" type="submit" disabled={isSaving}><Plus size={15} aria-hidden="true" />{isSaving ? 'Adding…' : 'Add subject'}</button>
      </form>
    </section>
  )
}