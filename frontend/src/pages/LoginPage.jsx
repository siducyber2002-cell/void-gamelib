import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ChevronRight, BookOpen, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [glitchText, setGlitchText] = useState('Enter The Void')
  const [videoLoaded, setVideoLoaded] = useState(false)
  const YT_VIDEO_ID = 'f3st1DfrvIc';

  const taglines = [
    'Enter The Void',
    'En73r Th3 V01d',
    'ΞNTΞR THΞ VOID',
    'Enter The Void',
    'Ent3r_The_V0id',
    'Enter The Void',
  ]

  // Glitch tagline animation
  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % taglines.length
      setGlitchText(taglines[idx])
    }, 900)
    return () => clearInterval(interval)
  }, [])


  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome to the Void 🌀')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const lm = !darkMode // light mode shorthand

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

        /* ── YouTube Video Background ── */
        .yt-bg-wrap {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          background: #000;
        }
        .yt-poster {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(135deg, #1a0a2e 0%, #0d0518 50%, #1a0a2e 100%);
  transition: opacity 0.6s ease;
}
        .yt-bg-wrap iframe {
          position: absolute;
          /* Oversized so the 16:9 video always covers the viewport edge-to-edge */
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 56.25vw;   /* 16:9 ratio */
          min-height: 100vh;
          min-width: 177.78vh; /* 16:9 inverse */
          transform: translate(-50%, -50%);
          border: none;
          pointer-events: none;
        }
        /* Medium dark cinematic overlay — not too light, not too deep */
        .yt-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: rgba(0, 0, 0, 0.52);
          /* Slight purple tint to match VOID brand */
          background: linear-gradient(
            135deg,
            rgba(5, 0, 18, 0.55) 0%,
            rgba(0, 0, 0, 0.48) 50%,
            rgba(8, 2, 20, 0.55) 100%
          );
        }
        /* Vignette on top of overlay */
        .yt-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 30%,
            rgba(0, 0, 0, 0.35) 80%,
            rgba(0, 0, 0, 0.65) 100%
          );
        }

        /* ── MODE TOGGLE ── */
        .mode-toggle {
          position: absolute;
          top: 1.5rem;
          right: 1.6rem;
          z-index: 20;
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
          z-index: 2;
        }

        /* ── VOID LOGO ── */
        .void-logo-wrap {
          display: flex;
          align-items: center;
          gap: 0px;
          text-decoration: none;
          user-select: none;
        }

        .void-logo-svg-wrap {
          display: flex;
          align-items: center;
        }

        /* The VOID text logo — exact match to brand */
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
          font-style: bold;
          color: ${lm ? '#2a1060' : '#d8d0f0'};
          text-shadow: ${lm ? '1px 2px 8px rgba(80,40,160,0.18)' : '0 0 24px rgba(200,160,255,0.35), 2px 4px 16px rgba(0,0,0,0.8)'};
          letter-spacing: 0em;
          line-height: 1;
          /* Metallic silver effect */
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
        /* Orbital rings around the O — CSS animated */
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

        /* Scanning tech line that sweeps around the O */
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
        .wm-d {
          flex-shrink: 0;
          line-height: 1;
        }

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
          width: min(440px, 42%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 2;
        }

        .login-card {
          width: 100%;
          background: ${lm
            ? 'rgba(255,252,255,0.88)'
            : 'rgba(10, 4, 24, 0.84)'};
          border: 1px solid ${lm
            ? 'rgba(124,58,237,0.3)'
            : 'rgba(147,51,234,0.28)'};
          border-radius: 18px;
          padding: 2.6rem 2.2rem;
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
          margin: 1.5rem 0;
          transition: background 0.3s;
        }

        /* Fields */
        .field-wrap { margin-bottom: 1rem; }
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
          padding: 0.75rem 0.75rem 0.75rem 0;
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

        .row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.4rem;
        }
        .remember-wrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          cursor: pointer;
        }
        .remember-check {
          width: 15px; height: 15px;
          accent-color: #7c3aed;
          cursor: pointer;
        }
        .remember-label {
          color: ${lm ? 'rgba(80,30,160,0.65)' : 'rgba(200,185,230,0.6)'};
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.02em;
          user-select: none;
          transition: color 0.3s;
        }
        .forgot-link {
          color: #a855f7;
          font-size: 0.82rem;
          font-weight: 500;
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }
        .forgot-link:hover { color: #c084fc; text-decoration: underline; }

        .login-btn {
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
        }
        .login-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.08) 100%);
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          box-shadow: 0 6px 36px rgba(124,58,237,0.7);
          transform: translateY(-1px);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .or-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.25rem 0;
        }
        .or-line { flex: 1; height: 1px; background: ${lm ? 'rgba(124,58,237,0.18)' : 'rgba(147,51,234,0.2)'}; transition: background 0.3s; }
        .or-text {
          color: ${lm ? 'rgba(80,30,160,0.4)' : 'rgba(180,160,220,0.4)'};
          font-size: 0.75rem;
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.1em;
          transition: color 0.3s;
        }

        .oauth-row { display: flex; gap: 0.6rem; }
        .oauth-btn {
          flex: 1;
          padding: 0.6rem 0.4rem;
          background: ${lm ? 'rgba(124,58,237,0.05)' : 'rgba(255,255,255,0.04)'};
          border: 1px solid ${lm ? 'rgba(124,58,237,0.2)' : 'rgba(147,51,234,0.2)'};
          border-radius: 8px;
          color: ${lm ? 'rgba(50,20,120,0.8)' : 'rgba(220,210,240,0.8)'};
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          letter-spacing: 0.03em;
          transition: all 0.2s;
        }
        .oauth-btn:hover {
          background: rgba(147,51,234,0.1);
          border-color: rgba(147,51,234,0.45);
        }
        .oauth-icon { width: 16px; height: 16px; }

        .signup-row {
          text-align: center;
          margin-top: 1.4rem;
          color: ${lm ? 'rgba(60,20,130,0.5)' : 'rgba(180,160,220,0.5)'};
          font-size: 0.85rem;
          font-weight: 300;
          transition: color 0.3s;
        }
        .signup-link {
          color: #a855f7;
          font-weight: 600;
          text-decoration: none;
          margin-left: 0.3rem;
        }
        .signup-link:hover { color: #c084fc; text-decoration: underline; }

        /* ── TECH ANIMATIONS ── */

        /* Scan line sweep over the whole page */
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


        /* Corner tech brackets on left panel */
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

        /* Pulsing data readout text */
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

        /* Logo container subtle pulse */
        .void-logo-wrap {
          animation: logoPulse 4s ease-in-out infinite;
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(147,51,234,0.2)); }
          50% { filter: drop-shadow(0 0 20px rgba(147,51,234,0.45)) drop-shadow(0 0 40px rgba(109,40,217,0.2)); }
        }

        /* Responsive */
        @media (max-width: 900px) {
          .void-root { flex-direction: column; overflow-y: auto; overflow-x: hidden; }

          /* Instead of hiding the logo, show a compact centered header */
          .left-panel {
            display: flex;
            flex: none;
            flex-direction: column;
            align-items: center;
            padding: 1.75rem 1rem 0.5rem;
          }
          .tech-corner, .tech-readout { display: none; }

          .void-logo-wrap { justify-content: center; }
          .wm-v { font-size: 2.1rem; margin-right: 2px; }
          .wm-o-wrap { width: 42px; height: 42px; }
          .wm-o-wrap svg { width: 42px; height: 42px; }
          .wm-o-wrap .orb-ring-1 { width: 50px; height: 50px; }
          .wm-o-wrap .orb-ring-2 { width: 58px; height: 58px; }
          .wm-o-wrap .orb-ring-3 { width: 66px; height: 66px; }
          .wm-o-wrap .orb-scanner { width: 50px; height: 50px; }
          .wm-i-wrap { width: 27px; height: 33px; margin: 0 2px; }
          .wm-i-wrap svg { width: 27px; height: 33px; }
          .wm-d svg { width: 48px; height: 37px; }

          .left-tagline {
            margin-top: 0.85rem;
            margin-bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .glitch-title { font-size: 1.35rem; }
          .glitch-sub { font-size: 0.68rem; line-height: 1.6; }
          .explore-btn { margin-top: 1rem; }

          .right-panel {
            width: 100%;
            min-height: auto;
            align-items: flex-start;
            padding: 0.5rem 1.25rem 2rem;
          }
        }
        @media (max-width: 480px) {
          .left-panel { padding: 1.4rem 1rem 0.25rem; }
          .glitch-title { font-size: 1.15rem; }
          .glitch-sub { font-size: 0.63rem; }
          .explore-btn { margin-top: 0.75rem; padding: 0.55rem 1.1rem; font-size: 0.6rem; }

          .login-card { padding: 1.6rem 1.3rem; border-radius: 14px; }
          .card-title { font-size: 1.15rem; }
          .card-subtitle { font-size: 0.78rem; }
          .divider { margin: 1rem 0; }
          .field-wrap { margin-bottom: 0.75rem; }
          .field-icon { width: 36px; height: 36px; }
          .field-input { font-size: 0.9rem; padding: 0.6rem 0.6rem 0.6rem 0; }
          .row-between { margin-bottom: 1.1rem; }
          .login-btn { padding: 0.75rem 1rem; }
          .or-row { margin: 1rem 0; }
          .mode-toggle { top: 1rem; right: 1rem; }
        }
      `}</style>

      <div className="void-root" style={{ background: lm ? '#04030a' : '#04030a' }}>
        {/* ── YouTube Video Background ── */}
        <div className="yt-bg-wrap">
  <div className="yt-poster" style={{ opacity: videoLoaded ? 0 : 1 }} />
  <iframe
    src={`https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YT_VIDEO_ID}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=1`}
    title="Background Video"
    allow="autoplay; encrypted-media"
    allowFullScreen={false}
    onLoad={() => setVideoLoaded(true)}
    style={{ opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
  />
</div>
        {/* Medium cinematic overlay */}
        <div className="yt-overlay" />



        {/* Dark/Light toggle */}
        <button
          className="mode-toggle"
          onClick={() => setDarkMode(d => !d)}
          aria-label="Toggle dark/light mode"
        >
          <div className="mode-toggle-knob">
            {darkMode ? <Moon size={11} /> : <Sun size={11} />}
          </div>
        </button>

        {/* ── Left Panel ── */}
        <div className="left-panel">
          {/* Tech corner brackets */}
          <span className="tech-corner tl" />
          <span className="tech-corner bl" />

          {/* Data readout */}
          <div className="tech-readout" style={{ top: 'auto', bottom: '3.5rem', right: '2.5rem', left: 'auto' }}>
            SYS::VOID_v2.1<br />
            AUTH::PORTAL_ACTIVE<br />
            NODE::{'0x' + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0')}
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
                    {/* Spiral swirl gradient */}
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

                  {/* Swirling nebula arms — static background swirl */}
                  <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />

                  {/* Deep void core */}
                  <circle cx="36" cy="36" r="22" fill={lm ? '#2a1060' : '#050507'} />

                  {/* Main photon ring — bright glowing purple circle */}
                  <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter="url(#glowStrong)" />
                  {/* Secondary inner ring */}
                  <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
                  {/* Highlight arc — bright hot spot like in logo */}
                  <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glowFilter)" />
                  <path d="M 20 31 A 18 18 0 0 1 36 17" stroke="rgba(232,180,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                  {/* Outer glow rim */}
                  <circle cx="36" cy="36" r="28" stroke="#6d28d9" strokeWidth="6" fill="none" opacity="0.25" />
                  <circle cx="36" cy="36" r="30" stroke="#4c1d95" strokeWidth="4" fill="none" opacity="0.12" />

                  {/* Tiny star particles inside swirl */}
                  <circle cx="24" cy="20" r="1" fill="#c084fc" opacity="0.7" />
                  <circle cx="48" cy="18" r="0.8" fill="#a855f7" opacity="0.5" />
                  <circle cx="52" cy="40" r="1.2" fill="#c084fc" opacity="0.6" />
                  <circle cx="20" cy="50" r="0.9" fill="#9333ea" opacity="0.5" />
                  <circle cx="42" cy="58" r="0.7" fill="#a855f7" opacity="0.4" />
                </svg>
              </span>

              {/* ── I ── joystick: purple ball, thin silver stick, wide rounded silver base with purple LED */}
              <span className="wm-i-wrap">
                <svg width="52" height="72" viewBox="0 0 52 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                  <defs>
                    {/* Joystick ball: purple sphere with highlight */}
                    <radialGradient id="joyBall" cx="38%" cy="28%" r="62%">
                      <stop offset="0%" stopColor="#d8a8ff" />
                      <stop offset="35%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#5b21b6" />
                    </radialGradient>
                    {/* Base gradient: silver/white */}
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

                  {/* Ball glow aura */}
                  <circle cx="26" cy="16" r="13" fill="#7c3aed" opacity="0.25" />
                  {/* Joystick ball */}
                  <circle cx="26" cy="16" r="11" fill="url(#joyBall)" filter="url(#ballGlow)" />
                  {/* Ball specular highlight */}
                  <ellipse cx="22" cy="11" rx="4" ry="3" fill="rgba(255,255,255,0.35)" />
                  {/* Ball bottom shadow */}
                  <ellipse cx="28" cy="22" rx="3.5" ry="2" fill="rgba(60,0,120,0.3)" />

                  {/* Stick — narrow, tapered */}
                  <rect x="23" y="26" width="6" height="20" rx="3" fill="url(#joyStick)" />
                  {/* Stick shadow line */}
                  <rect x="27" y="26" width="2" height="20" rx="1" fill="rgba(100,80,160,0.25)" />

                  {/* Base body — wide rounded rectangle, silver/white */}
                  <rect x="4" y="46" width="44" height="20" rx="6" fill="url(#joyBase)" />
                  {/* Base top highlight */}
                  <rect x="6" y="47" width="40" height="4" rx="3" fill="rgba(255,255,255,0.55)" />
                  {/* Base side shadow */}
                  <rect x="4" y="58" width="44" height="8" rx="4" fill="rgba(0,0,0,0.18)" />
                  {/* Base bottom edge */}
                  <rect x="6" y="62" width="40" height="3" rx="2" fill="rgba(80,60,120,0.15)" />

                  {/* Purple LED slot in center of base */}
                  <rect x="20" y="53" width="12" height="5" rx="2.5" fill="#1a0040" />
                  <rect x="21" y="54" width="10" height="3" rx="1.5" fill="#a855f7" opacity="0.9" style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />
                  {/* LED glow */}
                  <rect x="20" y="53" width="12" height="5" rx="2.5" fill="rgba(168,85,247,0.3)" style={{ filter: 'blur(2px)' }} />
                </svg>
              </span>

              {/* ── D ── game controller: dark body, silver D-border, D-pad left, 2 purple circles right */}
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

                  {/* Silver D-shaped outer border frame */}
                  <path d="M 4 6 H 46 Q 86 6 86 36 Q 86 66 46 66 H 4 Z" fill="url(#ctrlBorder)" />
                  {/* Dark body inset */}
                  <path d="M 8 11 H 45 Q 80 11 80 36 Q 80 61 45 61 H 8 Z" fill="url(#ctrlBody)" />
                  {/* Inner body highlight */}
                  <path d="M 10 13 H 44 Q 74 13 76 30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" strokeLinecap="round" />

                  {/* D-pad cross — left side */}
                  {/* Vertical bar */}
                  <rect x="21" y="26" width="8" height="20" rx="2" fill="#505060" />
                  {/* Horizontal bar */}
                  <rect x="16" y="31" width="18" height="10" rx="2" fill="#505060" />
                  {/* D-pad center */}
                  <rect x="21" y="31" width="8" height="10" rx="1" fill="#404050" />
                  {/* D-pad top arrow hint */}
                  <path d="M25 28 L23 31 L27 31 Z" fill="#707080" />
                  {/* D-pad bottom arrow */}
                  <path d="M25 44 L23 41 L27 41 Z" fill="#707080" />
                  {/* D-pad left arrow */}
                  <path d="M18 36 L21 33 L21 39 Z" fill="#707080" />
                  {/* D-pad right arrow */}
                  <path d="M32 36 L29 33 L29 39 Z" fill="#707080" />

                  {/* Purple button circles — right side (2 visible like in logo) */}
                  {/* Top button */}
                  <circle cx="62" cy="26" r="8" fill="#1a0040" />
                  <circle cx="62" cy="26" r="7" fill="url(#btnPurple1)" filter="url(#btnGlow)" />
                  <ellipse cx="59.5" cy="23.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.3)" />

                  {/* Bottom button */}
                  <circle cx="62" cy="46" r="8" fill="#1a0040" />
                  <circle cx="62" cy="46" r="7" fill="url(#btnPurple2)" filter="url(#btnGlow)" />
                  <ellipse cx="59.5" cy="43.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.25)" />

                  {/* Small lines / vents on body */}
                  <rect x="40" y="33" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
                  <rect x="40" y="36" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />
                  <rect x="40" y="39" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)" />

                  {/* Outer border top highlight */}
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
              &gt; YOUR ULTIMATE GAME LIBRARY_<br />
              &gt; ALL GAMES. ONE PLACE. INFINITE WORLDS_
              &gt; Developed and Designed by Sid and Subhra
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
          <div className="login-card">
            <div className="card-title">Welcome Back</div>
            <div className="card-subtitle">// log in to continue your journey</div>

            <div className="divider" />

            {/* Email */}
            <div className="field-wrap">
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
                  autoComplete="username"
                  placeholder="Email or Username"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-wrap">
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
                  placeholder="Password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button className="pw-toggle" type="button" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="row-between">
              <label className="remember-wrap">
                <input
                  className="remember-check"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span className="remember-label">Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            {/* Submit */}
            <button
              className="login-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" /> Signing in...</>
              ) : (
                <>Log In <ChevronRight size={15} /></>
              )}
            </button>

            {/* OR */}
            <div className="or-row">
              <div className="or-line" />
              <span className="or-text">OR</span>
              <div className="or-line" />
            </div>

            {/* OAuth */}
            <div className="oauth-row">
              <button className="oauth-btn" type="button">
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord
              </button>

              <button className="oauth-btn" type="button">
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="rgba(220,210,240,0.85)">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
                </svg>
                Steam
              </button>

              <button className="oauth-btn" type="button">
                <svg className="oauth-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
            </div>

            <div className="signup-row">
              Don't have an account?
              <Link to="/register" className="signup-link">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
