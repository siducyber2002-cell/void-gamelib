import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// This was previously set as a statement inside the component body, which
// means it ran on EVERY render of AuthProvider — and since AuthProvider
// wraps the whole app, that's every render triggered by any state change
// anywhere under it. The value never changes at runtime, so it only needs
// to run once, when the module loads.
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('gl_token'))
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(null) // { current_streak, longest_streak }
  const [showStreakPopup, setShowStreakPopup] = useState(false)

  // The backend's `streak_increased_today` flag stays true for the whole day
  // once the streak bumps — it's not a "just now" flag. checkStreak() gets
  // called on every mount AND every tab/app refocus (visibilitychange), so
  // without a local guard we'd re-show the popup on every single refocus
  // all day long, which is what was happening. We stamp the day + the
  // streak count we've already celebrated in localStorage, and only show
  // the popup if today's increase hasn't been shown yet.
  const maybeShowStreakPopup = useCallback((currentStreak, increasedToday) => {
    if (!increasedToday) return
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD, local calendar day
    const lastShown = localStorage.getItem('gl_streak_popup_shown')
    const key = `${today}:${currentStreak}`
    if (lastShown === key) return // already celebrated this streak today
    localStorage.setItem('gl_streak_popup_shown', key)
    setShowStreakPopup(true)
  }, [])

  const checkStreak = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/streak')
      setStreak({
        current_streak: res.data.current_streak,
        longest_streak: res.data.longest_streak,
      })
      maybeShowStreakPopup(res.data.current_streak, res.data.streak_increased_today)
    } catch {
      // silent — streak check should never break the app
    }
  }, [maybeShowStreakPopup])

  const dismissStreakPopup = useCallback(() => setShowStreakPopup(false), [])

  // Picks up after /api/auth/google/callback redirects back here. That's a
  // full-page navigation (Google → backend → here), not a fetch, so the
  // backend has no way to hand the token back except on the URL. This runs
  // once on mount, wherever the callback's `next` pointed — grabs the token
  // if there is one, stores it exactly like a normal login would, then
  // strips it from the URL so it doesn't linger in browser history.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthToken = params.get('token')
    const authError = params.get('auth_error')

    if (oauthToken) {
      localStorage.setItem('gl_token', oauthToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${oauthToken}`
      setToken(oauthToken)
      toast.success('Signed in with Google')
    } else if (authError) {
      toast.error(
        authError === 'google_email_unverified'
          ? "That Google account's email isn't verified"
          : 'Google sign-in failed — please try again'
      )
    }

    if (oauthToken || authError) {
      params.delete('token')
      params.delete('auth_error')
      const rest = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''))
    }
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me')
      setUser(res.data)
    } catch {
      logout() // eslint-disable-line no-use-before-define
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
      checkStreak() // covers the "reopened the app with an existing session" case
    } else {
      setLoading(false)
    }
  }, [token, fetchMe, checkStreak])

  // Covers "resumed the app" — tab/window regains focus (e.g. mobile app foregrounded,
  // browser tab switched back to). Safe to call repeatedly; backend is idempotent per day.
  useEffect(() => {
    if (!token) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkStreak()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [token, checkStreak])

  const login = useCallback(async (email, password) => {
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
      maybeShowStreakPopup(res.data.streak.current_streak, res.data.streak.streak_increased_today)
    }

    return res.data
  }, [fetchMe, maybeShowStreakPopup])

  const register = useCallback(async (data) => {
    const res = await axios.post('/api/auth/register', data)
    return res.data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gl_token')
    localStorage.removeItem('gl_streak_popup_shown')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
    setStreak(null)
    setShowStreakPopup(false)
  }, [])

  const updateProfile = useCallback(async (data) => {
    const res = await axios.put('/api/auth/me', data)
    setUser(res.data)
    return res.data
  }, [])

  // Merge partial fields (e.g. { avatar_url } or { banner_url }) into the
  // shared user object without a full refetch — used after image upload/removal
  // so every component reading `user` (sidebar, friends page, etc.) updates instantly.
  const updateUserFields = useCallback((fields) => {
    setUser(prev => (prev ? { ...prev, ...fields } : prev))
  }, [])

  const changePassword = useCallback(async (data) => {
    const res = await axios.post('/api/auth/change-password', data)
    return res.data
  }, [])

  const deleteAccount = useCallback(async (password) => {
    const res = await axios.delete('/api/auth/me', { data: { password } })
    logout()
    return res.data
  }, [logout])

  // Every field/function below is now referentially stable (useCallback) or
  // a primitive/plain object, so this value only produces a new reference
  // when something in it actually changed — instead of every render of
  // AuthProvider (which, unmemoized, cascades a re-render into every
  // component in the app that calls useAuth(), since AuthProvider sits at
  // the root).
  const value = useMemo(() => ({
    user, token, loading, login, register, logout, updateProfile, updateUserFields, changePassword, deleteAccount,
    streak, showStreakPopup, dismissStreakPopup, checkStreak,
  }), [
    user, token, loading, login, register, logout, updateProfile, updateUserFields, changePassword, deleteAccount,
    streak, showStreakPopup, dismissStreakPopup, checkStreak,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
