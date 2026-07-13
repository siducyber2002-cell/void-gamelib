import { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import { useTheme } from '../context/ThemeContext'
import { Trophy, Crown, Medal, Zap, Clock, SlidersHorizontal, Users, TrendingUp } from 'lucide-react'

// Same palette CommunityPage uses for member avatars without a photo — reused
// here so a user's fallback color stays the same wherever they show up.
const AVATAR_COLORS = ['#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const RANK_COLOR = { 1: '#fbbf24', 2: '#c7d2e0', 3: '#e0a458' }

function formatDuration(totalSeconds = 0) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${totalSeconds}s`
}

function Avatar({ username, avatarUrl, size = 40, ring, glow }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex items-center justify-center text-white font-black flex-shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        background: avatarUrl ? undefined : `linear-gradient(135deg, ${avatarColor(username)}, ${avatarColor(username)}aa)`,
        boxShadow: [
          ring ? `0 0 0 2px ${ring}` : null,
          glow ? `0 0 16px ${glow}88` : null,
        ].filter(Boolean).join(', ') || undefined,
      }}
    >
      {avatarUrl
        ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        : username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// Animated countup — ticks a number up from 0 to its target once, on mount/change.
function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const from = 0
    const to = Number(value) || 0
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])
  return display.toLocaleString()
}

// Hand-rolled animated area chart for community engagement — same drawing
// technique as DashboardPage's ActivityAreaChart (no chart library dep),
// generalized to plot whichever metric is selected.
function EngagementChart({ data, metricKey, color, isDark, textSub, gridLine, axisColor }) {
  const [progress, setProgress] = useState(0)
  const [hoverIdx, setHoverIdx] = useState(null)
  const rafRef = useRef(0)
  const startRef = useRef(null)

  const W = 640, H = 200
  const PAD = { top: 14, right: 12, bottom: 26, left: 34 }
  const IW = W - PAD.left - PAD.right
  const IH = H - PAD.top - PAD.bottom
  const lastIdx = data.length - 1

  const rawMax = Math.max(...data.map(d => d[metricKey]), 0)
  const MAX = rawMax === 0 ? 4 : Math.ceil(rawMax * 1.25)

  const sx = (i) => PAD.left + (i / (lastIdx || 1)) * IW
  const sy = (v) => PAD.top + IH - (v / MAX) * IH

  const linePath = (p) => {
    if (lastIdx <= 0) return ''
    const visible = Math.floor(p * lastIdx)
    const frac = p * lastIdx - visible
    const pts = data.slice(0, visible + 1).map((d, i) => [sx(i), sy(d[metricKey])])
    if (visible < lastIdx) {
      const [x1, y1] = [sx(visible), sy(data[visible][metricKey])]
      const [x2, y2] = [sx(visible + 1), sy(data[visible + 1][metricKey])]
      pts.push([x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac])
    }
    return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ')
  }

  const areaPath = (p) => {
    const line = linePath(p)
    if (!line) return ''
    const visible = Math.floor(p * lastIdx)
    const frac = p * lastIdx - visible
    const endX = visible < lastIdx ? sx(visible) + (sx(visible + 1) - sx(visible)) * frac : sx(lastIdx)
    const base = PAD.top + IH
    return `${line} L${endX.toFixed(1)},${base} L${PAD.left},${base} Z`
  }

  useEffect(() => {
    startRef.current = null
    setProgress(0)
    const animate = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / 900, 1)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [data, metricKey])

  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const v = Math.round((MAX * i) / 3)
    return { v, y: sy(v) }
  })

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = rect.width / W
    const relX = (e.clientX - rect.left) / scale - PAD.left
    const idx = Math.round((relX / IW) * lastIdx)
    if (idx >= 0 && idx <= lastIdx) setHoverIdx(idx)
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={200} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="lbAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id="lbGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke={gridLine} strokeWidth={1} />
            <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fill={axisColor} style={{ fontSize: 10, fontWeight: 600 }}>{t.v}</text>
          </g>
        ))}

        {data.map((d, i) => (
          <text key={i} x={sx(i)} y={H - 8} textAnchor="middle"
            fill={hoverIdx === i ? textSub : axisColor}
            style={{ fontSize: 11, fontWeight: 600, transition: 'fill 0.15s' }}>
            {d.label}
          </text>
        ))}

        {hoverIdx !== null && (
          <>
            <line x1={sx(hoverIdx)} y1={PAD.top} x2={sx(hoverIdx)} y2={PAD.top + IH} stroke={gridLine} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={sx(hoverIdx)} cy={sy(data[hoverIdx][metricKey])} r={4} fill={color} />
          </>
        )}

        <path d={areaPath(progress)} fill="url(#lbAreaGrad)" />
        <path d={linePath(progress)} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#lbGlow)" />
      </svg>

      {hoverIdx !== null && (
        <div
          className="absolute px-2.5 py-1.5 rounded-lg text-xs font-bold pointer-events-none"
          style={{
            left: `${(sx(hoverIdx) / W) * 100}%`, top: 0, transform: 'translate(-50%, -110%)',
            background: isDark ? 'rgba(10,14,24,0.95)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${gridLine}`, color: color, whiteSpace: 'nowrap',
          }}
        >
          {data[hoverIdx][metricKey].toLocaleString()} {metricKey === 'xp' ? 'XP' : 'players'}
        </div>
      )}
    </div>
  )
}

const SORT_OPTIONS = [
  { key: 'xp', label: 'XP', icon: Zap },
  { key: 'level', label: 'Level', icon: TrendingUp },
  { key: 'time_spent_seconds', label: 'Time on Site', icon: Clock },
]

export default function LeaderboardPage() {
  const { dark: isDark } = useTheme()
  const accent = '#a855f7'
  const gold = '#fbbf24'

  const [data, setData] = useState(null)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortBy, setSortBy] = useState('xp')
  const [graphMetric, setGraphMetric] = useState('xp')
  const [graphDays, setGraphDays] = useState(7)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      axios.get('/api/xp/leaderboard?limit=50'),
      axios.get(`/api/xp/community-activity?days=${graphDays}`),
    ])
      .then(([lbRes, graphRes]) => {
        if (cancelled) return
        setData(lbRes.data)
        setGraph(graphRes.data)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [graphDays])

  const sortedLeaderboard = useMemo(() => {
    if (!data) return []
    return [...data.leaderboard]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .map((entry, i) => ({ ...entry, displayRank: i + 1 }))
  }, [data, sortBy])

  const podium = sortedLeaderboard.slice(0, 3)
  const rest = sortedLeaderboard.slice(3)

  // Theme tokens — matches ProfilePage / DashboardPage
  const pageBg      = isDark ? '#0b0f19' : '#f6f8fc'
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)'  : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)'
  const divider     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textPrimary = isDark ? '#e8edf5' : '#0f172a'
  const textSub     = isDark ? '#8892a4' : '#64748b'
  const skeletonBg  = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'
  const gridLine    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const rowHighlight = isDark ? 'rgba(168,85,247,0.14)' : 'rgba(168,85,247,0.08)'

  return (
    <div className="relative min-h-screen h-full animate-fade-in" style={{ background: pageBg, fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes lbRowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes lbPodiumIn { from { opacity: 0; transform: translateY(16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes lbCrownBounce { 0%, 100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-4px) rotate(6deg); } }
        @keyframes lbGoldPulse { 0%, 100% { box-shadow: 0 0 0px rgba(251,191,36,0.4); } 50% { box-shadow: 0 0 28px rgba(251,191,36,0.55); } }
        .lb-row { animation: lbRowIn 0.4s ease backwards; }
        .lb-podium-block { animation: lbPodiumIn 0.5s cubic-bezier(0.16,1,0.3,1) backwards; }
        .lb-crown { animation: lbCrownBounce 1.8s ease-in-out infinite; transform-origin: center; }
        .lb-gold-ring { animation: lbGoldPulse 2.4s ease-in-out infinite; }
        .lb-chip { transition: all 0.18s ease; }
        .lb-chip:hover { transform: translateY(-1px); }
      `}</style>

      <div className="relative px-4 sm:px-6 py-5 sm:py-7 flex flex-col gap-5 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: textPrimary }}>
              <Trophy size={22} style={{ color: gold }} className="lb-crown" /> Leaderboard
            </h1>
            <p className="text-sm mt-1" style={{ color: textSub }}>See how you stack up against every player</p>
          </div>
          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="lb-chip flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
            style={{ background: settingsOpen ? accent : cardBg, color: settingsOpen ? '#fff' : textSub, border: `1px solid ${settingsOpen ? accent : cardBorder}` }}
          >
            <SlidersHorizontal size={13} /> Settings
          </button>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: textSub }}>Rank by</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setSortBy(opt.key)}
                    className="lb-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: sortBy === opt.key ? accent + '22' : 'transparent',
                      color: sortBy === opt.key ? accent : textSub,
                      border: `1px solid ${sortBy === opt.key ? accent + '55' : cardBorder}`,
                    }}>
                    <opt.icon size={12} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: textSub }}>Graph shows</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setGraphMetric('xp')}
                  className="lb-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: graphMetric === 'xp' ? accent + '22' : 'transparent', color: graphMetric === 'xp' ? accent : textSub, border: `1px solid ${graphMetric === 'xp' ? accent + '55' : cardBorder}` }}>
                  <Zap size={12} /> XP Earned
                </button>
                <button onClick={() => setGraphMetric('active_users')}
                  className="lb-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: graphMetric === 'active_users' ? accent + '22' : 'transparent', color: graphMetric === 'active_users' ? accent : textSub, border: `1px solid ${graphMetric === 'active_users' ? accent + '55' : cardBorder}` }}>
                  <Users size={12} /> Active Players
                </button>
                <button onClick={() => setGraphDays(d => d === 7 ? 14 : 7)}
                  className="lb-chip flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'transparent', color: textSub, border: `1px solid ${cardBorder}` }}>
                  Last {graphDays} days ⟳
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Your stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Your Rank', value: data ? `#${sortedLeaderboard.find(e => e.is_current_user)?.displayRank ?? data.current_user.rank}` : null, color: accent, raw: true },
            { label: 'Your XP', value: data?.current_user.xp, color: '#f59e0b' },
            { label: 'Your Level', value: data?.current_user.level, color: '#8b5cf6' },
            { label: 'Time on Site', value: data ? formatDuration(data.current_user.time_spent_seconds) : null, color: '#06b6d4', raw: true },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              {loading || s.value == null
                ? <div className="w-10 h-6 mx-auto rounded animate-pulse" style={{ background: skeletonBg }} />
                : <p className="text-lg sm:text-xl font-black" style={{ color: s.color }}>
                    {s.raw ? s.value : <CountUp value={s.value} />}
                  </p>
              }
              <p className="text-[11px] font-semibold mt-1" style={{ color: textSub }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Engagement graph */}
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} style={{ color: accent }} />
            <h2 className="font-black text-sm" style={{ color: textPrimary }}>Community Activity</h2>
          </div>
          <p className="text-xs mb-2" style={{ color: textSub }}>
            {graphMetric === 'xp' ? 'Total XP earned by everyone, per day' : 'Distinct players active, per day'}
          </p>
          {loading || !graph ? (
            <div className="h-[200px] rounded-xl animate-pulse" style={{ background: skeletonBg }} />
          ) : (
            <EngagementChart
              data={graph}
              metricKey={graphMetric}
              color={accent}
              isDark={isDark}
              textSub={textSub}
              gridLine={gridLine}
              axisColor={textSub}
            />
          )}
        </div>

        {/* Podium (top 3) */}
        {!loading && podium.length === 3 && (
          <div className="grid grid-cols-3 gap-3 items-end px-2">
            {[podium[1], podium[0], podium[2]].map((entry, visualIdx) => {
              const heights = [116, 148, 96]
              const order = [2, 1, 3]
              const rank = order[visualIdx]
              return (
                <div key={entry.user_id} className="lb-podium-block flex flex-col items-center gap-2"
                  style={{ animationDelay: `${visualIdx * 0.1}s` }}>
                  <div className={rank === 1 ? 'lb-gold-ring rounded-2xl' : ''}>
                    <Avatar username={entry.username} avatarUrl={entry.avatar_url} size={rank === 1 ? 56 : 46}
                      ring={cardBg} glow={RANK_COLOR[rank]} />
                  </div>
                  {rank === 1 && <Crown size={16} className="lb-crown" style={{ color: gold }} fill={gold} />}
                  <p className="text-xs font-black truncate max-w-[90px] text-center" style={{ color: textPrimary }}>{entry.username}</p>
                  <p className="text-[10px] font-bold" style={{ color: RANK_COLOR[rank] }}>{entry[sortBy].toLocaleString()} {sortBy === 'xp' ? 'XP' : sortBy === 'level' ? 'lvl' : ''}</p>
                  <div className="w-full rounded-t-xl flex items-start justify-center pt-2"
                    style={{
                      height: heights[visualIdx], background: `linear-gradient(180deg, ${RANK_COLOR[rank]}33, ${RANK_COLOR[rank]}0a)`,
                      border: `1px solid ${RANK_COLOR[rank]}44`, borderBottom: 'none',
                    }}>
                    <span className="text-2xl font-black" style={{ color: RANK_COLOR[rank] }}>#{rank}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Ranked list (rank 4+) */}
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
          {loading ? (
            <div className="p-5 flex flex-col gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: skeletonBg }} />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 rounded w-1/3 animate-pulse" style={{ background: skeletonBg }} />
                    <div className="h-2.5 rounded w-1/5 animate-pulse" style={{ background: skeletonBg }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold" style={{ color: textSub }}>Couldn't load the leaderboard. Try refreshing.</p>
            </div>
          ) : rest.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={24} style={{ color: accent, opacity: 0.3 }} className="mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: textSub }}>That's everyone — climb the ranks!</p>
            </div>
          ) : (
            rest.map((entry, i) => (
              <div
                key={entry.user_id}
                className="lb-row flex items-center gap-3 px-4 sm:px-5 py-3.5 transition-colors hover:brightness-105"
                style={{
                  background: entry.is_current_user ? rowHighlight : 'transparent',
                  borderBottom: i < rest.length - 1 ? `1px solid ${divider}` : 'none',
                  animationDelay: `${Math.min(i * 0.035, 0.6)}s`,
                }}
              >
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black" style={{ color: textSub }}>{entry.displayRank}</span>
                </div>

                <Avatar username={entry.username} avatarUrl={entry.avatar_url} size={38} ring={entry.is_current_user ? accent : undefined} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate" style={{ color: textPrimary }}>{entry.username}</span>
                    {entry.is_current_user && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: accent }}>YOU</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: textSub }}>
                    Level {entry.level} · {formatDuration(entry.time_spent_seconds)}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Zap size={12} style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-black" style={{ color: '#f59e0b' }}>{entry.xp.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
