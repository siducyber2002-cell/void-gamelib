import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'

const ChatNotifyContext = createContext({
  activeChatFriendId: null,
  setActiveChatFriendId: () => {},
})

// Generic toast card — used for new DM, friend request, and friend accepted.
function NotifyToastCard({ t, avatarUrl, username, subtitle, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#13131f', border: '1px solid rgba(168,85,247,0.35)',
        borderRadius: 14, padding: '10px 14px', minWidth: 260, maxWidth: 320,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)', cursor: 'pointer',
        opacity: t.visible ? 1 : 0, transform: t.visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 0.2s, transform 0.2s',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: '#a855f722', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#a855f7', fontWeight: 700, fontSize: 14,
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (username?.[0]?.toUpperCase() || '?')}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#eae8ff' }}>{username}</p>
        <p style={{
          margin: '2px 0 0', fontSize: 12, color: '#a5b4fc',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </p>
      </div>
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

        toast.custom(
          (t) => (
            <NotifyToastCard
              t={t}
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
