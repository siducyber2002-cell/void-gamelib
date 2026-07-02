import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('gl_token'))
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(null) // { current_streak, longest_streak }
  const [showStreakPopup, setShowStreakPopup] = useState(false)

  // axios.defaults.baseURL = 'http://localhost:8000'
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const checkStreak = async () => {
    try {
      const res = await axios.get('/api/auth/streak')
      setStreak({
        current_streak: res.data.current_streak,
        longest_streak: res.data.longest_streak,
      })
      if (res.data.streak_increased_today) setShowStreakPopup(true)
    } catch {
      // silent — streak check should never break the app
    }
  }

  const dismissStreakPopup = () => setShowStreakPopup(false)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
      checkStreak() // covers the "reopened the app with an existing session" case
    } else {
      setLoading(false)
    }
  }, [token])

  // Covers "resumed the app" — tab/window regains focus (e.g. mobile app foregrounded,
  // browser tab switched back to). Safe to call repeatedly; backend is idempotent per day.
  useEffect(() => {
    if (!token) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkStreak()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [token])

  const fetchMe = async () => {
    try {
      const res = await axios.get('/api/auth/me')
      setUser(res.data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await axios.post('/api/auth/token', form)
    const t = res.data.access_token
    localStorage.setItem('gl_token', t)
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
    setToken(t)
    await fetchMe()

    if (res.data.streak) {
      setStreak({
        current_streak: res.data.streak.current_streak,
        longest_streak: res.data.streak.longest_streak,
      })
      if (res.data.streak.streak_increased_today) setShowStreakPopup(true)
    }

    return res.data
  }

  const register = async (data) => {
    const res = await axios.post('/api/auth/register', data)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('gl_token')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    setStreak(null)
    setShowStreakPopup(false)
  }

  const updateProfile = async (data) => {
    const res = await axios.put('/api/auth/me', data)
    setUser(res.data)
    return res.data
  }

  const changePassword = async (data) => {
    const res = await axios.post('/api/auth/change-password', data)
    return res.data
  }

  const deleteAccount = async (password) => {
    const res = await axios.delete('/api/auth/me', { data: { password } })
    logout()
    return res.data
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updateProfile, changePassword, deleteAccount,
      streak, showStreakPopup, dismissStreakPopup, checkStreak,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
