import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

export default function PublicLayout() {
  return <><Navbar /><main id="main-content"><Outlet /></main></>
}