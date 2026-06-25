import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({ dark: true, setDark: () => {} })

export function ThemeProvider({ children }) {
  // Persist preference in localStorage
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('void-theme')
    return saved !== null ? saved === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('void-theme', dark ? 'dark' : 'light')
    // Apply to <html> so Tailwind dark: classes + any global CSS vars work everywhere
    if (dark) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
