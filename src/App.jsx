import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './Components/Auth/ProtectedRoute.jsx'
import PublicLayout from './Components/Layout/PublicLayout.jsx'
import WorkspaceLayout from './Components/Layout/WorkspaceLayout.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import Dashboard from './Pages/Dashboard.jsx'
import DocumentDetails from './Pages/DocumentDetails.jsx'
import Documents from './Pages/Documents.jsx'
import Landing from './Pages/Landing.jsx'
import Login from './Pages/Login.jsx'
import NotFound from './Pages/NotFound.jsx'
import PasswordReset from './Pages/PasswordReset.jsx'
import PhasePlaceholder from './Pages/PhasePlaceholder.jsx'
import Register from './Pages/Register.jsx'
import SubjectDetails from './Pages/SubjectDetails.jsx'
import Subjects from './Pages/Subjects.jsx'

const UploadNotes = lazy(() => import('./Pages/UploadNotes.jsx'))
const Summary = lazy(() => import('./Pages/Summary.jsx'))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Suspense fallback={<div className="workspace-route-loading" role="status">Preparing workspace…</div>}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<PasswordReset />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<WorkspaceLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:documentId" element={<DocumentDetails />} />
                <Route path="/upload" element={<UploadNotes />} />
                <Route path="/summary/:documentId" element={<Summary />} />
                <Route path="/flashcards/:documentId" element={<PhasePlaceholder title="Flashcards" />} />
                <Route path="/quiz/:quizId" element={<PhasePlaceholder title="Quiz" />} />
                <Route path="/study" element={<PhasePlaceholder title="Study mode" />} />
                <Route path="/ask" element={<PhasePlaceholder title="Ask your notes" />} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/subjects/:subjectId" element={<SubjectDetails />} />
                <Route path="/profile" element={<PhasePlaceholder title="Your profile" />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
