import { useState } from 'react'
import { ArrowRight, Menu, Plane, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Layout.css'

const sectionLinks = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Study tools', href: '/#features' },
  { label: 'Our approach', href: '/#why-aeronotes' },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <Link className="brand" to="/" aria-label="AeroNotes AI home" onClick={() => setIsMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><Plane size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">aeronotes<span>ai</span></span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav id="primary-navigation" className={`site-nav${isMenuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {sectionLinks.map((link) => (
            <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)}>{link.label}</Link>
          ))}
          <Link className="nav-login" to="/login" onClick={() => setIsMenuOpen(false)}>Log in</Link>
          <Link className="button button-small" to="/register" onClick={() => setIsMenuOpen(false)}>
            Get started <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  )
}