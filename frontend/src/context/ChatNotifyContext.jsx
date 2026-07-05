import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MessageCircle, UserPlus, Users } from 'lucide-react'
import { useAuth } from './AuthContext'
import { xpEventBus } from '../components/XPToast'

const ChatNotifyContext = createContext({
  activeChatFriendId: null,
  setActiveChatFriendId: () => {},
})

const TYPE_META = {
  new_dm:          { icon: MessageCircle, accent: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  friend_request:  { icon: UserPlus,      accent: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  friend_accepted: { icon: Users,         accent: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
}

function NotifyToastCard({ t, type, avatarUrl, username, subtitle, onOpen }) {
  const meta = TYPE_META[type]
  const Icon = meta.icon
  return (
    <div
      onClick={onOpen}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 16, minWidth: 270, maxWidth: 330,
        background: 'rgba(13,13,26,0.94)', border: `1px solid ${meta.accent}40`,
        backdropFilter: 'blur(16px)', overflow: 'hidden', cursor: 'pointer',
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${meta.accent}18, 0 4px 16px ${meta.accent}30`,
        transform: t.visible ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.94)',
        opacity: t.visible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
          background: `${meta.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: meta.accent, fontWeight: 700, fontSize: 15, border: `1.5px solid ${meta.accent}55`,
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (username?.[0]?.toUpperCase() || '?')}
        </div>
        <div style={{
          position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%',
          background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #0d0d1a', boxShadow: `0 2px 6px ${meta.accent}60`,
        }}>
          <Icon size={10} color="#fff" strokeWidth={3} />
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#eae8ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {username}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a0a0c0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </p>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `${meta.accent}20` }}>
        <div style={{ height: '100%', background: meta.gradient, animation: 'dmToastProgress 3000ms linear forwards' }} />
      </div>
      <style>{`@keyframes dmToastProgress { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  )
}

// Per-event-type config: toast subtitle + where clicking it should navigate.
const EVENT_CONFIG = {
  new_dm:            (d) => ({ subtitle: d.content, path: `/friends?tab=Friends&dm=${d.sender_id}` }),
  friend_request:    (d) => ({ subtitle: 'Sent you a friend request', path: '/friends?tab=Requests' }),
  friend_accepted:   (d) => ({ subtitle: 'Accepted your friend request', path: '/friends?tab=Friends' }),
}

export function ChatNotifyProvider({ children }) {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  // Which friend's DM panel is currently open, anywhere in the app. While
  // it's open for a given sender, an incoming message from them is already
  // visible live in the panel — a toast on top would just be noise, and
  // this is exactly what makes the toast "stop" the moment you go look.
  const [activeChatFriendId, setActiveChatFriendId] = useState(null)
  const activeChatFriendIdRef = useRef(null)
  useEffect(() => { activeChatFriendIdRef.current = activeChatFriendId }, [activeChatFriendId])

  const wsRef             = useRef(null)
  const reconnectTimer    = useRef(null)
  const reconnectAttempt  = useRef(0)

  useEffect(() => {
    if (!token || !user) {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    let stopped = false

    const connect = () => {
      if (stopped) return

      // Same derivation DMChatPanel already uses for its per-room socket —
      // talk directly to the backend origin, not window.location, so this
      // still works when the frontend/backend are on different Render
      // domains.
      const apiBase = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')
      const wsBase  = apiBase.replace(/^http/, 'ws')
      const ws = new WebSocket(`${wsBase}/api/dm/ws/notify?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => { reconnectAttempt.current = 0 }

      ws.onmessage = (e) => {
        let data
        try { data = JSON.parse(e.data) } catch { return }

        const build = EVENT_CONFIG[data.type]
        if (!build) return

        // Already viewing that DM live — skip its toast only.
        if (data.type === 'new_dm' && activeChatFriendIdRef.current === data.sender_id) return

        const { subtitle, path } = build(data)
        const toastId = `${data.type}-${data.sender_id}-${data.id}`

        // Bell already listens on xpEventBus (for xp/level_up) and refetches
        // on any event — piggyback on it so the unread badge updates the
        // instant this arrives, instead of waiting on its ~12s poll.
        xpEventBus.emit({ kind: data.type })

        toast.custom(
          (t) => (
            <NotifyToastCard
              t={t}
              type={data.type}
              avatarUrl={data.sender_avatar_url}
              username={data.sender_username}
              subtitle={subtitle}
              onOpen={() => { toast.dismiss(toastId); navigate(path) }}
            />
          ),
          { duration: 3000, id: toastId }
        )
      }

      ws.onclose = () => {
        wsRef.current = null
        if (stopped) return
        const attempt = reconnectAttempt.current + 1
        reconnectAttempt.current = attempt
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000)
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = () => { ws.close() }
    }

    connect()

    return () => {
      stopped = true
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // don't reconnect on our own cleanup
        wsRef.current.close()
        wsRef.current = null
      }
    }
    // token/user changes = login/logout; reconnect fresh each time.
  }, [token, user, navigate])

  return (
    <ChatNotifyContext.Provider value={{ activeChatFriendId, setActiveChatFriendId }}>
      {children}
    </ChatNotifyContext.Provider>
  )
}

export const useChatNotify = () => useContext(ChatNotifyContext)
