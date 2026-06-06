import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { AuthProvider }  from './context/AuthContext.jsx'
import ProtectedRoute    from './components/ProtectedRoute.jsx'
import Nav               from './components/Nav.jsx'
import Footer            from './components/Footer.jsx'
import Chatbot           from './components/Chatbot.jsx'

import HomePage    from './pages/HomePage.jsx'
import AboutPage   from './pages/AboutPage.jsx'
import NewsPage    from './pages/NewsPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import LoginPage           from './pages/LoginPage.jsx'
import ForgotPasswordPage  from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage   from './pages/ResetPasswordPage.jsx'
import PortalPage          from './pages/PortalPage.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [pathname])
  return null
}

function AppRoutes() {
  const { pathname } = useLocation()
  const isPortal = pathname.startsWith('/portal')
  const isAuth   = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password'

  return (
    <>
      <ScrollToTop />

      {/* Nav hidden on portal — portal uses its own sidebar navigation */}
      {!isPortal && <Nav />}

      <main style={{ paddingTop: isPortal ? 0 : '68px' }}>
        <Routes>
          <Route path="/"        element={<HomePage />}    />
          <Route path="/about"   element={<AboutPage />}   />
          <Route path="/news"    element={<NewsPage />}    />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login"            element={<LoginPage />}          />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />}  />

          <Route
            path="/portal/*"
            element={
              <ProtectedRoute>
                <PortalPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer and Chatbot hidden on portal and auth pages */}
      {!isPortal && !isAuth && <Footer />}
      {!isPortal && <Chatbot />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
