import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LibraryProvider } from './context/LibraryContext'

import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import DiscoverPage from './pages/DiscoverPage'
import LibraryPage from './pages/LibraryPage'
import TrendingPage from './pages/TrendingPage'
import NewsPage from './pages/NewsPage'
import CommunityPage from './pages/CommunityPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AchievementsPage from './pages/AchievementsPage'
import FriendsPage from './pages/FriendsPage'

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
        @keyframes vl-spin    { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes vl-spinrev { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes vl-pulse   { 0%,100% { transform: translate(-50%,-50%) scale(1); box-shadow: 0 0 18px 4px rgba(109,40,217,0.18); } 50% { transform: translate(-50%,-50%) scale(1.13); box-shadow: 0 0 32px 10px rgba(109,40,217,0.28); } }
        @keyframes vl-fade    { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes vl-drift1  { 0% { transform: rotate(0deg)   translateX(88px) rotate(0deg); }   100% { transform: rotate(360deg)  translateX(88px) rotate(-360deg); } }
        @keyframes vl-drift2  { 0% { transform: rotate(200deg) translateX(66px) rotate(-200deg); } 100% { transform: rotate(560deg)  translateX(66px) rotate(-560deg); } }
      `}</style>

      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: '2.2rem' }}>

        {/* Ring 1 — outermost, slow */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: '#b39ddb',
          borderRightColor: '#b39ddb55',
          animation: 'vl-spin 7s linear infinite',
          boxSizing: 'border-box',
        }} />

        {/* Ring 2 — reverse */}
        <div style={{
          position: 'absolute', inset: 22,
          borderRadius: '50%',
          border: '1px solid transparent',
          borderBottomColor: '#9575cd',
          borderLeftColor: '#9575cd44',
          animation: 'vl-spinrev 5s linear infinite',
          boxSizing: 'border-box',
        }} />

        {/* Ring 3 — inner, faster */}
        <div style={{
          position: 'absolute', inset: 42,
          borderRadius: '50%',
          border: '1px solid transparent',
          borderTopColor: '#ce93d8',
          borderRightColor: '#ce93d833',
          animation: 'vl-spin 3.5s linear infinite',
          boxSizing: 'border-box',
        }} />

        {/* Ring 4 — innermost arc */}
        <div style={{
          position: 'absolute', inset: 60,
          borderRadius: '50%',
          border: '1px solid transparent',
          borderBottomColor: '#d1c4e9',
          borderLeftColor: 'transparent',
          animation: 'vl-spinrev 2.5s linear infinite',
          boxSizing: 'border-box',
        }} />

        {/* Orbiting dot 1 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 5, height: 5, marginTop: -2.5, marginLeft: -2.5,
          borderRadius: '50%', background: '#9575cd',
          animation: 'vl-drift1 5s linear infinite',
        }} />

        {/* Orbiting dot 2 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 3.5, height: 3.5, marginTop: -1.75, marginLeft: -1.75,
          borderRadius: '50%', background: '#ce93d8',
          animation: 'vl-drift2 4s linear infinite',
        }} />

        {/* Core orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 48, height: 48,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 35%, #4a148c, #1a0533 70%, #0d0117)',
          animation: 'vl-pulse 2.6s ease-in-out infinite',
        }} />
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
  return !user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LibraryProvider>
          <BrowserRouter>
            <Toaster position="top-right" toastOptions={{
              style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '12px', fontSize: '14px' }
            }} />
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<HomePage />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/friends" element={<FriendsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LibraryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
