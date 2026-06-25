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


function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-slate-500 font-body">Loading GameLib...</p>
      </div>
    </div>
  )
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

