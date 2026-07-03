import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Gamepad2, Users, CheckCircle, PlayCircle,
  Bookmark, Heart, TrendingUp, Activity, Plus, UserPlus, LayoutDashboard, Flame
} from 'lucide-react'
import axios from 'axios'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

const ACCENT   = '#a855f7'
const ACCENT2  = '#7c3aed'

// Pure date formatter used to key calendar cells against the backend's
// 'YYYY-MM-DD' StreakLog dates — no state, no localStorage, just formatting.
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_COLORS = {
  Playing:   '#3b82f6',
  Completed: '#10b981',
  Wishlist:  '#f59e0b',
  Favorites: '#f43f5e',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'

  let then = new Date(dateStr)

  // Many backends serialize UTC timestamps without a trailing 'Z' or offset
  // (e.g. Python's datetime.utcnow()). JS then silently parses that string as
  // *local* time instead of UTC, throwing the whole diff off by your timezone
  // offset — this is almost always what produces "garbage" values. Detect a
  // plain, offset-less ISO string and correct it.
  if (typeof dateStr === 'string' && !/Z$|[+-]\d{2}:?\d{2}$/.test(dateStr.trim())) {
    then = new Date(dateStr.trim() + 'Z')
  }

  if (isNaN(then.getTime())) return '—'

  const diffSec = Math.floor((Date.now() - then.getTime()) / 1000)

  // Small negative values just mean minor clock skew between client/server —
  // treat as "just now" instead of showing a negative/garbage number.
  if (diffSec < 5)   return 'just now'
  if (diffSec < 60)  return `${diffSec}s ago`

  const mins = Math.floor(diffSec / 60)
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`

  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(months / 12)}y ago`
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

function ProgressCylinder({ pct, color, isDark, textPrimary, textSub }) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(0)
  const startRef = useRef(null)

  useEffect(() => {
    startRef.current = null
    const animate = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / 1300, 1)
      setProgress((1 - Math.pow(1 - t, 3)) * pct)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [pct])

  const bubbles = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: -26 + Math.random() * 52,
      size: 1.6 + Math.random() * 2,
      duration: 2.6 + Math.random() * 2,
      delay: Math.random() * 4,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [])

  // Tube geometry — a capsule/pill shape
  const W = 120, H = 220
  const tubeX = 14, tubeY = 10, tubeW = 92, tubeH = 200, tubeR = 46
  const innerX = 18, innerW = 84
  const bottomY = tubeY + tubeH - 4
  const topY = tubeY + 4
  const waterY = bottomY - (progress / 100) * (tubeH - 8)

  const buildWave = (yLevel, amplitude, wavelength) => {
    const pts = []
    for (let x = innerX - wavelength; x <= innerX + innerW + wavelength; x += 4) {
      const yy = yLevel + amplitude * Math.sin((x / wavelength) * Math.PI * 2)
      pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`)
    }
    return `M${pts.join(' L')} L${innerX + innerW + wavelength},${bottomY} L${innerX - wavelength},${bottomY} Z`
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 34, fontWeight: 900, color: textPrimary, lineHeight: 1 }}>{Math.round(progress)}%</span>

      <div style={{ position: 'relative', width: W, height: H }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'relative', overflow: 'visible' }}>
          <defs>
            <clipPath id="dashTubeClip">
              <rect x={innerX} y={topY} width={innerW} height={bottomY - topY} rx={tubeR - 4} />
            </clipPath>
            <linearGradient id="dashLiquidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          </defs>

          {/* Tube outline */}
          <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx={tubeR}
            fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
            stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} strokeWidth={2} />

          {/* Liquid, clipped to the tube */}
          <g clipPath="url(#dashTubeClip)">
            <path d={buildWave(waterY, 3.5, 43)} fill={color} opacity={0.35} className="dash-wave-scroll-slow" />
            <path d={buildWave(waterY, 2.5, 43)} fill="url(#dashLiquidGrad)" className="dash-wave-scroll" />

            {bubbles.map(b => (
              <circle key={b.id} cx={innerX + innerW / 2 + b.left} cy={bottomY - 6} r={b.size}
                fill="#fff" opacity={0}
                style={{ animation: `dashBubbleRise ${b.duration}s ease-in ${b.delay}s infinite` }} />
            ))}
          </g>
        </svg>
      </div>

      <span style={{ fontSize: 11, color: textSub, marginTop: -4 }}>complete</span>
    </div>
  )
}

// Animated donut chart (replaces the old Recharts pie) — sweeps in on mount,
// hover-syncs between the chart slices and the legend rows on the right.
function LibraryDonut({ items, total, isDark, textPrimary, textSub }) {
  const [progress, setProgress] = useState(0)
  const [hovered, setHovered] = useState(null)
  const rafRef = useRef(0)
  const startRef = useRef(null)

  const sum = items.reduce((s, d) => s + d.value, 0)
  const cx = 95, cy = 95, outerR = 78, innerR = 50
  const TAU = Math.PI * 2
  const GAP = 0.035

  useEffect(() => {
    startRef.current = null
    const animate = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / 1200, 1)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sum])

  const activeColors = items.filter(d => d.value > 0).map(d => d.color)
  const bubbles = useMemo(() => {
    const palette = activeColors.length ? activeColors : ['#a855f7']
    return Array.from({ length: 11 }, (_, i) => ({
      id: i,
      left: (Math.random() - 0.5) * (innerR - 16) * 2,
      size: 1.6 + Math.random() * 2.2,
      duration: 3 + Math.random() * 2.5,
      delay: Math.random() * 4.5,
      color: palette[i % palette.length],
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const polar = (angle, r) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  const slicePath = (a0, a1) => {
    const [x1, y1] = polar(a0, outerR)
    const [x2, y2] = polar(a1, outerR)
    const [x3, y3] = polar(a1, innerR)
    const [x4, y4] = polar(a0, innerR)
    const large = a1 - a0 > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
  }

  let cursor = -Math.PI / 2
  const slices = items.filter(d => d.value > 0).map((d, i) => {
    const sweep = (d.value / sum) * TAU * progress
    const start = cursor + GAP / 2
    const end = cursor + sweep - GAP / 2
    cursor += (d.value / sum) * TAU * progress
    return { ...d, start, end, sweep, idx: i }
  })

  const activeSlice = hovered !== null ? slices.find(s => s.idx === hovered) : null

  return (
    <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ width: '45%', display: 'flex', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <div className="dash-donut-breathe" style={{
          position: 'absolute', width: 150, height: 150, borderRadius: '50%',
          background: (activeSlice?.color || items.find(d => d.value > 0)?.color || '#a855f7') + '30',
          filter: 'blur(28px)', transition: 'background 0.3s',
        }} />
        <svg width={190} height={190} viewBox="0 0 190 190" style={{ overflow: 'visible', position: 'relative' }} className="dash-donut-breathe">
          <defs>
            <clipPath id="dashBubbleClip">
              <circle cx={cx} cy={cy} r={innerR - 4} />
            </clipPath>
          </defs>
          <g clipPath="url(#dashBubbleClip)">
            {bubbles.map(b => (
              <circle
                key={b.id}
                cx={cx + b.left}
                cy={cy + innerR - 8}
                r={b.size}
                fill={b.color}
                opacity={0}
                style={{ animation: `dashBubbleRise ${b.duration}s ease-in ${b.delay}s infinite` }}
              />
            ))}
          </g>
          {slices.map(slice => slice.sweep > 0.001 && (
            <path
              key={slice.label}
              d={slicePath(slice.start, slice.end)}
              fill={slice.color}
              opacity={hovered !== null && hovered !== slice.idx ? 0.35 : 1}
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: hovered === slice.idx ? 'scale(1.06)' : 'scale(1)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                cursor: 'pointer',
                filter: hovered === slice.idx ? `drop-shadow(0 0 8px ${slice.color}aa)` : 'none',
              }}
              onMouseEnter={() => setHovered(slice.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill={activeSlice ? activeSlice.color : textPrimary}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 900, transition: 'fill 0.2s ease' }}>
            {activeSlice ? activeSlice.value : total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={textSub}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {activeSlice ? activeSlice.label : 'Total'}
          </text>
        </svg>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item, i) => {
          const pct = sum > 0 ? Math.round((item.value / sum) * 100) : 0
          const isActive = hovered === i
          return (
            <div key={item.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: hovered !== null && !isActive ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
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
                    boxShadow: isActive ? `0 0 6px ${item.color}66` : 'none',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* Circular tab-style summary chips — fills the space below the chart */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
      {items.map((item, i) => {
        const isActive = hovered === i
        return (
          <button
            key={item.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px 7px 7px', borderRadius: 999, cursor: 'pointer',
              background: isActive ? item.color + '20' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
              border: `1px solid ${isActive ? item.color + '55' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)')}`,
              transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
              transform: isActive ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: item.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <item.icon size={11} style={{ color: item.color }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{item.label}</span>
            <span style={{
              fontSize: 11, fontWeight: 900, color: item.color, minWidth: 16, textAlign: 'center',
              background: item.color + '18', borderRadius: 999, padding: '1px 6px',
            }}>{item.value}</span>
          </button>
        )
      })}
    </div>
  </>
  )
}

// Animated area/line chart (replaces the old Recharts AreaChart) — draws in on mount,
// then a live comet-style pulse continuously travels the line like a heart-rate monitor.
function ActivityAreaChart({ data, color, isDark, textSub, gridLine, axisColor }) {
  const [progress, setProgress] = useState(0)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [livePhase, setLivePhase] = useState(0)
  const rafRef = useRef(0)
  const startRef = useRef(null)
  const liveRafRef = useRef(0)
  const liveStartRef = useRef(null)

  const W = 640, H = 200
  const PAD = { top: 14, right: 12, bottom: 26, left: 30 }
  const IW = W - PAD.left - PAD.right
  const IH = H - PAD.top - PAD.bottom
  const lastIdx = data.length - 1

  const rawMax = Math.max(...data.map(d => d.games), 0)
  const MAX = rawMax === 0 ? 4 : Math.ceil(rawMax * 1.25)

  const sx = (i) => PAD.left + (i / (lastIdx || 1)) * IW
  const sy = (v) => PAD.top + IH - (v / MAX) * IH

  const linePath = (p) => {
    if (lastIdx <= 0) return ''
    const visible = Math.floor(p * lastIdx)
    const frac = p * lastIdx - visible
    const pts = data.slice(0, visible + 1).map((d, i) => [sx(i), sy(d.games)])
    if (visible < lastIdx) {
      const [x1, y1] = [sx(visible), sy(data[visible].games)]
      const [x2, y2] = [sx(visible + 1), sy(data[visible + 1].games)]
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

  // Point + partial-segment helpers for the continuous traveling pulse
  const pointAt = (p) => {
    if (lastIdx <= 0) return [sx(0), sy(data[0]?.games || 0)]
    const clamped = Math.max(0, Math.min(1, p))
    const idxF = clamped * lastIdx
    const i0 = Math.floor(idxF)
    const i1 = Math.min(i0 + 1, lastIdx)
    const frac = idxF - i0
    const x = sx(i0) + (sx(i1) - sx(i0)) * frac
    const y = sy(data[i0].games) + (sy(data[i1].games) - sy(data[i0].games)) * frac
    return [x, y]
  }
  const segmentPath = (p0, p1, steps = 14) => {
    const pts = []
    for (let s = 0; s <= steps; s++) {
      const p = p0 + (p1 - p0) * (s / steps)
      pts.push(pointAt(p))
    }
    return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ')
  }

  useEffect(() => {
    startRef.current = null
    const animate = (ts) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / 1000, 1)
      setProgress(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [data])

  // Continuous traveling pulse — starts once the draw-in finishes, loops forever
  useEffect(() => {
    if (progress < 1) return
    liveStartRef.current = null
    const DURATION = 2600
    const loop = (ts) => {
      if (liveStartRef.current === null) liveStartRef.current = ts
      const elapsed = (ts - liveStartRef.current) % DURATION
      setLivePhase(elapsed / DURATION)
      liveRafRef.current = requestAnimationFrame(loop)
    }
    liveRafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(liveRafRef.current)
  }, [progress, data])

  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const v = Math.round((MAX * i) / 3)
    return { v, y: sy(v) }
  })

  const handleMove = (e) => {
    if (progress < 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = rect.width / W
    const relX = (e.clientX - rect.left) / scale - PAD.left
    const idx = Math.round((relX / IW) * lastIdx)
    if (idx >= 0 && idx <= lastIdx) setHoverIdx(idx)
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" height={200} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ overflow: 'visible', cursor: progress >= 1 ? 'crosshair' : 'default' }}
        onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id="dashGlow">
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
          <line x1={sx(hoverIdx)} y1={PAD.top} x2={sx(hoverIdx)} y2={PAD.top + IH} stroke={gridLine} strokeWidth={1} strokeDasharray="3 3" />
        )}

        <path d={areaPath(progress)} fill="url(#dashAreaGrad)" />
        <path d={linePath(progress)} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter="url(#dashGlow)" />

        {/* Continuous traveling pulse — like a heart-rate monitor blip sweeping the line */}
        {progress >= 1 && lastIdx > 0 && (() => {
          const trail = 0.16
          const p0 = Math.max(0, livePhase - trail)
          const [hx, hy] = pointAt(livePhase)
          const fadeIn = Math.min(livePhase / 0.04, 1) // avoid a hard pop-in right at phase 0
          return (
            <>
              <path d={segmentPath(p0, livePhase)} fill="none" stroke={color} strokeWidth={2.5}
                strokeLinecap="round" opacity={0.55 * fadeIn} />
              <circle cx={hx} cy={hy} r={4} fill={color} opacity={fadeIn}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            </>
          )
        })()}

        {progress < 1 && lastIdx > 0 && (() => {
          const visible = Math.floor(progress * lastIdx)
          const frac = progress * lastIdx - visible
          const x = visible < lastIdx ? sx(visible) + (sx(visible + 1) - sx(visible)) * frac : sx(lastIdx)
          const v1 = data[visible].games
          const v2 = visible < lastIdx ? data[visible + 1].games : v1
          const y = sy(v1 + (v2 - v1) * frac)
          return <circle cx={x} cy={y} r={4} fill={color} stroke={isDark ? '#0b0f19' : '#fff'} strokeWidth={2} />
        })()}

        {hoverIdx !== null && data.map((d, i) => (
          <circle key={i} cx={sx(i)} cy={sy(d.games)} r={i === hoverIdx ? 5 : 3}
            fill={i === hoverIdx ? color : (isDark ? '#0b0f19' : '#fff')}
            stroke={color} strokeWidth={i === hoverIdx ? 0 : 1.5}
            opacity={i === hoverIdx ? 1 : 0.4}
            style={{ transition: 'r 0.15s, opacity 0.15s' }} />
        ))}
      </svg>

      {/* Live pulse rings on the most recent data point */}
      {progress >= 1 && (
        <div style={{
          position: 'absolute', left: `${(sx(lastIdx) / W) * 100}%`, top: sy(data[lastIdx].games),
          width: 0, height: 0, pointerEvents: 'none',
        }}>
          <span className="dash-ring-pulse"       style={{ position: 'absolute', width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', border: `2px solid ${color}`, background: 'transparent' }} />
          <span className="dash-ring-pulse-delay" style={{ position: 'absolute', width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', border: `2px solid ${color}`, background: 'transparent' }} />
          <span style={{ position: 'absolute', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: '50%', background: color }} />
        </div>
      )}

      {hoverIdx !== null && progress >= 1 && (() => {
        const leftPct = (sx(hoverIdx) / W) * 100
        const flip = leftPct > 72
        return (
          <div style={{
            position: 'absolute', top: PAD.top - 4,
            left: flip ? `calc(${leftPct}% - 110px)` : `calc(${leftPct}% + 10px)`,
            background: isDark ? 'rgba(15,18,30,0.95)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${color}44`, borderRadius: 10, padding: '6px 12px', pointerEvents: 'none',
          }}>
            <p style={{ fontSize: 11, color: textSub, margin: '0 0 2px', fontWeight: 600 }}>{data[hoverIdx].label}</p>
            <p style={{ fontSize: 14, color, margin: 0, fontWeight: 800 }}>
              {data[hoverIdx].games} game{data[hoverIdx].games !== 1 ? 's' : ''}
            </p>
          </div>
        )
      })()}
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

// Daily login streak badge
function StreakBadge({ streak, longest, isDark }) {
  const bg     = isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)'
  const border = isDark ? 'rgba(249,115,22,0.35)' : 'rgba(249,115,22,0.25)'
  const sub    = isDark ? '#b0a89c' : '#78716c'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 16, padding: '10px 18px', flexShrink: 0,
    }}>
      <span className="dash-flame-pulse" style={{ fontSize: 24, lineHeight: 1 }}>
        <Flame size={24} style={{ color: '#f97316' }} fill="#f97316" fillOpacity={0.25} />
      </span>
      <div>
        <p style={{ fontSize: 17, fontWeight: 900, color: '#f97316', lineHeight: 1, marginBottom: 3 }}>
          {streak} day{streak !== 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: 10, color: sub, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Streak · Best {longest}
        </p>
      </div>
    </div>
  )
}

// ── Login Streak widget (neon design, compact) ─────────────────────────────
// Small square card — no XP (that lives on the Profile page), a real
// current-month calendar with visible day numbers, and streak-based badges.
// Deliberately keeps its own dark/neon palette regardless of the app's
// light/dark toggle — that's the designer's look, not the dashboard's.

function useCountUpNeon(target, duration, delay) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    const timeout = setTimeout(() => {
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const t = Math.min((ts - start) / duration, 1)
        const e = 1 - Math.pow(1 - t, 3)
        setVal(Math.round(e * target))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf) }
  }, [target, duration, delay])
  return val
}

function SwordIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M20 4L24 8L12 20L8 24L4 24L4 20L16 8L20 4Z" stroke="#00f5ff" strokeWidth={1.5} strokeLinejoin="round" fill="#00f5ff18" />
      <path d="M18 6L22 10" stroke="#00f5ff" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M4 22L6 20" stroke="#00f5ff" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function LoginStreakWidget({ streak, longest, history, user }) {
  const [gridVisible, setGridVisible] = useState(false)
  const today = useMemo(() => new Date(), [])
  const historySet = useMemo(() => new Set(history || []), [history])
  const streakCount = useCountUpNeon(streak, 800, 200)

  useEffect(() => {
    const t = setTimeout(() => setGridVisible(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Current-month calendar — day numbers always show, regardless of whether
  // that day has login history yet (fixes "why are all the cells blank").
  const year  = today.getFullYear()
  const month = today.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset  = (firstOfMonth.getDay() + 6) % 7 // Monday-first
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const todayKey   = localDateKey(today)
  const monthLabel = today.toLocaleDateString('en', { month: 'short' })

  // Badges stay tied to the streak logic — no separate achievements endpoint.
  const achievements = useMemo(() => ([
    { icon: '⚔️', label: '7-Day',   unlocked: longest >= 7   },
    { icon: '🏆', label: 'Month',   unlocked: longest >= 30  },
    { icon: '💎', label: '100-Day', unlocked: longest >= 100 },
  ]), [longest])

  const neon   = '#00f5ff'
  const purple = '#bf5fff'
  const playerName = (user?.username || 'player').toUpperCase()
  const level = user?.level ?? 1

  return (
    <div style={{
      background: '#06060f', border: `1px solid ${neon}25`, borderRadius: 20,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden', height: '100%',
      boxShadow: `0 0 24px ${neon}08, inset 0 0 24px ${purple}05`,
      fontFamily: "'DM Mono', monospace",
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${neon}, ${purple}, transparent)` }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwordIcon />
          <div>
            <p style={{ fontSize: 9, color: neon, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, opacity: 0.7 }}>Daily Login</p>
            <p style={{ fontSize: 11, color: '#f0f0f4', margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{playerName}</p>
          </div>
        </div>
        <div style={{ background: `${purple}20`, border: `1px solid ${purple}50`, borderRadius: 4, padding: '3px 7px', fontSize: 9.5, color: purple, letterSpacing: '0.08em', flexShrink: 0 }}>
          LVL {level}
        </div>
      </div>

      {/* Streak number */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: '2.5rem', fontWeight: 700, color: neon, lineHeight: 1,
          textShadow: `0 0 16px ${neon}, 0 0 30px ${neon}50`, letterSpacing: '-0.02em',
        }}>
          {streakCount}
        </span>
        <div>
          <p style={{ fontSize: '0.6rem', color: neon, margin: 0, opacity: 0.6, letterSpacing: '0.08em' }}>DAY</p>
          <p style={{ fontSize: '0.6rem', color: neon, margin: 0, opacity: 0.6, letterSpacing: '0.08em' }}>STREAK</p>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: neon, letterSpacing: '0.1em', opacity: 0.7 }}>{monthLabel.toUpperCase()}</span>
          <span style={{ fontSize: 9, color: '#717182' }}>Best {longest}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const cellDate = new Date(year, month, d)
            const key      = localDateKey(cellDate)
            const active   = historySet.has(key)
            const isToday  = key === todayKey
            return (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8.5, fontWeight: 700,
                background: active ? `${neon}22` : '#ffffff06',
                border: isToday ? `1px solid ${neon}` : active ? `1px solid ${neon}35` : '1px solid transparent',
                color: active ? neon : '#6a6a7a',
                boxShadow: active ? `0 0 6px ${neon}40` : 'none',
                transform: gridVisible ? 'scale(1)' : 'scale(0.6)',
                opacity: gridVisible ? 1 : 0,
                transition: `transform 0.25s ease ${i * 8}ms, opacity 0.25s ease ${i * 8}ms`,
              }}>
                {d}
              </div>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6 }}>
        {achievements.map((a, i) => (
          <div key={i} title={a.label} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 4px', borderRadius: 6,
            background: a.unlocked ? `${purple}15` : '#ffffff05',
            border: a.unlocked ? `1px solid ${purple}35` : '1px solid transparent',
            opacity: a.unlocked ? 1 : 0.35,
          }}>
            <span style={{ fontSize: '0.85rem' }}>{a.icon}</span>
            <span style={{ fontSize: 7, color: a.unlocked ? '#f0f0f4' : '#4a4a5a', textAlign: 'center', lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>
              {a.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dark: isDark } = useTheme()
  const { user, streak: authStreak } = useAuth()
  const { library }      = useLibrary()

  const [friends,        setFriends]   = useState(null)
  const [recentActivity, setActivity]  = useState([])
  const [frLoading,      setFrLoading] = useState(true)
  const [lineData,       setLineData]  = useState([])

  const streak  = authStreak?.current_streak ?? 0
  const longest = authStreak?.longest_streak ?? 0
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!user) return
    axios.get('/api/auth/streak/history')
      .then(res => setHistory(res.data || []))
      .catch(() => { /* calendar just stays empty — non-critical */ })
  }, [user])

  // Forces a re-render every few seconds so "Xs ago" / "Xm ago" labels stay
  // live without needing to refetch any data.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

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
              at:     f.created_at,
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
              at:     g.added_at,
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
    <div className="dash-page-wrap" style={{ background: pageBg, minHeight: '100vh', padding: '28px 24px 48px', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @keyframes dashPulseRing {
          0%   { transform: scale(0.8); opacity: 0.55; }
          80%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes dashGlowBreathe {
          0%, 100% { filter: drop-shadow(0 0 6px var(--glow-color, #a855f7)); }
          50%      { filter: drop-shadow(0 0 15px var(--glow-color, #a855f7)); }
        }
        @keyframes dashBreathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.035); }
        }
        @keyframes dashFlowDash {
          to { stroke-dashoffset: -32; }
        }
        @keyframes dashBubbleRise {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 0.85; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-88px); opacity: 0; }
        }
        @keyframes dashWaveScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-43px); }
        }
        @keyframes dashCellPop {
          0%   { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .dash-cal-cell { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .dash-cal-cell:hover { transform: scale(1.18); z-index: 2; }
        @keyframes dashFlamePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 3px rgba(249,115,22,0.5)); }
          50%      { transform: scale(1.1); filter: drop-shadow(0 0 8px rgba(249,115,22,0.85)); }
        }
        .dash-flame-pulse      { display: inline-flex; animation: dashFlamePulse 1.8s ease-in-out infinite; }
        .dash-wave-scroll      { animation: dashWaveScroll 2.6s linear infinite; }
        .dash-wave-scroll-slow { animation: dashWaveScroll 4s linear infinite reverse; }
        .dash-ring-pulse       { animation: dashPulseRing 2.4s ease-out infinite; }
        .dash-ring-pulse-delay { animation: dashPulseRing 2.4s ease-out 1.2s infinite; }
        .dash-arc-glow         { animation: dashGlowBreathe 2.6s ease-in-out infinite; }
        .dash-donut-breathe    { animation: dashBreathe 4s ease-in-out infinite; }
        .dash-flow-dash        { animation: dashFlowDash 1.1s linear infinite; }

        /* ── Mobile fit ── */
        .dash-stat-grid,
        .dash-row2-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        @media (max-width: 900px) {
          .dash-stat-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .dash-stat-grid { grid-template-columns: 1fr 1fr; }
          .dash-row2-grid { grid-template-columns: 1fr; }
          .dash-page-wrap { padding: 20px 14px 40px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${ACCENT}55`,
            }}>
              <LayoutDashboard size={21} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: ACCENT, textTransform: 'uppercase', marginBottom: 2 }}>
                Overview
              </p>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: textPrimary, lineHeight: 1 }}>
                Dashboard
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 13, color: textSub, marginBottom: 4 }}>
            Hey {user?.username || 'Gamer'} — here's what's going on
          </p>
          <p style={{ fontSize: 12.5, color: textSub, opacity: 0.8, fontStyle: 'italic' }}>
            Every game logged, every friend added — this is your journey, tracked.
          </p>
        </div>

        <StreakBadge streak={streak} longest={longest} isDark={isDark} />
      </div>

      {/* ── Stat cards ── */}
      <div className="dash-stat-grid">
        <StatCard label="Friends"     value={frLoading ? '…' : friendsCount} icon={Users} color="#10b981" delay={80}  isDark={isDark} />
        <StatCard label="Completed"   value={completedCount} icon={CheckCircle} color="#8b5cf6"    delay={160} isDark={isDark} />
      </div>

      {/* ── Row 2: Breakdown + Progress + Streak ── */}
      <div className="dash-row2-grid">

        {/* Library Breakdown */}
        <div style={{ ...cardStyle, padding: '24px 26px' }}>
          <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>Library</p>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: textPrimary, marginBottom: 2 }}>Breakdown</h2>
          <p style={{ fontSize: 12, color: textSub, marginBottom: 20 }}>Distribution across statuses</p>

          {total === 0 ? (
            <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Gamepad2 size={32} color={textSub} strokeWidth={1.4} />
              <p style={{ fontSize: 13, color: textSub }}>Add games to see your breakdown</p>
            </div>
          ) : (
            <LibraryDonut items={breakdownItems} total={total} isDark={isDark} textPrimary={textPrimary} textSub={textSub} />
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
            <ProgressCylinder pct={progress} color={ACCENT} isDark={isDark} textPrimary={textPrimary} textSub={textSub} />

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

        {/* Login Streak — compact square card, sits alongside Breakdown/Progress */}
        <LoginStreakWidget streak={streak} longest={longest} history={history} user={user} />
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

        <div style={{ height: 200 }}>
          <ActivityAreaChart data={lineData} color={ACCENT} isDark={isDark} textSub={textSub} gridLine={gridLine} axisColor={axisColor} />
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
                  <span style={{ fontSize: 11, color: textSub }}>{timeAgo(act.at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
