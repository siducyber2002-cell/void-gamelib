import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  ExternalLink, Clock, Newspaper, AlertCircle, RefreshCw,
  Wrench, FileText, Trophy, Rocket, ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const REFRESH_INTERVAL = 10 * 60 * 1000
const PAGE_SIZE        = 12

const TABS = [
  { id: 'Industry News',     icon: Newspaper },
  { id: 'Updates',           icon: Wrench    },
  { id: 'Patch Notes',       icon: FileText  },
  { id: 'Esports',           icon: Trophy    },
  { id: 'Upcoming Releases', icon: Rocket    },
]

const PRESETS = [
  { label: 'All Time',   value: 'all'    },
  { label: 'Today',      value: 'today'  },
  { label: 'This Week',  value: 'week'   },
  { label: 'This Month', value: 'month'  },
  { label: 'Custom',     value: 'custom' },
]

function getPresetDates(preset) {
  const now = new Date()
  const toISO = d => d.toISOString()
  if (preset === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return { from_date: toISO(start), to_date: toISO(now) }
  }
  if (preset === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7)
    return { from_date: toISO(start), to_date: toISO(now) }
  }
  if (preset === 'month') {
    const start = new Date(now); start.setDate(now.getDate() - 30)
    return { from_date: toISO(start), to_date: toISO(now) }
  }
  return {}
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins   = Math.floor(diffMs / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)   return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function NewsPage() {
  const { dark: isDark } = useTheme()
  const accent = '#a855f7'

  const [tab, setTab]                 = useState(TABS[0].id)
  const [page, setPage]               = useState(1)
  const [articles, setArticles]       = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [, forceRender]               = useState(0)

  // Date filter
  const [preset, setPreset]           = useState('all')
  const [customFrom, setCustomFrom]   = useState('')
  const [customTo, setCustomTo]       = useState('')
  const [showCustom, setShowCustom]   = useState(false)

  function getActiveDates() {
    if (preset === 'custom') {
      return {
        from_date: customFrom ? new Date(customFrom).toISOString() : undefined,
        to_date:   customTo   ? new Date(customTo).toISOString()   : undefined,
      }
    }
    return getPresetDates(preset)
  }

  const loadNews = useCallback((tabId, dates, pageNum, { force = false, silent = false } = {}) => {
    let cancelled = false
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)

    const params = { category: tabId, page: pageNum, page_size: PAGE_SIZE }
    if (dates.from_date) params.from_date = dates.from_date
    if (dates.to_date)   params.to_date   = dates.to_date

    axios.get('/api/news/live', { params })
      .then(res => {
        if (cancelled) return
        const { articles: arts = [], totalResults: total = 0 } = res.data
        setArticles(arts)
        setTotalResults(total)
        setLastUpdated(Date.now())
      })
      .catch(err => {
        if (!cancelled && !silent) setError(err.response?.data?.detail || err.message)
      })
      .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false) } })
    return () => { cancelled = true }
  }, [])

  // Reset to page 1 and reload when tab or filter changes
  useEffect(() => {
    setPage(1)
    return loadNews(tab, getActiveDates(), 1)
  }, [tab, preset, customFrom, customTo])

  // Reload when page changes (without resetting to 1)
  useEffect(() => {
    return loadNews(tab, getActiveDates(), page)
  }, [page])

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(() => loadNews(tab, getActiveDates(), page, { force: true, silent: true }), REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [tab, preset, customFrom, customTo, page])

  // Tick timeAgo labels every minute
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Theme tokens
  const pageBg      = isDark ? '#0b0f19' : '#f6f8fc'
  const surfaceBg   = isDark ? 'rgba(18,24,40,0.90)' : 'rgba(255,255,255,0.90)'
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)' : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)'
  const hoverShadow = isDark ? '0 12px 36px rgba(0,0,0,0.7)' : '0 12px 36px rgba(0,0,0,0.14)'
  const tabBarBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const textPrimary = isDark ? '#e8edf5' : '#0f172a'
  const textSub     = isDark ? '#8892a4' : '#64748b'
  const divider     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const inputBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  // NewsAPI free tier caps at 100 results total
  const totalPages = Math.max(1, Math.min(Math.ceil(totalResults / PAGE_SIZE), 8))
  const featured     = page === 1 && articles.length > 0 ? articles[0] : null
  const gridArticles = page === 1 ? articles.slice(1) : articles

  return (
    <div className="relative min-h-screen h-full animate-fade-in" style={{ background: pageBg, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes newsRock {
          0%,70% { transform: rotate(0deg); }
          80%    { transform: rotate(8deg); }
          90%    { transform: rotate(-6deg); }
          100%   { transform: rotate(0deg); }
        }
        @keyframes livePulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          80%  { transform: scale(2.1);  opacity: 0; }
          100% { transform: scale(2.1);  opacity: 0; }
        }
        .news-rock       { animation: newsRock  3.5s ease-in-out infinite; }
        .live-ring       { animation: livePulse 2.4s ease-out infinite; }
        .live-ring-delay { animation: livePulse 2.4s ease-out 1.2s infinite; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${isDark ? 'invert(1)' : 'none'}; opacity: 0.5; cursor: pointer; }
      `}</style>

      <div className="relative px-6 py-7 flex flex-col gap-6" style={{ zIndex: 1 }}>

        {/* Header */}
        <div className="rounded-2xl px-7 py-6 flex items-center justify-between"
          style={{ background: surfaceBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: accent }}>Stay In The Loop</p>
            <h1 className="text-4xl font-black tracking-tight leading-none" style={{ color: textPrimary }}>Gaming News</h1>
            <p className="text-sm mt-2" style={{ color: textSub }}>Latest headlines, updates, and releases from the gaming world</p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <span className="absolute inset-0 rounded-2xl live-ring"       style={{ background: accent + '30' }} />
            <span className="absolute inset-0 rounded-2xl live-ring-delay" style={{ background: accent + '30' }} />
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: accent + '22', border: `1px solid ${accent}35` }}>
              <Newspaper size={26} style={{ color: accent }} strokeWidth={1.8} className="news-rock" />
            </div>
          </div>
        </div>

        {/* Tabs + Live row */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-0.5 p-1 rounded-xl overflow-x-auto"
            style={{ background: tabBarBg, border: `1px solid ${cardBorder}` }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap"
                  style={active
                    ? { background: accent, color: '#fff', boxShadow: `0 2px 10px ${accent}55` }
                    : { color: textSub }}>
                  <t.icon size={13} />
                  {t.id}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: textSub }}>
            <span className="relative flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 live-ring" style={{ background: '#22c55e' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#22c55e' }} />
              </span>
              Live · 10m refresh
            </span>
            {lastUpdated && (
              <span className="hidden sm:inline">· updated {timeAgo(new Date(lastUpdated).toISOString())}</span>
            )}
            <button onClick={() => loadNews(tab, getActiveDates(), page, { force: true })} disabled={loading || refreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-150 disabled:opacity-40"
              style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
              <RefreshCw size={12} className={(loading || refreshing) ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
          style={{ background: surfaceBg, border: `1px solid ${cardBorder}` }}>
          <div className="flex items-center gap-1.5 mr-1" style={{ color: textSub }}>
            <Calendar size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">Filter by date</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map(p => (
              <button key={p.value}
                onClick={() => { setPreset(p.value); setShowCustom(p.value === 'custom') }}
                className="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150"
                style={preset === p.value
                  ? { background: accent, color: '#fff', boxShadow: `0 2px 8px ${accent}44` }
                  : { background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                {p.label}
              </button>
            ))}
          </div>
          {showCustom && (
            <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold outline-none border transition-all"
                style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textPrimary }} />
              <span className="text-xs" style={{ color: textSub }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold outline-none border transition-all"
                style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textPrimary }} />
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: accent + '15' }}>
              <Newspaper size={26} style={{ color: accent }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: textSub }}>Fetching the latest headlines…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertCircle size={26} style={{ color: '#ef4444' }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg" style={{ color: textPrimary }}>Couldn't load news</p>
              <p className="text-sm mt-1" style={{ color: textSub }}>{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Featured — page 1 only */}
            {featured && (
              <a href={featured.url} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl overflow-hidden group transition-all duration-200 block"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = hoverShadow}
                onMouseLeave={e => e.currentTarget.style.boxShadow = cardShadow}>
                <div className="grid md:grid-cols-2">
                  <div className="relative h-56 md:h-full overflow-hidden" style={{ background: accent + '18' }}>
                    {featured.urlToImage
                      ? <img src={featured.urlToImage} alt={featured.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><Newspaper size={42} color={accent} strokeWidth={1.4} /></div>}
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', backdropFilter: 'blur(6px)' }}>
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-2" style={{ color: textSub }}>
                      <Clock size={12} />
                      <span className="text-xs font-semibold">{timeAgo(featured.publishedAt)} · {featured.source?.name}</span>
                    </div>
                    <h2 className="text-2xl font-black leading-snug mb-3" style={{ color: textPrimary }}>{featured.title}</h2>
                    <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: textSub }}>{featured.description}</p>
                    <span className="flex items-center gap-2 mt-auto text-sm font-bold" style={{ color: accent }}>
                      Read More <ExternalLink size={14} />
                    </span>
                  </div>
                </div>
              </a>
            )}

            {/* Grid */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridArticles.map((news, i) => (
                  <a key={`${page}-${i}`} href={news.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-2xl overflow-hidden group transition-all duration-200 flex flex-col"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = hoverShadow}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = cardShadow}>
                    <div className="relative h-36 overflow-hidden" style={{ background: accent + '18' }}>
                      {news.urlToImage
                        ? <img src={news.urlToImage} alt={news.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center"><Newspaper size={32} color={accent} strokeWidth={1.4} /></div>}
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-1.5 mb-2" style={{ color: textSub }}>
                        <Clock size={11} />
                        <span className="text-xs font-semibold truncate">{timeAgo(news.publishedAt)} · {news.source?.name}</span>
                      </div>
                      <h3 className="font-bold text-sm leading-snug mb-2 line-clamp-2" style={{ color: textPrimary }}>{news.title}</h3>
                      <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: textSub }}>{news.description}</p>
                      <div className="flex items-center justify-between pt-3 mt-auto" style={{ borderTop: `1px solid ${divider}` }}>
                        <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: accent }}>
                          Read More <ExternalLink size={12} />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2 pb-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-40"
                  style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150"
                    style={p === page
                      ? { background: accent, color: '#fff', boxShadow: `0 2px 10px ${accent}55` }
                      : { background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 disabled:opacity-40"
                  style={{ background: tabBarBg, border: `1px solid ${cardBorder}`, color: textSub }}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Empty */}
            {articles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: accent + '15' }}>
                  <Newspaper size={26} style={{ color: accent }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg" style={{ color: textPrimary }}>No news found</p>
                  <p className="text-sm mt-1" style={{ color: textSub }}>Try a different category or date range</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
