import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useTheme } from '../../context/ThemeContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(248)
  const { dark, setDark } = useTheme()

  // Force <body> background to match theme — guarantees no white
  // ever shows through, regardless of inner page height/overflow.
  useEffect(() => {
    document.body.style.background = dark ? '#0b0f19' : '#f6f8fc'
    document.documentElement.style.background = dark ? '#0b0f19' : '#f6f8fc'
    return () => {
      document.body.style.background = ''
      document.documentElement.style.background = ''
    }
  }, [dark])

  return (
    <div
      className="flex min-h-screen"
      style={{ background: dark ? '#08080f' : '#f0eeff', transition: 'background 0.3s' }}
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
        dark={dark}
      />

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarOpen(s => !s)}
          dark={dark}
          setDark={setDark}
        />
        <main
          className="flex-1 overflow-auto"
          style={{ background: dark ? '#0b0f19' : '#f6f8fc' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
