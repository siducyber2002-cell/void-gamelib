import { useState, useRef, useEffect } from 'react'
import { Send, Hash, Circle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const CHANNELS = [
  { id: 'general', name: 'general', description: 'General chat for everyone' },
  { id: 'gaming', name: 'gaming', description: 'Talk about games' },
  { id: 'strategy', name: 'strategy', description: 'Strategy game discussion' },
  { id: 'rpg', name: 'rpg', description: 'RPG lovers unite' },
  { id: 'esports', name: 'esports', description: 'Esports news & results' },
  { id: 'memes', name: 'memes', description: 'Gaming memes only' },
  { id: 'tech', name: 'tech', description: 'Hardware & tech talk' },
]

const INITIAL_MSGS = {
  general: [
    { id: 1, user: 'GamerX', text: 'Hey everyone! 👋', time: '10:00 AM', self: false },
    { id: 2, user: 'ProGamer99', text: 'Anyone playing GTA VI right now?', time: '10:02 AM', self: false },
    { id: 3, user: 'NightOwl', text: 'Just finished the main story of Elden Ring 🔥', time: '10:05 AM', self: false },
  ],
  gaming: [
    { id: 1, user: 'PixelKing', text: 'Black Myth Wukong is absolutely stunning 🐒', time: '9:30 AM', self: false },
    { id: 2, user: 'GameDev101', text: 'Been playing Cyberpunk 2077 2.0 — it\'s a completely different game!', time: '9:45 AM', self: false },
  ],
  esports: [
    { id: 1, user: 'EsportsFan', text: 'Team Liquid WON THE INTERNATIONAL 🏆', time: '8:00 AM', self: false },
    { id: 2, user: 'ProPlayer', text: 'Insane performance by the whole squad!', time: '8:05 AM', self: false },
  ],
}

const ONLINE_USERS = ['GamerX', 'ProGamer99', 'NightOwl', 'PixelKing', 'GameDev101', 'EsportsFan', 'ProPlayer', 'CoolDude42', 'MasterBlaster']

export default function CommunityPage() {
  const { user } = useAuth()
  const { dark: isDark } = useTheme()
  const accentColors = { primary: '#a855f7', secondary: '#7c3aed' }
  const [channel, setChannel] = useState('general')
  const [messages, setMessages] = useState(INITIAL_MSGS)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const currentMsgs = messages[channel] || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMsgs])

  const sendMsg = () => {
    if (!input.trim()) return
    const msg = {
      id: Date.now(),
      user: user?.username || 'You',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      self: true,
    }
    setMessages(prev => ({ ...prev, [channel]: [...(prev[channel] || []), msg] }))
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMsg()
    }
  }

  const avatarColor = (name) => {
    const colors = [accentColors.primary, '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
    return colors[name.charCodeAt(0) % colors.length]
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-120px)] bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 animate-fade-in">

      {/* Channels sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-slate-900">💬 Community</h2>
          <p className="text-xs text-slate-400 mt-0.5">{ONLINE_USERS.length} online</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Channels</p>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-all ${channel === ch.id ? 'font-bold text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              style={channel === ch.id ? { background: accentColors.light, color: accentColors.primary } : {}}
            >
              <Hash size={14} />
              {ch.name}
              {(messages[ch.id]?.length > 0) && channel !== ch.id && (
                <span className="ml-auto w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center">
                  {messages[ch.id]?.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Online users */}
        <div className="border-t border-slate-100 p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Online</p>
          <div className="flex flex-col gap-1">
            {ONLINE_USERS.slice(0, 5).map(u => (
              <div key={u} className="flex items-center gap-2">
                <Circle size={8} className="text-emerald-400 fill-current flex-shrink-0" />
                <span className="text-xs text-slate-600 truncate">{u}</span>
              </div>
            ))}
            {ONLINE_USERS.length > 5 && (
              <span className="text-xs text-slate-400">+{ONLINE_USERS.length - 5} more</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Hash size={16} className="text-slate-400" />
          <h3 className="font-display font-bold text-slate-900">{channel}</h3>
          <span className="text-slate-400 text-sm">·</span>
          <span className="text-slate-400 text-sm">{CHANNELS.find(c => c.id === channel)?.description}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {currentMsgs.length === 0 && (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">👋</div>
              <p className="text-slate-500 font-semibold">Start the conversation in #{channel}</p>
            </div>
          )}
          {currentMsgs.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.self ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: avatarColor(msg.user) }}
              >
                {msg.user[0]?.toUpperCase()}
              </div>
              <div className={`max-w-xs lg:max-w-md ${msg.self ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!msg.self && <span className="text-xs font-bold text-slate-500">{msg.user}</span>}
                <div className={msg.self ? 'chat-bubble-me px-4 py-2.5' : 'chat-bubble-other px-4 py-2.5'}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-xs text-slate-400">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${channel}...`}
                rows={1}
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-slate-800 placeholder-slate-400 text-sm resize-none outline-none border-2 border-transparent transition-all"
                style={{ focusBorderColor: accentColors.primary }}
              />
            </div>
            <button
              onClick={sendMsg}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all disabled:opacity-40 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accentColors.primary}, #8b5cf6)` }}
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
