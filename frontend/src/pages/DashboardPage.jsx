import { useState, useEffect, useRef } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from 'recharts'
import {
  Gamepad2, Users, CheckCircle, PlayCircle,
  Bookmark, Heart, TrendingUp, Activity, Plus, UserPlus
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

const ACCENT   = '#a855f7'
const ACCENT2  = '#7c3aed'

const STATUS_COLORS = {
  Playing:   '#3b82f6',
  Completed: '#10b981',
  Wishlist:  '#f59e0b',
  Favorites: '#f43f5e',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    if (!target) return
    let start = null
    const tick = (ts) => {
      if (!start) start = ts
      const pct = Math.min((ts - start) / duration, 1)
      // ease-out cubic
      setValue(Math.round(target * (1 - Math.pow(1 - pct, 3))))
      if (pct < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])
  return value
}

// Build line chart data from library — games added per day over last 7 days
function buildLineData(library) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.toDateString(),
      games: 0,
    }
  })
  library.forEach(g => {
    const dateStr = new Date(g.added_at).toDateString()
    const slot = days.find(d => d.date === dateStr)
    if (slot) slot.games += 1
  })
  return days
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 140, stroke = 12, color }) {
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(168,85,247,0.12)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}88)` }} />
    </svg>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div style={{
      background: 'rgba(15,18,30,0.95)', border: `1px solid ${STATUS_COLORS[name]}44`,
      borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 700,
      color: '#e8edf5', backdropFilter: 'blur(8px)',
    }}>
      {name}: <span style={{ color: STATUS_COLORS[name] }}>{value}</span>
    </div>
  )
}

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(15,18,30,0.95)', border: `1px solid ${ACCENT}44`,
      borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 700,
      color: '#e8edf5',
    }}>
      {label}: <span style={{ color: ACCENT }}>{payload[0].value} game{payload[0].value !== 1 ? 's' : ''}</span>
    </div>
  )
}

// Animated stat card
function StatCard({ label, value, icon: Icon, color, delay = 0, isDark }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const cardBg     = isDark ? 'rgba(18,24,40,0.92)' : 'rgba(255,255,255,0.97)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

  return (
    <div style={{
      background: cardBg, border: `1px solid ${cardBorder}`,
      borderRadius: 20, padding: '22px 24px',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Icon size={19} style={{ color }} />
      </div>
      <p style={{ fontSize: 32, fontWeight: 900, color: isDark ? '#e8edf5' : '#0f172a', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#8892a4' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dark: isDark } = useTheme()
  const { user }         = useAuth()
  const { library }      = useLibrary()

  const [friends,        setFriends]   = useState(null)
  const [recentActivity, setActivity]  = useState([])
  const [frLoading,      setFrLoading] = useState(true)
  const [lineData,       setLineData]  = useState([])

  // Derived stats
  const total     = library.length
  const playing   = library.filter(g => g.status === 'playing').length
  const completed = library.filter(g => g.status === 'completed').length
  const wishlist  = library.filter(g => g.status === 'wishlist').length
  const favorites = library.filter(g => g.fav).length
  const owned     = total - wishlist
  const progress  = owned > 0 ? Math.round((completed / owned) * 100) : 0

  const gamesCount     = useCountUp(total)
  const friendsCount   = useCountUp(friends ?? 0)
  const completedCount = useCountUp(completed)
  const progressVal    = useCountUp(progress)

  // Build line chart whenever library changes
  useEffect(() => {
    setLineData(buildLineData(library))
  }, [library])

  // Fetch friends + build activity
  useEffect(() => {
    const token   = localStorage.getItem('gl_token')
    const headers = { Authorization: `Bearer ${token}` }

    ;(async () => {
      try {
        const res  = await fetch('/api/friends/', { headers })
        const data = await res.json()
        const arr  = Array.isArray(data) ? data : []
        setFriends(arr.length)

        const friendActivity = [...arr]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3)
          .map(f => {
            const friendUser = f.requester_id === user?.id ? f.addressee : f.requester
            return {
              type:   'friend',
              action: 'New friend added',
              detail: friendUser?.username || 'Someone',
              time:   timeAgo(f.created_at),
              emoji:  '👥',
            }
          })

        const gameActivity = [...library]
          .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
          .slice(0, 5)
          .map(g => {
            let action = 'Added to Library', emoji = '➕'
            if (g.status === 'completed')    { action = 'Marked Completed'; emoji = '✅' }
            else if (g.status === 'playing') { action = 'Now Playing';      emoji = '🎮' }
            else if (g.status === 'wishlist'){ action = 'Added to Wishlist';emoji = '🔖' }
            if (g.fav)                       { action = 'Marked Favorite';  emoji = '❤️' }
            return {
              type:   'game',
              action,
              detail: g.title || 'Unknown',
              time:   timeAgo(g.added_at),
              emoji,
            }
          })

        const merged = [...friendActivity, ...gameActivity]
          .sort(() => Math.random() - 0.5) // natural-feeling mix
          .slice(0, 6)

        setActivity(merged)
      } catch (err) {
        console.error('Friends fetch error:', err)
      } finally {
        setFrLoading(false)
      }
    })()
  }, [library, user])

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const pageBg     = isDark ? '#0b0f19'              : '#f1f4fb'
  const cardBg     = isDark ? 'rgba(18,24,40,0.92)'  : 'rgba(255,255,255,0.97)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)': 'rgba(0,0,0,0.07)'
  const cardShadow = isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.07)'
  const textPrimary= isDark ? '#e8edf5' : '#0f172a'
  const textSub    = isDark ? '#8892a4' : '#64748b'
  const divider    = isDark ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.06)'
  const gridLine   = isDark ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.05)'
  const axisColor  = isDark ? '#4a5568' : '#94a3b8'

  const pieData = [
    { name: 'Playing',   value: playing   },
    { name: 'Completed', value: completed },
    { name: 'Wishlist',  value: wishlist  },
    { name: 'Favorites', value: favorites },
  ].filter(d => d.value > 0)

  const breakdownItems = [
    { label: 'Playing',   value: playing,   icon: PlayCircle,  color: STATUS_COLORS.Playing   },
    { label: 'Completed', value: completed, icon: CheckCircle, color: STATUS_COLORS.Completed },
    { label: 'Wishlist',  value: wishlist,  icon: Bookmark,    color: STATUS_COLORS.Wishlist  },
    { label: 'Favorites', value: favorites, icon: Heart,       color: STATUS_COLORS.Favorites },
  ]

  const cardStyle = {
    background: cardBg, border: `1px solid ${cardBorder}`,
    borderRadius: 20, boxShadow: cardShadow,
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  }

  return (
    <div style={{ background: pageBg, minHeight: '100vh', padding: '28px 24px 48px', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>
          Overview
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: textPrimary, lineHeight: 1, marginBottom: 6 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: textSub }}>
          Hey {user?.username || 'Gamer'} — here's what's going on
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Games" value={gamesCount}     icon={Gamepad2}    color={ACCENT}     delay={0}   isDark={isDark} />
        <StatCard label="Friends"     value={frLoading ? '…' : friendsCount} icon={Users} color="#10b981" delay={80}  isDark={isDark} />
        <StatCard label="Completed"   value={completedCount} icon={CheckCircle} color="#8b5cf6"    delay={160} isDark={isDark} />
      </div>

      {/* ── Row 2: Breakdown + Progress ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 20 }}>

        {/* Library Breakdown */}
        <div style={{ ...cardStyle, padding: '24px 26px' }}>
          <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>Library</p>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, marginBottom: 2 }}>Breakdown</h2>
          <p style={{ fontSize: 12, color: textSub, marginBottom: 20 }}>Distribution across statuses</p>

          {pieData.length === 0 ? (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Gamepad2 size={32} color={textSub} strokeWidth={1.4} />
              <p style={{ fontSize: 13, color: textSub }}>Add games to see your breakdown</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: '45%', height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value"
                      animationBegin={200} animationDuration={800}>
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {breakdownItems.map(item => {
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <item.icon size={12} style={{ color: item.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: item.color }}>{item.value}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 99, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99, background: item.color,
                            width: `${pct}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                            boxShadow: `0 0 6px ${item.color}66`,
                          }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Progress Ring */}
        <div style={{ ...cardStyle, padding: '24px 26px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingUp size={14} style={{ color: ACCENT }} />
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase' }}>Progress</p>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, marginBottom: 2 }}>Overall</h2>
          <p style={{ fontSize: 12, color: textSub, marginBottom: 20 }}>Games completed vs owned</p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <ProgressRing pct={progress} size={140} stroke={12} color={ACCENT} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: textPrimary, lineHeight: 1 }}>{progressVal}%</span>
                <span style={{ fontSize: 11, color: textSub, marginTop: 2 }}>complete</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
              {[
                { label: 'Completed', value: completed, color: '#10b981' },
                { label: 'Owned',     value: owned,     color: ACCENT    },
              ].map(item => (
                <div key={item.label} style={{
                  borderRadius: 14, padding: '12px 8px', textAlign: 'center',
                  background: item.color + '12', border: `1px solid ${item.color}25`,
                }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: item.color, lineHeight: 1, marginBottom: 4 }}>{item.value}</p>
                  <p style={{ fontSize: 11, color: textSub, fontWeight: 600 }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Line Chart ── */}
      <div style={{ ...cardStyle, padding: '24px 26px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>Activity</p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, marginBottom: 2 }}>Games Added</h2>
            <p style={{ fontSize: 12, color: textSub }}>Last 7 days</p>
          </div>
          <div style={{
            background: ACCENT + '15', border: `1px solid ${ACCENT}30`,
            borderRadius: 10, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: ACCENT
          }}>
            {total} total
          </div>
        </div>

        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={lineData} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridLine} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<LineTooltip />} cursor={{ stroke: ACCENT + '40', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="games" stroke={ACCENT} strokeWidth={2.5}
                fill="url(#areaGrad)" dot={{ fill: ACCENT, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: ACCENT, stroke: isDark ? '#0b0f19' : '#fff', strokeWidth: 2 }}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: Recent Activity ── */}
      <div style={{ ...cardStyle, padding: '24px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>Feed</p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary }}>Recent Activity</h2>
          </div>
          <Activity size={15} style={{ color: textSub }} />
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: textSub }}>No activity yet — start adding games or making friends!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentActivity.map((act, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '11px 12px', borderRadius: 14,
                  background: 'transparent',
                  borderBottom: i < recentActivity.length - 1 ? `1px solid ${divider}` : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: act.type === 'friend' ? '#10b98120' : ACCENT + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {act.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {act.detail}
                  </p>
                  <p style={{ fontSize: 11, color: textSub, marginTop: 1 }}>{act.action}</p>
                </div>

                {/* Badge + time */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                    background: act.type === 'friend' ? '#10b98120' : ACCENT + '18',
                    color: act.type === 'friend' ? '#10b981' : ACCENT,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {act.type === 'friend' ? 'Friend' : 'Game'}
                  </span>
                  <span style={{ fontSize: 11, color: textSub }}>{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
