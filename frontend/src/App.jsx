import { createPortal } from 'react-dom'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LibraryProvider } from './context/LibraryContext'
import { XPToastProvider } from './components/XPToast'
import { ChatNotifyProvider } from './context/ChatNotifyContext'
import { authTransitionGate } from './utils/authTransitionGate'

import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import LibraryPage from './pages/LibraryPage'
import TrendingPage from './pages/TrendingPage'
import NewsPage from './pages/NewsPage'
import CommunityPage from './pages/CommunityPage'
import GroupDetailPage from './pages/GroupDetailPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AchievementsPage from './pages/AchievementsPage'
import FriendsPage from './pages/FriendsPage'
import AboutPage from './pages/AboutPage'

function VoidLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f0eef8',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <style>{`
        @keyframes vl-fade    { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes vl-orbSpin { to { transform: rotate(360deg); } }
        @keyframes vl-glow {
          0%,100% { filter: drop-shadow(0 0 6px rgba(168,85,247,0.25)); }
          50%      { filter: drop-shadow(0 0 18px rgba(124,58,237,0.5)) drop-shadow(0 0 34px rgba(124,58,237,0.2)); }
        }

        .vl-o-wrap {
          position: relative;
          width: 160px; height: 160px;
          display: flex; align-items: center; justify-content: center;
          animation: vl-glow 3.4s ease-in-out infinite;
        }
        .vl-orb-ring {
          position: absolute; border-radius: 40%;
          border-style: solid; border-color: transparent;
          pointer-events: none;
        }
        .vl-orb-ring-1 {
          width: 200px; height: 200px;
          border-top-color: rgba(147,51,234,0.55);
          border-right-color: rgba(147,51,234,0.2);
          border-width: 2px;
          animation: vl-orbSpin 8s linear infinite;
        }
        .vl-orb-ring-2 {
          width: 240px; height: 240px;
          border-bottom-color: rgba(109,40,217,0.45);
          border-left-color: rgba(109,40,217,0.15);
          border-width: 2px;
          animation: vl-orbSpin 14s linear infinite reverse;
        }
        .vl-orb-ring-3 {
          width: 280px; height: 280px;
          border-top-color: rgba(168,85,247,0.28);
          border-right-color: rgba(168,85,247,0.08);
          border-width: 1.5px;
          animation: vl-orbSpin 22s linear infinite;
        }
        .vl-orb-scanner {
          position: absolute;
          width: 200px; height: 200px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(192,132,252,0.9);
          animation: vl-orbSpin 3.5s linear infinite;
          filter: blur(0.5px);
        }
      `}</style>

      <div style={{ marginBottom: '2.2rem' }}>
        <div className="vl-o-wrap">
          <div className="vl-orb-ring vl-orb-ring-1" />
          <div className="vl-orb-ring vl-orb-ring-2" />
          <div className="vl-orb-ring vl-orb-ring-3" />
          <div className="vl-orb-scanner" />

          <svg
            width="160" height="160"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'relative', zIndex: 1, overflow: 'visible', display: 'block' }}
          >
            <defs>
              <radialGradient id="vl-voidGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" />
                <stop offset="55%" stopColor="#1a0040" />
                <stop offset="80%" stopColor="#3b0d7a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <filter id="vl-glowFilter">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="vl-glowStrong">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <circle cx="36" cy="36" r="32" fill="url(#vl-voidGlow)" opacity="0.7" />
            <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="36" cy="36" r="22" fill="#2a1060" />
            <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter="url(#vl-glowStrong)" />
            <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
            <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#vl-glowFilter)" />
            <path d="M 20 31 A 18 18 0 0 1 36 17" stroke="rgba(232,180,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="36" cy="36" r="28" stroke="#6d28d9" strokeWidth="6" fill="none" opacity="0.25" />
            <circle cx="36" cy="36" r="30" stroke="#4c1d95" strokeWidth="4" fill="none" opacity="0.12" />
            <circle cx="24" cy="20" r="1" fill="#c084fc" opacity="0.7" />
            <circle cx="48" cy="18" r="0.8" fill="#a855f7" opacity="0.5" />
            <circle cx="52" cy="40" r="1.2" fill="#c084fc" opacity="0.6" />
            <circle cx="20" cy="50" r="0.9" fill="#9333ea" opacity="0.5" />
            <circle cx="42" cy="58" r="0.7" fill="#a855f7" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: '0.22em',
        color: '#6d6a80',
        textTransform: 'uppercase',
        margin: 0,
        animation: 'vl-fade 3s ease-in-out infinite',
      }}>
        Welcome to the Void
      </p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <VoidLoader />
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  // While LoginPage's portal-collapse transition is playing, `user` may
  // already be truthy but we deliberately don't redirect here — LoginPage
  // calls navigate('/') itself once the animation finishes. Without this,
  // this route would swap LoginPage out instantly and the transition
  // would never be seen.
  if (user && authTransitionGate.active) return children
  return !user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LibraryProvider>
          <XPToastProvider>
            <BrowserRouter>
              {/* Portaled straight to document.body. <Toaster> was previously
                  just a normal child several context-providers deep
                  (ThemeProvider > AuthProvider > LibraryProvider >
                  XPToastProvider). `position: fixed` only pins to the
                  viewport if NO ancestor has a `transform`, `filter`,
                  `perspective`, or `will-change` style — if any of those
                  providers (or something inside them) renders a wrapping
                  div with one of those, it silently turns "fixed" into
                  "positioned relative to that ancestor" instead of the
                  screen, which is exactly the "toast only shows near the
                  top, disappears on scroll" bug. Portaling sidesteps every
                  ancestor in the tree, so this is now correct regardless of
                  what those providers do internally. */}
              {createPortal(
                <Toaster position="top-right" toastOptions={{
                  style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '12px', fontSize: '14px' }
                }} />,
                document.body
              )}
              {/* ChatNotifyProvider needs to be inside BrowserRouter (it uses
                  useNavigate to jump straight to a DM when a toast is
                  clicked) but wraps every route so its socket + toast stay
                  alive no matter which page you're on. */}
              <ChatNotifyProvider>
                <Routes>
                  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                  <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/discover" element={<ExplorePage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/trending" element={<TrendingPage />} />
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/community/:groupId" element={<GroupDetailPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/achievements" element={<AchievementsPage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/about" element={<AboutPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ChatNotifyProvider>
            </BrowserRouter>
          </XPToastProvider>
        </LibraryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
