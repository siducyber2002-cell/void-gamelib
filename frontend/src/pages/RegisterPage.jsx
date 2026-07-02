import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ChevronRight, BookOpen, Sun, Moon } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [glitchText, setGlitchText] = useState('Join The Void')
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)

  const taglines = [
    'Join The Void',
    'J01n Th3 V01d',
    'JΞIN THΞ VOID',
    'Join The Void',
    'J0in_The_V0id',
    'Join The Void',
  ]

  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % taglines.length
      setGlitchText(taglines[idx])
    }, 900)
    return () => clearInterval(interval)
  }, [])

  // Canvas star + black hole animation (identical to LoginPage)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })

    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const NUM_STARS = 220
    const stars = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.003 + 0.001,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))

    const NUM_SPIRAL = 180
    const spiralParticles = Array.from({ length: NUM_SPIRAL }, (_, i) => ({
      angle: (i / NUM_SPIRAL) * Math.PI * 2,
      radius: 120 + Math.random() * 220,
      speed: (Math.random() * 0.003 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.7 + 0.2,
      arm: Math.floor(Math.random() * 3),
    }))

    let t = 0

    const ring_color = (arm) => {
      if (arm === 0) return '147,51,234'
      if (arm === 1) return '168,85,247'
      return '192,132,252'
    }

    const draw = () => {
      t += 0.012
      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = darkMode ? '#050507' : '#f0ecff'
      ctx.fillRect(0, 0, W, H)

      const cx = W * 0.32
      const cy = H * 0.5

      stars.forEach(s => {
        s.twinkleOffset += s.speed
        const alpha = (Math.sin(s.twinkleOffset) * 0.5 + 0.5) * (darkMode ? 0.9 : 0.3)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${darkMode ? '200,180,255' : '100,60,180'},${alpha})`
        ctx.fill()
      })

      for (let ring = 6; ring >= 0; ring--) {
        const rInner = 90 + ring * 45
        const rOuter = rInner + 38
        const gradient = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter)
        const intensities = [0.55, 0.45, 0.35, 0.28, 0.2, 0.13, 0.07]
        const intensity = intensities[ring] * (darkMode ? 1 : 0.7)
        gradient.addColorStop(0, `rgba(147,51,234,${intensity})`)
        gradient.addColorStop(0.4, `rgba(109,40,217,${intensity * 0.6})`)
        gradient.addColorStop(1, `rgba(76,29,149,0)`)
        ctx.beginPath()
        ctx.arc(cx, cy, rOuter, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      spiralParticles.forEach(p => {
        p.angle += p.speed
        const armOffset = (p.arm / 3) * Math.PI * 2
        const wobble = Math.sin(p.angle * 2 + t) * 18
        const r = p.radius + wobble
        const spiral = p.angle * 0.35 + armOffset
        const px = cx + Math.cos(spiral) * r
        const py = cy + Math.sin(spiral) * r * 0.42

        const distFromCenter = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        const fade = Math.max(0, 1 - distFromCenter / 400)

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${ring_color(p.arm)},${p.alpha * fade * (darkMode ? 1 : 0.8)})`
        ctx.fill()
      })

      const orbitals = [
        { a: 210, b: 58,  tilt: -28,  speed: 0.38,  color: '192,132,252', trailColor: '168,85,247',  phaseOffset: 0 },
        { a: 190, b: 52,  tilt:  52,  speed: -0.28, color: '147,51,234',  trailColor: '109,40,217',  phaseOffset: 2.1 },
        { a: 230, b: 46,  tilt:  90,  speed: 0.22,  color: '216,180,254', trailColor: '192,132,252', phaseOffset: 4.2 },
      ]

      orbitals.forEach(orb => {
        const angle = t * orb.speed + orb.phaseOffset
        const tiltRad = (orb.tilt * Math.PI) / 180

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tiltRad)
        ctx.beginPath()
        ctx.ellipse(0, 0, orb.a, orb.b, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${orb.color},${darkMode ? 0.13 : 0.09})`
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.restore()

        const trailSteps = 28
        for (let s = 0; s < trailSteps; s++) {
          const trailAngle = angle - (s * 0.045)
          const tx2 = Math.cos(trailAngle) * orb.a
          const ty2 = Math.sin(trailAngle) * orb.b
          const rotX = tx2 * Math.cos(tiltRad) - ty2 * Math.sin(tiltRad)
          const rotY = tx2 * Math.sin(tiltRad) + ty2 * Math.cos(tiltRad)
          const trailAlpha = ((trailSteps - s) / trailSteps) * 0.55 * (darkMode ? 1 : 0.7)
          const trailSize = 2.5 * ((trailSteps - s) / trailSteps)
          ctx.beginPath()
          ctx.arc(cx + rotX, cy + rotY, trailSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${orb.trailColor},${trailAlpha})`
          ctx.fill()
        }

        const px2 = Math.cos(angle) * orb.a
        const py2 = Math.sin(angle) * orb.b
        const rotPx = px2 * Math.cos(tiltRad) - py2 * Math.sin(tiltRad)
        const rotPy = px2 * Math.sin(tiltRad) + py2 * Math.cos(tiltRad)

        const pGlow = ctx.createRadialGradient(cx + rotPx, cy + rotPy, 0, cx + rotPx, cy + rotPy, 14)
        pGlow.addColorStop(0, `rgba(${orb.color},0.6)`)
        pGlow.addColorStop(1, `rgba(${orb.color},0)`)
        ctx.beginPath()
        ctx.arc(cx + rotPx, cy + rotPy, 14, 0, Math.PI * 2)
        ctx.fillStyle = pGlow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(cx + rotPx, cy + rotPy, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${orb.color},${0.85 + Math.sin(t * 3 + orb.phaseOffset) * 0.15})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(cx + rotPx, cy + rotPy, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,0.9)`
        ctx.fill()
      })

      const ringGlow = ctx.createRadialGradient(cx, cy, 82, cx, cy, 100)
      ringGlow.addColorStop(0, `rgba(147,51,234,0)`)
      ringGlow.addColorStop(0.5, `rgba(168,85,247,${0.55 + Math.sin(t * 1.2) * 0.15})`)
      ringGlow.addColorStop(1, `rgba(147,51,234,0)`)
      ctx.beginPath()
      ctx.arc(cx, cy, 100, 0, Math.PI * 2)
      ctx.fillStyle = ringGlow
      ctx.fill()

      const halo = ctx.createRadialGradient(cx, cy, 95, cx, cy, 320)
      halo.addColorStop(0, `rgba(124,58,237,${0.22 + Math.sin(t * 0.8) * 0.06})`)
      halo.addColorStop(0.4, `rgba(109,40,217,0.1)`)
      halo.addColorStop(1, 'rgba(76,29,149,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 320, 0, Math.PI * 2)
      ctx.fillStyle = halo
      ctx.fill()

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 88)
      core.addColorStop(0, darkMode ? '#000000' : '#1a0040')
      core.addColorStop(0.85, darkMode ? '#020004' : '#0d0030')
      core.addColorStop(1, 'rgba(5,0,10,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 88, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, 90, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(192,132,252,${0.5 + Math.sin(t * 1.5) * 0.2})`
      ctx.lineWidth = 1.5
      ctx.stroke()



      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [darkMode])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      return toast.error("Passwords don't match!")
    }
    setLoading(true)
    try {
      await register({ username: form.username, email: form.email, password: form.password })
      toast.success('Welcome to the Void 🌀')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = () => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }

  const strength = pwStrength()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColors = ['', '#f43f5e', '#f59e0b', '#a855f7', '#7c3aed']
  const strengthColor = strengthColors[strength]

  const lm = !darkMode

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600&family=Share+Tech+Mono&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .void-root {
          min-height: 100vh;
          display: flex;
          overflow: hidden;
          position: relative;
          font-family: 'Rajdhani', sans-serif;
          transition: background 0.4s;
        }

        .void-canvas {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          will-change: transform;
        }

        /* ── MODE TOGGLE ── */
        .mode-toggle {
          position: absolute;
          top: 1.5rem;
          right: 1.6rem;
          z-index: 10;
          width: 54px;
          height: 28px;
          background: ${lm ? 'rgba(124,58,237,0.15)' : 'rgba(20,0,40,0.6)'};
          border: 1px solid ${lm ? 'rgba(124,58,237,0.4)' : 'rgba(168,85,247,0.35)'};
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 3px;
          transition: all 0.35s;
          backdrop-filter: blur(8px);
        }
        .mode-toggle-knob {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateX(${lm ? '26px' : '0px'});
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 0 8px rgba(168,85,247,0.7);
          color: #fff;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 3rem;
          position: relative;
          z-index: 1;
        }

        /* ── VOID LOGO ── */
        .void-logo-wrap {
          display: flex;
          align-items: center;
          gap: 0px;
          text-decoration: none;
          user-select: none;
          animation: logoPulse 4s ease-in-out infinite;
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(147,51,234,0.2)); }
          50% { filter: drop-shadow(0 0 20px rgba(147,51,234,0.45)) drop-shadow(0 0 40px rgba(109,40,217,0.2)); }
        }

        .void-logo-svg-wrap { display: flex; align-items: center; }

        .void-wordmark {
          display: flex;
          align-items: center;
          gap: 1px;
          line-height: 1;
        }
        .wm-v {
          font-family: 'Orbitron', sans-serif;
          font-size: 3.9rem;
          font-weight: 900;
          color: ${lm ? '#2a1060' : '#d8d0f0'};
          text-shadow: ${lm ? '1px 2px 8px rgba(80,40,160,0.18)' : '0 0 24px rgba(200,160,255,0.35), 2px 4px 16px rgba(0,0,0,0.8)'};
          letter-spacing: 0em;
          line-height: 1;
          background: ${lm
            ? 'linear-gradient(170deg, #7c60c0 0%, #3a206a 40%, #7c60c0 70%, #2a1060 100%)'
            : 'linear-gradient(170deg, #ffffff 0%, #b0a0d8 30%, #e8e0ff 55%, #8070b0 80%, #d0c8f0 100%)'};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-right: 4px;
        }
        .wm-o-wrap {
          position: relative;
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wm-o-wrap .orb-ring {
          position: absolute;
          border-radius: 40%;
          border-style: solid;
          border-color: transparent;
          pointer-events: none;
        }
        .wm-o-wrap .orb-ring-1 {
          width: 88px; height: 88px;
          border-top-color: rgba(147,51,234,0.55);
          border-right-color: rgba(147,51,234,0.2);
          border-width: 1.5px;
          animation: orbSpin1 8s linear infinite;
        }
        .wm-o-wrap .orb-ring-2 {
          width: 102px; height: 102px;
          border-bottom-color: rgba(109,40,217,0.45);
          border-left-color: rgba(109,40,217,0.15);
          border-width: 1px;
          animation: orbSpin1 14s linear infinite reverse;
        }
        .wm-o-wrap .orb-ring-3 {
          width: 116px; height: 116px;
          border-top-color: rgba(168,85,247,0.3);
          border-right-color: rgba(168,85,247,0.08);
          border-width: 1px;
          animation: orbSpin1 22s linear infinite;
        }
        @keyframes orbSpin1 { to { transform: rotate(360deg); } }

        .wm-o-wrap .orb-scanner {
          position: absolute;
          width: 88px; height: 88px;
          border-radius: 50%;
          border: 1px solid transparent;
          border-top-color: rgba(192,132,252,0.9);
          animation: orbSpin1 3.5s linear infinite;
          filter: blur(0.5px);
        }

        .wm-i-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 45px;
          height: 55px;
          margin: 0 4px;
          flex-shrink: 0;
        }
        .wm-d { flex-shrink: 0; line-height: 1; }

        /* ── LEFT TAGLINE ── */
        .left-tagline {
          margin-top: auto;
          margin-bottom: 3.5rem;
        }

        .glitch-title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1.8rem, 3.2vw, 3rem);
          font-weight: 900;
          color: ${lm ? '#1a0040' : '#ffffff'};
          letter-spacing: 0.06em;
          line-height: 1.1;
          text-transform: uppercase;
          position: relative;
          display: inline-block;
          font-variant-numeric: tabular-nums;
          text-shadow: ${lm ? 'none' : '0 0 30px rgba(168,85,247,0.4)'};
          transition: color 0.3s;
        }

        .glitch-sub {
          font-family: 'Share Tech Mono', monospace;
          font-size: clamp(0.75rem, 1.1vw, 0.92rem);
          color: ${lm ? 'rgba(80,30,160,0.7)' : 'rgba(192,132,252,0.75)'};
          margin-top: 1rem;
          letter-spacing: 0.07em;
          line-height: 1.8;
          animation: textBlink 3.5s steps(1) infinite;
        }

        @keyframes textBlink {
          0%, 94%, 100% { opacity: 1; }
          95%, 97% { opacity: 0.3; }
          96%, 98% { opacity: 1; }
          99% { opacity: 0.5; }
        }

        .glitch-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #a855f7;
          margin-left: 3px;
          animation: cursorBlink 1.1s steps(1) infinite;
          vertical-align: text-bottom;
        }
        @keyframes cursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        .explore-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 2rem;
          padding: 0.7rem 1.4rem;
          border: 1px solid ${lm ? 'rgba(124,58,237,0.5)' : 'rgba(147,51,234,0.7)'};
          border-radius: 4px;
          background: ${lm ? 'rgba(124,58,237,0.06)' : 'rgba(147,51,234,0.08)'};
          color: ${lm ? '#7c3aed' : '#a855f7'};
          font-family: 'Orbitron', sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }
        .explore-btn:hover {
          background: rgba(147,51,234,0.18);
          border-color: #a855f7;
          box-shadow: 0 0 22px rgba(147,51,234,0.3);
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          width: min(480px, 46%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }

        .register-card {
          width: 100%;
          background: ${lm
            ? 'rgba(255,252,255,0.88)'
            : 'rgba(10, 4, 24, 0.84)'};
          border: 1px solid ${lm
            ? 'rgba(124,58,237,0.3)'
            : 'rgba(147,51,234,0.28)'};
          border-radius: 18px;
          padding: 2.2rem 2.2rem;
          backdrop-filter: blur(28px);
          box-shadow: ${lm
            ? '0 8px 60px rgba(124,58,237,0.12), 0 2px 12px rgba(0,0,0,0.06)'
            : '0 0 0 1px rgba(147,51,234,0.1), 0 32px 80px rgba(0,0,0,0.75), 0 0 60px rgba(100,20,180,0.12)'};
          transition: background 0.4s, border-color 0.4s, box-shadow 0.4s;
        }

        .card-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: ${lm ? '#1a0040' : '#ffffff'};
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-align: center;
          transition: color 0.3s;
        }
        .card-subtitle {
          text-align: center;
          color: ${lm ? 'rgba(80,30,160,0.55)' : 'rgba(200,185,230,0.55)'};
          font-size: 0.9rem;
          font-weight: 300;
          margin-top: 0.35rem;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.04em;
          transition: color 0.3s;
        }

        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, ${lm ? 'rgba(124,58,237,0.3)' : 'rgba(147,51,234,0.35)'}, transparent);
          margin: 1.2rem 0;
          transition: background 0.3s;
        }

        /* Fields */
        .field-wrap { margin-bottom: 0.85rem; }
        .field-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          color: ${lm ? 'rgba(80,30,160,0.6)' : 'rgba(192,132,252,0.6)'};
          text-transform: uppercase;
          margin-bottom: 0.35rem;
          display: block;
          transition: color 0.3s;
        }
        .field-inner {
          position: relative;
          display: flex;
          align-items: center;
          background: ${lm ? 'rgba(124,58,237,0.04)' : 'rgba(255,255,255,0.04)'};
          border: 1px solid ${lm ? 'rgba(124,58,237,0.2)' : 'rgba(147,51,234,0.22)'};
          border-radius: 8px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.3s;
        }
        .field-inner:focus-within {
          border-color: rgba(147,51,234,0.7);
          box-shadow: 0 0 0 3px rgba(147,51,234,0.12);
          background: ${lm ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.06)'};
        }
        .field-inner.error {
          border-color: rgba(244,63,94,0.6);
          box-shadow: 0 0 0 3px rgba(244,63,94,0.1);
        }
        .field-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          color: rgba(147,51,234,0.6);
          flex-shrink: 0;
        }
        .field-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: ${lm ? '#1a0040' : '#e2d9f3'};
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.97rem;
          font-weight: 500;
          padding: 0.72rem 0.75rem 0.72rem 0;
          letter-spacing: 0.03em;
          transition: color 0.3s;
        }
        .field-input::placeholder { color: ${lm ? 'rgba(80,30,160,0.3)' : 'rgba(180,160,220,0.35)'}; }
        .pw-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(147,51,234,0.5);
          padding: 0 12px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .pw-toggle:hover { color: #a855f7; }

        /* Password strength */
        .strength-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.45rem;
        }
        .strength-bars {
          display: flex;
          gap: 3px;
          flex: 1;
        }
        .strength-bar {
          flex: 1;
          height: 3px;
          border-radius: 999px;
          transition: background 0.3s;
        }
        .strength-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          min-width: 36px;
          text-align: right;
          transition: color 0.3s;
        }

        /* Error hint */
        .field-error {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          color: #f43f5e;
          margin-top: 0.3rem;
          letter-spacing: 0.06em;
        }

        /* Register button */
        .register-btn {
          width: 100%;
          padding: 0.9rem 1rem;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #7c3aed, #9333ea);
          color: #fff;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 24px rgba(124,58,237,0.45);
          position: relative;
          overflow: hidden;
          margin-top: 0.4rem;
        }
        .register-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.08) 100%);
        }
        .register-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          box-shadow: 0 6px 36px rgba(124,58,237,0.7);
          transform: translateY(-1px);
        }
        .register-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .signin-row {
          text-align: center;
          margin-top: 1.2rem;
          color: ${lm ? 'rgba(60,20,130,0.5)' : 'rgba(180,160,220,0.5)'};
          font-size: 0.85rem;
          font-weight: 300;
          transition: color 0.3s;
        }
        .signin-link {
          color: #a855f7;
          font-weight: 600;
          text-decoration: none;
          margin-left: 0.3rem;
        }
        .signin-link:hover { color: #c084fc; text-decoration: underline; }

        /* ── TECH ANIMATIONS ── */
        .void-root::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 5;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(147,51,234,0.018) 3px,
            rgba(147,51,234,0.018) 4px
          );
          animation: scanMove 12s linear infinite;
        }
        @keyframes scanMove {
          0% { background-position: 0 0; }
          100% { background-position: 0 200px; }
        }


        .tech-corner {
          position: absolute;
          width: 24px;
          height: 24px;
          pointer-events: none;
          opacity: ${lm ? '0.4' : '0.6'};
        }
        .tech-corner.tl { top: 2.2rem; left: 2.8rem; border-top: 2px solid #7c3aed; border-left: 2px solid #7c3aed; }
        .tech-corner.tr { top: 2.2rem; right: 2rem; border-top: 2px solid #7c3aed; border-right: 2px solid #7c3aed; }
        .tech-corner.bl { bottom: 3rem; left: 2.8rem; border-bottom: 2px solid #7c3aed; border-left: 2px solid #7c3aed; }
        .tech-corner.br { bottom: 3rem; right: 2rem; border-bottom: 2px solid #7c3aed; border-right: 2px solid #7c3aed; }

        .tech-readout {
          position: absolute;
          top: 2.6rem;
          right: 2.5rem;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.6rem;
          color: rgba(147,51,234,${lm ? '0.5' : '0.4'});
          letter-spacing: 0.08em;
          line-height: 1.6;
          text-align: right;
          animation: dataFlicker 4s steps(1) infinite;
          pointer-events: none;
        }
        @keyframes dataFlicker {
          0%, 88%, 100% { opacity: 1; }
          89%, 91% { opacity: 0.2; }
          90%, 92% { opacity: 1; }
          95% { opacity: 0.5; }
          96% { opacity: 1; }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .void-root { overflow-y: auto; overflow-x: hidden; }
          .left-panel { display: none; }
          .right-panel {
            width: 100%;
            min-height: 100vh;
            align-items: flex-start;
            padding: 4.5rem 1.25rem 2rem;
          }
        }
        @media (max-width: 480px) {
          .register-card { padding: 1.75rem 1.3rem; border-radius: 14px; }
          .card-title { font-size: 1.15rem; }
          .card-subtitle { font-size: 0.78rem; }
          .divider { margin: 1rem 0; }
          .field-wrap { margin-bottom: 0.7rem; }
          .field-icon { width: 38px; height: 38px; }
          .field-input { font-size: 0.92rem; }
          .mode-toggle { top: 1rem; right: 1rem; }
        }
      `}</style>

      <div className="void-root" style={{ background: lm ? '#f0ecff' : '#050507' }}>
        {/* Canvas background */}
        <canvas ref={canvasRef} className="void-canvas" />



        {/* Dark/Light toggle */}
        <button className="mode-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle theme">
          <div className="mode-toggle-knob">
            {darkMode ? <Moon size={11} /> : <Sun size={11} />}
          </div>
        </button>

        {/* ── Left Panel ── */}
        <div className="left-panel">
          {/* Tech corners */}
          <div className="tech-corner tl" />
          <div className="tech-corner bl" />

          {/* Data readout */}
          <div className="tech-readout" style={{ top: 'auto', bottom: '3.5rem', right: '2.5rem', left: 'auto' }}>
            SYS::VOID_v2.1<br />
            AUTH::PORTAL_ACTIVE<br />
            REG::{'0x' + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0')}
          </div>

          {/* VOID Logo — pixel-accurate brand match */}
          <a href="/" className="void-logo-wrap">
            <div className="void-wordmark">

              {/* ── V ── metallic silver italic */}
              <span className="wm-v">V</span>

              {/* ── O ── glowing purple black hole portal with orbital rings */}
              <span className="wm-o-wrap">
                {/* Animated orbital rings (CSS) */}
                <span className="orb-ring orb-ring-1" />
                <span className="orb-ring orb-ring-2" />
                <span className="orb-ring orb-ring-3" />
                <span className="orb-scanner" />

                <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1, overflow: 'visible' }}>
                  <defs>
                    <radialGradient id="voidGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#000000" />
                      <stop offset="55%" stopColor="#1a0040" />
                      <stop offset="80%" stopColor="#3b0d7a" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                      <stop offset="60%" stopColor="#9333ea" stopOpacity="0.9" />
                      <stop offset="85%" stopColor="#7c3aed" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glowFilter">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="glowStrong">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>

                  {/* Outer diffuse glow aura */}
                  <circle cx="36" cy="36" r="32" fill="url(#voidGlow)" opacity="0.7" />

                  {/* Swirling nebula arms */}
                  <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />

                  {/* Deep void core */}
                  <circle cx="36" cy="36" r="22" fill={lm ? '#2a1060' : '#050507'} />

                  {/* Main photon ring */}
                  <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter="url(#glowStrong)" />
                  {/* Secondary inner ring */}
                  <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
                  {/* Highlight arc */}
                  <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glowFilter)" />
                  <path d="M 20 31 A 18 18 0 0 1 36 17" stroke="rgba(232,180,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                  {/* Outer glow rim */}
                  <circle cx="36" cy="36" r="28" stroke="#6d28d9" strokeWidth="6" fill="none" opacity="0.25" />
                  <circle cx="36" cy="36" r="30" stroke="#4c1d95" strokeWidth="4" fill="none" opacity="0.12" />

                  {/* Tiny star particles */}
                  <circle cx="24" cy="20" r="1" fill="#c084fc" opacity="0.7" />
                  <circle cx="48" cy="18" r="0.8" fill="#a855f7" opacity="0.5" />
                  <circle cx="52" cy="40" r="1.2" fill="#c084fc" opacity="0.6" />
                  <circle cx="20" cy="50" r="0.9" fill="#9333ea" opacity="0.5" />
                  <circle cx="42" cy="58" r="0.7" fill="#a855f7" opacity="0.4" />
                </svg>
              </span>

              {/* ── I ── joystick */}
              <span className="wm-i-wrap">
                <svg width="52" height="72" viewBox="0 0 52 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                  <defs>
                    <radialGradient id="joyBall" cx="38%" cy="28%" r="62%">
                      <stop offset="0%" stopColor="#d8a8ff" />
                      <stop offset="35%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#5b21b6" />
                    </radialGradient>
                    <linearGradient id="joyBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8e8f0" />
                      <stop offset="40%" stopColor="#c8c8d8" />
                      <stop offset="100%" stopColor="#a8a8b8" />
                    </linearGradient>
                    <linearGradient id="joyStick" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#aaa8c0" />
                      <stop offset="50%" stopColor="#d0cce0" />
                      <stop offset="100%" stopColor="#aaa8c0" />
                    </linearGradient>
                    <filter id="ballGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <circle cx="26" cy="16" r="13" fill="#7c3aed" opacity="0.25" />
                  <circle cx="26" cy="16" r="11" fill="url(#joyBall)" filter="url(#ballGlow)" />
                  <ellipse cx="22" cy="11" rx="4" ry="3" fill="rgba(255,255,255,0.35)" />
                  <ellipse cx="28" cy="22" rx="3.5" ry="2" fill="rgba(60,0,120,0.3)" />
                  <rect x="23" y="26" width="6" height="20" rx="3" fill="url(#joyStick)" />
                  <rect x="27" y="26" width="2" height="20" rx="1" fill="rgba(100,80,160,0.25)" />
                  <rect x="4" y="46" width="44" height="20" rx="6" fill="url(#joyBase)" />
                  <rect x="6" y="47" width="40" height="4" rx="3" fill="rgba(255,255,255,0.55)" />
                  <rect x="4" y="58" width="44" height="8" rx="4" fill="rgba(0,0,0,0.18)" />
                  <rect x="6" y="62" width="40" height="3" rx="2" fill="rgba(80,60,120,0.15)" />
                  <rect x="20" y="53" width="12" height="5" rx="2.5" fill="#1a0040" />
                  <rect x="21" y="54" width="10" height="3" rx="1.5" fill="#a855f7" opacity="0.9" style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />
                  <rect x="20" y="53" width="12" height="5" rx="2.5" fill="rgba(168,85,247,0.3)" style={{ filter: 'blur(2px)' }} />
                </svg>
              </span>

              {/* ── D ── game controller */}
              <span className="wm-d">
                <svg width="80" height="62" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="ctrlBody" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lm ? '#3a3060' : '#2e2e3a'} />
                      <stop offset="100%" stopColor={lm ? '#1e1440' : '#1a1a24'} />
                    </linearGradient>
                    <linearGradient id="ctrlBorder" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e8e8f8" />
                      <stop offset="40%" stopColor="#c0b8d8" />
                      <stop offset="100%" stopColor="#a0a0b8" />
                    </linearGradient>
                    <radialGradient id="btnPurple1" cx="35%" cy="30%">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </radialGradient>
                    <radialGradient id="btnPurple2" cx="35%" cy="30%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#5b21b6" />
                    </radialGradient>
                    <filter id="btnGlow">
                      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <path d="M 4 6 H 46 Q 86 6 86 36 Q 86 66 46 66 H 4 Z" fill="url(#ctrlBorder)" />
                  <path d="M 8 11 H 45 Q 80 11 80 36 Q 80 61 45 61 H 8 Z" fill="url(#ctrlBody)" />
                  <path d="M 10 13 H 44 Q 74 13 76 30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <rect x="21" y="26" width="8" height="20" rx="2" fill="#505060" />
                  <rect x="16" y="31" width="18" height="10" rx="2" fill="#505060" />
                  <rect x="21" y="31" width="8" height="10" rx="1" fill="#404050" />
                  <path d="M25 28 L23 31 L27 31 Z" fill="#707080" />
                  <path d="M25 44 L23 41 L27 41 Z" fill="#707080" />
                  <path d="M18 36 L21 33 L21 39 Z" fill="#707080" />
                  <path d="M32 36 L29 33 L29 39 Z" fill="#707080" />
                  <circle cx="62" cy="26" r="8" fill="#1a0040" />
                  <circle cx="62" cy="26" r="7" fill="url(#btnPurple1)" filter="url(#btnGlow)" />
                  <ellipse cx="59.5" cy="23.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.3)" />
                  <circle cx="62" cy="46" r="8" fill="#1a0040" />
                  <circle cx="62" cy="46" r="7" fill="url(#btnPurple2)" filter="url(#btnGlow)" />
                  <ellipse cx="59.5" cy="43.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.25)" />
                  <rect x="40" y="33" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
                  <rect x="40" y="36" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
                  <rect x="40" y="39" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
                  <path d="M 6 10 Q 8 7 16 6.5" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </span>

            </div>
          </a>

          {/* Tagline */}
          <div className="left-tagline">
            <div className="glitch-title">
              {glitchText}
              <span className="glitch-cursor" />
            </div>
            <div className="glitch-sub">
              &gt; CREATE YOUR ACCOUNT TODAY_<br />
              &gt; 50,000+ GAMES. ONE VOID. INFINITE PLAY_
            </div>
            <a href="/library" className="explore-btn">
              <BookOpen size={12} />
              Explore Library
              <ChevronRight size={12} />
            </a>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="right-panel">
          <div className="register-card">
            <div className="card-title">Create Account</div>
            <div className="card-subtitle">// initialize your void profile</div>

            <div className="divider" />

            {/* Username */}
            <div className="field-wrap">
              <label className="field-label">Username</label>
              <div className="field-inner">
                <div className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  className="field-input"
                  type="text"
                  placeholder="CoolGamer123"
                  value={form.username}
                  onChange={update('username')}
                  required
                  minLength={3}
                />
              </div>
            </div>

            {/* Email */}
            <div className="field-wrap">
              <label className="field-label">Email</label>
              <div className="field-inner">
                <div className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="M2 7l10 7 10-7"/>
                  </svg>
                </div>
                <input
                  className="field-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-wrap">
              <label className="field-label">Password</label>
              <div className="field-inner">
                <div className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  className="field-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={update('password')}
                  required
                  minLength={8}
                />
                <button className="pw-toggle" type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="strength-wrap">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{ background: i <= strength ? strengthColor : (lm ? 'rgba(124,58,237,0.12)' : 'rgba(147,51,234,0.15)') }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="field-wrap">
              <label className="field-label">Confirm Password</label>
              <div className={`field-inner${form.confirm_password && form.password !== form.confirm_password ? ' error' : ''}`}>
                <div className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <input
                  className="field-input"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirm_password}
                  onChange={update('confirm_password')}
                  required
                />
                <button className="pw-toggle" type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm_password && form.password !== form.confirm_password && (
                <div className="field-error">&gt; passwords do not match_</div>
              )}
            </div>

            {/* Submit */}
            <button
              className="register-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" /> Initializing...</>
              ) : (
                <>Create Account <ChevronRight size={15} /></>
              )}
            </button>

            <div className="signin-row">
              Already in the void?
              <Link to="/login" className="signin-link">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
