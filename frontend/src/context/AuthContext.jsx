import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('gl_token'))
  const [loading, setLoading] = useState(true)

  axios.defaults.baseURL = 'http://localhost:8000'

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe()
    } else {
      setLoading(false)
    }
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
