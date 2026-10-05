import { ArrowDown, ArrowRight, BookmarkCheck, BookOpenText, BrainCircuit, CircleHelp, Compass, Layers3, MessageSquareText, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../Components/Layout/PageContainer.jsx'
import './Landing.css'

const features = [
  { icon: BookOpenText, title: 'Short notes, clear thinking', description: 'Condense lengthy course material into focused explanations that are easier to revisit.', tone: 'blue' },
  { icon: Layers3, title: 'Formulas with context', description: 'Keep equations, symbols, units, and the conditions they depend on together.', tone: 'mint' },
  { icon: BrainCircuit, title: 'Active recall that sticks', description: 'Turn key ideas into flashcards and practice questions for more deliberate revision.', tone: 'amber' },
  { icon: MessageSquareText, title: 'Ask your own material', description: 'Explore course concepts through answers grounded in the notes you provide.', tone: 'coral' },
  { icon: CircleHelp, title: 'Exam-focused practice', description: 'Surface important relationships, likely questions, and concepts worth another look.', tone: 'blue' },
  { icon: BookmarkCheck, title: 'Your subjects, organized', description: 'Keep documents and revision material arranged around the courses you are taking.', tone: 'mint' },
]
const steps = [
  { number: '01', title: 'Bring your notes', text: 'Start with the lecture PDFs and handouts you already use.' },
  { number: '02', title: 'Make them workable', text: 'Shape dense material into structured, review-ready study guides.' },
  { number: '03', title: 'Study with intent', text: 'Revisit the details, test your recall, and follow what needs work.' },
]

function Eyebrow({ children }) {
  return <p className="eyebrow"><span aria-hidden="true" />{children}</p>
}

export default function Landing() {
  return (
    <div className="landing-page">
      <section className="hero-section">
        <PageContainer className="hero-grid">
          <div className="hero-copy">
            <Eyebrow>Built for engineering students</Eyebrow>
            <h1>Turn long engineering notes into <span>smart study material.</span></h1>
            <p className="hero-description">Upload your lecture PDFs and turn dense material into concise notes, formulas, flashcards, quizzes, and exam-focused revision.</p>
            <div className="hero-actions">
              <Link className="button" to="/register">Start studying <ArrowRight size={17} aria-hidden="true" /></Link>
              <a className="button button-secondary" href="#how-it-works">See how it works <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <div className="hero-note"><span className="note-dot" />A focused workspace for serious study</div>
          </div>
          <div className="hero-visual">
            <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1500&q=85" alt="View over an aircraft wing above a layer of clouds" fetchPriority="high" />
            <div className="visual-label">
              <span className="visual-label-icon"><Compass size={17} aria-hidden="true" /></span>
              <span><strong>Engineering, in focus</strong><small>From source material to structured revision</small></span>
            </div>
            <span className="visual-index" aria-hidden="true">AERONAUTICS / 01</span>
          </div>
        </PageContainer>
      </section>
      <section className="process-section" id="how-it-works">
        <PageContainer>
          <div className="section-heading"><Eyebrow>A clearer route through the material</Eyebrow><h2>Less sorting. More understanding.</h2></div>
          <div className="steps-grid">
            {steps.map((step) => <article className="step-item" key={step.number}><span className="step-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}
          </div>
        </PageContainer>
      </section>
      <section className="features-section" id="features">
        <PageContainer>
          <div className="section-heading features-heading"><Eyebrow>Tools for the whole revision cycle</Eyebrow><h2>Built around how engineers learn.</h2><p>Keep the technical detail. Make it easier to find, understand, and remember.</p></div>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, description, tone }) => <article className="feature-item" key={title}><span className={`feature-icon tone-${tone}`}><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></article>)}
          </div>
        </PageContainer>
      </section>
      <section className="principles-section" id="why-aeronotes">
        <PageContainer className="principles-grid">
          <div><Eyebrow>Made for technical material</Eyebrow><h2>Precision matters when the details do.</h2></div>
          <div className="principles-copy">
            <p>Engineering revision is more than memorizing a paragraph. The relationships, assumptions, units, and definitions are part of the answer.</p>
            <p>AeroNotes AI is designed to keep those details connected to your source material as you turn it into a study plan that works for you.</p>
            <Link className="text-link" to="/register">Start with your notes <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </PageContainer>
      </section>
      <section className="closing-section">
        <PageContainer className="closing-inner">
          <div className="closing-icon"><Sparkles size={21} aria-hidden="true" /></div>
          <div className="closing-copy"><p className="closing-kicker">Your next revision session starts here</p><h2>Make room for the ideas that matter.</h2></div>
          <Link className="button closing-button" to="/register">Get started <ArrowRight size={17} aria-hidden="true" /></Link>
        </PageContainer>
      </section>
      <footer className="site-footer">
        <PageContainer className="footer-inner">
          <Link className="brand footer-brand" to="/" aria-label="AeroNotes AI home"><span className="brand-mark" aria-hidden="true"><Compass size={18} /></span><span className="brand-name">aeronotes<span>ai</span></span></Link>
          <p>Engineering study, in focus.</p>
          <a href="#main-content" className="footer-top-link">Back to top <ArrowRight size={14} aria-hidden="true" /></a>
        </PageContainer>
      </footer>
    </div>
  )
}