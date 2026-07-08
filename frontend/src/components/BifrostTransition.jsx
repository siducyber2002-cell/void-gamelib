import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Simple pub/sub ──
//
// Mounted once, high up in App.jsx, outside <Routes>, so it survives route
// changes. Driven by three calls from LoginPage:
//
//   1. bifrostBus.freeze({ image, width, height, left, top })
//      Called the instant the login button is clicked, before the login
//      request is even sent. Paints a pixel-perfect frozen copy of the page
//      over itself — invisible, since it's an exact copy of what's already
//      on screen — so nothing underneath can flash through while the
//      request is in flight.
//
//   2. bifrostBus.shatter({ impact: { xPct, yPct } })
//      Called only once login actually succeeds. The sequence:
//        a) the VOID "O" portal mark detaches from the logo (top-left) and
//           drops, spinning, while a stickman sprints in from off-screen to
//           meet it at ground level, bottom-left
//        b) the O lands at his feet; he plants, leans back, and winds up
//        c) bicycle kick — he whips a leg up and overhead, striking the O
//           on the way through
//        d) the O rockets off on an arc into the impact point (the login
//           button)
//        e) on the hit: a crater punches in and debris flecks burst
//           outward — instant damage, before anything cracks
//        f) a beat later, a crack slowly spiders out from that same
//           point — short, then medium, then splitting the whole page —
//           while the homepage is already sitting there underneath, waiting
//        g) the page splits into 7 mirror-shard pieces radiating from the
//           impact point, which then fall away one at a time, each fall
//           uncovering its own slice of the homepage until all 7 are gone
//      ~8-8.5 seconds total.
//
//   3. bifrostBus.cancel()
//      Called if login fails. Instantly drops the frozen overlay — since
//      nothing behind it ever changed, the login page is just sitting
//      there, unchanged, ready for another attempt.
const listeners = new Set()
export const bifrostBus = {
  freeze: (payload) => listeners.forEach(cb => cb({ type: 'freeze', payload })),
  shatter: (payload) => listeners.forEach(cb => cb({ type: 'shatter', payload })),
  cancel: () => listeners.forEach(cb => cb({ type: 'cancel' })),
  subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
}

// ── Timing — tuned to land the whole sequence at ~9-9.5s from click ──
// The O's fall is normal speed. The moment the stickman enters through his
// strike — and the ball's flight off his foot — plays in slow motion so the
// hit actually reads. Speed snaps back to normal the instant it lands.
const DROP_MS = 560          // NORMAL SPEED — the O falling from the logo to the kick point
const ENTRANCE_MS = 900      // SLOW MOTION — the stickman sprinting in to meet the ball
const KICK_MS = 650          // SLOW MOTION — plant, wind-up and the bicycle-kick strike
const BALL_MS = 900          // SLOW MOTION — the struck ball's flight to the impact point
const IMPACT_MS = 260        // NORMAL SPEED — crater + debris punching outward, before the cracks start spreading
const CRACK_MS = 2100        // the crack slowly spidering from short → medium → full-page
const HOLD_MS = 250          // a beat of stillness once the crack is complete, before it lets go
const NAV_GUARD_MS = 40      // buffer after navigate before revealing pieces, in case of a slow paint
const NUM_PIECES = 7
const PIECE_STAGGER_MS = 340 // gap between each piece breaking loose — makes them fall one at a time
const PIECE_DUR_MIN = 1250
const PIECE_DUR_MAX = 1700

// Where the stickman stands and meets the falling O — bottom-left, out of
// the way of the card on the right, roughly under the "Explore Library" link.
const KICK_X_PCT = 11
const KICK_Y_PCT = 80

// Fallback origin (top-left, roughly where the VOID logo sits) used only if
// LoginPage didn't pass a measured origin rect through freeze().
const DEFAULT_ORIGIN = { xPct: 9, yPct: 14 }

// Where a ray from (px,py) at `angle` exits the [0,w]x[0,h] rectangle.
// Assumes (px,py) is inside the rectangle.
function raycastToRect(px, py, angle, w, h) {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let best = null
  const consider = (t, x, y) => {
    if (t > 1e-6 && (best === null || t < best.t)) best = { t, x, y }
  }
  if (dx > 1e-9) {
    const t = (w - px) / dx
    const y = py + t * dy
    if (y >= -0.01 && y <= h + 0.01) consider(t, w, y)
  } else if (dx < -1e-9) {
    const t = (0 - px) / dx
    const y = py + t * dy
    if (y >= -0.01 && y <= h + 0.01) consider(t, 0, y)
  }
  if (dy > 1e-9) {
    const t = (h - py) / dy
    const x = px + t * dx
    if (x >= -0.01 && x <= w + 0.01) consider(t, x, h)
  } else if (dy < -1e-9) {
    const t = (0 - py) / dy
    const x = px + t * dx
    if (x >= -0.01 && x <= w + 0.01) consider(t, x, 0)
  }
  return best ? { x: best.x, y: best.y } : { x: px, y: py }
}

function norm2pi(a) {
  const twoPi = Math.PI * 2
  return ((a % twoPi) + twoPi) % twoPi
}

// Builds NUM_PIECES jagged cracks radiating from the impact point out to the
// edges of the page, plus the NUM_PIECES mirror-shard polygons they carve
// the page into (each polygon = impact point + its two bounding cracks +
// any rectangle corners swept between them).
function buildMirrorShatter(width, height, impactXPct, impactYPct) {
  const ix = (impactXPct / 100) * width
  const iy = (impactYPct / 100) * height
  const slot = (Math.PI * 2) / NUM_PIECES
  const base = Math.random() * slot

  const dividers = []
  for (let i = 0; i < NUM_PIECES; i++) {
    const jitter = (Math.random() * 0.36 - 0.18) * slot
    const angle = norm2pi(base + i * slot + jitter)
    const boundary = raycastToRect(ix, iy, angle, width, height)
    const len = Math.hypot(boundary.x - ix, boundary.y - iy)
    const perpAngle = angle + Math.PI / 2
    const jag = (Math.random() * 2 - 1) * len * 0.07
    const mid = {
      x: ix + Math.cos(angle) * len * 0.5 + Math.cos(perpAngle) * jag,
      y: iy + Math.sin(angle) * len * 0.5 + Math.sin(perpAngle) * jag,
    }
    dividers.push({
      angle,
      points: [{ x: ix, y: iy }, mid, boundary],
    })
  }
  dividers.sort((a, b) => a.angle - b.angle)

  const corners = [
    { x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height },
  ].map(c => ({ ...c, angle: norm2pi(Math.atan2(c.y - iy, c.x - ix)) }))

  const pieces = []
  for (let i = 0; i < NUM_PIECES; i++) {
    const a = dividers[i]
    const b = dividers[(i + 1) % NUM_PIECES]
    const sweep = norm2pi(b.angle - a.angle) || Math.PI * 2

    const between = corners
      .map(c => ({ ...c, shifted: norm2pi(c.angle - a.angle) }))
      .filter(c => c.shifted > 0.001 && c.shifted < sweep - 0.001)
      .sort((p, q) => p.shifted - q.shifted)

    const polygon = [
      ...a.points,
      ...between.map(c => ({ x: c.x, y: c.y })),
      ...[...b.points].reverse(),
    ]

    const midAngle = a.angle + sweep / 2
    const outward = 60 + Math.random() * 100
    pieces.push({
      key: `piece-${i}`,
      polygon,
      dx: Math.cos(midAngle) * outward + (Math.random() * 120 - 60),
      dy: height * (0.9 + Math.random() * 0.6),
      rot: (Math.random() * 150 - 75) * (Math.random() < 0.5 ? 1 : -1),
      delay: i * PIECE_STAGGER_MS,
      dur: Math.round(PIECE_DUR_MIN + Math.random() * (PIECE_DUR_MAX - PIECE_DUR_MIN)),
    })
  }

  return { dividers, pieces }
}

// Builds the crater rim/dent (two jagged rings around the impact point) and
// a burst of small debris flecks — the "smash damage" that lands the instant
// the ball hits, a beat before the mirror cracks start spidering outward.
function buildCrater(width, height, impactXPct, impactYPct) {
  const ix = (impactXPct / 100) * width
  const iy = (impactYPct / 100) * height
  const baseR = Math.max(28, Math.min(width, height) * 0.075)
  const SEGS = 14

  const makeRing = (rFactor) => {
    const pts = []
    for (let i = 0; i < SEGS; i++) {
      const angle = (i / SEGS) * Math.PI * 2
      const jitter = baseR * rFactor * (0.72 + Math.random() * 0.5)
      pts.push({ x: ix + Math.cos(angle) * jitter, y: iy + Math.sin(angle) * jitter })
    }
    return pts
  }

  const DEBRIS_COUNT = 12
  const debris = []
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = baseR * (1.6 + Math.random() * 2.4)
    debris.push({
      key: `debris-${i}`,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - baseR * 0.5, // slight upward kick, like real debris
      rot: Math.round(Math.random() * 360),
      size: Math.round(3 + Math.random() * 4),
      dur: Math.round(420 + Math.random() * 280),
      delay: Math.round(Math.random() * 40),
    })
  }

  return { ix, iy, rimPoints: makeRing(1), dentPoints: makeRing(0.6), debris }
}

// The VOID "O" portal mark — same art as the login logo — reused for every
// stage the ball appears in (falling, held at the stickman's feet, and in
// flight). Only one of those stages is ever mounted at a time, so reusing
// the same gradient/filter ids across them is safe.
function VoidOrb({ size = 64 }) {
  return (
    <svg className="bf-ball-orb" width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bfVoidGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="55%" stopColor="#1a0040" />
          <stop offset="80%" stopColor="#3b0d7a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        {/* Lit-sphere body: bright off-center highlight fading to a
            dark far edge, so it reads as a solid 3D ball rather
            than a flat ring icon. */}
        <radialGradient id="bfSphereBody" cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="22%" stopColor="#a855f7" />
          <stop offset="55%" stopColor="#5b1a9e" />
          <stop offset="80%" stopColor="#220a45" />
          <stop offset="100%" stopColor="#050110" />
        </radialGradient>
        {/* Terminator shadow — darkens the lower-right to imply
            curvature and a single light source. */}
        <radialGradient id="bfSphereShade" cx="72%" cy="78%" r="65%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <filter id="bfGlowFilter">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="bfGlowStrong">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="bfGlowSoft">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Ambient aura */}
      <circle cx="36" cy="36" r="32" fill="url(#bfVoidGlow)" opacity="0.7" />

      {/* Faint nebula wisps drifting behind the sphere */}
      <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.2)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.16)" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Tilted ring "behind" the sphere, for depth */}
      <ellipse cx="36" cy="37" rx="29" ry="9" fill="none" stroke="#7c3aed" strokeWidth="1.4" opacity="0.3" transform="rotate(-12 36 37)" />

      {/* ── Solid sphere body ── */}
      <circle cx="36" cy="36" r="24" fill="url(#bfSphereBody)" />
      <circle cx="36" cy="36" r="24" fill="url(#bfSphereShade)" />

      {/* Photon ring hugging the sphere's silhouette */}
      <circle cx="36" cy="36" r="25" stroke="#9333ea" strokeWidth="2" fill="none" filter="url(#bfGlowStrong)" opacity="0.85" />

      {/* Sharp glassy specular highlight */}
      <ellipse cx="27" cy="25" rx="7" ry="4.5" fill="rgba(255,255,255,0.55)" filter="url(#bfGlowSoft)" transform="rotate(-25 27 25)" />
      <circle cx="25" cy="22" r="1.8" fill="#ffffff" opacity="0.95" />

      {/* Rim light on the terminator edge */}
      <path d="M 14 40 A 22 22 0 0 0 34 59" stroke="rgba(192,132,252,0.5)" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Tiny star particles drifting in the aura */}
      <circle cx="14" cy="20" r="1" fill="#c084fc" opacity="0.7" />
      <circle cx="56" cy="18" r="0.8" fill="#a855f7" opacity="0.5" />
      <circle cx="58" cy="46" r="1.2" fill="#c084fc" opacity="0.6" />
      <circle cx="12" cy="50" r="0.9" fill="#9333ea" opacity="0.5" />
      <circle cx="46" cy="62" r="0.7" fill="#a855f7" opacity="0.4" />
    </svg>
  )
}

// A simple stick figure: a torso group (rotates for the lean-back), a
// planted leg, and a kicking leg group that swings up and overhead for the
// bicycle-kick strike. All rotation pivots sit at the hip (35, 58) or
// shoulder (35, 30) in the SVG's own coordinate space via transform-box:
// view-box, so the CSS keyframes can rotate them cleanly regardless of the
// element's rendered size.
function Stickman() {
  return (
    <svg className="bf-stickman-svg" width="70" height="100" viewBox="0 0 70 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle className="bm-head" cx="35" cy="16" r="8" stroke="#e9d5ff" strokeWidth="3" fill="none" />
      <g className="bm-torso">
        <line x1="35" y1="24" x2="35" y2="58" stroke="#e9d5ff" strokeWidth="3" strokeLinecap="round" />
        <line className="bm-arm-back" x1="35" y1="30" x2="18" y2="46" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
        <line className="bm-arm-front" x1="35" y1="30" x2="50" y2="20" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
      </g>
      <line className="bm-leg-plant" x1="35" y1="58" x2="26" y2="92" stroke="#e9d5ff" strokeWidth="3.5" strokeLinecap="round" />
      <g className="bm-leg-kick-pivot">
        <line className="bm-leg-kick" x1="35" y1="58" x2="46" y2="90" stroke="#e9d5ff" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function BifrostTransition() {
  const [phase, setPhase] = useState('idle') // idle | held | drop | kick | ball | impact | crack | pieces | falling
  const [payload, setPayload] = useState(null)
  const [shatter, setShatterState] = useState(null) // { dividers, pieces }
  const [crater, setCrater] = useState(null) // { ix, iy, rimPoints, dentPoints, debris }
  const [dropVec, setDropVec] = useState({ fx: 0, fy: 0 }) // O's fall: logo origin → stickman's feet
  const [ballVec, setBallVec] = useState({ fx: 0, fy: 0, mx: 0, my: 0 }) // O's flight: kick point → impact
  const navigate = useNavigate()
  const timers = useRef([])
  const raf = useRef([])
  const held = useRef(null)

  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    raf.current.forEach(cancelAnimationFrame)
    raf.current = []
  }

  const doFreeze = (data) => {
    clearAll()
    const width = data?.width || window.innerWidth
    const height = data?.height || window.innerHeight
    const left = data?.left || 0
    const top = data?.top || 0
    const origin = data?.origin || null // { xPct, yPct } of the VOID logo's "O", relative to the root
    const p = { image: data?.image, width, height, left, top, origin }
    held.current = p
    setPayload(p)
    setShatterState(null)
    setCrater(null)
    setPhase('held')
  }

  const doShatter = (data) => {
    if (!held.current) return
    const { width, height, origin } = held.current
    const impact = data?.impact || { xPct: 50, yPct: 90 }
    const impactX = (impact.xPct / 100) * width
    const impactY = (impact.yPct / 100) * height

    const kickX = (KICK_X_PCT / 100) * width
    const kickY = (KICK_Y_PCT / 100) * height
    const originXPct = origin?.xPct ?? DEFAULT_ORIGIN.xPct
    const originYPct = origin?.yPct ?? DEFAULT_ORIGIN.yPct
    const originX = (originXPct / 100) * width
    const originY = (originYPct / 100) * height

    // The O detaches from the logo and drops straight to where the
    // stickman is sprinting in to meet it.
    setDropVec({ fx: originX - kickX, fy: originY - kickY })

    // Once struck, the O arcs from the kick point in to the impact point —
    // same lobbed-arc treatment as before, just launched from underfoot
    // instead of from the bottom-center of the screen.
    setBallVec({
      fx: kickX - impactX,
      fy: kickY - impactY,
      mx: (kickX - impactX) * 0.18,
      my: -55,
    })

    setPayload(prev => ({ ...prev, impactXPct: impact.xPct, impactYPct: impact.yPct }))
    setPhase('drop')

    timers.current.push(setTimeout(() => {
      // O has landed at the kick point and waits there, idling. Time slows
      // down right here — the stickman sprints in to meet it.
      setPhase('entrance')

      timers.current.push(setTimeout(() => {
        // He's arrived — plant, lean back, wind up the kick. Still slow-mo.
        setPhase('kick')

        timers.current.push(setTimeout(() => {
          // Contact! The bicycle kick connects and the O launches on its arc
          // toward the login button — still slow-mo through the flight.
          setPhase('ball')

          timers.current.push(setTimeout(() => {
            // Ball has landed — impact! Speed snaps back to normal here.
            // Crater punches in and debris flecks burst outward instantly.
            // The cracks haven't started yet; this is pure "damage" on the
            // surface first.
            setCrater(buildCrater(width, height, impact.xPct, impact.yPct))
            setPhase('impact')

            timers.current.push(setTimeout(() => {
              // Impact has registered — now the crack spiders out from the
              // crater across the whole page.
              setShatterState(buildMirrorShatter(width, height, impact.xPct, impact.yPct))
              setPhase('crack')

              timers.current.push(setTimeout(() => {
                // Crack is fully drawn. Swap to the (still seamless, still whole-
                // looking) 7-piece layout one paint ahead of navigating, so the
                // route change is hidden behind intact-looking pieces.
                setPhase('pieces')
                raf.current.push(requestAnimationFrame(() => {
                  raf.current.push(requestAnimationFrame(() => {
                    navigate('/')
                    timers.current.push(setTimeout(() => {
                      setPhase('falling')
                      timers.current.push(setTimeout(() => {
                        setPhase('idle')
                        held.current = null
                      }, NUM_PIECES * PIECE_STAGGER_MS + PIECE_DUR_MAX + 150))
                    }, NAV_GUARD_MS))
                  }))
                }))
              }, CRACK_MS + HOLD_MS))
            }, IMPACT_MS))
          }, BALL_MS))
        }, KICK_MS))
      }, ENTRANCE_MS))
    }, DROP_MS))
  }

  const doCancel = () => {
    clearAll()
    held.current = null
    setPhase('idle')
  }

  useEffect(() => {
    return bifrostBus.subscribe(({ type, payload }) => {
      if (type === 'freeze') doFreeze(payload)
      else if (type === 'shatter') doShatter(payload)
      else if (type === 'cancel') doCancel()
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearAll(), [])

  if (phase === 'idle' || !payload) return null

  const { image, width, height, left, top, impactXPct = 50, impactYPct = 90 } = payload
  const showWhole = phase === 'held' || phase === 'drop' || phase === 'entrance' || phase === 'kick' || phase === 'ball' || phase === 'impact' || phase === 'crack'
  const showPieces = phase === 'pieces' || phase === 'falling'
  const showCracks = phase === 'crack' || phase === 'pieces' || phase === 'falling'
  const showCrater = phase === 'impact' || phase === 'crack' || phase === 'pieces'
  const isFalling = phase === 'falling'
  const showStickman = phase === 'entrance' || phase === 'kick' || phase === 'ball'
  const stickmanClass = phase === 'entrance' ? 'bf-stickman-run' : phase === 'kick' ? 'bf-stickman-kick' : 'bf-stickman-exit'
  const showDropBall = phase === 'drop'
  const showIdleBall = phase === 'entrance'
  const showHeldBall = phase === 'kick'
  const showSlowmoPulse = phase === 'entrance'

  return (
    <div className="bf-overlay">
      <style>{`
        .bf-overlay {
          position: fixed; inset: 0; z-index: 999999;
          overflow: hidden;
          pointer-events: none;
        }
        .bf-stage {
          position: absolute;
        }
        .bf-stage.bf-shake {
          animation: bf-shake 260ms ease-in-out;
        }
        @keyframes bf-shake {
          0%   { transform: translate(0, 0); }
          20%  { transform: translate(-6px, 3px); }
          40%  { transform: translate(5px, -4px); }
          60%  { transform: translate(-4px, -2px); }
          80%  { transform: translate(3px, 3px); }
          100% { transform: translate(0, 0); }
        }
        .bf-whole {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          background-size: 100% 100%;
        }
        .bf-piece {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          background-size: 100% 100%;
          transform: translate(0, 0) rotate(0deg) scale(1);
          opacity: 1;
          transition-property: transform, opacity;
          transition-timing-function: cubic-bezier(0.55, 0.06, 0.68, 0.19);
          will-change: transform, opacity;
        }
        .bf-piece.bf-fall {
          transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.92);
          opacity: 0;
        }

        /* ── Void ball — the VOID "O" portal mark, thrown from the user's side ── */
        .bf-ball {
          position: absolute;
          left: ${impactXPct}%; top: ${impactYPct}%;
          width: 0; height: 0;
          filter: drop-shadow(0 0 16px rgba(168,85,247,0.7)) drop-shadow(0 0 34px rgba(124,58,237,0.4));
          transform: translate(-50%, -50%) translate(${ballVec.fx}px, ${ballVec.fy}px) scale(2.2);
          opacity: 0.9;
          animation: bf-ballThrow ${BALL_MS}ms cubic-bezier(0.33, 0, 0.4, 1) forwards;
        }
        .bf-ball-orb {
          position: absolute;
          left: -32px; top: -32px;
          overflow: visible;
          animation: bf-ballSpin 650ms linear infinite;
        }
        @keyframes bf-ballSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bf-ballThrow {
          0%   { transform: translate(-50%, -50%) translate(${ballVec.fx}px, ${ballVec.fy}px) scale(2.2); opacity: 0.9; }
          55%  { transform: translate(-50%, -50%) translate(${ballVec.mx}px, ${ballVec.my}px) scale(1.25); opacity: 1; }
          85%  { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(0.8); opacity: 0; }
        }

        /* ── O drop — detaches from the logo (top-left) and falls, spinning,
           down to the kick point, at normal speed ── */
        .bf-drop-ball {
          position: absolute;
          left: ${KICK_X_PCT}%; top: ${KICK_Y_PCT}%;
          width: 0; height: 0;
          filter: drop-shadow(0 0 16px rgba(168,85,247,0.7)) drop-shadow(0 0 34px rgba(124,58,237,0.4));
          transform: translate(-50%, -50%) translate(${dropVec.fx}px, ${dropVec.fy}px) scale(1);
          animation: bf-ballDrop ${DROP_MS}ms cubic-bezier(0.55, 0.06, 0.68, 0.19) forwards;
        }
        @keyframes bf-ballDrop {
          0%   { transform: translate(-50%, -50%) translate(${dropVec.fx}px, ${dropVec.fy}px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
        }

        /* ── O idling at the kick point, waiting — a slow breathing pulse
           while the stickman sprints in, in slow motion ── */
        .bf-idle-ball {
          position: absolute;
          left: ${KICK_X_PCT}%; top: ${KICK_Y_PCT}%;
          width: 0; height: 0;
          filter: drop-shadow(0 0 16px rgba(168,85,247,0.7)) drop-shadow(0 0 34px rgba(124,58,237,0.4));
          transform: translate(-50%, -50%) scale(1);
          animation: bf-ballIdle 900ms ease-in-out infinite;
        }
        @keyframes bf-ballIdle {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    }
          50%      { transform: translate(-50%, -50%) scale(1.05); }
        }

        /* A soft ring pulse right as the stickman enters — the visual cue
           that time is slowing down for the shot. */
        .bf-slowmo-pulse {
          position: absolute;
          left: ${KICK_X_PCT}%; top: ${KICK_Y_PCT}%;
          width: 16vmax; height: 16vmax;
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0.2);
          background: radial-gradient(circle, rgba(216,196,255,0.4) 0%, rgba(168,85,247,0.12) 45%, transparent 72%);
          opacity: 0;
          animation: bf-slowmoPulse 520ms ease-out forwards;
        }
        @keyframes bf-slowmoPulse {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.2); }
          30%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1);   }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.9); }
        }

        /* ── O held at the stickman's feet — a slow-motion anticipation
           squash right before the strike, then it's off ── */
        .bf-held-ball {
          position: absolute;
          left: ${KICK_X_PCT}%; top: ${KICK_Y_PCT}%;
          width: 0; height: 0;
          filter: drop-shadow(0 0 16px rgba(168,85,247,0.7)) drop-shadow(0 0 34px rgba(124,58,237,0.4));
          transform: translate(-50%, -50%) scale(1);
          animation: bf-ballAnticipate ${KICK_MS}ms cubic-bezier(0.45, 0, 0.4, 1) forwards;
        }
        @keyframes bf-ballAnticipate {
          0%   { transform: translate(-50%, -50%) scale(1);    }
          70%  { transform: translate(-50%, -50%) scale(0.86); }
          92%  { transform: translate(-50%, -50%) scale(0.72); }
          100% { transform: translate(-50%, -50%) scale(1.15); }
        }

        /* ── Stickman — sprints in from off-screen to meet the falling O,
           then lands the bicycle kick that launches it ── */
        .bf-stickman {
          position: absolute;
          left: ${KICK_X_PCT}%; top: ${KICK_Y_PCT}%;
          width: 0; height: 0;
        }
        .bf-stickman-svg {
          position: absolute;
          left: -35px; top: -92px;
          overflow: visible;
          filter: drop-shadow(0 0 8px rgba(124,58,237,0.5));
        }
        .bm-torso, .bm-leg-kick-pivot, .bm-arm-back, .bm-arm-front, .bm-leg-plant {
          transform-box: view-box;
        }
        .bm-torso           { transform-origin: 35px 58px; }
        .bm-leg-kick-pivot   { transform-origin: 35px 58px; }
        .bm-leg-plant        { transform-origin: 35px 58px; }
        .bm-arm-back         { transform-origin: 35px 30px; }
        .bm-arm-front        { transform-origin: 35px 30px; }

        /* Running in, slow motion — a slow, powerful stride, torso translating
           in from off-screen left and settling right where the O is waiting. */
        .bf-stickman-run .bf-stickman-svg {
          animation: bm-runIn ${ENTRANCE_MS}ms cubic-bezier(0.3, 0.1, 0.25, 1) forwards;
        }
        @keyframes bm-runIn {
          0%   { transform: translate(-320px, 8px); }
          75%  { transform: translate(-30px, 0px);  }
          100% { transform: translate(0px, 0px);    }
        }
        .bf-stickman-run .bm-leg-plant {
          animation: bm-runLegsA 380ms ease-in-out infinite;
        }
        .bf-stickman-run .bm-leg-kick-pivot {
          animation: bm-runLegsB 380ms ease-in-out infinite;
        }
        @keyframes bm-runLegsA {
          0%, 100% { transform: rotate(26deg); }
          50%      { transform: rotate(-26deg); }
        }
        @keyframes bm-runLegsB {
          0%, 100% { transform: rotate(-26deg); }
          50%      { transform: rotate(26deg); }
        }
        .bf-stickman-run .bm-torso {
          animation: bm-runBob 380ms ease-in-out infinite;
        }
        @keyframes bm-runBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        /* ── The bicycle kick — a proper football-style strike, in slow motion:
           1) plant leg coils and the whole body dips into a crouch
           2) he leaps, leaning back, going airborne
           3) the kicking leg whips up and over in a wide arc — contact lands
              late in the swing, right at the top of the arc, so the hit is
              clearly visible before the follow-through
           4) he comes back down out of frame as the ball is already gone ── */
        .bf-stickman-kick .bm-torso {
          animation: bm-leanBack ${KICK_MS}ms cubic-bezier(0.45, 0, 0.3, 1) forwards;
        }
        @keyframes bm-leanBack {
          0%   { transform: rotate(0deg)   translateY(0);   }
          22%  { transform: rotate(-6deg)  translateY(3px); }  /* crouch, coiling */
          55%  { transform: rotate(18deg)  translateY(-7px); } /* airborne, leaning back */
          88%  { transform: rotate(30deg)  translateY(-9px); } /* apex — strike lands here */
          100% { transform: rotate(26deg)  translateY(-4px); } /* settling back down */
        }
        .bf-stickman-kick .bm-leg-kick-pivot {
          animation: bm-bicycleKick ${KICK_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes bm-bicycleKick {
          0%   { transform: rotate(18deg);   }  /* cocked back, low */
          22%  { transform: rotate(46deg);   }  /* deeper cock-back through the crouch */
          60%  { transform: rotate(-110deg); }  /* whipping up fast */
          88%  { transform: rotate(-188deg); }  /* CONTACT — leg near the top of the arc, overhead */
          100% { transform: rotate(-206deg); }  /* follow-through */
        }
        .bf-stickman-kick .bm-leg-plant {
          animation: bm-plantBrace ${KICK_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes bm-plantBrace {
          0%   { transform: rotate(0deg);   }
          22%  { transform: rotate(-16deg); } /* knee bends deep, coiling for the jump */
          55%  { transform: rotate(6deg);   } /* extending, pushing off the ground */
          100% { transform: rotate(12deg);  }
        }
        .bf-stickman-kick .bm-arm-back,
        .bf-stickman-kick .bm-arm-front {
          animation: bm-armFlail ${KICK_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes bm-armFlail {
          0%   { transform: rotate(0deg);   }
          40%  { transform: rotate(-10deg); }
          88%  { transform: rotate(-34deg); }
          100% { transform: rotate(-30deg); }
        }

        /* He's done his job — settle back down and fade as the O takes off. */
        .bf-stickman-exit {
          animation: bm-exitFade 260ms ease-out forwards;
        }
        @keyframes bm-exitFade {
          0%   { opacity: 1; transform: translateY(0);   }
          100% { opacity: 0; transform: translateY(6px); }
        }

        /* ── Impact damage: crater + debris, lands a beat before the crack ── */
        @keyframes bf-craterPop {
          0%   { transform: scale(0);    opacity: 0; }
          55%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        .bf-crater-dent {
          fill: rgba(0, 0, 0, 0.55);
          animation: bf-craterPop ${IMPACT_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .bf-crater-rim {
          fill: rgba(10, 4, 20, 0.75);
          stroke: rgba(192, 132, 252, 0.55);
          stroke-width: 1.5;
          filter: drop-shadow(0 0 10px rgba(124,58,237,0.55));
          animation: bf-craterPop ${IMPACT_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes bf-debrisBurst {
          0%   { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          65%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.2); opacity: 0; }
        }
        .bf-debris {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #f3e8ff 0%, #c084fc 45%, #7c3aed 100%);
          box-shadow: 0 0 6px rgba(168,85,247,0.75);
          animation-name: bf-debrisBurst;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }

        @keyframes bf-crackBurst {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.1); }
          18%  { opacity: 1;   transform: translate(-50%, -50%) scale(1);   }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(2.4); }
        }
        .bf-crack-flash {
          position: absolute;
          width: 18vmax; height: 18vmax;
          border-radius: 50%;
          left: ${impactXPct}%; top: ${impactYPct}%;
          transform: translate(-50%, -50%) scale(0.1);
          background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(216,196,255,0.55) 35%, transparent 70%);
          opacity: 0;
          animation: bf-crackBurst 420ms ease-out forwards;
        }

        .bf-crack-svg { position: absolute; inset: 0; }
        .bf-crack-line {
          fill: none;
          stroke: rgba(255,255,255,0.9);
          stroke-width: 1.8;
          stroke-linecap: round;
          filter: drop-shadow(0 0 3px rgba(216,196,255,0.85));
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: bf-crackDraw ${CRACK_MS}ms cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes bf-crackDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className={`bf-stage ${phase === 'impact' || phase === 'crack' ? 'bf-shake' : ''}`} style={{ left, top, width, height }}>
        {showWhole && (
          <div className="bf-whole" style={{ backgroundImage: image ? `url(${image})` : undefined }} />
        )}

        {showPieces && shatter?.pieces.map(p => (
          <div
            key={p.key}
            className={`bf-piece ${isFalling ? 'bf-fall' : ''}`}
            style={{
              backgroundImage: image ? `url(${image})` : undefined,
              clipPath: `polygon(${p.polygon.map(pt => `${pt.x.toFixed(1)}px ${pt.y.toFixed(1)}px`).join(',')})`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--rot': `${p.rot}deg`,
              transitionDelay: `${p.delay}ms`,
              transitionDuration: `${p.dur}ms`,
            }}
          />
        ))}

        {showCracks && shatter && (
          <svg className="bf-crack-svg" width={width} height={height}>
            {shatter.dividers.map((d, i) => (
              <path
                key={i}
                className="bf-crack-line"
                pathLength="1"
                d={`M ${d.points[0].x} ${d.points[0].y} L ${d.points[1].x.toFixed(1)} ${d.points[1].y.toFixed(1)} L ${d.points[2].x.toFixed(1)} ${d.points[2].y.toFixed(1)}`}
              />
            ))}
          </svg>
        )}

        {showCrater && crater && (
          <svg className="bf-crack-svg" width={width} height={height}>
            <polygon
              className="bf-crater-dent"
              points={crater.dentPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              style={{ transformOrigin: `${crater.ix}px ${crater.iy}px` }}
            />
            <polygon
              className="bf-crater-rim"
              points={crater.rimPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
              style={{ transformOrigin: `${crater.ix}px ${crater.iy}px` }}
            />
          </svg>
        )}

        {showCrater && crater && crater.debris.map(d => (
          <span
            key={d.key}
            className="bf-debris"
            style={{
              left: crater.ix,
              top: crater.iy,
              width: d.size,
              height: d.size,
              '--dx': `${d.dx}px`,
              '--dy': `${d.dy}px`,
              '--rot': `${d.rot}deg`,
              animationDuration: `${d.dur}ms`,
              animationDelay: `${d.delay}ms`,
            }}
          />
        ))}

        {(phase === 'impact' || phase === 'crack') && <div className="bf-crack-flash" />}

        {/* O falling from the logo down to the kick point — normal speed */}
        {showDropBall && (
          <div className="bf-drop-ball">
            <VoidOrb />
          </div>
        )}

        {/* Slow-mo cue — a soft pulse the instant the stickman enters */}
        {showSlowmoPulse && <div className="bf-slowmo-pulse" />}

        {/* O idling at the kick point while the stickman sprints in, slow-mo */}
        {showIdleBall && (
          <div className="bf-idle-ball">
            <VoidOrb />
          </div>
        )}

        {/* O sitting at his feet for the anticipation squash right before the strike */}
        {showHeldBall && (
          <div className="bf-held-ball">
            <VoidOrb />
          </div>
        )}

        {/* Stickman — sprints in to meet the falling O, plants, and lands the bicycle kick */}
        {showStickman && (
          <div className={`bf-stickman ${stickmanClass}`}>
            <Stickman />
          </div>
        )}

        {/* Struck O, in flight from the kick point to the impact point */}
        {phase === 'ball' && (
          <div className="bf-ball">
            <VoidOrb />
          </div>
        )}
      </div>
    </div>
  )
}
