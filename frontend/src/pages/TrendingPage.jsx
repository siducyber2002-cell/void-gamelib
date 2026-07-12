import { useState, useEffect, memo } from 'react'
import { Activity, TrendingUp, Flame, Star, Rocket, Loader2, ImageOff } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import PageTour from '../components/onboarding/PageTour'
import { trendingTourSteps } from '../components/onboarding/tourSteps'

const RAWG_KEY = 'cf38811b97cf43bbb8d88c606ed4e73c'
const RAWG_BASE = 'https://api.rawg.io/api/games'

function getRecentDateRange(days) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const fmt = (d) => d.toISOString().split('T')[0]
  return `${fmt(start)},${fmt(end)}`
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return String(num)
}

const GameCover = memo(function GameCover({ src, alt, className = '' }) {
  return (
    <div className={`rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-white/10 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          <ImageOff size={14} />
        </div>
      )}
    </div>
  )
})

function TrendCard({ title, icon: Icon, color, items, loading, error, renderItem, emptyText = 'No games found' }) {
  return (
    <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '1f' }}>
          <Icon size={16} style={{ color }} strokeWidth={2.25} />
        </div>
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>
      <div className="flex flex-col min-h-[220px]">
        {loading ? (
          <div className="flex items-center justify-center flex-1 py-12">
            <Loader2 size={22} className="animate-spin text-slate-300 dark:text-white/20" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center flex-1 py-12 text-sm text-slate-400 dark:text-white/40">
            Couldn't load games right now
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-12 text-sm text-slate-400 dark:text-white/40">
            {emptyText}
          </div>
        ) : (
          items.map((item, i) => renderItem(item, i))
        )}
      </div>
    </div>
  )
}

export default function TrendingPage() {
  const { dark: isDark } = useTheme()

  const [trending, setTrending] = useState([])
  const [popular, setPopular] = useState([])
  const [topRated, setTopRated] = useState([])
  const [rising, setRising] = useState([])
  const [hero, setHero] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let intervalId = null
    const controller = new AbortController()

    async function fetchData(isRefresh = false) {
      try {
        if (!isRefresh) setLoading(true)

        // Slight randomization on each refresh so results feel live
        // by sampling from a wider pool and shuffling order.
        const randomPage = Math.floor(Math.random() * 2) + 1

        const results = await Promise.allSettled([
          fetch(`${RAWG_BASE}?key=${RAWG_KEY}&dates=${getRecentDateRange(90)}&ordering=-added&page_size=10&page=${randomPage}`, { signal: controller.signal }).then(r => r.json()),
          fetch(`${RAWG_BASE}?key=${RAWG_KEY}&ordering=-added&page_size=10&page=${randomPage}`, { signal: controller.signal }).then(r => r.json()),
          fetch(`${RAWG_BASE}?key=${RAWG_KEY}&ordering=-rating&metacritic=85,100&page_size=10&page=${randomPage}`, { signal: controller.signal }).then(r => r.json()),
          fetch(`${RAWG_BASE}?key=${RAWG_KEY}&dates=${getRecentDateRange(30)}&ordering=-added&page_size=10&page=${randomPage}`, { signal: controller.signal }).then(r => r.json()),
        ])

        // Each section falls back to an empty list if its own request failed,
        // instead of one flaky endpoint blanking out the whole page.
        const [trendingData, popularData, ratedData, risingData] = results.map(
          r => (r.status === 'fulfilled' ? r.value : {})
        )
        const allFailed = results.every(r => r.status === 'rejected')

        const trendingResults = (trendingData.results || []).slice(0, 6)
        const popularResults = (popularData.results || []).slice(0, 6)

        setTrending(trendingResults)
        setPopular(popularResults)
        setTopRated((ratedData.results || []).slice(0, 6))
        setRising((risingData.results || []).slice(0, 6))
        setHero(trendingResults[0] || popularResults[0] || null)
        setLastUpdated(new Date())
        setError(allFailed)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch trending games:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData(false)
    intervalId = setInterval(() => fetchData(true), 5 * 60 * 1000) // refresh every 5 minutes

    return () => {
      controller.abort()
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 animate-fade-in p-6 md:p-8">
      {/* ── First-time guided tour ── */}
      <PageTour
        pageKey="trending"
        steps={trendingTourSteps}
        ready={!loading}
      />

      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 border border-purple-400/20">
              <Activity size={18} className="text-purple-400" strokeWidth={2.5} />
              <span className="absolute inset-0 rounded-xl animate-ping bg-purple-500/10" />
            </span>
            Trending
          </h1>
          <p className="text-slate-500 dark:text-white/50 mt-1 text-sm">What the gaming world is playing right now</p>
        </div>
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Hero banner */}
      <div className="rounded-3xl overflow-hidden relative min-h-[150px] border border-purple-500/10"
        data-tour="trending-hero"
        style={{ background: isDark
          ? 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(168,85,247,0.06))'
          : 'linear-gradient(135deg, #f43f5e18, #8b5cf618)' }}>

        {hero?.background_image && (
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: `url(${hero.background_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className={`absolute inset-0 ${isDark
          ? 'bg-gradient-to-r from-black/70 via-black/40 to-transparent'
          : 'bg-gradient-to-r from-white via-white/40 to-transparent'}`} />

        <div className="relative z-10 flex flex-col gap-2 p-6 md:p-7">
          <span className="inline-flex w-fit items-center gap-1.5 bg-red-500/15 text-red-400 text-[11px] font-bold px-2.5 py-1 rounded-md tracking-wide">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            LIVE TRENDING
          </span>

          {loading ? (
            <div className="h-9 w-56 bg-slate-300/40 dark:bg-white/10 rounded-lg animate-pulse mt-1" />
          ) : hero ? (
            <>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{hero.name}</h2>
              <p className="text-slate-500 dark:text-white/50 text-sm">
                {formatNumber(hero.added)} players have this in their library
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {hero.metacritic && (
                  <span className="text-emerald-500 font-bold text-sm">Metacritic {hero.metacritic}</span>
                )}
                {hero.rating > 0 && (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-white/50 text-sm">
                    <Star size={12} className="fill-current text-amber-400" /> {hero.rating.toFixed(1)}
                  </span>
                )}
                {hero.released && (
                  <span className="text-slate-400 dark:text-white/30 text-sm">Released {hero.released}</span>
                )}
              </div>
            </>
          ) : (
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">No data available</h2>
          )}
        </div>
      </div>

      {/* 2x2 trend grid */}
      <div className="grid md:grid-cols-2 gap-4" data-tour="trending-grid">

        {/* Trending Now */}
        <TrendCard title="Trending Now" icon={TrendingUp} color="#f43f5e" items={trending} loading={loading} error={error}
          renderItem={(game, i) => (
            <a
              key={game.id}
              href={`https://rawg.io/games/${game.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="w-5 text-center text-sm font-bold text-slate-400 dark:text-white/30 tabular-nums flex-shrink-0">{i + 1}</span>
              <GameCover src={game.background_image} alt={game.name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate leading-tight">{game.name}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 leading-tight mt-0.5">{formatNumber(game.added)} in libraries</p>
              </div>
              {game.metacritic && (
                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg flex-shrink-0 tabular-nums">
                  {game.metacritic}
                </span>
              )}
            </a>
          )}
        />

        {/* Most Popular */}
        <TrendCard title="Most Popular" icon={Flame} color="#3b82f6" items={popular} loading={loading} error={error}
          renderItem={(game, i) => (
            <a
              key={game.id}
              href={`https://rawg.io/games/${game.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="w-5 text-center text-sm font-bold text-slate-400 dark:text-white/30 tabular-nums flex-shrink-0">{i + 1}</span>
              <GameCover src={game.background_image} alt={game.name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate leading-tight">{game.name}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 leading-tight mt-0.5">{formatNumber(game.added)} players total</p>
              </div>
              <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg flex-shrink-0 tabular-nums">
                {game.released ? game.released.slice(0, 4) : '—'}
              </span>
            </a>
          )}
        />

        {/* Highest Rated */}
        <TrendCard title="Highest Rated" icon={Star} color="#f59e0b" items={topRated} loading={loading} error={error}
          renderItem={(game, i) => (
            <a
              key={game.id}
              href={`https://rawg.io/games/${game.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <span className="w-5 text-center text-sm font-bold text-slate-400 dark:text-white/30 tabular-nums flex-shrink-0">{i + 1}</span>
              <GameCover src={game.background_image} alt={game.name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-white text-sm truncate leading-tight">{game.name}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 leading-tight mt-0.5">{formatNumber(game.ratings_count)} ratings</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star size={12} className="fill-current text-amber-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-white/80 tabular-nums">{game.rating?.toFixed(1) ?? '—'}</span>
              </div>
            </a>
          )}
        />

        {/* New & Rising */}
        <TrendCard title="New & Rising" icon={Rocket} color="#10b981" items={rising} loading={loading} error={error}
          renderItem={(game, i) => {
            const maxAdded = rising[0]?.added || 1
            const barPct = Math.max(8, Math.round((game.added / maxAdded) * 100))
            return (
              <a
                key={game.id}
                href={`https://rawg.io/games/${game.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="w-5 text-center text-sm font-bold text-slate-400 dark:text-white/30 tabular-nums flex-shrink-0">{i + 1}</span>
                <GameCover src={game.background_image} alt={game.name} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm truncate leading-tight">{game.name}</p>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, background: '#10b981' }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500 flex-shrink-0 tabular-nums">{formatNumber(game.added)}</span>
              </a>
            )
          }}
        />
      </div>
    </div>
  )
}
