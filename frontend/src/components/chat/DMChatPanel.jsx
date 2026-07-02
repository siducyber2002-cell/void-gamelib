import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Minimize2, Maximize2, Circle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import axios from 'axios'

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

function MessageBubble({ msg, isSelf, showAvatar, friend, accentColors, isDark }) {
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
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
          style={isSelf
            ? { background: `linear-gradient(135deg, ${accentColors.primary}, #8b5cf6)`, color: 'white', borderBottomRightRadius: '4px' }
            : {
                background: isDark ? '#374151' : '#f1f5f9',
                color: isDark ? '#f3f4f6' : '#0f172a',
                borderBottomLeftRadius: '4px'
              }
          }
        >
          {msg.content}
        </div>
        <span className={`text-xs px-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

// onNewMessage(senderName) — called when a message arrives from the friend
export default function DMChatPanel({ friend, onClose, onNewMessage }) {
  const { user } = useAuth()
  const { dark: isDark } = useTheme()
  const accentColors = { primary: '#a855f7', secondary: '#7c3aed' }

  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [wsReady, setWsReady]     = useState(false)
  const [isTyping, setIsTyping]   = useState(false)

  const wsRef       = useRef(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const reconnectTimer = useRef(null)
  const reconnectAttempt = useRef(0)
  // Track if panel is minimized in a ref so the ws handler can read it
  const minimizedRef = useRef(false)
  // Track our own in-flight optimistic messages so we can reconcile the
  // server echo instead of rendering it as a duplicate bubble
  const pendingOptimistic = useRef([])

  const roomId = getRoomId(user?.id, friend?.id)
  const token  = localStorage.getItem('gl_token')

  // ── theme shortcuts ───────────────────────────────────────
  const panelBg          = isDark ? '#111827' : 'white'
  const headerBg         = isDark
    ? `linear-gradient(135deg, ${accentColors.primary}20, #8b5cf620)`
    : `linear-gradient(135deg, ${accentColors.primary}15, #8b5cf615)`
  const borderColor      = isDark ? '#374151' : '#e2e8f0'
  const msgAreaBg        = isDark ? '#0f172a' : '#f8fafc'
  const inputAreaBg      = isDark ? '#111827' : 'white'
  const inputBg          = isDark ? '#1f2937' : '#f1f5f9'
  const inputText        = isDark ? '#f3f4f6' : '#1e293b'
  const inputPlaceholder = isDark ? 'placeholder-gray-500' : 'placeholder-slate-400'
  const inputFocus       = isDark ? 'focus:border-purple-500' : 'focus:border-blue-300'
  const textPrimary      = isDark ? 'text-gray-100' : 'text-slate-900'
  const textMuted        = isDark ? 'text-gray-500' : 'text-slate-400'
  const dividerBg        = isDark ? 'bg-gray-700' : 'bg-slate-200'
  const typingBg         = isDark ? 'bg-gray-700' : 'bg-slate-200'
  const typingDot        = isDark ? 'bg-gray-400' : 'bg-slate-400'
  const minimizeBtnHover = isDark ? 'hover:bg-gray-700' : 'hover:bg-slate-100'
  const closeBtnHover    = isDark ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'
  const iconColor        = isDark ? 'text-gray-400' : 'text-slate-400'

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
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/dm/ws/dm/${roomId}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsReady(true)
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

  const grouped = messages.reduce((acc, msg) => {
    const label = formatDateLabel(msg.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(msg)
    return acc
  }, {})

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
          fixed right-0 top-0 h-full z-40 flex flex-col shadow-2xl
          transition-all duration-300 ease-in-out
          w-full sm:w-96
          ${minimized ? 'translate-y-[calc(100%-56px)]' : 'translate-y-0'}
        `}
        style={{ background: panelBg, borderLeft: `1px solid ${borderColor}` }}
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
            <Circle size={10} className="absolute -bottom-0.5 -right-0.5 fill-emerald-400 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className={`font-display font-bold text-sm truncate ${textPrimary}`}>{friend.username}</p>
            <p className="text-xs text-emerald-500 font-semibold">
              {wsReady ? 'Online' : 'Connecting...'}
            </p>
          </div>

          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
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
              className="px-4 py-3 flex-shrink-0 flex items-end gap-2"
              style={{ borderTop: `1px solid ${borderColor}`, background: inputAreaBg }}
            >
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
