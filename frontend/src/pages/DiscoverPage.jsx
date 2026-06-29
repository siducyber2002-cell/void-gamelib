import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import {
  Search, SlidersHorizontal, Star, X, Play, Loader2,
  ChevronLeft, ChevronRight, Compass, Plus,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const RAWG_KEY = 'cf38811b97cf43bbb8d88c606ed4e73c'
const YT_KEY   = 'AIzaSyAH92kSbIuWj-if5suELQQCkoJXESmIrVk'

const GENRES    = ['All','Action','Adventure','RPG','Strategy','Shooter','Sports','Horror','Puzzle','Simulation','Arcade','Racing','Fighting','Indie']
const PLATFORMS = ['All','PC','PS5','PS4','Xbox One','Xbox Series','Nintendo Switch','Mobile']
const YEARS     = ['All','2025','2024','2023','2022','2021','2020','2019','2018']
const RATINGS   = ['All','9+','8+','7+','6+']
const SORT_OPTIONS = [
  { label: 'Popularity', value: '-added'    },
  { label: 'Rating',     value: '-rating'   },
  { label: 'Release',    value: '-released' },
  { label: 'Name',       value: 'name'      },
]
const GENRE_SLUGS = {
  Action:'action', Adventure:'adventure', RPG:'role-playing-games-rpg',
  Strategy:'strategy', Shooter:'shooter', Sports:'sports', Horror:'action',
  Puzzle:'puzzle', Simulation:'simulation', Arcade:'arcade', Racing:'racing',
  Fighting:'fighting', Indie:'indie',
}
const PLATFORM_IDS = {
  PC:4, PS5:187, PS4:18, 'Xbox One':1, 'Xbox Series':186, 'Nintendo Switch':7, Mobile:21,
}
const ACCENT_COLORS = [
  '#f43f5e','#8b5cf6','#06b6d4','#f59e0b','#10b981',
  '#3b82f6','#ef4444','#ec4899','#14b8a6','#f97316',
]

// ── Trailer Modal ──────────────────────────────────────────────────────────────
function TrailerModal({ gameTitle, onClose, onXpAwarded }) {
  const [videoId, setVideoId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const q = encodeURIComponent(`${gameTitle} official trailer`)
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=1&key=${YT_KEY}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const id = data.items?.[0]?.id?.videoId || null
        setVideoId(id)
        setLoading(false)
        if (id) onXpAwarded(gameTitle)   // award XP only when a trailer is actually found
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gameTitle])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#0f172a' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#a855f7' }}>Official Trailer</p>
            <h3 className="text-lg font-black text-white mt-0.5">{gameTitle}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <X size={16} className="text-white" />
          </button>
        </div>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: '#0f172a' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#a855f7' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>Finding trailer…</p>
            </div>
          )}
          {!loading && !videoId && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: '#0f172a' }}>
              <Play size={48} style={{ color: '#334155' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>Trailer not found</p>
            </div>
          )}
          {videoId && (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={`${gameTitle} trailer`}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Game Card ─────────────────────────────────────────────────────────────────
function GameCard({ game, accentColor, onTrailer, cardBg, cardBorder, cardShadow, hoverShadow, textPrimary, textSub }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered]   = useState(false)

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: hovered ? hoverShadow : cardShadow,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="h-40 relative overflow-hidden" style={{ background: accentColor + '18' }}>
        {game.background_image && !imgError ? (
          <img
            src={game.background_image}
            alt={game.name}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass size={36} style={{ color: accentColor, opacity: 0.5 }} strokeWidth={1.4} />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-end p-3 gap-1.5 transition-opacity duration-200"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)', opacity: hovered ? 1 : 0 }}
        >
          <button
            onClick={e => { e.stopPropagation(); onTrailer(game.name) }}
            className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 transition-all"
            style={{ background: 'rgba(168,85,247,0.85)' }}
          >
            <Play size={10} fill="white" /> Trailer
          </button>
          <button
            onClick={e => e.stopPropagation()}
            className="w-full py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)' }}
          >
            <Plus size={10} className="inline mr-1" />Library
          </button>
        </div>

        {/* TBA badge */}
        {game.tba && (
          <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', backdropFilter: 'blur(6px)' }}>
            TBA
          </span>
        )}

        {/* Metacritic */}
        {game.metacritic && (
          <span className="absolute top-2 right-2 text-xs font-black px-1.5 py-0.5 rounded-md"
            style={{
              background: game.metacritic >= 80 ? 'rgba(16,185,129,0.18)' : game.metacritic >= 60 ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)',
              color:      game.metacritic >= 80 ? '#10b981'  : game.metacritic >= 60 ? '#f59e0b' : '#ef4444',
              border:    `1px solid ${game.metacritic >= 80 ? '#10b98144' : game.metacritic >= 60 ? '#f59e0b44' : '#ef444444'}`,
              backdropFilter: 'blur(6px)',
            }}>
            {game.metacritic}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="font-bold text-sm truncate" style={{ color: textPrimary }}>{game.name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: textSub }}>
          {game.genres?.slice(0, 2).map(g => g.name).join(' · ') || 'Game'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: textSub }}>
            {game.released ? new Date(game.released).getFullYear() : '—'}
          </span>
          <div className="flex items-center gap-1">
            <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
            <span className="text-xs font-bold" style={{ color: textPrimary }}>{game.rating?.toFixed(1) || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const { dark: isDark } = useTheme()
  const accent = '#a855f7'

  // Filter state
  const [genre, setGenre]       = useState('All')
  const [platform, setPlatform] = useState('All')
  const [year, setYear]         = useState('All')
  const [rating, setRating]     = useState('All')
  const [sortBy, setSortBy]     = useState('-added')
  const [search, setSearch]     = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Data state
  const [games, setGames]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [trailerGame, setTrailerGame] = useState(null)

  const PAGE_SIZE  = 20
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Award watched_trailer XP (once per game per session)
  const awardedTrailers = useRef(new Set())
  const awardTrailerXp = useCallback(async (gameTitle) => {
    if (awardedTrailers.current.has(gameTitle)) return
    awardedTrailers.current.add(gameTitle)
    try {
      await axios.post('/api/xp/award', null, { params: { action: 'watched_trailer', detail: gameTitle } })
    } catch (e) {
      console.warn('Trailer XP award failed:', e)
    }
  }, [])

  // Search debounce
  const searchTimer = useRef(null)
  const handleSearchInput = val => {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 500)
  }

  // Build RAWG URL
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ key: RAWG_KEY, page_size: PAGE_SIZE, page, ordering: sortBy })
    if (search)             params.set('search', search)
    if (genre !== 'All')    params.set('genres', GENRE_SLUGS[genre] || genre.toLowerCase())
    if (platform !== 'All') params.set('platforms', PLATFORM_IDS[platform])
    if (year !== 'All')     params.set('dates', `${year}-01-01,${year}-12-31`)
    if (rating !== 'All')   params.set('metacritic', `${parseInt(rating) * 10},100`)
    return `https://api.rawg.io/api/games?${params}`
  }, [genre, platform, year, rating, sortBy, search, page])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(buildUrl())
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setGames(data.results || [])
        setTotalCount(data.count || 0)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [buildUrl])

  useEffect(() => { setPage(1) }, [genre, platform, year, rating, sortBy, search])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [page])

  const activeFilters = [
    genre    !== 'All' && { label: genre,        clear: () => setGenre('All')    },
    platform !== 'All' && { label: platform,     clear: () => setPlatform('All') },
    year     !== 'All' && { label: year,         clear: () => setYear('All')     },
    rating   !== 'All' && { label: `★ ${rating}`, clear: () => setRating('All') },
  ].filter(Boolean)

  const clearAll = () => {
    setGenre('All'); setPlatform('All'); setYear('All'); setRating('All')
    setSearch(''); setSearchInput(''); setSortBy('-added'); setPage(1)
  }

  // Theme tokens
  const pageBg      = isDark ? '#0b0f19' : '#f6f8fc'
  const surfaceBg   = isDark ? 'rgba(18,24,40,0.90)' : 'rgba(255,255,255,0.90)'
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)' : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)'
  const hoverShadow = isDark ? '0 12px 36px rgba(0,0,0,0.7)' : '0 12px 36px rgba(0,0,0,0.14)'
  const panelBg     = isDark ? 'rgba(15,20,35,0.98)' : 'rgba(255,255,255,0.98)'
  const inputBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'
  const tabBarBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const textPrimary = isDark ? '#e8edf5' : '#0f172a'
  const textSub     = isDark ? '#8892a4' : '#64748b'
  const divider     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  // FilterPill sub-component (inside render so it picks up theme vars)
  const FilterPill = ({ options, value, onChange, label }) => (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: accent }}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => { onChange(opt); setPage(1) }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
            style={value === opt
              ? { background: accent, color: '#fff', boxShadow: `0 2px 8px ${accent}55` }
              : { background: tabBarBg, color: textSub, border: `1px solid ${cardBorder}` }
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div
      className="relative min-h-screen h-full animate-fade-in"
      style={{ background: pageBg, fontFamily: 'DM Sans, sans-serif' }}
    >
      <style>{`
        @keyframes compassSpin {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(90deg); }
          50%  { transform: rotate(180deg); }
          75%  { transform: rotate(270deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes compassPulse {
          0%   { transform: scale(0.85); opacity: 0.6; }
          80%  { transform: scale(2.1);  opacity: 0; }
          100% { transform: scale(2.1);  opacity: 0; }
        }
        .compass-spin        { animation: compassSpin 8s linear infinite; }
        .compass-pulse       { animation: compassPulse 2.6s ease-out infinite; }
        .compass-pulse-delay { animation: compassPulse 2.6s ease-out 1.3s infinite; }
      `}</style>

      {trailerGame && <TrailerModal gameTitle={trailerGame} onClose={() => setTrailerGame(null)} onXpAwarded={awardTrailerXp} />}

      <div className="relative px-6 py-7 flex flex-col gap-6" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <div
          className="rounded-2xl px-7 py-6 flex items-center justify-between"
          style={{ background: surfaceBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: accent }}>RAWG Database</p>
            <h1 className="text-4xl font-black tracking-tight leading-none" style={{ color: textPrimary }}>Discover Games</h1>
            <p className="text-sm mt-2" style={{ color: textSub }}>
              Explore 500,000+ games
              {!loading && totalCount > 0 && (
                <> · <span className="font-bold" style={{ color: accent }}>{totalCount.toLocaleString()}</span> results</>
              )}
            </p>
          </div>

          {/* Animated compass icon */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <span className="absolute inset-0 rounded-2xl compass-pulse"       style={{ background: accent + '28' }} />
            <span className="absolute inset-0 rounded-2xl compass-pulse-delay" style={{ background: accent + '28' }} />
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: accent + '22', border: `1px solid ${accent}35` }}
            >
              <Compass size={26} style={{ color: accent }} strokeWidth={1.8} className="compass-spin" />
            </div>
          </div>
        </div>

        {/* ── Search + Sort + Filter toggle ── */}
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: textSub }} />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Search 500,000+ games..."
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: inputBg,
                border: `1.5px solid ${inputBorder}`,
                color: textPrimary,
                caretColor: accent,
              }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e  => e.target.style.borderColor = inputBorder}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: textSub }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1) }}
            className="px-4 py-3 rounded-xl text-sm font-bold outline-none cursor-pointer"
            style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, color: textPrimary }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150"
            style={showFilters || activeFilters.length > 0
              ? { background: accent + '18', border: `1.5px solid ${accent}`, color: accent }
              : { background: inputBg, border: `1.5px solid ${inputBorder}`, color: textSub }
            }
          >
            <SlidersHorizontal size={15} />
            Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
        </div>

        {/* ── Filter panel ── */}
        {showFilters && (
          <div
            className="rounded-2xl p-5 flex flex-col gap-5"
            style={{ background: panelBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
          >
            <FilterPill options={GENRES}    value={genre}    onChange={setGenre}    label="Genre" />
            <div style={{ borderTop: `1px solid ${divider}` }} />
            <FilterPill options={PLATFORMS} value={platform} onChange={setPlatform} label="Platform" />
            <div style={{ borderTop: `1px solid ${divider}` }} />
            <FilterPill options={YEARS}     value={year}     onChange={setYear}     label="Year" />
            <div style={{ borderTop: `1px solid ${divider}` }} />
            <FilterPill options={RATINGS}   value={rating}   onChange={setRating}   label="Min Metacritic" />
          </div>
        )}

        {/* ── Active filter chips ── */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {activeFilters.map(f => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: accent + '18', color: accent, border: `1px solid ${accent}35` }}
              >
                {f.label}
                <button onClick={f.clear}><X size={11} /></button>
              </span>
            ))}
            <button onClick={clearAll} className="text-xs font-bold px-2 transition-colors" style={{ color: '#ef4444' }}>
              Clear all
            </button>
          </div>
        )}

        {/* ── Results info ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: textSub }}>
            {loading ? 'Loading…' : (
              <>
                Showing{' '}
                <span className="font-bold" style={{ color: textPrimary }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}</span>
                {' '}of{' '}
                <span className="font-bold" style={{ color: textPrimary }}>{totalCount.toLocaleString()}</span> games
              </>
            )}
          </p>
          {totalPages > 1 && !loading && (
            <p className="text-xs font-semibold" style={{ color: textSub }}>Page {page} of {totalPages.toLocaleString()}</p>
          )}
        </div>

        {/* ── Game Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="h-40" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }} />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 rounded w-3/4" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0' }} />
                  <div className="h-2.5 rounded w-1/2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }} />
                </div>
              </div>
            ))}
          </div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                onTrailer={setTrailerGame}
                cardBg={cardBg}
                cardBorder={cardBorder}
                cardShadow={cardShadow}
                hoverShadow={hoverShadow}
                textPrimary={textPrimary}
                textSub={textSub}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: accent + '15' }}>
              <Compass size={28} style={{ color: accent }} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-black text-xl" style={{ color: textPrimary }}>No games found</p>
              <p className="text-sm mt-1" style={{ color: textSub }}>Try adjusting your filters or search term</p>
            </div>
            <button
              onClick={clearAll}
              className="mt-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: accent, boxShadow: `0 4px 14px ${accent}55` }}
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 pb-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-40"
              style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p
                if (totalPages <= 5)          p = i + 1
                else if (page <= 3)           p = i + 1
                else if (page >= totalPages - 2) p = totalPages - 4 + i
                else                          p = page - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150"
                    style={p === page
                      ? { background: accent, color: '#fff', boxShadow: `0 2px 10px ${accent}55` }
                      : { background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }
                    }
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-40"
              style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
