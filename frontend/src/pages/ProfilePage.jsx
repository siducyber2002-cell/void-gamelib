import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Edit3, MapPin, Star, Check, X,
  Gamepad2, Trophy, Users, Zap, Clock, Plus, Play, Newspaper,
} from 'lucide-react'

// Action → icon + colour + label
const ACTION_META = {
  added_game:      { icon: Plus,      color: '#a855f7', label: 'Added to library'   },
  completed_game:  { icon: Check,     color: '#22c55e', label: 'Completed a game'   },
  made_friend:     { icon: Users,     color: '#10b981', label: 'New friend'         },
  watched_trailer: { icon: Play,      color: '#06b6d4', label: 'Watched trailer'    },
  read_news:       { icon: Newspaper, color: '#f59e0b', label: 'Read news'          },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  // Normalize: handle both "Z", "+00:00", and naive UTC strings
  let normalized = dateStr
  if (!normalized.endsWith('Z') && !normalized.match(/[+-]\d{2}:\d{2}$/)) {
    normalized = normalized + 'Z'   // treat as UTC if no tz info
  }
  const diffMs = Date.now() - new Date(normalized).getTime()
  if (isNaN(diffMs)) return ''      // guard against bad dates
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days  = Math.floor(hours / 24)
  if (days < 7)   return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { dark: isDark } = useTheme()
  const accent = '#a855f7'

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    username:      user?.username      || '',
    bio:           user?.bio           || 'Passionate gamer. RPG & Action enthusiast.',
    country:       user?.country       || '',
    favorite_game: user?.favorite_game || '',
  })

  // Real data state
  const [xpStats, setXpStats]       = useState({ level: user?.level || 1, xp: user?.xp || 0, xp_to_next: 100, xp_percent: 0 })
  const [libStats, setLibStats]     = useState({ total: 0 })
  const [friendCount, setFriendCount] = useState(0)
  const [activity, setActivity]     = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingStats(true)
      try {
        const [xpRes, libRes, friendRes, actRes] = await Promise.all([
          axios.get('/api/xp/stats'),
          axios.get('/api/library/stats'),
          axios.get('/api/friends/'),
          axios.get('/api/xp/activity?limit=8'),
        ])
        setXpStats(xpRes.data)
        setLibStats(libRes.data)
        setFriendCount(friendRes.data.length)
        setActivity(actRes.data)
      } catch (e) {
        console.error('Profile stats fetch failed:', e)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchAll()
  }, [])

  const save = async () => {
    try {
      await updateProfile(form)
      toast.success('Profile updated!')
      setEditing(false)
    } catch {
      toast.error('Failed to update profile')
    }
  }

  // Theme tokens
  const pageBg      = isDark ? '#0b0f19' : '#f6f8fc'
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)'  : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)'
  const inputBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  const tabBarBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const divider     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textPrimary = isDark ? '#e8edf5' : '#0f172a'
  const textSub     = isDark ? '#8892a4' : '#64748b'
  const skeletonBg  = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'

  const inputStyle = {
    background: inputBg, border: `1.5px solid ${inputBorder}`, color: textPrimary,
    borderRadius: '10px', padding: '6px 10px', outline: 'none',
    fontSize: '14px', fontFamily: 'DM Sans, sans-serif', width: '100%',
  }

  const STATS = [
    { label: 'Level',       value: xpStats.level,  color: accent,    icon: Zap      },
    { label: 'Games Owned', value: libStats.total,  color: '#10b981', icon: Gamepad2 },
    { label: 'Friends',     value: friendCount,      color: '#8b5cf6', icon: Users    },
    { label: 'Completed',   value: libStats.completed ?? 0, color: '#f59e0b', icon: Trophy },
  ]

  return (
    <div
      className="relative min-h-screen h-full animate-fade-in"
      style={{ background: pageBg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <style>{`
        @keyframes avatarPulse {
          0%   { transform: scale(0.85); opacity: 0.5; }
          80%  { transform: scale(1.6);  opacity: 0; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
        .avatar-ring       { animation: avatarPulse 2.8s ease-out infinite; }
        .avatar-ring-delay { animation: avatarPulse 2.8s ease-out 1.4s infinite; }
        @keyframes xpShine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .xp-bar-shine {
          background-size: 200% auto;
          animation: xpShine 2.5s linear infinite;
        }
      `}</style>

      <div className="relative px-6 py-7 flex flex-col gap-5 max-w-3xl" style={{ zIndex: 1 }}>

        {/* ── Profile Card ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>

          {/* Banner */}
          <div className="h-40 relative"
            style={{ background: `linear-gradient(135deg, ${accent}40, #8b5cf640, #f43f5e28)` }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.3))' }} />
          </div>

          <div className="px-6 pb-6 relative">
            {/* Avatar + actions row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <span className="absolute inset-0 rounded-2xl avatar-ring"       style={{ background: accent + '30' }} />
                <span className="absolute inset-0 rounded-2xl avatar-ring-delay" style={{ background: accent + '30' }} />
                <div
                  className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black"
                  style={{ background: `linear-gradient(135deg, ${accent}, #7c3aed)`, boxShadow: `0 0 0 4px ${cardBg}, 0 8px 24px ${accent}55` }}
                >
                  {(editing ? form.username : user?.username)?.[0]?.toUpperCase() || 'G'}
                </div>
              </div>

              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                  <Edit3 size={13} /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="p-2 rounded-xl transition-all"
                    style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                    <X size={15} />
                  </button>
                  <button onClick={save}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                    style={{ background: accent, boxShadow: `0 4px 14px ${accent}55` }}>
                    <Check size={13} /> Save
                  </button>
                </div>
              )}
            </div>

            {/* Username */}
            {editing
              ? <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  style={{ ...inputStyle, fontSize: '22px', fontWeight: 800 }} />
              : <h2 className="text-2xl font-black" style={{ color: textPrimary }}>{user?.username}</h2>
            }

            {/* Email + country */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm" style={{ color: textSub }}>{user?.email}</span>
              <span style={{ color: cardBorder }}>·</span>
              {editing
                ? <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                    placeholder="Country" style={{ ...inputStyle, width: '120px' }} />
                : form.country && (
                    <div className="flex items-center gap-1 text-sm" style={{ color: textSub }}>
                      <MapPin size={12} /> {form.country}
                    </div>
                  )
              }
            </div>

            {/* Bio */}
            <div className="mt-3">
              {editing
                ? <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                    rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5' }} />
                : <p className="text-sm leading-relaxed" style={{ color: textSub }}>{form.bio}</p>
              }
            </div>

            {/* Favourite game */}
            <div className="flex items-center gap-2 mt-3">
              <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
              <span className="text-sm font-semibold" style={{ color: textSub }}>Favourite:</span>
              {editing
                ? <input value={form.favorite_game} onChange={e => setForm({ ...form, favorite_game: e.target.value })}
                    style={{ ...inputStyle, width: '180px', color: accent, fontWeight: 700 }} />
                : <span className="text-sm font-bold" style={{ color: accent }}>{form.favorite_game}</span>
              }
            </div>

            {/* ── XP Bar ── */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap size={13} style={{ color: accent }} />
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: accent }}>
                    Level {xpStats.level}
                  </span>
                </div>
                <span className="text-xs font-semibold" style={{ color: textSub }}>
                  {xpStats.xp} / {xpStats.xp_to_next} XP
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
                <div
                  className="h-full rounded-full xp-bar-shine transition-all duration-700"
                  style={{
                    width: `${xpStats.xp_percent}%`,
                    background: `linear-gradient(90deg, ${accent}, #7c3aed, #06b6d4, ${accent})`,
                    minWidth: xpStats.xp_percent > 0 ? '12px' : '0',
                  }}
                />
              </div>
              <p className="text-[10px] mt-1 font-semibold" style={{ color: textSub }}>
                {xpStats.xp_to_next - xpStats.xp} XP to Level {xpStats.level + 1}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map(stat => (
            <div key={stat.label} className="rounded-2xl p-4 text-center flex flex-col items-center gap-1.5"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5"
                style={{ background: stat.color + '18' }}>
                <stat.icon size={16} style={{ color: stat.color }} strokeWidth={2} />
              </div>
              {loadingStats
                ? <div className="w-8 h-6 rounded animate-pulse" style={{ background: skeletonBg }} />
                : <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              }
              <p className="text-[11px] font-semibold" style={{ color: textSub }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── XP Info banner ── */}
        <div className="rounded-2xl px-5 py-4 flex flex-wrap gap-4 items-center justify-between"
          style={{ background: accent + '12', border: `1px solid ${accent}25` }}>
          <div>
            <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: accent }}>How to earn XP</p>
            <p className="text-xs" style={{ color: textSub }}>XP is earned automatically as you use The Void</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Add game',       xp: '+20 XP' },
              { label: 'Complete game',  xp: '+100 XP' },
              { label: 'Make friend',    xp: '+30 XP' },
              { label: 'Watch trailer',  xp: '+10 XP' },
              { label: 'Read news',      xp: '+5 XP'  },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: textSub }}>{item.label}</span>
                <span className="text-[11px] font-black" style={{ color: accent }}>{item.xp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="rounded-2xl p-5"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} style={{ color: accent }} />
            <h2 className="font-black text-base" style={{ color: textPrimary }}>Recent Activity</h2>
          </div>

          {loadingStats ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: skeletonBg }} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 rounded w-3/4 animate-pulse" style={{ background: skeletonBg }} />
                    <div className="h-2.5 rounded w-1/3 animate-pulse" style={{ background: skeletonBg }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-8">
              <Zap size={28} style={{ color: accent, opacity: 0.3 }} className="mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: textSub }}>No activity yet — start exploring!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {activity.map((act, i) => {
                const meta = ACTION_META[act.action] || { icon: Zap, color: accent, label: act.action }
                const IconComp = meta.icon
                return (
                  <div key={act.id} className="flex items-start gap-3 py-3"
                    style={{ borderBottom: i < activity.length - 1 ? `1px solid ${divider}` : 'none' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.color + '18' }}>
                      <IconComp size={15} style={{ color: meta.color }} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: textPrimary }}>
                        {act.detail ? `${meta.label}: ${act.detail}` : meta.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs" style={{ color: textSub }}>{timeAgo(act.created_at)}</p>
                        <span className="text-[10px] font-black" style={{ color: accent }}>+{act.xp_earned} XP</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
