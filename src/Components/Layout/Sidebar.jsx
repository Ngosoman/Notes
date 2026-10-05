import { BookOpen, BookOpenCheck, FileText, LayoutDashboard, LogOut, MessageSquareText, Plane, Upload, UserRound, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

const workspaceLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/upload', label: 'Upload notes', icon: Upload },
]

const studyLinks = [
  { to: '/study', label: 'Study mode', icon: BookOpenCheck },
  { to: '/ask', label: 'Ask your notes', icon: MessageSquareText },
]

export default function Sidebar({ isOpen, onNavigate }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const userName = user?.user_metadata?.full_name || user?.email || 'Student account'

  async function handleSignOut() {
    try {
      await signOut()
      onNavigate()
      navigate('/', { replace: true })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to sign out.', error)
    }
  }

  function renderLinks(links) {
    return links.map(({ to, label, icon: Icon }) => (
      <NavLink key={to} to={to} end onClick={onNavigate} className={({ isActive }) => `workspace-link${isActive ? ' is-active' : ''}`}>
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" /><span>{label}</span>
      </NavLink>
    ))
  }

  return (
    <aside className={`workspace-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Workspace sidebar">
      <div className="sidebar-brand-row">
        <Link className="brand" to="/dashboard" aria-label="AeroNotes AI dashboard" onClick={onNavigate}>
          <span className="brand-mark"><Plane size={18} aria-hidden="true" /></span>
          <span className="brand-name">aeronotes<span>ai</span></span>
        </Link>
        <button className="sidebar-close" type="button" aria-label="Close workspace navigation" onClick={onNavigate}><X size={18} /></button>
      </div>
      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>
        <nav aria-label="Workspace">{renderLinks(workspaceLinks)}</nav>
      </div>
      <div className="sidebar-section sidebar-study-section">
        <p className="sidebar-label">STUDY</p>
        <nav aria-label="Study tools">{renderLinks(studyLinks)}</nav>
      </div>
      <div className="sidebar-bottom">
        <Link className="workspace-link" to="/profile" onClick={onNavigate}><UserRound size={17} aria-hidden="true" /><span>Profile</span></Link>
        <div className="sidebar-account">
          <span className="account-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
          <span className="account-name" title={userName}>{userName}</span>
          <button className="account-signout" type="button" aria-label="Log out" title="Log out" onClick={handleSignOut}><LogOut size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </aside>
  )
}