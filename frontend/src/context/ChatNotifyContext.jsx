import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { xpEventBus } from '../components/XPToast'

const ChatNotifyContext = createContext({
  activeChatFriendId: null,
  setActiveChatFriendId: () => {},
})

// Per-event-type config: toast subtitle + where clicking it should navigate.
const EVENT_CONFIG = {
  new_dm:              (d) => ({ subtitle: d.content, path: `/friends?tab=Friends&dm=${d.sender_id}` }),
  friend_request:      (d) => ({ subtitle: 'Sent you a friend request', path: '/friends?tab=Requests' }),
  friend_accepted:     (d) => ({ subtitle: 'Accepted your friend request', path: '/friends?tab=Friends' }),
  group_mention:       (d) => ({ subtitle: `Mentioned you in ${d.group_name}`, path: `/community/${d.group_id}` }),
  group_reply:         (d) => ({ subtitle: `Replied: ${d.content}`, path: `/community/${d.group_id}` }),
  group_join_request:  (d) => ({ subtitle: `Wants to join ${d.group_name}`, path: `/community/${d.group_id}` }),
  group_join_accepted: (d) => ({ subtitle: `Welcome to ${d.group_name}! 🎉`, path: `/community/${d.group_id}` }),
  group_join_rejected: (d) => ({ subtitle: `Your request to join ${d.group_name} was declined`, path: '/community' }),
  group_member_added:  (d) => ({ subtitle: `Added you to ${d.group_name}`, path: `/community/${d.group_id}` }),
  group_removed:       (d) => ({ subtitle: `You were removed from ${d.group_name}`, path: '/community' }),
  // These two are pushed live by community.py's transfer_ownership() and
  // disband_group(), but had no entry here — meaning fireToast's
  // `if (!build) return` silently swallowed both events and affected
  // members never found out their ownership changed or their group was
  // disbanded until they happened to revisit /community.
  group_ownership_transferred: (d) => ({ subtitle: `You're now the owner of ${d.group_name}`, path: `/community/${d.group_id}` }),
  group_disbanded:     (d) => ({ subtitle: `${d.group_name} was disbanded`, path: '/community' }),
}

// Dedupe key so a request/accept only ever toasts once — whether it arrives
// live over the socket or gets picked up later by the offline catch-up.
// Scoped per-user so multiple accounts on the same browser don't share
// (or leak) each other's seen state.
const SEEN_KEY_PREFIX = 'gl_seen_notify_events'
const getSeenKey = (userId) => `${SEEN_KEY_PREFIX}_${userId ?? 'anon'}`
const getSeen  = (userId) => { try { return new Set(JSON.parse(localStorage.getItem(getSeenKey(userId))) || []) } catch { return new Set() } }
const markSeen = (userId, id) => {
  const s = getSeen(userId); s.add(id)
  localStorage.setItem(getSeenKey(userId), JSON.stringify([...s].slice(-300)))
}

// Only these types need de-duping against the offline catch-up. `new_dm`
// isn't re-fetched by catch-up, so it doesn't need a seen-key.
const DEDUPE_TYPES = new Set(['friend_request', 'friend_accepted'])

// Module-level (not per-render) lock — React 18 Strict Mode mounts effects
// twice in dev, so without this, two overlapping catchUp() calls can both
// read localStorage before either writes back and both fire the same toast.
let catchUpInFlight = false

export function ChatNotifyProvider({ children }) {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id

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
    if (!token || !userId) {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    let stopped = false

    // `alreadySeen` marks the event as seen (for dedupe-able types) BEFORE
    // rendering the toast. This is the key fix: previously only the offline
    // catch-up path called markSeen(), so anything that arrived live never
    // got recorded — meaning the very next reconnect / login / catch-up run
    // would see it as "unseen" and fire it again, giving the repeated /
    // double / triple toast behavior.
    const fireToast = (data) => {
      const build = EVENT_CONFIG[data.type]
      if (!build) return
      if (data.type === 'new_dm' && activeChatFriendIdRef.current === data.sender_id) return

      if (DEDUPE_TYPES.has(data.type)) {
        if (data.id == null) {
          // Defensive: if the backend payload for this event type doesn't
          // include a stable id, we can't dedupe it reliably. Log so it's
          // visible during testing rather than silently double-firing.
          console.warn(`[ChatNotify] "${data.type}" event missing an id — cannot dedupe`, data)
        } else {
          const key = `${data.type}-${data.id}`
          const seen = getSeen(userId)
          if (seen.has(key)) return
          markSeen(userId, key)
        }
      }

      const { subtitle, path } = build(data)

      // Hand off to the single shared toast system (XPToast) instead of
      // rendering our own card here — see XPToast.jsx's `kind: 'social'`
      // branch. `username`/`avatarUrl` presence is what tells ToastItem to
      // draw the avatar-circle style instead of the plain icon square.
      xpEventBus.emit({
        kind: 'social',
        toast: {
          type:      data.type,
          username:  data.sender_username,
          avatarUrl: data.sender_avatar_url,
          subtitle,
          duration:  3000,
          onClick:   () => navigate(path),
        },
      })
    }

    // Catch up on anything that happened while you were offline — a friend
    // request/accept sent to an offline user has nowhere to go live, so on
    // login/reconnect we pull recent ones and toast whatever hasn't been
    // shown yet (tracked via the per-user seen set, so it only ever fires
    // once, whether it was already shown live or not).
    const catchUp = async () => {
      if (catchUpInFlight) return
      catchUpInFlight = true
      try {
        const axios = (await import('axios')).default
        const [{ data: requests }, { data: notifs }] = await Promise.all([
          axios.get('/api/friends/requests'),
          axios.get('/api/xp/notifications?limit=20'),
        ])
        if (stopped) return

        requests.forEach((r) => {
          fireToast({
            type: 'friend_request', id: r.id, sender_id: r.requester_id,
            sender_username: r.requester?.username, sender_avatar_url: r.requester?.avatar_url,
          })
        })

        notifs.filter((n) => n.type === 'friend_accepted').forEach((n) => {
          fireToast({
            type: 'friend_accepted', id: n.id, sender_id: n.id,
            sender_username: n.detail || 'Someone', sender_avatar_url: null,
          })
        })
      } catch {
        /* catch-up is best-effort — never block the app on it */
      } finally {
        catchUpInFlight = false
      }
    }

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
        fireToast(data)
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
    catchUp()

    return () => {
      stopped = true
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // don't reconnect on our own cleanup
        wsRef.current.close()
        wsRef.current = null
      }
    }
    // Depend on userId (stable primitive), not the user object — AuthContext
    // may hand back a new object reference on unrelated renders, which would
    // otherwise tear down and reconnect the socket (and re-run catchUp)
    // far more often than an actual login/logout.
  }, [token, userId, navigate])

  // Without this, every render of ChatNotifyProvider (e.g. any time the
  // *parent* re-renders, unrelated to chat) handed out a brand-new object
  // reference here — which forces every component that calls
  // useChatNotify() to re-render too, even though activeChatFriendId is
  // the only piece of state involved and it rarely changes.
  const value = useMemo(
    () => ({ activeChatFriendId, setActiveChatFriendId }),
    [activeChatFriendId]
  )

  return (
    <ChatNotifyContext.Provider value={value}>
      {children}
    </ChatNotifyContext.Provider>
  )
}

export const useChatNotify = () => useContext(ChatNotifyContext)
