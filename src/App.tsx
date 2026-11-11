import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Footer, Navbar, Spinner, ToastHost } from '@/components/ui'

const Home = lazy(() => import('@/pages/Home'))
const Templates = lazy(() => import('@/pages/Templates'))
const Editor = lazy(() => import('@/pages/Editor'))
const MyWorks = lazy(() => import('@/pages/MyWorks'))
const MyTemplates = lazy(() => import('@/pages/MyTemplates'))
const Login = lazy(() => import('@/pages/Login'))
const Invite = lazy(() => import('@/pages/Invite'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const isEditor = location.pathname.startsWith('/editor')
  const isInvite = location.pathname.startsWith('/i/')

  return (
    <>
      {isEditor || isInvite ? (
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/editor" element={<Editor />} />
            <Route path="/editor/:templateId" element={<Editor />} />
            <Route path="/i/:slug" element={<Invite />} />
          </Routes>
        </Suspense>
      ) : (
        <Shell>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/my" element={<MyWorks />} />
              <Route path="/my-templates" element={<MyTemplates />} />
              <Route path="/login" element={<Login />} />
              <Route path="/editor" element={<Navigate to="/editor" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Shell>
      )}
      <ToastHost />
    </>
  )
}
