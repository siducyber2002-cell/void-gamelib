import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, ChevronRight,
  Gamepad2, Trophy, Zap,
  User, Mail, Lock, Rocket,
} from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm_password: '',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [overlayText, setOverlayText] = useState('WELCOME TO VOID')
  const [videoLoaded, setVideoLoaded] = useState(false)
  const YT_VIDEO_ID = 'f3st1DfrvIc'
  const darkMode = true

  const overlayVariants = [
    'WELCOME TO VOID',
    'W3LC0ME T0 V01D',
    'WΞLCOMΞ TO VOID',
    'WELCOME TO VOID',
    'W3LC0ME_T0_V01D',
    'WELCOME TO VOID',
  ]

  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % overlayVariants.length
      setOverlayText(overlayVariants[idx])
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      return toast.error("Passwords don't match!")
    }
    if (!agreeTerms) {
      return toast.error('Please agree to the Terms of Service and Privacy Policy')
    }
    setLoading(true)
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
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

  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    const apiBase = import.meta.env.VITE_API_URL || ''
    const next = encodeURIComponent(window.location.origin + '/')
    window.location.href = `${apiBase}/api/auth/google?next=${next}`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .void-root {
          min-height: 100vh;
          display: flex;
          overflow-x: hidden;
          overflow-y: auto;
          position: relative;
          font-family: 'Rajdhani', sans-serif;
          transition: background 0.4s;
        }

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
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 56.25vw;
          min-height: 100vh;
          min-width: 177.78vh;
          transform: translate(-50%, -50%);
          border: none;
          pointer-events: none;
        }
        @supports (height: 100dvh) {
          .void-root { min-height: 100dvh; }
          .yt-bg-wrap iframe { min-height: 100dvh; min-width: 177.78dvh; }
        }
        @media (max-height: 560px) and (orientation: landscape) {
          .void-root { overflow-y: auto; overflow-x: hidden; }
        }

        .yt-overlay {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            135deg,
            rgba(5, 0, 18, 0.55) 0%,
            rgba(0, 0, 0, 0.48) 50%,
            rgba(8, 2, 20, 0.55) 100%
          );
        }
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

        .welcome-glitch {
          position: fixed;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
          display: flex;
          align-items: center;
        }
        .glitch-row {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          animation: marqueeSwing 10s ease-in-out infinite alternate;
          will-change: transform;
        }
        .marquee-track {
          display: inline-block;
          white-space: nowrap;
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: clamp(3.4rem, 11.5vw, 11rem);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .row-base .marquee-track { color: rgba(226,217,243,0.055); }
        .row-r .marquee-track {
          color: rgba(236,72,153,0.09);
          animation: glitchShiftR 4.6s steps(1) infinite;
        }
        .row-c .marquee-track {
          color: rgba(56,189,248,0.09);
          animation: glitchShiftC 4.6s steps(1) infinite;
        }
        @keyframes marqueeSwing {
          from { transform: translateX(-32%); }
          to   { transform: translateX(14%); }
        }
        @keyframes glitchShiftR {
          0%, 91%, 100% { transform: translate(0,0); clip-path: inset(0 0 0 0); opacity: 0; }
          92% { transform: translate(-7px, 3px); clip-path: inset(8% 0 46% 0); opacity: 1; }
          93% { transform: translate(5px, -2px); clip-path: inset(58% 0 4% 0); opacity: 1; }
          94% { transform: translate(-4px, 1px); clip-path: inset(22% 0 52% 0); opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        @keyframes glitchShiftC {
          0%, 90%, 100% { transform: translate(0,0); clip-path: inset(0 0 0 0); opacity: 0; }
          91% { transform: translate(7px, -3px); clip-path: inset(50% 0 12% 0); opacity: 1; }
          92% { transform: translate(-5px, 2px); clip-path: inset(6% 0 62% 0); opacity: 1; }
          93.5% { transform: translate(4px, -1px); clip-path: inset(34% 0 30% 0); opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .glitch-row, .row-r .marquee-track, .row-c .marquee-track { animation: none; }
        }

        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 3rem;
          position: relative;
          z-index: 2;
        }

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

        .hero-block {
          margin-top: auto;
          margin-bottom: 2.2rem;
        }
        .hero-heading {
          display: flex;
          flex-direction: column;
          line-height: 0.95;
        }
        .hero-line1 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: clamp(2.6rem, 5vw, 4.4rem);
          color: #f5f2ff;
          letter-spacing: 0.02em;
          text-shadow: 0 0 30px rgba(200,170,255,0.25);
        }
        .hero-line2 {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          font-size: clamp(2.6rem, 5vw, 4.4rem);
          letter-spacing: 0.02em;
          background: linear-gradient(120deg, #c084fc 0%, #a855f7 40%, #7c3aed 75%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 26px rgba(168,85,247,0.45));
          margin-top: 0.1em;
        }
        .hero-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.85rem;
          font-weight: 400;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(226,217,243,0.85);
          margin-top: 1.5rem;
        }
        .hero-desc {
          font-family: 'Rajdhani', sans-serif;
          font-size: 1.05rem;
          font-weight: 400;
          color: rgba(192,178,220,0.65);
          margin-top: 0.6rem;
          max-width: 400px;
          line-height: 1.5;
        }

        .feature-row {
          display: flex;
          gap: 1.8rem;
          margin-bottom: 1.6rem;
          flex-wrap: wrap;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.7rem;
          max-width: 190px;
        }
        .feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(147,51,234,0.14);
          border: 1px solid rgba(147,51,234,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c084fc;
          flex-shrink: 0;
        }
        .feature-title {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          letter-spacing: 0.03em;
          color: #f0eaff;
          text-transform: uppercase;
        }
        .feature-desc {
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.82rem;
          color: rgba(192,178,220,0.55);
          margin-top: 0.15rem;
          line-height: 1.35;
        }

        .right-panel {
          width: min(500px, 46%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          z-index: 2;
          background: rgba(5,2,12,0.55);
          border-left: 1px solid rgba(147,51,234,0.12);
        }

        .register-card {
          width: 100%;
          background: rgba(10, 4, 24, 0.84);
          border: 1px solid rgba(147,51,234,0.28);
          border-radius: 18px;
          padding: 2rem 2.1rem;
          backdrop-filter: blur(28px);
          box-shadow: 0 0 0 1px rgba(147,51,234,0.1), 0 32px 80px rgba(0,0,0,0.75), 0 0 60px rgba(100,20,180,0.12);
          animation: cardRise 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cardRise {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .register-card { animation: none; }
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-bottom: 1.3rem;
        }
        .card-header-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(147,51,234,0.16);
          border: 1px solid rgba(147,51,234,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c084fc;
          flex-shrink: 0;
        }
        .card-header-text { flex: 1; min-width: 0; }
        .card-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.02em;
        }
        .card-subtitle {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.78rem;
          color: rgba(200,185,230,0.55);
          margin-top: 0.25rem;
        }
        .login-link-top {
          text-align: right;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.78rem;
          color: rgba(200,185,230,0.5);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .login-link-top span {
          display: flex;
          align-items: center;
          gap: 2px;
          color: #a855f7;
          font-weight: 700;
          margin-top: 0.2rem;
        }
        .login-link-top:hover span { color: #c084fc; text-decoration: underline; }

        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(147,51,234,0.35), transparent);
          margin: 1rem 0 1.2rem;
        }

        .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 0.9rem;
          margin-bottom: 0.85rem;
        }
        .field-grid .field-wrap { margin-bottom: 0; min-width: 0; }
        .field-wrap { margin-bottom: 0.85rem; }
        .field-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          color: rgba(192,132,252,0.6);
          text-transform: uppercase;
          margin-bottom: 0.35rem;
          display: block;
        }
        .field-inner {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(147,51,234,0.22);
          border-radius: 8px;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.3s;
        }
        .field-inner:focus-within {
          border-color: rgba(147,51,234,0.7);
          box-shadow: 0 0 0 3px rgba(147,51,234,0.12);
          background: rgba(255,255,255,0.06);
        }
        .field-inner.error {
          border-color: rgba(244,63,94,0.6);
          box-shadow: 0 0 0 3px rgba(244,63,94,0.1);
        }
        .field-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 44px;
          color: rgba(147,51,234,0.6);
          flex-shrink: 0;
        }
        .field-input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: #e2d9f3;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.97rem;
          font-weight: 500;
          padding: 0.72rem 0.75rem 0.72rem 0;
          letter-spacing: 0.03em;
        }
        .field-input::placeholder { color: rgba(180,160,220,0.35); }
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

        .strength-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.45rem;
        }
        .strength-bars { display: flex; gap: 3px; flex: 1; }
        .strength-bar { flex: 1; height: 3px; border-radius: 999px; transition: background 0.3s; }
        .strength-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          min-width: 36px;
          text-align: right;
        }

        .field-error {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.65rem;
          color: #f43f5e;
          margin-top: 0.3rem;
          letter-spacing: 0.06em;
        }

        .terms-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin: 0.3rem 0 1.2rem;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.85rem;
          color: rgba(200,190,225,0.65);
          line-height: 1.4;
        }
        .terms-checkbox {
          width: 17px;
          height: 17px;
          margin-top: 2px;
          accent-color: #9333ea;
          cursor: pointer;
          flex-shrink: 0;
        }
        .terms-link { color: #a855f7; font-weight: 600; text-decoration: none; }
        .terms-link:hover { color: #c084fc; text-decoration: underline; }

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

        .or-row { display: flex; align-items: center; gap: 0.75rem; margin: 1.2rem 0; }
        .or-line { flex: 1; height: 1px; background: rgba(147,51,234,0.2); }
        .or-text {
          font-size: 0.72rem;
          color: rgba(180,160,220,0.4);
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.1em;
        }

        .oauth-row { display: flex; }
        .google-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.97);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 10px;
          color: #1f1f1f;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          letter-spacing: 0.02em;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.25s ease;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        }
        .google-btn::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 10px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(168,85,247,0.6), rgba(124,58,237,0));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.35), 0 0 20px rgba(168,85,247,0.35);
        }
        .google-btn:hover::before { opacity: 1; }
        .google-btn:active { transform: translateY(0); }
        .google-btn:disabled { cursor: default; opacity: 0.75; transform: none; }
        .oauth-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .google-spinner {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(30,30,30,0.2);
          border-top-color: #1f1f1f;
          animation: spin 0.7s linear infinite;
        }

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
          opacity: 0.6;
          z-index: 2;
        }
        .tech-corner.tl { top: 2.2rem; left: 2.8rem; border-top: 2px solid #7c3aed; border-left: 2px solid #7c3aed; }
        .tech-corner.bl { bottom: 3rem; left: 2.8rem; border-bottom: 2px solid #7c3aed; border-left: 2px solid #7c3aed; }

        .tech-readout {
          position: absolute;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.6rem;
          color: rgba(147,51,234,0.4);
          letter-spacing: 0.08em;
          line-height: 1.6;
          text-align: right;
          animation: dataFlicker 4s steps(1) infinite;
          pointer-events: none;
          z-index: 2;
        }
        @keyframes dataFlicker {
          0%, 88%, 100% { opacity: 1; }
          89%, 91% { opacity: 0.2; }
          90%, 92% { opacity: 1; }
          95% { opacity: 0.5; }
          96% { opacity: 1; }
        }

        @media (max-width: 900px) {
          .void-root { flex-direction: column; overflow-y: auto; overflow-x: hidden; }

          .left-panel {
            display: flex;
            flex: none;
            flex-direction: column;
            align-items: center;
            padding: 1.5rem 1rem 0.4rem;
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

          .hero-block {
            margin-top: 0.7rem;
            margin-bottom: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .hero-desc { max-width: 100%; }
          .feature-row { justify-content: center; margin-bottom: 1.2rem; }
          .feature-item { max-width: 150px; }

          .marquee-track { font-size: clamp(2.2rem, 13vw, 5rem); }

          .right-panel {
            width: 100%;
            min-height: auto;
            align-items: flex-start;
            padding: 0.5rem 1.25rem 2rem;
            background: transparent;
            border-left: none;
          }
        }
        @media (max-width: 480px) {
          .card-header { gap: 0.7rem; }
          .login-link-top { width: 100%; text-align: left; margin-top: 0.2rem; }
          .login-link-top span { justify-content: flex-start; }
          .left-panel { padding: 1.2rem 1rem 0.2rem; }
          .hero-line1, .hero-line2 { font-size: 2.2rem; }
          .hero-desc { font-size: 0.9rem; }
          .feature-row { flex-direction: column; align-items: flex-start; gap: 1rem; }

          .register-card { padding: 1.5rem 1.3rem; border-radius: 14px; }
          .card-title { font-size: 1rem; }
          .card-subtitle { font-size: 0.7rem; }
          .field-grid { grid-template-columns: 1fr; gap: 0; }
          .divider { margin: 0.85rem 0 1rem; }
          .field-wrap { margin-bottom: 0.6rem; }
          .field-label { font-size: 0.72rem; }
          .field-icon { width: 34px; height: 34px; }
          .field-input { font-size: 0.9rem; padding-top: 0.55rem; padding-bottom: 0.55rem; }
          .strength-wrap { margin-top: 0.35rem; }
          .register-btn { padding: 0.75rem 1rem; }
        }
      `}</style>

      <div className="void-root" style={{ background: '#04030a' }}>
        <div className="yt-bg-wrap">
          <div
            className="yt-poster"
            style={{ opacity: videoLoaded ? 0 : 1 }}
          />
          <iframe
            src={`https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${YT_VIDEO_ID}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&cc_load_policy=0&playsinline=1&enablejsapi=1`}
            title="Background Video"
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
            onLoad={() => setVideoLoaded(true)}
            style={{ opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.6s ease' }}
          />
        </div>
        <div className="yt-overlay" />

        <div className="welcome-glitch" aria-hidden="true">
          <div className="glitch-row row-base">
            <span className="marquee-track">{overlayText}</span>
          </div>
          <div className="glitch-row row-r">
            <span className="marquee-track">{overlayText}</span>
          </div>
          <div className="glitch-row row-c">
            <span className="marquee-track">{overlayText}</span>
          </div>
        </div>

        <div className="left-panel">
          <div className="tech-corner tl" />
          <div className="tech-corner bl" />

          <div className="tech-readout" style={{ top: 'auto', bottom: '3.5rem', right: '2.5rem', left: 'auto' }}>
            SYS::VOID_v2.1<br />
            AUTH::PORTAL_ACTIVE<br />
            REG::{'0x' + Math.floor(Math.random()*0xFFFFFF).toString(16).toUpperCase().padStart(6,'0')}
          </div>

          <a href="/" className="void-logo-wrap">
            <div className="void-wordmark">

              <span className="wm-v">V</span>

              <span className="wm-o-wrap">
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

                  <circle cx="36" cy="36" r="32" fill="url(#voidGlow)" opacity="0.7" />

                  <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />

                  <circle cx="36" cy="36" r="22" fill={lm ? '#2a1060' : '#050507'} />

                  <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter="url(#glowStrong)" />
                  <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
                  <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glowFilter)" />
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

          <div className="hero-block">
            <div className="hero-heading">
              <span className="hero-line1">JOIN</span>
              <span className="hero-line2">THE VOID</span>
            </div>
            <div className="hero-label">Create your account</div>
            <p className="hero-desc">Step into infinite worlds. Battle, explore and conquer with millions of players.</p>
          </div>

          <div className="feature-row">
            <div className="feature-item">
              <span className="feature-icon"><Gamepad2 size={19} /></span>
              <div>
                <div className="feature-title">50,000+ Games</div>
                <div className="feature-desc">Endless adventures await you.</div>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><Trophy size={19} /></span>
              <div>
                <div className="feature-title">Built For Gamers</div>
                <div className="feature-desc">Performance, stats and competitions.</div>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><Zap size={19} /></span>
              <div>
                <div className="feature-title">Infinite Play</div>
                <div className="feature-desc">Your journey. Your rules.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="register-card">
            <div className="card-header">
              <div className="card-header-icon"><User size={22} /></div>
              <div className="card-header-text">
                <div className="card-title">Create your account</div>
                <div className="card-subtitle">Let's get you into the action</div>
              </div>
              <Link to="/login" className="login-link-top">
                Already have an account?
                <span>Login <ChevronRight size={13} /></span>
              </Link>
            </div>

            <div className="divider" />

            <div className="field-grid">
              <div className="field-wrap">
                <label className="field-label">Username</label>
                <div className="field-inner">
                  <div className="field-icon"><User size={16} /></div>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="Choose a cool username"
                    value={form.username}
                    onChange={update('username')}
                    required
                    minLength={3}
                  />
                </div>
              </div>

              <div className="field-wrap">
                <label className="field-label">Email Address</label>
                <div className="field-inner">
                  <div className="field-icon"><Mail size={16} /></div>
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
            </div>

            <div className="field-wrap">
              <label className="field-label">Password</label>
              <div className="field-inner">
                <div className="field-icon"><Lock size={16} /></div>
                <input
                  className="field-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Create a strong password"
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
                        style={{ background: i <= strength ? strengthColor : 'rgba(147,51,234,0.15)' }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
              {!form.password && (
                <div className="field-error" style={{ color: 'rgba(192,178,220,0.45)' }}>
                  Use 8+ characters with a mix of letters, numbers &amp; symbols
                </div>
              )}
            </div>

            <div className="field-wrap">
              <label className="field-label">Confirm Password</label>
              <div className={`field-inner${form.confirm_password && form.password !== form.confirm_password ? ' error' : ''}`}>
                <div className="field-icon"><Lock size={16} /></div>
                <input
                  className="field-input"
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Confirm your password"
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

            <label className="terms-row">
              <input
                type="checkbox"
                className="terms-checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span>
                I agree to the <a href="/terms" className="terms-link">Terms of Service</a> and{' '}
                <a href="/privacy" className="terms-link">Privacy Policy</a>
              </span>
            </label>

            <button
              className="register-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" /> Initializing...</>
              ) : (
                <><Rocket size={15} /> Create Account</>
              )}
            </button>

            <div className="or-row">
              <div className="or-line" />
              <span className="or-text">OR</span>
              <div className="or-line" />
            </div>

            <div className="oauth-row">
              <button
                className="google-btn"
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <div className="google-spinner" />
                ) : (
                  <svg className="oauth-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
