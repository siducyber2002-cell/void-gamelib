import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Edit3, MapPin, Star, Check, X, Camera, Loader2, Upload, Trash2,
  Gamepad2, Trophy, Users, Zap, Clock, Plus, Play, Newspaper,
} from 'lucide-react'

// Image upload constraints — adjust freely
const MAX_IMAGE_MB = 2
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

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

  // Avatar / cover photo state
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null)
  const [coverUrl, setCoverUrl]   = useState(user?.cover_url  || null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading]   = useState(false)
  const avatarInputRef = useRef(null)
  const coverInputRef  = useRef(null)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [coverMenuOpen, setCoverMenuOpen]   = useState(false)

  const validateImage = (file) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WEBP or GIF image')
      return false
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(`Image must be under ${MAX_IMAGE_MB}MB`)
      return false
    }
    return true
  }

  const handleImageUpload = async (e, kind) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!validateImage(file)) { e.target.value = ''; return }

    const isAvatar     = kind === 'avatar'
    const setUrl        = isAvatar ? setAvatarUrl : setCoverUrl
    const setUploading  = isAvatar ? setAvatarUploading : setCoverUploading
    const previousUrl   = isAvatar ? avatarUrl : coverUrl
    const previewUrl    = URL.createObjectURL(file)

    setUrl(previewUrl)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append(kind, file)
      const { data } = await axios.post(`/api/profile/${kind}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUrl(data?.[`${kind}_url`] || previewUrl)
      toast.success(isAvatar ? 'Profile picture updated!' : 'Cover photo updated!')
    } catch (err) {
      console.error(`${kind} upload failed:`, err)
      setUrl(previousUrl)
      toast.error(`Failed to upload ${isAvatar ? 'profile picture' : 'cover photo'}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = async (kind) => {
    const isAvatar = kind === 'avatar'
    const setUrl = isAvatar ? setAvatarUrl : setCoverUrl
    const previousUrl = isAvatar ? avatarUrl : coverUrl
    if (!previousUrl) return

    setUrl(null)
    try {
      await axios.delete(`/api/profile/${kind}`)
      toast.success(isAvatar ? 'Profile picture removed' : 'Cover photo removed')
    } catch (err) {
      console.error(`${kind} removal failed:`, err)
      setUrl(previousUrl)
      toast.error(`Failed to remove ${isAvatar ? 'profile picture' : 'cover photo'}`)
    }
  }

  // Small "Upload new / Remove" dropdown shared by both avatar and cover controls
  const renderImageMenu = (kind) => {
    const isOpen = kind === 'avatar' ? avatarMenuOpen : coverMenuOpen
    if (!isOpen) return null
    const isAvatar = kind === 'avatar'
    const close = () => (isAvatar ? setAvatarMenuOpen(false) : setCoverMenuOpen(false))
    const hasImage = isAvatar ? !!avatarUrl : !!coverUrl
    const inputRef = isAvatar ? avatarInputRef : coverInputRef

    return (
      <>
        <div className="fixed inset-0 z-40" onClick={close} />
        <div
          className="absolute z-50 bottom-full mb-2 right-0 w-44 rounded-xl overflow-hidden py-1"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
        >
          <button
            onClick={() => { inputRef.current?.click(); close() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-colors hover:opacity-70"
            style={{ color: textPrimary }}
          >
            <Upload size={13} /> Upload new photo
          </button>
          {hasImage && (
            <button
              onClick={() => { handleRemoveImage(kind); close() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left transition-colors hover:opacity-70"
              style={{ color: '#ef4444' }}
            >
              <Trash2 size={13} /> Remove {isAvatar ? 'photo' : 'cover'}
            </button>
          )}
        </div>
      </>
    )
  }

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

      <div className="relative px-4 sm:px-6 py-5 sm:py-7 flex flex-col gap-5 max-w-3xl" style={{ zIndex: 1 }}>

        {/* ── Profile Card ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>

          {/* Banner / cover photo */}
          <div className="h-40 sm:h-48 relative group overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accent}40, #8b5cf640, #f43f5e28)` }}>

            {coverUrl && (
              <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}

            {!coverUrl && (
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
            )}

            {/* Faint watermark typography — sits above cover art or gradient alike */}
            <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none select-none">
              <span
                className="whitespace-nowrap font-black"
                style={{
                  fontSize: 'clamp(56px, 11vw, 130px)',
                  color: '#fff',
                  opacity: 0.16,
                  mixBlendMode: 'overlay',
                  letterSpacing: '-0.04em',
                  transform: 'translateX(-2%)',
                }}
              >
                {(form.username || user?.username || 'PLAYER').toUpperCase()}
              </span>
            </div>

            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.35))' }} />

            {/* Cover photo options */}
            <div className="absolute bottom-3 right-3">
              <button
                onClick={() => setCoverMenuOpen(v => !v)}
                disabled={coverUploading}
                className="relative z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all opacity-90 hover:opacity-100 hover:scale-[1.03] backdrop-blur-sm"
                style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
              >
                {coverUploading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Camera size={13} />}
                {coverUploading ? 'Uploading…' : (coverUrl ? 'Edit cover' : 'Add cover')}
              </button>
              {renderImageMenu('cover')}
            </div>
            <input
              ref={coverInputRef} type="file" accept={ACCEPTED_IMAGE_ACCEPT}
              className="hidden" onChange={e => handleImageUpload(e, 'cover')}
            />
          </div>

          <div className="px-4 sm:px-6 pb-6 relative">
            {/* Avatar + actions row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center group/avatar">
                <span className="absolute inset-0 rounded-2xl avatar-ring"       style={{ background: accent + '30' }} />
                <span className="absolute inset-0 rounded-2xl avatar-ring-delay" style={{ background: accent + '30' }} />
                <div
                  onClick={() => setAvatarMenuOpen(v => !v)}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-black cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${accent}, #7c3aed)`, boxShadow: `0 0 0 4px ${cardBg}, 0 8px 24px ${accent}55` }}
                >
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    : (editing ? form.username : user?.username)?.[0]?.toUpperCase() || 'G'}

                  {/* Hover dim + camera prompt (desktop) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    {avatarUploading
                      ? <Loader2 size={20} color="#fff" className="animate-spin" />
                      : <Camera size={20} color="#fff" />}
                  </div>
                </div>

                {/* Always-visible edit badge, for touch devices */}
                <div className="absolute -bottom-1 -right-1">
                  <button
                    onClick={() => setAvatarMenuOpen(v => !v)}
                    disabled={avatarUploading}
                    className="relative z-50 w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ background: accent, border: `2px solid ${cardBg}`, boxShadow: `0 2px 8px ${accent}66` }}
                    aria-label="Change profile picture"
                  >
                    {avatarUploading
                      ? <Loader2 size={11} color="#fff" className="animate-spin" />
                      : <Camera size={11} color="#fff" />}
                  </button>
                  {renderImageMenu('avatar')}
                </div>

                <input
                  ref={avatarInputRef} type="file" accept={ACCEPTED_IMAGE_ACCEPT}
                  className="hidden" onChange={e => handleImageUpload(e, 'avatar')}
                />
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

            <p className="text-[10px] font-semibold mb-3 -mt-2" style={{ color: textSub }}>
              PNG, JPG, WEBP or GIF · up to {MAX_IMAGE_MB}MB
            </p>

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
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
              <span className="text-sm font-semibold" style={{ color: textSub }}>Favourite:</span>
              {editing
                ? <input value={form.favorite_game} onChange={e => setForm({ ...form, favorite_game: e.target.value })}
                    style={{ ...inputStyle, width: '100%', maxWidth: '180px', color: accent, fontWeight: 700 }} />
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map(stat => (
            <div key={stat.label} className="rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-1 cursor-default"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5"
                style={{ background: stat.color + '18' }}>
                <stat.icon size={16} style={{ color: stat.color }} strokeWidth={2} />
              </div>
              {loadingStats
                ? <div className="w-8 h-6 rounded animate-pulse" style={{ background: skeletonBg }} />
                : <p className="text-xl sm:text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
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
