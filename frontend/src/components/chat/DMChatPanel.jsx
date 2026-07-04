import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Send, Minimize2, Maximize2, Circle, Loader2, Smile, MoreVertical, Trash2, Ban, UserX, Check, CheckCheck, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import axios from 'axios'

// Compact, curated emoji set — enough variety for casual chat without
// pulling in an emoji-picker dependency.
const EMOJI_GROUPS = {
  Smileys: ['😀','😂','🤣','😅','😊','😍','🥰','😘','😉','😎','🤔','🙄','😴','😭','😢','😡','🤯','🥳','😱','🫡'],
  Gestures: ['👍','👎','👏','🙌','🙏','💪','🤝','👋','✌️','🤞','👌','🫶'],
  Gaming: ['🎮','🕹️','🏆','🔥','⚡','💯','🎯','🚀','⭐','💀','🎉','🥇'],
  Hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💖'],
}

function getRoomId(userId1, userId2) {
  return [userId1, userId2].sort((a, b) => a - b).join('_')
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function MessageBubble({ msg, isSelf, showAvatar, friend, accentColors, isDark, showStatus }) {
  return (
    <div className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : ''}`}>
      {!isSelf && (
        <div className="w-7 h-7 flex-shrink-0">
          {showAvatar && (
            friend.avatar_url
              ? <img src={friend.avatar_url} alt={friend.username} className="w-7 h-7 rounded-full object-cover" />
              : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: accentColors.primary }}
                >
                  {friend.username?.[0]?.toUpperCase()}
                </div>
              )
          )}
        </div>
      )}

      <div className={`max-w-[70%] flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={{
            // whiteSpace: pre-wrap — this was the "text format" bug. The
            // textarea supports Shift+Enter for a new line, but plain text
            // in a div collapses newlines by default, so multi-line
            // messages silently rendered as one squashed line. pre-wrap
            // keeps the line breaks (and still wraps long words).
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            ...(isSelf
              ? { background: `linear-gradient(135deg, ${accentColors.primary}, #8b5cf6)`, color: 'white', borderBottomRightRadius: '4px' }
              : {
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
                  color: isDark ? '#eae8ff' : '#0f0f1f',
                  borderBottomLeftRadius: '4px'
                }),
          }}
        >
          {msg.content}
        </div>
        <span className={`text-xs px-1 flex items-center gap-1 ${isDark ? 'text-[#8c8aaa]' : 'text-[#6b7280]'}`}>
          {formatTime(msg.created_at)}
          {/* Read receipt — WhatsApp-style: only shown on the most recent
              message you sent, not on every bubble (too noisy otherwise). */}
          {isSelf && showStatus && (
            msg.optimistic
              ? <Clock size={11} />
              : msg.is_read
                ? <CheckCheck size={13} style={{ color: accentColors.primary }} />
                : <Check size={13} />
          )}
        </span>
        {isSelf && showStatus && (
          <span className={`text-[10px] px-1 -mt-1 ${isDark ? 'text-[#8c8aaa]' : 'text-[#6b7280]'}`}>
            {msg.optimistic ? 'Sending…' : (msg.is_read ? 'Seen' : 'Sent')}
          </span>
        )}
      </div>
    </div>
  )
}

// onNewMessage(senderName) — called when a message arrives from the friend
// onRequestRemove(friend) / onRequestBlock(friend) — delegate up to the
//   Friends page's own remove/block handlers, so an action taken from
//   inside the chat panel goes through the exact same confirmation +
//   state update as the Friends grid. Keeps the two views in sync instead
//   of the panel quietly having its own separate copy of this logic.
// requestConfirm(config) — the Friends page's confirm-modal setter, reused
//   here for "Clear chat" so every destructive action in the app (remove,
//   block, decline, clear chat) shares one modal instead of this panel
//   falling back to a native window.confirm().
export default function DMChatPanel({ friend, onClose, onNewMessage, onRequestRemove, onRequestBlock, requestConfirm }) {
  const { user } = useAuth()
  const { dark: isDark } = useTheme()
  const accentColors = { primary: '#a855f7', secondary: '#7c3aed' }

  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [wsReady, setWsReady]     = useState(false)
  const [isTyping, setIsTyping]   = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiTab, setEmojiTab]   = useState('Smileys')
  const [showMenu, setShowMenu]   = useState(false)
  const [clearing, setClearing]   = useState(false)

  const wsRef       = useRef(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const reconnectTimer = useRef(null)
  const reconnectAttempt = useRef(0)
  const emojiPickerRef = useRef(null)
  const emojiBtnRef     = useRef(null)
  const menuRef      = useRef(null)
  const menuBtnRef   = useRef(null)
  // Track if panel is minimized in a ref so the ws handler can read it
  const minimizedRef = useRef(false)
  // Track our own in-flight optimistic messages so we can reconcile the
  // server echo instead of rendering it as a duplicate bubble
  const pendingOptimistic = useRef([])

  const roomId = getRoomId(user?.id, friend?.id)
  const token  = localStorage.getItem('gl_token')

  // ── theme tokens ──────────────────────────────────────────
  // Matched directly to FriendsPage's palette (bgCard / borderClr / txtPri
  // etc.) so the panel reads as part of the same surface instead of a
  // visually separate widget bolted onto the page.
  const panelBg          = isDark ? '#13131f' : '#ffffff'
  const headerBg         = isDark
    ? `linear-gradient(135deg, ${accentColors.primary}20, #8b5cf620)`
    : `linear-gradient(135deg, ${accentColors.primary}15, #8b5cf615)`
  const borderColor      = isDark ? 'rgba(255,255,255,0.08)' : '#e8e8f0'
  const msgAreaBg        = isDark ? '#0b0b14' : '#f4f4f8'
  const inputAreaBg      = panelBg
  const inputBg          = isDark ? '#1a1a2a' : '#ffffff'
  const inputText        = isDark ? '#eae8ff' : '#0f0f1f'
  const inputPlaceholder = isDark ? 'placeholder-gray-500' : 'placeholder-slate-400'
  const inputFocus       = 'focus:border-purple-500'
  const textPrimary      = isDark ? 'text-[#eae8ff]' : 'text-[#0f0f1f]'
  const textMuted        = isDark ? 'text-[#8c8aaa]' : 'text-[#6b7280]'
  const dividerBg        = isDark ? 'bg-white/10' : 'bg-slate-200'
  const typingBg         = isDark ? 'bg-white/10' : 'bg-slate-200'
  const typingDot        = isDark ? 'bg-gray-400' : 'bg-slate-400'
  const minimizeBtnHover = isDark ? 'hover:bg-purple-500/10' : 'hover:bg-purple-50'
  const closeBtnHover    = isDark ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'
  const dangerHover      = isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
  const iconColor        = isDark ? 'text-[#8c8aaa]' : 'text-[#6b7280]'

  // ── Load message history ──────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`/api/dm/history/${friend.id}`)
      setMessages(res.data)
      // Opening the panel means we've now read everything up to this point
      axios.post(`/api/dm/read/${friend.id}`).catch(() => {})
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [friend.id])

  // ── Connect WebSocket (with auto-reconnect) ────────────────
  useEffect(() => {
    loadHistory()

    const connect = () => {
      // Build the WS URL from the *same* backend origin axios already uses
      // (AuthContext sets axios.defaults.baseURL = VITE_API_URL). Using
      // window.location.host here was the actual bug in production: the
      // frontend (static site) and backend (web service) live on two
      // different Render domains, so that always resolved to a host with
      // no /api/dm/ws route at all, and the socket could never open —
      // every message silently fell back to REST until the panel was
      // reopened. Deriving from VITE_API_URL instead means we always talk
      // directly to the backend, regardless of what's proxying (or not
      // proxying) the frontend.
      const apiBase = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')
      const wsBase  = apiBase.replace(/^http/, 'ws') // http:// → ws://, https:// → wss://
      const ws = new WebSocket(`${wsBase}/api/dm/ws/dm/${roomId}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsReady(true)
        // If this is a *reconnect* (not the first connect), re-fetch
        // history — any message that arrived while we were dropped would
        // otherwise sit unseen until the panel was closed and reopened.
        if (reconnectAttempt.current > 0) loadHistory()
        reconnectAttempt.current = 0
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)

          if (data.type === 'typing') {
            if (data.user_id !== user?.id) {
              setIsTyping(true)
              clearTimeout(typingTimer.current)
              typingTimer.current = setTimeout(() => setIsTyping(false), 2000)
            }
            return
          }

          if (data.type === 'read') {
            // The friend has now read everything up to this point — flip
            // our sent messages to "Seen" live, no refresh needed.
            if (data.reader_id === friend.id) {
              setMessages(prev => prev.map(m =>
                m.sender_id === user?.id ? { ...m, is_read: true } : m
              ))
            }
            return
          }

          if (data.type === 'cleared') {
            // Either side cleared the chat — the messages are actually
            // gone server-side now, so both open panels clear together.
            setMessages([])
            return
          }

          if (data.type === 'message') {
            setMessages(prev => {
              if (prev.find(m => m.id === data.id)) return prev

              // If this is the server echo of a message WE just sent,
              // replace the optimistic placeholder instead of adding a
              // second, duplicate bubble.
              if (data.sender_id === user?.id && pendingOptimistic.current.length) {
                const optIndex = prev.findIndex(m =>
                  m.optimistic && pendingOptimistic.current.includes(m.id) && m.content === data.content
                )
                if (optIndex !== -1) {
                  pendingOptimistic.current = pendingOptimistic.current.filter(id => id !== prev[optIndex].id)
                  const next = [...prev]
                  next[optIndex] = data
                  return next
                }
              }

              return [...prev, data]
            })

            // If the message is from the friend (not self), fire the notification callback
            if (data.sender_id !== user?.id) {
              // Only notify if panel is minimized — if open and visible, user sees it directly
              if (minimizedRef.current) {
                onNewMessage?.(friend.username)
              } else {
                // Visible and reading it live — mark read right away
                axios.post(`/api/dm/read/${friend.id}`).catch(() => {})
              }
            }
          }
        } catch {}
      }

      ws.onclose = () => {
        setWsReady(false)
        wsRef.current = null
        // Auto-reconnect with capped exponential backoff, so a dropped
        // connection doesn't silently kill live updates until the panel
        // is closed and reopened.
        const attempt = reconnectAttempt.current + 1
        reconnectAttempt.current = attempt
        const delay = Math.min(1000 * 2 ** (attempt - 1), 10000)
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        setWsReady(false)
        ws.close()
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(typingTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // don't trigger reconnect on unmount
        wsRef.current.close()
      }
    }
  }, [roomId, token])

  // Keep minimizedRef in sync
  useEffect(() => {
    minimizedRef.current = minimized
  }, [minimized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (!minimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
      axios.post(`/api/dm/read/${friend.id}`).catch(() => {})
    }
  }, [minimized, friend.id])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    const optimistic = {
      id: `opt_${Date.now()}`,
      sender_id: user?.id,
      receiver_id: friend.id,
      content: text,
      created_at: new Date().toISOString(),
      optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    pendingOptimistic.current.push(optimistic.id)
    setInput('')

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content: text }))
    } else {
      axios.post('/api/dm/send', { receiver_id: friend.id, content: text })
        .catch(() => {
          setMessages(prev => prev.filter(m => m.id !== optimistic.id))
          pendingOptimistic.current = pendingOptimistic.current.filter(id => id !== optimistic.id)
        })
    }
  }

  // The actual delete — separated from the confirmation trigger below.
  const doClearChat = async () => {
    try {
      setClearing(true)
      await axios.delete(`/api/dm/clear/${friend.id}`)
      setMessages([]) // don't wait for the WS echo — clear immediately for whoever tapped it
    } catch {
      // leave messages as-is if the delete failed server-side
    } finally {
      setClearing(false)
    }
  }

  // Routes through the Friends page's shared confirm modal instead of
  // window.confirm — same look, same behavior as remove/block/decline
  // everywhere else in the app.
  const clearChat = () => {
    setShowMenu(false)
    requestConfirm?.({
      title: 'Clear chat?',
      message: `All messages with ${friend.username} will be permanently deleted for both of you. This can't be undone.`,
      confirmLabel: 'Clear chat',
      danger: true,
      onConfirm: doClearChat,
    })
  }

  // Close the options menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        menuBtnRef.current && !menuBtnRef.current.contains(e.target)
      ) setShowMenu(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMenu])

  // Close the emoji popup on outside click
  useEffect(() => {
    if (!showEmoji) return
    const h = (e) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) &&
        emojiBtnRef.current && !emojiBtnRef.current.contains(e.target)
      ) setShowEmoji(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showEmoji])

  const insertEmoji = (emoji) => {
    const el = inputRef.current
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart
      const end = el.selectionEnd
      setInput(prev => prev.slice(0, start) + emoji + prev.slice(end))
      // restore cursor right after the inserted emoji next tick
      requestAnimationFrame(() => {
        el.focus()
        el.selectionStart = el.selectionEnd = start + emoji.length
      })
    } else {
      setInput(prev => prev + emoji)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }))
    }
  }

  // useMemo: grouping/scanning the full message list on every render
  // (including renders triggered by unrelated state like isTyping or
  // showEmoji) is wasted work once history gets long. Only recompute when
  // the messages actually change.
  const grouped = useMemo(() => messages.reduce((acc, msg) => {
    const label = formatDateLabel(msg.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(msg)
    return acc
  }, {}), [messages])

  // WhatsApp-style: only the most recent message *you* sent shows a
  // Sent/Seen status — showing it on every bubble is noisy and redundant.
  const lastSelfMsgId = useMemo(
    () => [...messages].reverse().find(m => m.sender_id === user?.id)?.id,
    [messages, user?.id]
  )

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className="fixed inset-0 bg-black/20 z-30 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed right-0 top-0 h-full z-40 flex flex-col
          transition-all duration-300 ease-in-out
          w-full sm:w-96
          ${minimized ? 'translate-y-[calc(100%-56px)]' : 'translate-y-0'}
        `}
        style={{
          background: panelBg,
          borderLeft: `1px solid ${borderColor}`,
          boxShadow: isDark ? '-12px 0 50px rgba(0,0,0,0.5)' : '-12px 0 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0 cursor-pointer select-none"
          style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}
          onClick={() => setMinimized(m => !m)}
        >
          <div className="relative flex-shrink-0">
            {friend.avatar_url
              ? <img src={friend.avatar_url} alt={friend.username} className="w-9 h-9 rounded-full object-cover" />
              : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: accentColors.primary }}
                >
                  {friend.username?.[0]?.toUpperCase()}
                </div>
              )
            }
            <Circle
              size={10}
              className="absolute -bottom-0.5 -right-0.5"
              style={{
                fill: friend.online ? '#22c55e' : '#9ca3af',
                color: friend.online ? '#22c55e' : '#9ca3af',
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-display font-bold text-sm truncate ${textPrimary}`}>{friend.username}</p>
            <p className="text-xs font-semibold" style={{ color: !wsReady ? '#94a3b8' : (friend.online ? '#22c55e' : '#9ca3af') }}>
              {!wsReady ? 'Connecting...' : (friend.online ? 'Online' : 'Offline')}
            </p>
          </div>

          <div className="flex items-center gap-1 relative" onClick={e => e.stopPropagation()}>
            <button
              ref={menuBtnRef}
              onClick={() => setShowMenu(m => !m)}
              className={`p-1.5 rounded-lg ${minimizeBtnHover} ${iconColor} transition-colors`}
              title="More options"
            >
              <MoreVertical size={15} />
            </button>

            {showMenu && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 mt-1 rounded-xl shadow-2xl overflow-hidden z-20"
                style={{ width: 200, background: panelBg, border: `1px solid ${borderColor}` }}
              >
                <button
                  onClick={clearChat}
                  disabled={clearing || messages.length === 0}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dangerHover}`}
                  style={{ color: '#ef4444' }}
                >
                  {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Clear chat
                </button>
                {/* Same remove/block flow as the Friends grid — delegated
                    up to the page so both surfaces stay in sync instead of
                    the panel keeping its own copy of this logic. */}
                <button
                  onClick={() => { setShowMenu(false); onRequestBlock?.(friend) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors ${dangerHover}`}
                  style={{ color: '#ef4444', borderTop: `1px solid ${borderColor}` }}
                >
                  <Ban size={15} />
                  Block user
                </button>
                <button
                  onClick={() => { setShowMenu(false); onRequestRemove?.(friend) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors ${minimizeBtnHover}`}
                  style={{ color: isDark ? '#8c8aaa' : '#6b7280', borderTop: `1px solid ${borderColor}` }}
                >
                  <UserX size={15} />
                  Remove friend
                </button>
              </div>
            )}

            <button
              onClick={() => setMinimized(m => !m)}
              className={`p-1.5 rounded-lg ${minimizeBtnHover} ${iconColor} transition-colors`}
              title={minimized ? 'Expand' : 'Minimize'}
            >
              {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${closeBtnHover} ${iconColor} transition-colors`}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages area */}
        {!minimized && (
          <>
            <div
              className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
              style={{ background: msgAreaBg }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className={`animate-spin ${textMuted}`} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: isDark ? 'rgba(168,85,247,0.15)' : '#f3e8ff' }}
                  >
                    💬
                  </div>
                  <p className={`font-display font-bold ${textPrimary}`}>Start a conversation</p>
                  <p className={`text-xs ${textMuted}`}>Say hi to {friend.username}!</p>
                </div>
              ) : (
                Object.entries(grouped).map(([dateLabel, msgs]) => (
                  <div key={dateLabel} className="flex flex-col gap-2">
                    {/* Date divider */}
                    <div className="flex items-center gap-3 my-1">
                      <div className={`flex-1 h-px ${dividerBg}`} />
                      <span className={`text-xs font-semibold px-2 ${textMuted}`}>{dateLabel}</span>
                      <div className={`flex-1 h-px ${dividerBg}`} />
                    </div>

                    {msgs.map((msg, i) => {
                      const isSelf = msg.sender_id === user?.id
                      const nextMsg = msgs[i + 1]
                      const showAvatar = !isSelf && (!nextMsg || nextMsg.sender_id !== msg.sender_id)
                      return (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isSelf={isSelf}
                          showAvatar={showAvatar}
                          friend={friend}
                          accentColors={accentColors}
                          isDark={isDark}
                          showStatus={msg.id === lastSelfMsgId}
                        />
                      )
                    })}
                  </div>
                ))
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: accentColors.primary }}
                  >
                    {friend.username?.[0]?.toUpperCase()}
                  </div>
                  <div className={`${typingBg} rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5`}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${typingDot} animate-bounce`}
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="relative px-4 py-3 flex-shrink-0 flex items-end gap-2"
              style={{ borderTop: `1px solid ${borderColor}`, background: inputAreaBg }}
            >
              {showEmoji && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-4 mb-2 rounded-2xl shadow-2xl overflow-hidden z-10"
                  style={{ width: 264, background: panelBg, border: `1px solid ${borderColor}` }}
                >
                  <div className="flex" style={{ borderBottom: `1px solid ${borderColor}` }}>
                    {Object.keys(EMOJI_GROUPS).map(group => (
                      <button
                        key={group}
                        onClick={() => setEmojiTab(group)}
                        className="flex-1 py-2 text-xs font-semibold transition-colors"
                        style={{
                          color: emojiTab === group ? accentColors.primary : (isDark ? '#6b7280' : '#94a3b8'),
                          background: emojiTab === group ? `${accentColors.primary}14` : 'transparent',
                          borderBottom: emojiTab === group ? `2px solid ${accentColors.primary}` : '2px solid transparent',
                        }}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1 p-2.5 max-h-40 overflow-y-auto">
                    {EMOJI_GROUPS[emojiTab].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className={`text-xl leading-none w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-125 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                ref={emojiBtnRef}
                onClick={() => setShowEmoji(s => !s)}
                title="Emoji"
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors flex-shrink-0 ${minimizeBtnHover}`}
                style={{ color: showEmoji ? accentColors.primary : (isDark ? '#9ca3af' : '#94a3b8') }}
              >
                <Smile size={19} />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${friend.username}...`}
                rows={1}
                className={`flex-1 px-4 py-2.5 rounded-2xl text-sm resize-none outline-none border-2 border-transparent ${inputFocus} transition-all max-h-28 ${inputPlaceholder}`}
                style={{ background: inputBg, color: inputText, lineHeight: '1.5' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-30 hover:scale-105 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentColors.primary}, #8b5cf6)` }}
              >
                <Send size={16} />
              </button>
            </div>

            <p className={`text-xs text-center pb-2 ${textMuted}`}>
              Enter to send · Shift+Enter for new line
            </p>
          </>
        )}
      </div>
    </>
  )
}
