import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './Components/Layout/Navbar.jsx'
import Landing from './Pages/Landing.jsx'
import NotFound from './Pages/NotFound.jsx'
import PhasePlaceholder from './Pages/PhasePlaceholder.jsx'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main id="main-content" className="min-h-screen">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<PhasePlaceholder title="Log in" />} />
            <Route path="/register" element={<PhasePlaceholder title="Create your account" />} />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
