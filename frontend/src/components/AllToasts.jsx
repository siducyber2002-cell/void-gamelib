import { createContext, useContext, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { Zap, Users, MessageCircle, UserPlus, AtSign, CornerUpLeft, PartyPopper, UserMinus, XCircle, Crown, Trash2, FlameKindling } from 'lucide-react'

// ── Event bus ────────────────────────────────────────────────────────────
// Lets non-component code (e.g. xpService.js) trigger toasts without hooks.
const listeners = new Set()
export const xpEventBus = {
  emit(payload) {
    listeners.forEach(fn => fn(payload))
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

// Toast types config
const TOAST_META = {
  xp: {
    icon: Zap,
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    glow: 'rgba(168,85,247,0.45)',
    accent: '#a855f7',
  },
  level_up: {
    icon: Zap,
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    glow: 'rgba(245,158,11,0.45)',
    accent: '#f59e0b',
  },
  // Fires when a user's login streak lapses (i.e. they missed a day and
  // current_streak reset). Deliberately muted/cool-toned (slate, not the
  // warm orange StreakBadge uses for an active streak) so it doesn't read
  // as a celebratory toast — this is a "heads up" not a "nice job".
  streak_ended: {
    icon: FlameKindling,
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.4)',
    accent: '#64748b',
  },
  friend_request: {
    icon: UserPlus,
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#10b981',
  },
  friend_accepted: {
    icon: Users,
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#10b981',
  },
  new_message: {
    icon: MessageCircle,
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    glow: 'rgba(59,130,246,0.4)',
    accent: '#3b82f6',
  },
  // ── Social events, fed in by ChatNotifyContext via xpEventBus (kind: 'social') ──
  new_dm: {
    icon: MessageCircle,
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    glow: 'rgba(59,130,246,0.4)',
    accent: '#3b82f6',
  },
  group_mention: {
    icon: AtSign,
    gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    glow: 'rgba(139,92,246,0.4)',
    accent: '#8b5cf6',
  },
  group_reply: {
    icon: CornerUpLeft,
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    glow: 'rgba(139,92,246,0.4)',
    accent: '#8b5cf6',
  },
  group_join_request: {
    icon: UserPlus,
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    glow: 'rgba(245,158,11,0.4)',
    accent: '#f59e0b',
  },
  group_join_accepted: {
    icon: PartyPopper,
    gradient: 'linear-gradient(135deg, #10b981, #22c55e)',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#10b981',
  },
  group_join_rejected: {
    icon: XCircle,
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.35)',
    accent: '#64748b',
  },
  group_member_added: {
    icon: UserPlus,
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    glow: 'rgba(6,182,212,0.4)',
    accent: '#06b6d4',
  },
  group_removed: {
    icon: UserMinus,
    gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
    glow: 'rgba(244,63,94,0.4)',
    accent: '#f43f5e',
  },
  group_ownership_transferred: {
    icon: Crown,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.45)',
    accent: '#f59e0b',
  },
  group_disbanded: {
    icon: Trash2,
    gradient: 'linear-gradient(135deg, #64748b, #334155)',
    glow: 'rgba(100,116,139,0.4)',
    accent: '#64748b',
  },
}

// Single toast item — wrapped in memo() so it only re-renders when its own
// `toast` prop actually changes. Without this, every add/remove of ANY
// toast re-renders the whole toasts array in the container, which re-ran
// the JSX (and rebuilt every inline style object) for every already-visible
// toast too, not just the new one.
const ToastItem = memo(function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const meta = TOAST_META[toast.type] || TOAST_META.xp
  const Icon = meta.icon
  // Social toasts (from ChatNotifyContext) set `username` — that's the
  // signal to show a person's avatar instead of the plain icon square, and
  // to make the whole card clickable to navigate. XP/level-up toasts never
  // set this, so their rendering is completely unchanged below.
  const isSocial = toast.username !== undefined

  useEffect(() => {
    // Slide in
    const t1 = setTimeout(() => setVisible(true), 10)
    // Start leave animation
    const t2 = setTimeout(() => setLeaving(true), toast.duration || 3500)
    // Remove from DOM
    const t3 = setTimeout(() => onRemove(toast.id), (toast.duration || 3500) + 420)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const handleClick = () => {
    if (!toast.onClick) return
    toast.onClick()
    onRemove(toast.id)
  }

  return (
    <div
      onClick={toast.onClick ? handleClick : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 16,
        background: 'rgba(13,13,26,0.92)',
        border: `1px solid ${meta.accent}40`,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${meta.accent}20, 0 4px 16px ${meta.glow}`,
        minWidth: 260,
        maxWidth: 340,
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.92)',
        opacity: visible && !leaving ? 1 : 0,
        transition: leaving
          ? 'all 0.4s cubic-bezier(0.4,0,1,1)'
          : 'all 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        willChange: 'transform, opacity',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
        cursor: toast.onClick ? 'pointer' : 'default',
      }}
    >
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(105deg, transparent 40%, ${meta.accent}18 50%, transparent 60%)`,
        backgroundSize: '200% 100%',
        animation: 'xpShimmer 1.8s ease-in-out 1',
      }} />

      {isSocial ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
            background: `${meta.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: meta.accent, fontWeight: 700, fontSize: 15, border: `1.5px solid ${meta.accent}55`,
          }}>
            {toast.avatarUrl
              ? <img src={toast.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (toast.username?.[0]?.toUpperCase() || '?')}
          </div>
          <div style={{
            position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%',
            background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0d0d1a', boxShadow: `0 2px 6px ${meta.accent}60`,
          }}>
            <Icon size={10} color="#fff" strokeWidth={3} />
          </div>
        </div>
      ) : (
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: meta.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${meta.glow}`,
        }}>
          <Icon size={18} color="#fff" strokeWidth={2.5} />
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 800, color: '#eae8ff',
          margin: 0, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {isSocial ? toast.username : toast.title}
        </p>
        {toast.subtitle && (
          <p style={{ fontSize: 11, color: '#8c8aaa', margin: '2px 0 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.subtitle}
          </p>
        )}
      </div>

      {/* XP badge */}
      {toast.xp && (
        <div style={{
          flexShrink: 0,
          padding: '3px 9px', borderRadius: 8,
          background: `${meta.accent}22`,
          border: `1px solid ${meta.accent}40`,
          color: meta.accent, fontSize: 12, fontWeight: 900,
          fontFamily: 'monospace',
        }}>
          {toast.xp}
        </div>
      )}

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `${meta.accent}20`,
      }}>
        <div style={{
          height: '100%',
          background: meta.gradient,
          animation: `xpProgress ${(toast.duration || 3500)}ms linear forwards`,
          transformOrigin: 'left',
        }} />
      </div>
    </div>
  )
})

// The keyframes never depend on props — they were previously inlined as a
// <style> tag rendered by AllToastsContainer, which re-runs on every single
// toast add/remove (i.e. constantly). Even though the CSS text itself never
// changes, React was still touching that <style> node's text content on
// every one of those re-renders. Splitting it into its own memo'd component
// with no props means React renders it exactly once and never revisits it.
const ToastKeyframes = memo(function ToastKeyframes() {
  return (
    <style>{`
      @keyframes xpShimmer {
        0%   { background-position: 200% center; }
        100% { background-position: -200% center; }
      }
      @keyframes xpProgress {
        from { width: 100%; }
        to   { width: 0%; }
      }
    `}</style>
  )
})

// Internal presentational container — rendered once by the Provider, never import directly
function AllToastsContainer({ toasts, onRemove }) {
  return (
    <>
      <ToastKeyframes />
      <div style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  )
}

// ── Global context ──────────────────────────────────────────────────────────
// This makes toasts work no matter which page/component triggers them.
// Mount <XPToastProvider> ONCE, at the root of your app (e.g. App.jsx or Layout.jsx),
// wrapping everything else. Then any page can just call useXPToast().
let _toastId = 0
const XPToastCtx = createContext(null)

export function XPToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    setToasts(prev => [...prev, { id: ++_toastId, ...toast }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showXP = useCallback((xpEarned, action, detail = '') => {
    const labels = {
      made_friend:     'New Friend Added',
      added_game:      'Game Added to Library',
      completed_game:  'Game Completed!',
      watched_trailer: 'Watched a Trailer',
      read_news:       'Read News Article',
    }
    addToast({
      type: 'xp',
      title: labels[action] || 'XP Earned',
      subtitle: detail || undefined,
      xp: `+${xpEarned} XP`,
      duration: 3500,
    })
  }, [addToast])

  const showLevelUp = useCallback((newLevel) => {
    addToast({
      type: 'level_up',
      title: `Level Up! You're now Level ${newLevel}`,
      subtitle: 'Keep going — you\'re on fire!',
      duration: 5000,
    })
  }, [addToast])

  // Call this when the frontend learns a user's login streak has lapsed
  // (current_streak reset to 0 after previously being > 0). `previousStreak`
  // is optional — pass it if you have it (e.g. the last value you read from
  // authStreak.current_streak before this update) so the message can
  // reference what was lost; omit it for a generic message.
  const showStreakEnded = useCallback((previousStreak) => {
    addToast({
      type: 'streak_ended',
      title: 'Streak Ended',
      subtitle: previousStreak
        ? `Your ${previousStreak}-day streak has ended. A new one just started.`
        : 'Your login streak has ended. A new one just started.',
      duration: 5000,
    })
  }, [addToast])

  const showFriendRequest = useCallback((username) => {
    addToast({
      type: 'friend_request',
      title: 'New Friend Request',
      subtitle: `${username} wants to be friends`,
      duration: 4000,
    })
  }, [addToast])

  const showFriendAccepted = useCallback((username) => {
    addToast({
      type: 'friend_accepted',
      title: 'Friend Request Accepted!',
      subtitle: `You and ${username} are now friends`,
      xp: '+30 XP',
      duration: 4000,
    })
  }, [addToast])

  const showNewMessage = useCallback((username) => {
    addToast({
      type: 'new_message',
      title: 'New Message',
      subtitle: `${username} sent you a message`,
      duration: 3500,
    })
  }, [addToast])

  // Convenience: call the backend /api/xp/award endpoint AND show the right
  // toast(s) from the response, in one go. Pages will mostly just call this.
  const awardXP = useCallback(async (action, detail = '') => {
    try {
      const axios = (await import('axios')).default
      const res = await axios.post('/api/xp/award', { action, detail })
      const data = res.data
      if (data.xp_earned > 0) {
        showXP(data.xp_earned, action, detail)
      }
      if (data.leveled_up) {
        // Slight stagger so the two toasts don't overlap visually
        setTimeout(() => showLevelUp(data.level), 450)
      }
      return data
    } catch (e) {
      console.error('XP award failed:', e)
      return null
    }
  }, [showXP, showLevelUp])

  // Listen for XP events fired from outside React (e.g. xpService.js), AND
  // social events fired by ChatNotifyContext (DMs, friend requests, group
  // mentions/replies/join events) — this is the single point where both
  // feed into the same toast queue, so there's only ever one toast stack
  // on screen instead of two competing ones.
  useEffect(() => {
    const unsubscribe = xpEventBus.subscribe((payload) => {
      if (payload.kind === 'xp') {
        showXP(payload.xpEarned, payload.action, payload.detail)
      } else if (payload.kind === 'level_up') {
        showLevelUp(payload.level)
      } else if (payload.kind === 'streak_ended') {
        showStreakEnded(payload.previousStreak)
      } else if (payload.kind === 'social') {
        addToast(payload.toast)
      }
    })
    return unsubscribe
  }, [showXP, showLevelUp, showStreakEnded, addToast])

  // Every action here is now a stable useCallback reference, so this value
  // object only changes identity when `toasts` itself changes — components
  // that call useXPToast() purely to trigger toasts (not to read the list)
  // no longer re-render every time a toast is added or expires elsewhere
  // in the app.
  const value = useMemo(() => ({
    toasts,
    removeToast,
    showXP,
    showLevelUp,
    showStreakEnded,
    showFriendRequest,
    showFriendAccepted,
    showNewMessage,
    awardXP,
  }), [toasts, removeToast, showXP, showLevelUp, showStreakEnded, showFriendRequest, showFriendAccepted, showNewMessage, awardXP])

  return (
    <XPToastCtx.Provider value={value}>
      {children}
      <AllToastsContainer toasts={toasts} onRemove={removeToast} />
    </XPToastCtx.Provider>
  )
}

export function useXPToast() {
  const ctx = useContext(XPToastCtx)
  if (!ctx) {
    throw new Error('useXPToast() must be used inside <XPToastProvider>. Wrap your app root with it once (e.g. in App.jsx).')
  }
  return ctx
}
