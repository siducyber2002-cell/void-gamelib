import { useState, useEffect, useRef, useId } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Home, Compass, BookOpen, Flame, Newspaper,
  MessageSquare, LayoutDashboard, User,
  Trophy, Users, LogOut, Zap, Settings,
} from 'lucide-react'

// ── VOID Wordmark — unique SVG IDs via useId to prevent collisions with Topbar ──
function VoidLogo({ dark = true }) {
  const uid = useId().replace(/:/g, '')
  const lm = !dark

  return (
    <div className="sb-void-wordmark">

      {/* ── V ── CSS text, Orbitron 900, metallic gradient */}
      <span key={lm ? 'v-light' : 'v-dark'} className="sb-wm-v" style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '2rem',
        fontWeight: 900,
        lineHeight: 1,
        marginRight: 2,
        background: lm
          ? 'linear-gradient(170deg, #7c60c0 0%, #3a206a 40%, #7c60c0 70%, #2a1060 100%)'
          : 'linear-gradient(170deg, #ffffff 0%, #b0a0d8 30%, #e8e0ff 55%, #8070b0 80%, #d0c8f0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        backgroundClip: 'text',
        filter: dark ? 'drop-shadow(0 0 8px rgba(200,160,255,0.35))' : 'none',
        flexShrink: 0,
        alignSelf: 'center',
      }}>V</span>

      {/* ── O ── SVG black hole + CSS orbital rings */}
      <span className="sb-wm-o-wrap">
        <span className="sb-orb-ring sb-orb-ring-1" />
        <span className="sb-orb-ring sb-orb-ring-2" />
        <span className="sb-orb-ring sb-orb-ring-3" />
        <span className="sb-orb-scanner" />

        <svg
          width="38" height="38"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1, overflow: 'visible', display: 'block' }}
        >
          <defs>
            <radialGradient id={`${uid}-sb-voidGlow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="55%" stopColor="#1a0040" />
              <stop offset="80%" stopColor="#3b0d7a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-sb-ringGrad`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
              <stop offset="60%" stopColor="#9333ea" stopOpacity="0.9" />
              <stop offset="85%" stopColor="#7c3aed" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>
            <filter id={`${uid}-sb-glowFilter`}>
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id={`${uid}-sb-glowStrong`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <circle cx="36" cy="36" r="32" fill={`url(#${uid}-sb-voidGlow)`} opacity="0.7" />
          <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="36" r="22" fill={lm ? '#2a1060' : '#050507'} />
          <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter={`url(#${uid}-sb-glowStrong)`} />
          <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter={`url(#${uid}-sb-glowFilter)`} />
          <path d="M 20 31 A 18 18 0 0 1 36 17" stroke="rgba(232,180,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="36" r="28" stroke="#6d28d9" strokeWidth="6" fill="none" opacity="0.25" />
          <circle cx="36" cy="36" r="30" stroke="#4c1d95" strokeWidth="4" fill="none" opacity="0.12" />
          <circle cx="24" cy="20" r="1" fill="#c084fc" opacity="0.7" />
          <circle cx="48" cy="18" r="0.8" fill="#a855f7" opacity="0.5" />
          <circle cx="52" cy="40" r="1.2" fill="#c084fc" opacity="0.6" />
          <circle cx="20" cy="50" r="0.9" fill="#9333ea" opacity="0.5" />
          <circle cx="42" cy="58" r="0.7" fill="#a855f7" opacity="0.4" />
        </svg>
      </span>

      {/* ── I ── joystick SVG */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 2px' }}>
        <svg width="27" height="38" viewBox="0 0 52 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <radialGradient id={`${uid}-sb-joyBall`} cx="38%" cy="28%" r="62%">
              <stop offset="0%" stopColor="#d8a8ff" />
              <stop offset="35%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#5b21b6" />
            </radialGradient>
            <linearGradient id={`${uid}-sb-joyBase`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8e8f0" />
              <stop offset="40%" stopColor="#c8c8d8" />
              <stop offset="100%" stopColor="#a8a8b8" />
            </linearGradient>
            <linearGradient id={`${uid}-sb-joyStick`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#aaa8c0" />
              <stop offset="50%" stopColor="#d0cce0" />
              <stop offset="100%" stopColor="#aaa8c0" />
            </linearGradient>
            <filter id={`${uid}-sb-ballGlow`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="26" cy="16" r="13" fill="#7c3aed" opacity="0.25" />
          <circle cx="26" cy="16" r="11" fill={`url(#${uid}-sb-joyBall)`} filter={`url(#${uid}-sb-ballGlow)`} />
          <ellipse cx="22" cy="11" rx="4" ry="3" fill="rgba(255,255,255,0.35)" />
          <ellipse cx="28" cy="22" rx="3.5" ry="2" fill="rgba(60,0,120,0.3)" />
          <rect x="23" y="26" width="6" height="20" rx="3" fill={`url(#${uid}-sb-joyStick)`} />
          <rect x="27" y="26" width="2" height="20" rx="1" fill="rgba(100,80,160,0.25)" />
          <rect x="4" y="46" width="44" height="20" rx="6" fill={`url(#${uid}-sb-joyBase)`} />
          <rect x="6" y="47" width="40" height="4" rx="3" fill="rgba(255,255,255,0.55)" />
          <rect x="4" y="58" width="44" height="8" rx="4" fill="rgba(0,0,0,0.18)" />
          <rect x="6" y="62" width="40" height="3" rx="2" fill="rgba(80,60,120,0.15)" />
          <rect x="20" y="53" width="12" height="5" rx="2.5" fill="#1a0040" />
          <rect x="21" y="54" width="10" height="3" rx="1.5" fill="#a855f7" opacity="0.9" style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />
          <rect x="20" y="53" width="12" height="5" rx="2.5" fill="rgba(168,85,247,0.3)" style={{ filter: 'blur(2px)' }} />
        </svg>
      </span>

      {/* ── D ── game controller SVG */}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <svg width="42" height="32" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={`${uid}-sb-ctrlBody`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lm ? '#3a3060' : '#2e2e3a'} />
              <stop offset="100%" stopColor={lm ? '#1e1440' : '#1a1a24'} />
            </linearGradient>
            <linearGradient id={`${uid}-sb-ctrlBorder`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e8e8f8" />
              <stop offset="40%" stopColor="#c0b8d8" />
              <stop offset="100%" stopColor="#a0a0b8" />
            </linearGradient>
            <radialGradient id={`${uid}-sb-btnP1`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
            <radialGradient id={`${uid}-sb-btnP2`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#5b21b6" />
            </radialGradient>
            <filter id={`${uid}-sb-btnGlow`}>
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M 4 6 H 46 Q 86 6 86 36 Q 86 66 46 66 H 4 Z" fill={`url(#${uid}-sb-ctrlBorder)`} />
          <path d="M 8 11 H 45 Q 80 11 80 36 Q 80 61 45 61 H 8 Z" fill={`url(#${uid}-sb-ctrlBody)`} />
          <path d="M 10 13 H 44 Q 74 13 76 30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="21" y="26" width="8" height="20" rx="2" fill="#505060" />
          <rect x="16" y="31" width="18" height="10" rx="2" fill="#505060" />
          <rect x="21" y="31" width="8" height="10" rx="1" fill="#404050" />
          <path d="M25 28 L23 31 L27 31 Z" fill="#707080" />
          <path d="M25 44 L23 41 L27 41 Z" fill="#707080" />
          <path d="M18 36 L21 33 L21 39 Z" fill="#707080" />
          <path d="M32 36 L29 33 L29 39 Z" fill="#707080" />
          <circle cx="62" cy="26" r="8" fill="#1a0040" />
          <circle cx="62" cy="26" r="7" fill={`url(#${uid}-sb-btnP1)`} filter={`url(#${uid}-sb-btnGlow)`} />
          <ellipse cx="59.5" cy="23.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.3)" />
          <circle cx="62" cy="46" r="8" fill="#1a0040" />
          <circle cx="62" cy="46" r="7" fill={`url(#${uid}-sb-btnP2)`} filter={`url(#${uid}-sb-btnGlow)`} />
          <ellipse cx="59.5" cy="43.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.25)" />
          <rect x="40" y="33" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
          <rect x="40" y="36" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
          <rect x="40" y="39" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
          <path d="M 6 10 Q 8 7 16 6.5" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </span>

    </div>
  )
}

// ── Arc Reactor Clock — CHAOS MODE ──
function ArcReactorClock({ dark = true }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    const W = parent?.offsetWidth || 248
    const H = parent?.offsetHeight || 320
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // reactor center — upper portion, leaves room for time + glitch strip
    const cx = W / 2
    const cy = H * 0.36

    let t = 0
    let overloadTimer = 0
    let overloadFlash = 0
    let lightningBolts = []
    let glitchTimer = 0
    let glitchActive = false
    let glitchLines = []
    let dataStreams = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 5) * (W - 20) + 10,
      y: H * 0.72 + Math.random() * 20,
      speed: 0.4 + Math.random() * 0.6,
      chars: Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)),
      alpha: 0.15 + Math.random() * 0.25,
      offset: Math.random() * 100,
    }))
    let hexNodes = Array.from({ length: 5 }, (_, i) => ({
      x: 20 + Math.random() * (W - 40),
      y: H * 0.76 + Math.random() * (H * 0.2),
      r: 5 + Math.random() * 6,
      pulse: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.02,
    }))

    const makeLightning = (x1, y1, x2, y2, segs = 7) => {
      const pts = [{ x: x1, y: y1 }]
      for (let i = 1; i < segs; i++) {
        const f = i / segs
        pts.push({
          x: x1 + (x2 - x1) * f + (Math.random() - 0.5) * 22,
          y: y1 + (y2 - y1) * f + (Math.random() - 0.5) * 22,
        })
      }
      pts.push({ x: x2, y: y2 })
      return pts
    }

    const spawnLightning = () => {
      const n = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        lightningBolts.push({
          pts: makeLightning(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20,
            cx + Math.cos(a + (Math.random() - 0.5)) * (72 + Math.random() * 18),
            cy + Math.sin(a + (Math.random() - 0.5)) * (72 + Math.random() * 18)),
          life: 1, decay: 0.07 + Math.random() * 0.1,
          color: Math.random() > 0.4 ? '#7dd3fc' : '#fff',
        })
      }
    }

    const spawnGlitch = () => {
      glitchLines = Array.from({ length: 4 + Math.floor(Math.random() * 5) }, () => ({
        y: H * 0.68 + Math.random() * (H * 0.3),
        w: 20 + Math.random() * (W - 40),
        x: Math.random() * 30,
        h: 1 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.5,
        col: Math.random() > 0.5 ? '#38bdf8' : '#a78bfa',
      }))
    }

    const draw = () => {
      t += 0.016
      const pulse = Math.sin(t * 1.8) * 0.5 + 0.5
      const charge = Math.sin(t * 0.4) * 0.5 + 0.5

      overloadTimer += 0.016
      if (overloadTimer > 9) { overloadTimer = 0; overloadFlash = 1; spawnLightning(); spawnLightning() }
      if (overloadFlash > 0) {
        overloadFlash -= 0.035
        if (Math.random() > 0.65) spawnLightning()
      }
      if (Math.random() > 0.988) spawnLightning()

      glitchTimer += 0.016
      if (glitchTimer > 3.5 + Math.random() * 2) { glitchTimer = 0; glitchActive = true; spawnGlitch() }
      if (glitchActive && Math.random() > 0.85) glitchActive = false

      ctx.clearRect(0, 0, W, H)

      // overload flash
      if (overloadFlash > 0) {
        ctx.fillStyle = `rgba(180,230,255,${overloadFlash * 0.15})`
        ctx.fillRect(0, 0, W, H)
      }

      // ── METALLIC OUTER BEZEL ──
      const R = 90
      // brushed metal ring
      const metal = ctx.createRadialGradient(cx - 10, cy - 10, R * 0.7, cx, cy, R)
      metal.addColorStop(0, 'rgba(180,180,200,0.25)')
      metal.addColorStop(0.4, 'rgba(100,100,120,0.35)')
      metal.addColorStop(0.7, 'rgba(60,60,80,0.4)')
      metal.addColorStop(1, 'rgba(30,30,50,0.5)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = metal; ctx.fill()
      // bezel rim glow
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(150,160,180,${0.3 + pulse * 0.15})`
      ctx.lineWidth = 3; ctx.setLineDash([]); ctx.stroke()
      // inner bezel shadow
      ctx.beginPath(); ctx.arc(cx, cy, R - 5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 4; ctx.stroke()

      // ── AMBIENT GLOW ──
      const glowRad = ctx.createRadialGradient(cx, cy, 10, cx, cy, R + 20)
      glowRad.addColorStop(0, `rgba(56,189,248,${0.12 + pulse * 0.1})`)
      glowRad.addColorStop(1, 'rgba(56,189,248,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R + 25, 0, Math.PI * 2)
      ctx.fillStyle = glowRad; ctx.fill()

      // ── SEGMENTED GLOW PANELS (like the real reactor) ──
      const segCount = 12
      const segR1 = 60, segR2 = 80
      for (let i = 0; i < segCount; i++) {
        const a1 = (i / segCount) * Math.PI * 2 - Math.PI / 2
        const a2 = ((i + 0.75) / segCount) * Math.PI * 2 - Math.PI / 2
        const segPulse = Math.sin(t * 2 + i * 0.5) * 0.5 + 0.5
        const bright = 0.5 + segPulse * 0.5 + (overloadFlash * 0.5)
        ctx.beginPath()
        ctx.arc(cx, cy, segR2, a1, a2)
        ctx.arc(cx, cy, segR1, a2, a1, true)
        ctx.closePath()
        const sg = ctx.createRadialGradient(cx, cy, segR1, cx, cy, segR2)
        sg.addColorStop(0, `rgba(0,40,80,0.8)`)
        sg.addColorStop(0.5, `rgba(14,100,180,${0.4 + segPulse * 0.3})`)
        sg.addColorStop(1, `rgba(56,189,248,${bright * 0.9})`)
        ctx.fillStyle = sg; ctx.fill()
        ctx.strokeStyle = `rgba(56,189,248,${0.2 + segPulse * 0.2})`
        ctx.lineWidth = 0.5; ctx.stroke()
      }

      // ── CLOCK ARCS (inner rings) ──
      const now = new Date()
      const hrs = now.getHours() % 12, min = now.getMinutes(), sec = now.getSeconds()

      const drawArc = (r, prog, col, w, sh = 0) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 2)
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2 * prog)
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.setLineDash([])
        if (sh) { ctx.shadowColor = col; ctx.shadowBlur = sh }
        ctx.stroke(); ctx.shadowBlur = 0; ctx.restore()
      }
      drawArc(55, 1, 'rgba(56,189,248,0.06)', 4)
      drawArc(46, 1, 'rgba(56,189,248,0.06)', 3)
      drawArc(38, 1, 'rgba(56,189,248,0.06)', 2.5)
      drawArc(55, hrs / 12 + min / 720, `rgba(56,189,248,${0.75 + pulse*0.25})`, 3.5, 10)
      drawArc(46, min / 60 + sec / 3600, `rgba(125,211,252,${0.8 + pulse*0.2})`, 2.5, 8)
      drawArc(38, sec / 60, `rgba(186,230,253,${0.9 + pulse*0.1})`, 2, 6 + pulse * 8)

      // ── INNER CIRCUIT RING ──
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3)
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(56,189,248,${0.15 + charge * 0.1})`
      ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.stroke()
      ctx.restore()

      // ── LIGHTNING ARCS ──
      lightningBolts = lightningBolts.filter(b => b.life > 0)
      lightningBolts.forEach(bolt => {
        bolt.life -= bolt.decay
        ctx.beginPath()
        ctx.moveTo(bolt.pts[0].x, bolt.pts[0].y)
        bolt.pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
        ctx.strokeStyle = bolt.color; ctx.globalAlpha = bolt.life * 0.85
        ctx.lineWidth = 0.8 + bolt.life * 2; ctx.setLineDash([])
        ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 10
        ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0
      })

      // ── ORBITING PARTICLES ──
      for (let i = 0; i < 6; i++) {
        const a = t * 1.4 + (i / 6) * Math.PI * 2
        const pr = 28 + Math.sin(t * 3 + i) * 4
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr, 1.5 + Math.sin(t * 4 + i) * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(186,230,253,${0.4 + Math.sin(t * 3 + i) * 0.4})`
        ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 5; ctx.fill(); ctx.shadowBlur = 0
      }

      // ── REACTOR CORE ──
      const coreR = 20 + pulse * 3 + overloadFlash * 5
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
      coreG.addColorStop(0, '#ffffff')
      coreG.addColorStop(0.3, '#bae6fd')
      coreG.addColorStop(0.65, '#0ea5e9')
      coreG.addColorStop(1, '#0369a1')
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fillStyle = coreG
      ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 28 + pulse * 22 + overloadFlash * 35
      ctx.fill(); ctx.shadowBlur = 0

      // rotating spokes
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.6)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5)
        ctx.lineTo(Math.cos(a) * (coreR - 3), Math.sin(a) * (coreR - 3))
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + pulse * 0.3})`
        ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke()
      }
      ctx.restore()

      // overload starburst
      if (overloadFlash > 0.25) {
        ctx.save(); ctx.translate(cx, cy)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 4
          ctx.beginPath(); ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(a) * 40 * overloadFlash, Math.sin(a) * 40 * overloadFlash)
          ctx.strokeStyle = `rgba(255,255,255,${overloadFlash * 0.7})`
          ctx.lineWidth = 1.5; ctx.stroke()
        }
        ctx.restore()
      }

      // center dot
      ctx.beginPath(); ctx.arc(cx, cy, 4 + pulse * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12 + pulse * 8
      ctx.fill(); ctx.shadowBlur = 0

      // ── VOID ENTERPRISES (larger, styled) ──
      const labelY = cy + R + 18
      ctx.font = "700 11px 'Orbitron', monospace"
      ctx.fillStyle = `rgba(125,211,252,${0.6 + pulse * 0.3})`
      ctx.textAlign = 'center'
      ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 6 + pulse * 4
      ctx.fillText('VOID ENTERPRISE', cx, labelY)
      ctx.shadowBlur = 0

      // ── TIME DISPLAY (below label) ──
      const hh = String(now.getHours()).padStart(2, '0')
      const mm2 = String(min).padStart(2, '0')
      const ss = String(sec).padStart(2, '0')
      ctx.font = "700 18px 'Orbitron', monospace"
      ctx.fillStyle = `rgba(186,230,253,${0.9 + pulse * 0.1})`
      ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10 + pulse * 8
      ctx.fillText(`${hh}:${mm2}:${ss}`, cx, labelY + 22)
      ctx.shadowBlur = 0

      // ── TECH NEXUS / GLITCH ZONE (bottom strip) ──
      const zoneY = labelY + 34
      // subtle separator line
      ctx.beginPath(); ctx.moveTo(10, zoneY); ctx.lineTo(W - 10, zoneY)
      ctx.strokeStyle = `rgba(56,189,248,${0.08 + pulse * 0.06})`
      ctx.lineWidth = 0.5; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([])

      // scrolling hex data streams
      dataStreams.forEach(s => {
        s.offset += s.speed
        if (s.offset > 120) s.offset = 0
        ctx.font = "9px 'Share Tech Mono', monospace"
        ctx.textAlign = 'center'
        for (let i = 0; i < s.chars.length; i++) {
          if (Math.random() > 0.995) s.chars[i] = Math.floor(Math.random() * 16).toString(16)
          const yPos = zoneY + 10 + i * 11 - (s.offset % 88)
          if (yPos < zoneY + 5 || yPos > H - 4) continue
          const fade = Math.min(1, Math.min(yPos - zoneY - 5, H - yPos - 4) / 14)
          const bright = i === 0 ? 0.9 : 0.15 + Math.random() * 0.1
          ctx.fillStyle = `rgba(56,189,248,${bright * fade * s.alpha * 3})`
          ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = i === 0 ? 4 : 0
          ctx.fillText(s.chars[i].toUpperCase(), s.x, yPos)
          ctx.shadowBlur = 0
        }
      })

      // hex node network
      ctx.textAlign = 'left'
      hexNodes.forEach((node, ni) => {
        node.pulse += node.speed
        const np = Math.sin(node.pulse) * 0.5 + 0.5
        // connect to next node
        const next = hexNodes[(ni + 1) % hexNodes.length]
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(next.x, next.y)
        ctx.strokeStyle = `rgba(56,189,248,${0.04 + np * 0.06})`
        ctx.lineWidth = 0.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([])
        // hex node
        ctx.save(); ctx.translate(node.x, node.y); ctx.rotate(t * 0.3)
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          i === 0 ? ctx.moveTo(Math.cos(a) * node.r, Math.sin(a) * node.r)
                  : ctx.lineTo(Math.cos(a) * node.r, Math.sin(a) * node.r)
        }
        ctx.closePath()
        ctx.strokeStyle = `rgba(56,189,248,${0.12 + np * 0.2})`
        ctx.lineWidth = 0.8; ctx.stroke()
        ctx.restore()
        // pulse dot
        ctx.beginPath(); ctx.arc(node.x, node.y, 1.5 + np, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(125,211,252,${0.3 + np * 0.5})`
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 4 * np; ctx.fill(); ctx.shadowBlur = 0
      })

      // glitch lines
      if (glitchActive) {
        glitchLines.forEach(g => {
          ctx.fillStyle = `${g.col}${Math.floor(g.alpha * 255).toString(16).padStart(2,'0')}`
          ctx.fillRect(g.x, g.y, g.w, g.h)
          // shift glitch offset
          g.x += (Math.random() - 0.5) * 4
        })
        // scanline glitch on reactor area occasionally
        if (Math.random() > 0.7) {
          const gy = cy - 60 + Math.random() * 120
          ctx.fillStyle = `rgba(56,189,248,${Math.random() * 0.08})`
          ctx.fillRect(0, gy, W, 1 + Math.random() * 3)
        }
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [dark])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}

// ── Nav sections ──
const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { to: '/',          icon: Home,           label: 'Home'       },
      { to: '/library',   icon: BookOpen,       label: 'My Library' },
      { to: '/trending',  icon: Flame,          label: 'Trending',  badge: 'hot' },
      { to: '/news',      icon: Newspaper,      label: 'News'       },
    ],
  },
  {
    label: 'Discover',
    items: [
      { to: '/discover',   icon: Compass,         label: 'Explore'    },
      { to: '/community',  icon: MessageSquare,   label: 'Community', badge: 'live' },
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
    ],
  },
  {
    label: 'Your Stuff',
    items: [
      { to: '/profile',      icon: User,     label: 'Profile'      },
      { to: '/achievements', icon: Trophy,   label: 'Achievements' },
      { to: '/friends',      icon: Users,    label: 'Friends'      },
      { to: '/settings',     icon: Settings, label: 'Settings'     },
    ],
  },
]

const DARK = {
  bg: '#08080f', surface: '#0f0f1a', border: '#1e1e32', borderActive: '#6366f133',
  text: '#f0eeff', textSub: '#7a759a', textMuted: '#3d3960',
  accent: '#a855f7', accentDim: '#7c3aed', accentGlow: 'rgba(168,85,247,0.12)', sectionLabel: '#3d3960',
}
const LIGHT = {
  bg: '#f0eeff', surface: '#ffffff', border: '#e2dcf5', borderActive: '#7c3aed33',
  text: '#1a1230', textSub: '#5a4e8a', textMuted: '#9490b5',
  accent: '#7c3aed', accentDim: '#6d28d9', accentGlow: 'rgba(124,58,237,0.08)', sectionLabel: '#a0a0bf',
}

export default function Sidebar({ open, onClose, width = 248, setWidth = () => {}, dark = true }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isResizingRef = useRef(false)
  const [isResizingState, setIsResizingState] = useState(false)
  const t = dark ? DARK : LIGHT

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizingRef.current) return
      setWidth(Math.min(Math.max(200, e.clientX), 400))
    }
    const onUp = () => {
      if (!isResizingRef.current) return
      isResizingRef.current = false
      setIsResizingState(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setWidth])

  const startResize = (e) => {
    e.preventDefault()
    isResizingRef.current = true
    setIsResizingState(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@400;500;600;700&display=swap');

        /* ── Logo wordmark row ── */
        .sb-void-wordmark {
          display: flex;
          align-items: center;
          gap: 0;
          line-height: 1;
          animation: voidLogoGlow 4s ease-in-out infinite;
          overflow: visible;
        }

        /* ── O orbital rings ── */
        .sb-wm-o-wrap {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: visible;
          margin: 0 1px;
        }
        .sb-orb-ring {
          position: absolute;
          border-radius: 40%;
          border-style: solid;
          border-color: transparent;
          pointer-events: none;
        }
        .sb-orb-ring-1 {
          width: 46px; height: 46px;
          border-top-color: rgba(147,51,234,0.55);
          border-right-color: rgba(147,51,234,0.2);
          border-width: 1px;
          animation: sbOrbSpin 8s linear infinite;
        }
        .sb-orb-ring-2 {
          width: 54px; height: 54px;
          border-bottom-color: rgba(109,40,217,0.45);
          border-left-color: rgba(109,40,217,0.15);
          border-width: 1px;
          animation: sbOrbSpin 14s linear infinite reverse;
        }
        .sb-orb-ring-3 {
          width: 62px; height: 62px;
          border-top-color: rgba(168,85,247,0.3);
          border-right-color: rgba(168,85,247,0.08);
          border-width: 0.5px;
          animation: sbOrbSpin 22s linear infinite;
        }
        .sb-orb-scanner {
          position: absolute;
          width: 46px; height: 46px;
          border-radius: 50%;
          border: 1px solid transparent;
          border-top-color: rgba(192,132,252,0.9);
          animation: sbOrbSpin 3.5s linear infinite;
          filter: blur(0.5px);
        }
        @keyframes sbOrbSpin { to { transform: rotate(360deg); } }

        /* ── Nav links ── */
        .sb-nav-link {
          transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
          font-family: 'Exo 2', sans-serif !important;
          letter-spacing: 0.04em;
        }
        .sb-nav-link:hover {
          color: ${t.text} !important;
          background: ${t.accentGlow} !important;
          transform: translateX(2px);
        }
        .sb-nav-link:hover .sb-nav-icon { color: ${t.accent} !important; }

        .sb-logout {
          font-family: 'Exo 2', sans-serif !important;
          letter-spacing: 0.06em;
          transition: all 0.18s ease;
        }
        .sb-logout:hover { background: #1a050a !important; border-color: #ef444444 !important; color: #ef4444 !important; }

        /* ── Resize handle ── */
        .sb-resize-handle {
          position: absolute; top: 0; right: -3px;
          width: 6px; height: 100%;
          cursor: col-resize; z-index: 9999;
          transition: background 0.2s ease;
        }
        .sb-resize-handle::after {
          content: '';
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 2px; height: 40px; border-radius: 2px;
          background: ${t.border};
          transition: background 0.2s, height 0.2s;
        }
        .sb-resize-handle:hover::after,
        .sb-resize-handle.resizing::after {
          background: ${t.accentDim};
          height: 80px;
          box-shadow: 0 0 8px ${t.accentDim};
        }
        .sb-resize-handle:hover { background: ${t.accentDim}22; }
        .sb-resize-handle.resizing { background: ${t.accentDim}33; }

        .sb-scrollbar::-webkit-scrollbar { width: 3px; }
        .sb-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sb-scrollbar::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
        .sb-user-card:hover { border-color: ${t.accent}44 !important; background: ${t.accentGlow} !important; }

        @keyframes voidLogoGlow {
          0%,100% { filter: drop-shadow(0 0 5px rgba(147,51,234,0.2)); }
          50%      { filter: drop-shadow(0 0 16px rgba(168,85,247,0.5)) drop-shadow(0 0 32px rgba(109,40,217,0.22)); }
        }
        @keyframes sb-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }
        @keyframes sb-stripe-in {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
        .sb-active-stripe { animation: sb-stripe-in 0.2s ease forwards; transform-origin: center; }

        /* Hide the decorative Arc Reactor Clock below lg — keeps the mobile
           sidebar short enough that Sign Out is reachable in one short scroll */
        @media (max-width: 1023px) {
          .sb-clock-wrap { display: none; }
        }
      `}</style>

      <aside
        className={`sb-scrollbar fixed lg:sticky top-0 left-0 z-30 h-screen flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: `${width}px`,
          background: t.bg,
          borderRight: `1px solid ${t.border}`,
          flexShrink: 0,
          minHeight: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* ── Logo header ── */}
        <div style={{ borderBottom: `3px solid ${t.border}`, padding: '12px 14px 12px', flexShrink: 0, overflow: 'visible' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'block', overflow: 'visible' }}>
            <div style={{ overflow: 'visible', paddingBottom: 8 }}>
              <VoidLogo dark={dark} />
            </div>
            <p style={{
              fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: t.textMuted,
              letterSpacing: '0.1em', marginTop: 2, paddingLeft: 2,
            }}>
              {'>'} YOUR ULTIMATE GAME LIBRARY_
            </p>
          </a>
          <div style={{ marginTop: 8, height: 5, background: `linear-gradient(to right, ${t.accentDim}, ${t.accent}, transparent)` }} />
        </div>

        {/* ── Nav ── */}
        <nav
          className="sb-scrollbar"
          style={{
            flexShrink: 0,
            overflowY: 'auto',
            padding: '10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 4 }}>
              {section.label && (
                <p style={{
                  fontFamily: "'Share Tech Mono', monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.2em', color: t.sectionLabel, textTransform: 'uppercase',
                  padding: '8px 10px 4px',
                }}>
                  {section.label}
                </p>
              )}
              {section.items.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to} to={item.to} end={item.to === '/'}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className="sb-nav-link"
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px 8px 12px', borderRadius: 10,
                      textDecoration: 'none', marginBottom: 2,
                      position: 'relative', overflow: 'hidden',
                      background: isActive ? t.accentGlow : 'transparent',
                      color: isActive ? t.accent : t.textSub,
                      border: `1px solid ${isActive ? t.borderActive : 'transparent'}`,
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="sb-active-stripe" style={{
                            position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3,
                            borderRadius: 4,
                            background: `linear-gradient(to bottom, ${t.accentDim}, ${t.accent})`,
                            boxShadow: `0 0 8px ${t.accent}88`,
                          }} />
                        )}
                        <Icon
                          className="sb-nav-icon"
                          size={15} strokeWidth={isActive ? 2.5 : 2}
                          style={{ color: isActive ? t.accent : t.textSub, flexShrink: 0, transition: 'color 0.18s' }}
                        />
                        <span style={{
                          flex: 1,
                          fontFamily: "'Exo 2', sans-serif",
                          fontSize: 13.5, fontWeight: 600,
                          letterSpacing: '0.05em',
                        }}>
                          {item.label}
                        </span>
                        {item.badge === 'live' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'sb-pulse 2s ease-in-out infinite' }} />
                            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em' }}>LIVE</span>
                          </span>
                        )}
                        {item.badge === 'hot' && <Zap size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* spacer pushes footer to bottom */}
        <div style={{ flex: 1 }} />

        {/* ── User Footer ── */}
        <div style={{ padding: '10px', borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div
            className="sb-user-card"
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12, marginBottom: 8,
              background: t.surface, border: `1px solid ${t.border}`,
              cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {user?.username?.[0]?.toUpperCase() || 'G'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Exo 2', sans-serif", fontWeight: 700, fontSize: 12, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username || 'Player'}
              </p>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ''}
              </p>
            </div>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e', flexShrink: 0 }} />
          </div>
          <button
            onClick={handleLogout}
            className="sb-logout"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 7, padding: '9px', borderRadius: 10,
              background: t.surface, border: `1px solid ${t.border}`,
              color: t.textMuted, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.07em',
            }}
          >
            <LogOut size={13} strokeWidth={2.5} /> Sign Out
          </button>
        </div>

        {/* ── Arc Reactor Clock — desktop only, hidden on mobile so Sign Out
             is reachable without scrolling past a 550px decoration ── */}
        <div className="sb-clock-wrap" style={{
          flexShrink: 0,
          flex: 1,
          minHeight: 550,
          borderTop: `1px solid ${t.border}33`,
          position: 'relative', overflow: 'hidden',
          background: dark
            ? 'radial-gradient(ellipse at 50% 40%, rgba(14,165,233,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 40%, rgba(14,165,233,0.04) 0%, transparent 70%)',
        }}>
          <ArcReactorClock dark={dark} />
        </div>

        {/* ── Resize Handle ── */}
        <div
          className={`sb-resize-handle${isResizingState ? ' resizing' : ''}`}
          onMouseDown={startResize}
        />
      </aside>
    </>
  )
}
