import { useState, useEffect, memo } from 'react'
import { Star, Heart, CheckCircle, PlayCircle, BookOpen, Trash2, Gamepad2, Trophy, Bookmark, Search } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useLibrary } from '../context/LibraryContext'
import { awardXP } from '../utils/xpService'
import PageTour from '../components/onboarding/PageTour'
import { libraryTourSteps } from '../components/onboarding/tourSteps'


const RAWG_API_KEY = 'cf38811b97cf43bbb8d88c606ed4e73c'
const RAWG_BASE    = 'https://api.rawg.io/api'

const BG_SLUGS = [
  'assassins-creed-odyssey',
  'prince-of-persia-the-sands-of-time',
  'marvel-spider-man',
  'batman-arkham-knight',
  'the-witcher-3-wild-hunt',
  'god-of-war',
  'cyberpunk-2077',
  'red-dead-redemption-2',
  'marvel-spider-man-miles-morales',
  'assassins-creed-valhalla',
  'batman-arkham-city',
  'avengers',
  'shadow-of-the-tomb-raider',
  'prince-of-persia-warrior-within',
  'guardians-of-the-galaxy',
  'injustice-2',
]

const TABS = [
  { id: 'all',       label: 'All',       icon: BookOpen    },
  { id: 'playing',   label: 'Playing',   icon: PlayCircle  },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'wishlist',  label: 'Wishlist',  icon: Bookmark    },
  { id: 'favorites', label: 'Favorites', icon: Heart       },
]

const STATUS_META = {
  playing:   { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6', border: 'rgba(59,130,246,0.3)',  label: 'Playing'   },
  completed: { bg: 'rgba(22,163,74,0.15)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)',   label: 'Completed' },
  wishlist:  { bg: 'rgba(217,119,6,0.15)',   text: '#d97706', border: 'rgba(217,119,6,0.3)',   label: 'Wishlist'  },
}

// ── Module-level caches — survive re-renders and re-mounts ──
const _rawgCache = {}
const _bgImagesCache = { data: null }

async function fetchRawgGame(slug) {
  if (_rawgCache[slug]) return _rawgCache[slug]
  const res = await fetch(`${RAWG_BASE}/games/${slug}?key=${RAWG_API_KEY}`)
  if (!res.ok) throw new Error(`RAWG ${res.status}`)
  const data = await res.json()
  _rawgCache[slug] = data
  return data
}

// Watermark background — 4×4 grid of cycling game cover images
const WatermarkBg = memo(function WatermarkBg({ images, isDark }) {
  const COUNT = 16
  const [slots, setSlots]   = useState(() => Array.from({ length: COUNT }, (_, i) => i % Math.max(images.length, 1)))
  const [fading, setFading] = useState(Array(COUNT).fill(false))

  // Re-init slots when images arrive
  useEffect(() => {
    if (images.length === 0) return
    setSlots(Array.from({ length: COUNT }, (_, i) => i % images.length))
  }, [images.length])

  // Cycle one random slot every 1.2s
  useEffect(() => {
    if (images.length < 2) return
    const id = setInterval(() => {
      const slot = Math.floor(Math.random() * COUNT)
      setFading(f => { const n = [...f]; n[slot] = true; return n })
      setTimeout(() => {
        setSlots(v => { const n = [...v]; n[slot] = (n[slot] + 1) % images.length; return n })
        setFading(f => { const n = [...f]; n[slot] = false; return n })
      }, 700)
    }, 1200)
    return () => clearInterval(id)
  }, [images.length])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* 4x4 image grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gridTemplateRows: 'repeat(4,1fr)', gap: '4px', width: '100%', height: '100%', padding: '4px' }}>
        {slots.map((imgIdx, i) => (
          <div
            key={i}
            style={{
              overflow: 'hidden',
              borderRadius: '8px',
              opacity: fading[i] ? 0 : isDark ? 0.18 : 0.13,
              transition: 'opacity 0.7s ease-in-out',
              filter: isDark
                ? 'saturate(0.5) brightness(0.6)'
                : 'saturate(0.4) brightness(1.05) contrast(0.9)',
            }}
          >
            {images[imgIdx] && (
              <img
                src={images[imgIdx]}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Vignette — fades edges so content stays readable */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, #0b0f19 72%)'
            : 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, #f6f8fc 72%)',
        }}
      />
      {/* Extra top/bottom fade so header & footer content is clean */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: isDark
            ? 'linear-gradient(to bottom, #0b0f19 0%, transparent 15%, transparent 85%, #0b0f19 100%)'
            : 'linear-gradient(to bottom, #f6f8fc 0%, transparent 15%, transparent 85%, #f6f8fc 100%)',
        }}
      />
    </div>
  )
})

export default function LibraryPage() {
  const { dark: isDark } = useTheme()
  const accentColors = { primary: '#a855f7', secondary: '#7c3aed' }
  const { library, toggleFav, removeFromLibrary, updateStatus } = useLibrary()

  const [covers,   setCovers]   = useState({})
  const [bgImages, setBgImages] = useState([])
  const [tab,      setTab]      = useState('all')
  const [search,   setSearch]   = useState('')

  // Fetch user game covers — skips anything already in module cache
  useEffect(() => {
    const toFetch = library.filter(g => g.slug && !g.cover && !_rawgCache[g.slug])
    if (!toFetch.length) {
      // pull covers from cache for games already fetched
      const fromCache = {}
      library.forEach(g => {
        if (g.slug && _rawgCache[g.slug]?.background_image)
          fromCache[g.slug] = _rawgCache[g.slug].background_image
      })
      if (Object.keys(fromCache).length) setCovers(p => ({ ...p, ...fromCache }))
      return
    }
    let cancelled = false
    Promise.allSettled(toFetch.map(g => fetchRawgGame(g.slug))).then(results => {
      if (cancelled) return
      const nc = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.background_image)
          nc[toFetch[i].slug] = r.value.background_image
      })
      setCovers(p => ({ ...p, ...nc }))
    })
    return () => { cancelled = true }
  }, [library.length])

  // Fetch watermark BG images — fetched ONCE ever, cached at module level
  useEffect(() => {
    if (_bgImagesCache.data) { setBgImages(_bgImagesCache.data); return }
    let cancelled = false
    Promise.allSettled(BG_SLUGS.map(fetchRawgGame)).then(results => {
      if (cancelled) return
      const imgs = results
        .filter(r => r.status === 'fulfilled' && r.value?.background_image)
        .map(r => r.value.background_image)
      _bgImagesCache.data = imgs
      setBgImages(imgs)
    })
    return () => { cancelled = true }
  }, [])

  const getCover = g => g.cover || covers[g.slug] || null

  const filtered = library.filter(g => {
    const matchTab =
      tab === 'all'       ? true :
      tab === 'favorites' ? g.fav :
      g.status === tab
    const q = search.trim().toLowerCase()
    return matchTab && (!q || g.title?.toLowerCase().includes(q))
  })

  // ── Theme tokens ──────────────────────────────────────
  const pageBg      = isDark ? '#0b0f19'  : '#f6f8fc'
  const surfaceBg   = isDark ? 'rgba(18,24,40,0.90)'  : 'rgba(255,255,255,0.90)'
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)'  : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)'  : '0 2px 16px rgba(0,0,0,0.08)'
  const hoverShadow = isDark ? '0 12px 36px rgba(0,0,0,0.7)' : '0 12px 36px rgba(0,0,0,0.14)'
  const tabBarBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const inputBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const textPrimary = isDark ? '#e8edf5'  : '#0f172a'
  const textSub     = isDark ? '#8892a4'  : '#64748b'
  const divider     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  // 5 stat cards — now includes Playing
  const stats = [
    { label: 'TOTAL',     value: library.length,                                       color: accentColors.primary, icon: Gamepad2   },
    { label: 'PLAYING',   value: library.filter(g => g.status === 'playing').length,   color: '#3b82f6',            icon: PlayCircle },
    { label: 'COMPLETED', value: library.filter(g => g.status === 'completed').length, color: '#10b981',            icon: Trophy     },
    { label: 'WISHLIST',  value: library.filter(g => g.status === 'wishlist').length,  color: '#f59e0b',            icon: Bookmark   },
    { label: 'FAVORITES', value: library.filter(g => g.fav).length,                   color: '#f43f5e',            icon: Heart      },
  ]

  return (
    <div
      className="relative min-h-screen animate-fade-in"
      style={{ background: pageBg, fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* ── First-time guided tour ── */}
      <PageTour pageKey="library" steps={libraryTourSteps} />
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Animated watermark */}
      <WatermarkBg images={bgImages} isDark={isDark} />

      {/* Content */}
      <div className="relative px-6 py-7 flex flex-col gap-6" style={{ zIndex: 1 }}>

        {/* Header */}
        <div
          className="rounded-2xl px-4 sm:px-7 py-5 sm:py-6 flex items-center justify-between gap-3"
          style={{
            background: surfaceBg,
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: accentColors.primary }}>
              My Collection
            </p>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-none" style={{ color: textPrimary }}>
              Library
            </h1>
            <p className="text-xs sm:text-sm mt-2" style={{ color: textSub }}>
              {library.length === 0
                ? 'No games yet — start adding!'
                : `${library.length} game${library.length !== 1 ? 's' : ''} in your collection`}
            </p>
          </div>
          <div
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: accentColors.primary + '22', border: `1px solid ${accentColors.primary}35` }}
          >
            <Gamepad2 size={22} className="sm:hidden" style={{ color: accentColors.primary }} strokeWidth={1.8} />
            <Gamepad2 size={26} className="hidden sm:block" style={{ color: accentColors.primary }} strokeWidth={1.8} />
          </div>
        </div>

        {/* Stat cards — 5 cards now */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-tour="library-stats">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl px-5 py-4 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: surfaceBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: cardShadow,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black tracking-widest" style={{ color: textSub }}>{stat.label}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: stat.color + '20' }}>
                  <stat.icon size={12} style={{ color: stat.color }} strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black" style={{ color: textPrimary }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div
            className="no-scrollbar flex items-center gap-0.5 p-1 rounded-xl overflow-x-auto max-w-full"
            data-tour="library-tabs"
            style={{
              background: tabBarBg,
              border: `1px solid ${cardBorder}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {TABS.map(t => {
              const count =
                t.id === 'all'       ? library.length :
                t.id === 'favorites' ? library.filter(g => g.fav).length :
                library.filter(g => g.status === t.id).length
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0"
                  style={active
                    ? { background: accentColors.primary, color: '#fff', boxShadow: `0 2px 10px ${accentColors.primary}55` }
                    : { color: textSub, background: 'transparent' }
                  }
                >
                  <t.icon size={12} strokeWidth={2.5} />
                  {t.label}
                  {count > 0 && (
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{
                        background: active ? 'rgba(255,255,255,0.25)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        color: active ? '#fff' : textSub,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="relative w-full sm:w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textSub }} />
            <input
              type="text"
              placeholder="Search games…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1.5 rounded-xl text-xs font-medium outline-none w-full"
              style={{
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                color: textPrimary,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            />
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4" data-tour="library-game-grid">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: accentColors.primary + '15' }}>
              <BookOpen size={26} style={{ color: accentColors.primary }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg" style={{ color: textPrimary }}>Nothing here yet</p>
              <p className="text-sm mt-1" style={{ color: textSub }}>
                {search.trim() ? 'No games match your search' : 'Add games from Home or Discover'}
              </p>
            </div>
          </div>
        )}

        {/* Game grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-tour="library-game-grid">
            {filtered.map(game => {
              const coverUrl = getCover(game)
              const meta     = STATUS_META[game.status] || STATUS_META.playing
              return (
                <div
                  key={game.id}
                  className="rounded-2xl overflow-hidden group transition-all duration-200 cursor-default"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = hoverShadow}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = cardShadow}
                >
                  {/* Cover art */}
                  <div className="relative overflow-hidden" style={{ height: '152px', background: (game.accent || accentColors.primary) + '18' }}>
                    {coverUrl
                      ? <img src={coverUrl} alt={game.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 size={38} color={game.accent || accentColors.primary} strokeWidth={1.4} />
                        </div>
                    }
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)' }} />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300" />

                    {/* Action buttons */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between">
                      <button
                        onClick={() => removeFromLibrary(game.slug || game.rawgId)}
                        className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        title="Remove"
                      >
                        <Trash2 size={12} color="#ff6b6b" />
                      </button>
                      <button
                        onClick={() => toggleFav(game.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                        style={{ background: game.fav ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                        title={game.fav ? 'Unfavorite' : 'Favorite'}
                      >
                        <Heart size={12} className={game.fav ? 'fill-white text-white' : 'text-white'} />
                      </button>
                    </div>

                    {/* Status pill */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span
                        className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}`, backdropFilter: 'blur(6px)' }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <p className="font-bold text-sm leading-snug truncate mb-0.5" style={{ color: textPrimary }}>{game.title}</p>
                    <p className="text-xs mb-4" style={{ color: textSub }}>{game.genre || '—'}</p>

                    {/* Status switcher */}
                    <div className="flex gap-1.5 mb-4">
                      {['playing', 'completed', 'wishlist'].map(s => {
                        const m = STATUS_META[s]
                        const isActive = game.status === s
                        return (
                          <button
                            key={s}
                            onClick={() => {
                             if (game.status === s) return  // already this status, do nothing
                             updateStatus(game.id, s)
                             if (s === 'completed') awardXP('completed_game', game.title)
                           }}
                            className="flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all duration-150"
                            style={isActive
                              ? { background: m.bg, color: m.text, border: `1px solid ${m.border}` }
                              : { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: textSub, border: `1px solid ${cardBorder}` }
                            }
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${divider}` }}>
                      <div className="flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold" style={{ color: textPrimary }}>{game.rating ?? '—'}</span>
                      </div>
                      {game.fav && (
                        <div className="flex items-center gap-1.5">
                          <Heart size={10} className="fill-red-400 text-red-400" />
                          <span className="text-[10px] font-semibold" style={{ color: '#f87171' }}>Favorite</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
