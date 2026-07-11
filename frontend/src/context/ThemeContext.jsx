import { createContext, useContext, useState, useEffect, useMemo } from 'react'

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

  // setDark is already stable (useState setter), so this only produces a
  // new reference when `dark` itself changes — every component reading
  // useTheme() no longer re-renders on unrelated ThemeProvider re-renders.
  const value = useMemo(() => ({ dark, setDark }), [dark])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
