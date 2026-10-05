import { useState } from 'react'
import { Menu, Plane, X } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import './Workspace.css'

export default function WorkspaceLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)

  function closeNavigation() {
    setIsNavigationOpen(false)
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-mobile-header">
        <a className="brand" href="/dashboard" aria-label="AeroNotes AI dashboard" onClick={closeNavigation}>
          <span className="brand-mark"><Plane size={18} aria-hidden="true" /></span>
          <span className="brand-name">aeronotes<span>ai</span></span>
        </a>
        <button className="workspace-menu-toggle" type="button" aria-label={isNavigationOpen ? 'Close workspace navigation' : 'Open workspace navigation'} aria-expanded={isNavigationOpen} onClick={() => setIsNavigationOpen((open) => !open)}>
          {isNavigationOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {isNavigationOpen && <button className="workspace-backdrop" type="button" aria-label="Close navigation" onClick={closeNavigation} />}
      <Sidebar isOpen={isNavigationOpen} onNavigate={closeNavigation} />
      <main id="main-content" className="workspace-main"><Outlet /></main>
    </div>
  )
}