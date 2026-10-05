import { useState } from 'react'
import { ArrowRight, LogOut, Menu, Plane, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import './Layout.css'

const sectionLinks = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Study tools', href: '/#features' },
  { label: 'Our approach', href: '/#why-aeronotes' },
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    setSignOutError('')
    try {
      await signOut()
      setIsMenuOpen(false)
      navigate('/', { replace: true })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to sign out.', error)
      setSignOutError('We could not log you out. Please try again.')
    }
  }

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
            <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>{link.label}</a>
          ))}
          {user ? <>
            <Link className="nav-login" to="/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
            <button className="nav-signout" type="button" onClick={handleSignOut}><LogOut size={15} aria-hidden="true" /> Log out</button>
          </> : <>
            <Link className="nav-login" to="/login" onClick={() => setIsMenuOpen(false)}>Log in</Link>
            <Link className="button button-small" to="/register" onClick={() => setIsMenuOpen(false)}>
              Get started <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </>}
        </nav>
      </div>
      {signOutError && <p className="nav-error" role="alert">{signOutError}</p>}
    </header>
  )
}