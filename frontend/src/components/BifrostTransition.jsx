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
//   2. bifrostBus.shatter({ impact: { xPct, yPct }, origin: { xPct, yPct } })
//      Called only once login actually succeeds. `origin` is where the VOID
//      "O" logo sits on screen at that moment; `impact` is the login button.
//      The sequence:
//        a) the O drops straight down off the logo, like a dropped ball,
//           and comes to rest near the bottom-left of the screen
//        b) a stick figure jogs in from off-screen left, in slow motion
//        c) it plants and swings through a slow-motion bicycle kick —
//           partway through the swing, the ball launches
//        d) the ball arcs, spinning, across the screen and slams into the
//           login button
//        e) on the hit: a crater punches in and debris flecks burst
//           outward — instant damage, before anything cracks
//        f) a beat later, a crack slowly spiders out from that same
//           point — short, then medium, then splitting the whole page —
//           while the homepage is already sitting there underneath, waiting
//        g) the page splits into 7 mirror-shard pieces radiating from the
//           impact point, which then fall away one at a time, each fall
//           uncovering its own slice of the homepage until all 7 are gone
//      ~9-10 seconds total.
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

// ── Timing — tuned to land the whole sequence at ~9.5-10s from impact ──
const DROP_MS = 700          // the O drops off the logo down to the ground
const RUN_MS = 1300          // the stick figure's slow-motion run-in
const KICK_MS = 900          // the slow-motion bicycle-kick swing
const KICK_LAUNCH_PCT = 0.55 // the ball launches 55% through the kick swing
const FLY_MS = 680           // the ball's flight from the ground to the impact point
const IMPACT_MS = 260        // crater + debris punching outward, before the cracks start spreading
const CRACK_MS = 2100        // the crack slowly spidering from short → medium → full-page
const HOLD_MS = 250          // a beat of stillness once the crack is complete, before it lets go
const NAV_GUARD_MS = 40      // buffer after navigate before revealing pieces, in case of a slow paint
const NUM_PIECES = 7
const PIECE_STAGGER_MS = 340 // gap between each piece breaking loose — makes them fall one at a time
const PIECE_DUR_MIN = 1250
const PIECE_DUR_MAX = 1700

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

export default function BifrostTransition() {
  const [phase, setPhase] = useState('idle') // idle | held | drop | run | kick | fly | impact | crack | pieces | falling
  const [payload, setPayload] = useState(null)
  const [shatter, setShatterState] = useState(null) // { dividers, pieces }
  const [crater, setCrater] = useState(null) // { ix, iy, rimPoints, dentPoints, debris }
  const [kickGeo, setKickGeo] = useState(null) // { originX, originY, groundX, groundY, impactX, impactY }
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
    const p = { image: data?.image, width, height, left, top }
    held.current = p
    setPayload(p)
    setShatterState(null)
    setCrater(null)
    setPhase('held')
  }

  const doShatter = (data) => {
    if (!held.current) return
    const { width, height } = held.current
    const impact = data?.impact || { xPct: 50, yPct: 90 }
    // Where the VOID "O" logo sits on screen right now — falls back to
    // roughly the logo's usual top-left spot if it couldn't be measured.
    const origin = data?.origin || { xPct: 12, yPct: 12 }

    const impactX = (impact.xPct / 100) * width
    const impactY = (impact.yPct / 100) * height
    const originX = (origin.xPct / 100) * width
    const originY = (origin.yPct / 100) * height
    // Ground level the O drops to, and where the stick figure meets it —
    // a little in from the left edge, near the bottom of the frame.
    const groundX = Math.max(originX - width * 0.03, width * 0.12)
    const groundY = height * 0.85

    setKickGeo({ originX, originY, groundX, groundY, impactX, impactY })
    setPayload(prev => ({ ...prev, impactXPct: impact.xPct, impactYPct: impact.yPct }))

    const at = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    let t = 0

    // 1) The O drops off the logo.
    setPhase('drop')
    t += DROP_MS

    // 2) The stick figure jogs in, slow motion.
    at(t, () => setPhase('run'))
    t += RUN_MS

    // 3) It plants and swings through the bicycle kick. The ball launches
    // partway through the swing, not at the very end of it.
    at(t, () => setPhase('kick'))
    at(t + KICK_MS * KICK_LAUNCH_PCT, () => setPhase('fly'))
    t += KICK_MS

    // 4) The ball is already airborne (from the 'fly' timer above) — this
    // just advances the clock past its flight before impact lands.
    t += FLY_MS

    // 5) Impact! Crater punches in and debris flecks burst outward
    // instantly. The cracks haven't started yet; this is pure "damage" on
    // the surface first.
    at(t, () => {
      setCrater(buildCrater(width, height, impact.xPct, impact.yPct))
      setPhase('impact')
    })
    t += IMPACT_MS

    // 6) Impact has registered — now the crack spiders out from the
    // crater across the whole page.
    at(t, () => {
      setShatterState(buildMirrorShatter(width, height, impact.xPct, impact.yPct))
      setPhase('crack')
    })
    t += CRACK_MS + HOLD_MS

    // 7) Crack is fully drawn. Swap to the (still seamless, still whole-
    // looking) 7-piece layout one paint ahead of navigating, so the route
    // change is hidden behind intact-looking pieces.
    at(t, () => {
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
    })
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
  const showWhole = phase === 'held' || phase === 'drop' || phase === 'run' || phase === 'kick' || phase === 'fly' || phase === 'impact' || phase === 'crack'
  const showPieces = phase === 'pieces' || phase === 'falling'
  const showCracks = phase === 'crack' || phase === 'pieces' || phase === 'falling'
  const showCrater = phase === 'impact' || phase === 'crack' || phase === 'pieces'
  const isFalling = phase === 'falling'
  const showBall = phase === 'drop' || phase === 'run' || phase === 'kick' || phase === 'fly'
  const showStick = phase === 'run' || phase === 'kick' || phase === 'fly'
  const {
    originX = 0, originY = 0, groundX = 0, groundY = 0, impactX = 0, impactY = 0,
  } = kickGeo || {}

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

        /* ── The kicked ball — the VOID "O" logo mark, dropped and kicked ── */
        .bf-ball {
          position: absolute;
          left: ${originX}px; top: ${originY}px;
          width: 0; height: 0;
          filter: drop-shadow(0 0 16px rgba(168,85,247,0.7)) drop-shadow(0 0 34px rgba(124,58,237,0.4));
        }
        .bf-ball.bf-ball-drop {
          animation: bf-ballDrop ${DROP_MS}ms cubic-bezier(0.4, 0, 0.7, 1) forwards;
        }
        @keyframes bf-ballDrop {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          62%  { transform: translate(-50%, -50%) translate(${(groundX - originX) * 0.9}px, ${groundY - originY}px) scale(1); }
          80%  { transform: translate(-50%, -50%) translate(${(groundX - originX) * 0.97}px, ${(groundY - originY) * 0.92}px) scale(1); }
          100% { transform: translate(-50%, -50%) translate(${groundX - originX}px, ${groundY - originY}px) scale(1); }
        }
        .bf-ball.bf-ball-rest {
          transform: translate(-50%, -50%) translate(${groundX - originX}px, ${groundY - originY}px) scale(1);
        }
        .bf-ball.bf-ball-fly {
          animation: bf-ballFly ${FLY_MS}ms cubic-bezier(0.3, 0, 0.35, 1) forwards;
        }
        @keyframes bf-ballFly {
          0%   { transform: translate(-50%, -50%) translate(${groundX - originX}px, ${groundY - originY}px) scale(1); opacity: 1; }
          45%  { transform: translate(-50%, -50%) translate(${(groundX + impactX) / 2 - originX}px, ${Math.min(groundY, impactY) - 130 - originY}px) scale(0.9); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(${impactX - originX}px, ${impactY - originY}px) scale(0.6); opacity: 1; }
        }
        .bf-ball-orb {
          position: absolute;
          left: -32px; top: -32px;
          overflow: visible;
        }
        .bf-ball-drop .bf-ball-orb,
        .bf-ball-rest .bf-ball-orb {
          animation: bf-ballWobble 900ms ease-in-out infinite;
        }
        .bf-ball-fly .bf-ball-orb {
          animation: bf-ballSpin 260ms linear infinite;
        }
        @keyframes bf-ballWobble {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes bf-ballSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Stick figure — slow-motion run-in and bicycle kick ── */
        .bf-stick-wrap {
          position: absolute;
          left: ${groundX}px;
          top: ${groundY}px;
          width: 0; height: 0;
        }
        .bf-stick {
          position: absolute;
          left: -30px; top: -100px;
          width: 60px; height: 100px;
          overflow: visible;
          filter: drop-shadow(0 0 6px rgba(192,132,252,0.55));
        }
        .bf-stick.bf-stick-run {
          animation: bf-runIn ${RUN_MS}ms cubic-bezier(0.45, 0, 0.55, 1) forwards;
        }
        @keyframes bf-runIn {
          0%   { transform: translateX(-75vw); }
          100% { transform: translateX(-40px); }
        }
        .bf-stick.bf-stick-kick {
          transform: translateX(-40px);
        }
        .bf-stick .stick-body {
          transform-origin: 30px 95px;
        }
        .bf-stick.bf-stick-kick .stick-body {
          animation: bf-bodyLean ${KICK_MS}ms cubic-bezier(0.34, 1.2, 0.4, 1) forwards;
        }
        @keyframes bf-bodyLean {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(-8deg); }
          65%  { transform: rotate(-18deg); }
          100% { transform: rotate(-6deg); }
        }
        .stick-leg-front-thigh,
        .stick-leg-back,
        .stick-arm-front,
        .stick-arm-back {
          transform-origin: 30px 60px;
        }
        .stick-arm-front, .stick-arm-back { transform-origin: 30px 30px; }
        .bf-stick.bf-stick-run .stick-leg-front-thigh {
          animation: bf-runLegFront 320ms ease-in-out infinite;
        }
        .bf-stick.bf-stick-run .stick-leg-back {
          animation: bf-runLegBack 320ms ease-in-out infinite;
        }
        .bf-stick.bf-stick-run .stick-arm-front {
          animation: bf-runArmFront 320ms ease-in-out infinite;
        }
        .bf-stick.bf-stick-run .stick-arm-back {
          animation: bf-runArmBack 320ms ease-in-out infinite;
        }
        @keyframes bf-runLegFront {
          0%, 100% { transform: rotate(24deg); }
          50% { transform: rotate(-24deg); }
        }
        @keyframes bf-runLegBack {
          0%, 100% { transform: rotate(-24deg); }
          50% { transform: rotate(24deg); }
        }
        @keyframes bf-runArmFront {
          0%, 100% { transform: rotate(-20deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes bf-runArmBack {
          0%, 100% { transform: rotate(20deg); }
          50% { transform: rotate(-20deg); }
        }
        .bf-stick.bf-stick-kick .stick-leg-back {
          animation: bf-kickPlant ${KICK_MS}ms cubic-bezier(0.34, 1.2, 0.4, 1) forwards;
        }
        @keyframes bf-kickPlant {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(-14deg); }
        }
        .bf-stick.bf-stick-kick .stick-leg-front-thigh {
          animation: bf-kickThigh ${KICK_MS}ms cubic-bezier(0.3, 0, 0.3, 1) forwards;
        }
        .bf-stick.bf-stick-kick .stick-leg-front-shin {
          transform-origin: 44px 76px;
          animation: bf-kickShin ${KICK_MS}ms cubic-bezier(0.3, 0, 0.3, 1) forwards;
        }
        @keyframes bf-kickThigh {
          0%   { transform: rotate(20deg); }
          35%  { transform: rotate(-40deg); }
          60%  { transform: rotate(-125deg); }
          80%  { transform: rotate(-165deg); }
          100% { transform: rotate(-150deg); }
        }
        @keyframes bf-kickShin {
          0%   { transform: rotate(15deg); }
          35%  { transform: rotate(0deg); }
          60%  { transform: rotate(35deg); }
          80%  { transform: rotate(55deg); }
          100% { transform: rotate(40deg); }
        }
        .bf-stick.bf-stick-kick .stick-arm-front,
        .bf-stick.bf-stick-kick .stick-arm-back {
          animation: bf-kickArms ${KICK_MS}ms cubic-bezier(0.3, 0, 0.3, 1) forwards;
        }
        @keyframes bf-kickArms {
          0%   { transform: rotate(0deg); }
          60%  { transform: rotate(-60deg); }
          100% { transform: rotate(-30deg); }
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

        {showStick && (
          <div className="bf-stick-wrap">
            <svg
              className={`bf-stick ${phase === 'run' ? 'bf-stick-run' : 'bf-stick-kick'}`}
              viewBox="0 0 60 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g className="stick-body" stroke="#d8c4ff" strokeWidth="3.2" strokeLinecap="round" fill="none">
                {/* head */}
                <circle cx="30" cy="16" r="8" fill="#0d0518" stroke="#e9d5ff" strokeWidth="3" />
                {/* torso */}
                <line x1="30" y1="24" x2="30" y2="60" />
                {/* back arm */}
                <line className="stick-arm-back" x1="30" y1="30" x2="16" y2="48" />
                {/* front arm */}
                <line className="stick-arm-front" x1="30" y1="30" x2="44" y2="46" />
                {/* back leg (plant leg) */}
                <line className="stick-leg-back" x1="30" y1="60" x2="16" y2="95" />
                {/* front leg (kicking leg) — two segments so it can bend at the knee */}
                <line className="stick-leg-front-thigh" x1="30" y1="60" x2="44" y2="76" />
                <line className="stick-leg-front-shin" x1="44" y1="76" x2="56" y2="92" />
              </g>
            </svg>
          </div>
        )}

        {showBall && (
          <div
            className={`bf-ball ${
              phase === 'drop' ? 'bf-ball-drop'
              : phase === 'fly' ? 'bf-ball-fly'
              : 'bf-ball-rest'
            }`}
          >
            {/* VOID "O" portal mark, same art as the login logo, used as the void-ball */}
            <svg className="bf-ball-orb" width="64" height="64" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          </div>
        )}
      </div>
    </div>
  )
}
