import { useEffect, useState } from 'react'
import { Zap, Users, MessageCircle, UserPlus } from 'lucide-react'

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
}

// Single toast item
function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const meta = TOAST_META[toast.type] || TOAST_META.xp
  const Icon = meta.icon

  useEffect(() => {
    // Slide in
    const t1 = setTimeout(() => setVisible(true), 10)
    // Start leave animation
    const t2 = setTimeout(() => setLeaving(true), toast.duration || 3500)
    // Remove from DOM
    const t3 = setTimeout(() => onRemove(toast.id), (toast.duration || 3500) + 420)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div
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
      }}
    >
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(105deg, transparent 40%, ${meta.accent}18 50%, transparent 60%)`,
        backgroundSize: '200% 100%',
        animation: 'xpShimmer 1.8s ease-in-out 1',
      }} />

      {/* Icon circle */}
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: meta.gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 14px ${meta.glow}`,
      }}>
        <Icon size={18} color="#fff" strokeWidth={2.5} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 800, color: '#eae8ff',
          margin: 0, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast.title}
        </p>
        {toast.subtitle && (
          <p style={{ fontSize: 11, color: '#8c8aaa', margin: '2px 0 0', lineHeight: 1.3 }}>
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
}

// The global toast container — place this once in App.jsx or Layout.jsx
export default function XPToastContainer({ toasts, onRemove }) {
  return (
    <>
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

// ── Hook ──────────────────────────────────────────────────────────────────────
// Usage: const { showXP, showFriendToast, showMessageToast } = useXPToast()
let _toastId = 0

export function useXPToast() {
  const [toasts, setToasts] = useState([])

  const addToast = (toast) => {
    setToasts(prev => [...prev, { id: ++_toastId, ...toast }])
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const showXP = (xpEarned, action, detail = '') => {
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
  }

  const showLevelUp = (newLevel) => {
    addToast({
      type: 'level_up',
      title: `Level Up! You're now Level ${newLevel}`,
      subtitle: 'Keep going — you\'re on fire!',
      duration: 5000,
    })
  }

  const showFriendRequest = (username) => {
    addToast({
      type: 'friend_request',
      title: 'New Friend Request',
      subtitle: `${username} wants to be friends`,
      duration: 4000,
    })
  }

  const showFriendAccepted = (username) => {
    addToast({
      type: 'friend_accepted',
      title: 'Friend Request Accepted!',
      subtitle: `You and ${username} are now friends`,
      xp: '+30 XP',
      duration: 4000,
    })
  }

  const showNewMessage = (username) => {
    addToast({
      type: 'new_message',
      title: 'New Message',
      subtitle: `${username} sent you a message`,
      duration: 3500,
    })
  }

  return {
    toasts,
    removeToast,
    showXP,
    showLevelUp,
    showFriendRequest,
    showFriendAccepted,
    showNewMessage,
  }
}
