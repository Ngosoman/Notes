import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './Components/Auth/ProtectedRoute.jsx'
import Navbar from './Components/Layout/Navbar.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import Landing from './Pages/Landing.jsx'
import Login from './Pages/Login.jsx'
import NotFound from './Pages/NotFound.jsx'
import PasswordReset from './Pages/PasswordReset.jsx'
import PhasePlaceholder from './Pages/PhasePlaceholder.jsx'
import Register from './Pages/Register.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Navbar />
          <main id="main-content" className="min-h-screen">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<PhasePlaceholder title="Your study dashboard" />} />
                <Route path="/documents" element={<PhasePlaceholder title="Your documents" />} />
                <Route path="/documents/:documentId" element={<PhasePlaceholder title="Document details" />} />
                <Route path="/upload" element={<PhasePlaceholder title="Upload notes" />} />
                <Route path="/summary/:documentId" element={<PhasePlaceholder title="Study summary" />} />
                <Route path="/flashcards/:documentId" element={<PhasePlaceholder title="Flashcards" />} />
                <Route path="/quiz/:quizId" element={<PhasePlaceholder title="Quiz" />} />
                <Route path="/study" element={<PhasePlaceholder title="Study mode" />} />
                <Route path="/ask" element={<PhasePlaceholder title="Ask your notes" />} />
                <Route path="/subjects" element={<PhasePlaceholder title="Subjects" />} />
                <Route path="/subjects/:subjectId" element={<PhasePlaceholder title="Subject details" />} />
                <Route path="/profile" element={<PhasePlaceholder title="Your profile" />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
