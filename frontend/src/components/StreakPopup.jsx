import { useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// No props, so memo() means this only ever re-renders when its own hooks
// (useAuth/useTheme) actually give it new values — not because whatever
// mounted it happened to re-render for an unrelated reason.
function StreakPopup() {
  const { showStreakPopup, streak, dismissStreakPopup } = useAuth()
  const { dark } = useTheme()

  useEffect(() => {
    if (!showStreakPopup) return
    const timer = setTimeout(dismissStreakPopup, 5000)
    return () => clearTimeout(timer)
  }, [showStreakPopup, dismissStreakPopup])

  if (!showStreakPopup || !streak) return null

  // Rendered through a portal straight to document.body. `position: fixed`
  // is supposed to pin an element to the viewport no matter how far the
  // page is scrolled — but that breaks the moment ANY ancestor has a
  // `transform`, `filter`, `perspective`, or `will-change` style, because
  // that ancestor becomes the new containing block instead of the
  // viewport. That's almost certainly why this was only showing up near
  // the top of the page and disappearing on scroll — some wrapper further
  // up the tree (a page-transition wrapper, an animated layout container,
  // etc.) has one of those properties. Portaling to <body> sidesteps that
  // ancestor chain entirely, so this will now stay pinned top-right
  // regardless of scroll position or which page you're on.
  return createPortal(
    <div className="fixed top-6 right-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-card-hover font-body ${
          dark
            ? 'bg-[#14101f] border-accent-violet/30 text-white'
            : 'bg-white border-accent-violet/20 text-gray-900'
        }`}
        style={{ minWidth: 300 }}
      >
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xl"
          style={{ background: 'radial-gradient(circle at 35% 30%, #a855f7, #4c1d95 75%)' }}
        >
          🔥
        </div>

        <div className="flex-1">
          <p className="font-display text-sm font-semibold">
            {streak.current_streak} Day Streak!
          </p>
          <p className={`text-xs mt-0.5 ${dark ? 'text-white/60' : 'text-gray-500'}`}>
            You're keeping the Void alive. Come back tomorrow to keep it going.
          </p>
        </div>

        <button
          onClick={dismissStreakPopup}
          className={`flex-shrink-0 rounded-full p-1 text-lg leading-none transition-colors ${
            dark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-700'
          }`}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  )
}

export default memo(StreakPopup)
