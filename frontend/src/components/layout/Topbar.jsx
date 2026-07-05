import { useState, useEffect, useRef, useId, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { XP_LABELS } from '../../utils/xpService'
import { xpEventBus } from '../XPToast'
import { Sun, Moon, Menu, Bell, Check, X } from 'lucide-react'

// ── Glitch ticker — unchanged ──
const FULL_TEXT = 'Welcome to THE VOID - DESIGNED AND DEVELOPED BY SUBHRANIL MANNA AND SIDDHARTHA DHAR'
const GLITCH_CHARS = '!@#$%^&*<>?/\\|[]{}~ABCDEFXYZabcxyz0123456789░▒▓█▄▀ΞΔΩ∅∞'
const randomChar = () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function GlitchTicker({ dark }) {
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState('reveal')
  const [glitchMap, setGlitchMap] = useState({})
  const frame = useRef(null)
  const idx = useRef(0)

  useEffect(() => {
    if (phase !== 'reveal') return
    idx.current = 0; setDisplayed('')
    const tick = () => {
      idx.current++
      setDisplayed(FULL_TEXT.slice(0, idx.current))
      if (idx.current < FULL_TEXT.length) frame.current = setTimeout(tick, 30)
      else setPhase('hold')
    }
    frame.current = setTimeout(tick, 500)
    return () => clearTimeout(frame.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'hold') return
    frame.current = setTimeout(() => setPhase('scramble'), 4200)
    return () => clearTimeout(frame.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'scramble') return
    let count = 0; const total = 22
    const tick = () => {
      count++
      const map = {}
      const slots = Math.floor((total - count) * 1.2)
      for (let i = 0; i < slots; i++) map[Math.floor(Math.random() * FULL_TEXT.length)] = randomChar()
      setGlitchMap(map)
      const keep = Math.max(0, FULL_TEXT.length - Math.floor((count / total) * FULL_TEXT.length))
      setDisplayed(FULL_TEXT.slice(0, keep))
      if (count < total) frame.current = setTimeout(tick, 50)
      else { setDisplayed(''); setGlitchMap({}); setPhase('reveal') }
    }
    frame.current = setTimeout(tick, 50)
    return () => clearTimeout(frame.current)
  }, [phase])

  const chars = displayed.split('').map((ch, i) =>
    glitchMap[i] ? <span key={i} style={{ color: '#f472b6' }}>{glitchMap[i]}</span> : <span key={i}>{ch}</span>
  )
  const extras = Object.entries(glitchMap)
    .filter(([k]) => parseInt(k) >= displayed.length).slice(0, 4)
    .map(([k, v]) => <span key={`e${k}`} style={{ color: '#f472b6' }}>{v}</span>)

  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11.5, color: dark ? '#a5b4fc' : '#6d28d9', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {'> '}{chars}{extras}
      {phase === 'reveal' && <span style={{ color: '#f472b6' }}>█</span>}
    </span>
  )
}

// ── Mini VOID logo — unique SVG IDs via useId to prevent collisions with Sidebar ──
function MiniVoidLogo({ dark }) {
  const uid = useId().replace(/:/g, '')
  const lm = !dark
  return (
    <div className="tb-void-wordmark">

      {/* ── V ── */}
      <span key={lm ? 'v-light' : 'v-dark'} style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.3rem',
        fontWeight: 900,
        lineHeight: 1,
        marginRight: 1,
        background: lm
          ? 'linear-gradient(170deg, #7c60c0 0%, #3a206a 40%, #7c60c0 70%, #2a1060 100%)'
          : 'linear-gradient(170deg, #ffffff 0%, #b0a0d8 30%, #e8e0ff 55%, #8070b0 80%, #d0c8f0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        backgroundClip: 'text',
        filter: dark ? 'drop-shadow(0 0 6px rgba(200,160,255,0.35))' : 'none',
        flexShrink: 0,
        alignSelf: 'center',
      }}>V</span>

      {/* ── O ── SVG black hole + CSS orbital rings */}
      <span className="tb-wm-o-wrap">
        <span className="tb-orb-ring tb-orb-ring-1" />
        <span className="tb-orb-ring tb-orb-ring-2" />
        <span className="tb-orb-ring tb-orb-ring-3" />
        <span className="tb-orb-scanner" />

        <svg
          width="24" height="24"
          viewBox="0 0 72 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1, overflow: 'visible', display: 'block' }}
        >
          <defs>
            <radialGradient id={`${uid}-tb-voidGlow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="55%" stopColor="#1a0040" />
              <stop offset="80%" stopColor="#3b0d7a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <filter id={`${uid}-tb-glowFilter`}>
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id={`${uid}-tb-glowStrong`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <circle cx="36" cy="36" r="32" fill={`url(#${uid}-tb-voidGlow)`} opacity="0.7" />
          <path d="M36 10 C50 14 58 24 56 36 C54 48 44 56 36 54" stroke="rgba(109,40,217,0.25)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M36 10 C22 14 14 24 16 36 C18 48 28 56 36 54" stroke="rgba(76,29,149,0.2)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M36 8 C54 10 64 22 62 36 C60 50 48 60 36 62" stroke="rgba(147,51,234,0.15)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M36 8 C18 10 8 22 10 36 C12 50 24 60 36 62" stroke="rgba(109,40,217,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="36" r="22" fill={lm ? '#2a1060' : '#050507'} />
          <circle cx="36" cy="36" r="26" stroke="#9333ea" strokeWidth="3.5" fill="none" filter={`url(#${uid}-tb-glowStrong)`} />
          <circle cx="36" cy="36" r="23" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M 17 28 A 22 22 0 0 1 36 14" stroke="#c084fc" strokeWidth="3" fill="none" strokeLinecap="round" filter={`url(#${uid}-tb-glowFilter)`} />
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

      {/* ── I — mini joystick ── */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 1px' }}>
        <svg width="17" height="24" viewBox="0 0 52 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <radialGradient id={`${uid}-tb-joyBall`} cx="38%" cy="28%" r="62%">
              <stop offset="0%" stopColor="#d8a8ff"/>
              <stop offset="35%" stopColor="#a855f7"/>
              <stop offset="100%" stopColor="#5b21b6"/>
            </radialGradient>
            <linearGradient id={`${uid}-tb-joyBase`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8e8f0"/>
              <stop offset="40%" stopColor="#c8c8d8"/>
              <stop offset="100%" stopColor="#a8a8b8"/>
            </linearGradient>
            <linearGradient id={`${uid}-tb-joyStick`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#aaa8c0"/>
              <stop offset="50%" stopColor="#d0cce0"/>
              <stop offset="100%" stopColor="#aaa8c0"/>
            </linearGradient>
            <filter id={`${uid}-tb-ballGlow`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="26" cy="16" r="13" fill="#7c3aed" opacity="0.25"/>
          <circle cx="26" cy="16" r="11" fill={`url(#${uid}-tb-joyBall)`} filter={`url(#${uid}-tb-ballGlow)`}/>
          <ellipse cx="22" cy="11" rx="4" ry="3" fill="rgba(255,255,255,0.35)"/>
          <ellipse cx="28" cy="22" rx="3.5" ry="2" fill="rgba(60,0,120,0.3)"/>
          <rect x="23" y="26" width="6" height="20" rx="3" fill={`url(#${uid}-tb-joyStick)`}/>
          <rect x="27" y="26" width="2" height="20" rx="1" fill="rgba(100,80,160,0.25)"/>
          <rect x="4" y="46" width="44" height="20" rx="6" fill={`url(#${uid}-tb-joyBase)`}/>
          <rect x="6" y="47" width="40" height="4" rx="3" fill="rgba(255,255,255,0.55)"/>
          <rect x="4" y="58" width="44" height="8" rx="4" fill="rgba(0,0,0,0.18)"/>
          <rect x="6" y="62" width="40" height="3" rx="2" fill="rgba(80,60,120,0.15)"/>
          <rect x="20" y="53" width="12" height="5" rx="2.5" fill="#1a0040"/>
          <rect x="21" y="54" width="10" height="3" rx="1.5" fill="#a855f7" opacity="0.9" style={{ filter: 'drop-shadow(0 0 3px #a855f7)' }}/>
          <rect x="20" y="53" width="12" height="5" rx="2.5" fill="rgba(168,85,247,0.3)" style={{ filter: 'blur(2px)' }}/>
        </svg>
      </span>

      {/* ── D — mini controller ── */}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <svg width="26" height="20" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={`${uid}-tb-ctrlBody`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lm ? '#3a3060' : '#2e2e3a'}/>
              <stop offset="100%" stopColor={lm ? '#1e1440' : '#1a1a24'}/>
            </linearGradient>
            <linearGradient id={`${uid}-tb-ctrlBorder`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e8e8f8"/>
              <stop offset="40%" stopColor="#c0b8d8"/>
              <stop offset="100%" stopColor="#a0a0b8"/>
            </linearGradient>
            <radialGradient id={`${uid}-tb-btnP1`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="#c084fc"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </radialGradient>
            <radialGradient id={`${uid}-tb-btnP2`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="#a855f7"/>
              <stop offset="100%" stopColor="#5b21b6"/>
            </radialGradient>
            <filter id={`${uid}-tb-btnGlow`}>
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M 4 6 H 46 Q 86 6 86 36 Q 86 66 46 66 H 4 Z" fill={`url(#${uid}-tb-ctrlBorder)`}/>
          <path d="M 8 11 H 45 Q 80 11 80 36 Q 80 61 45 61 H 8 Z" fill={`url(#${uid}-tb-ctrlBody)`}/>
          <path d="M 10 13 H 44 Q 74 13 76 30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" strokeLinecap="round"/>
          <rect x="21" y="26" width="8" height="20" rx="2" fill="#505060"/>
          <rect x="16" y="31" width="18" height="10" rx="2" fill="#505060"/>
          <rect x="21" y="31" width="8" height="10" rx="1" fill="#404050"/>
          <path d="M25 28 L23 31 L27 31 Z" fill="#707080"/>
          <path d="M25 44 L23 41 L27 41 Z" fill="#707080"/>
          <path d="M18 36 L21 33 L21 39 Z" fill="#707080"/>
          <path d="M32 36 L29 33 L29 39 Z" fill="#707080"/>
          <circle cx="62" cy="26" r="8" fill="#1a0040"/>
          <circle cx="62" cy="26" r="7" fill={`url(#${uid}-tb-btnP1)`} filter={`url(#${uid}-tb-btnGlow)`}/>
          <ellipse cx="59.5" cy="23.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.3)"/>
          <circle cx="62" cy="46" r="8" fill="#1a0040"/>
          <circle cx="62" cy="46" r="7" fill={`url(#${uid}-tb-btnP2)`} filter={`url(#${uid}-tb-btnGlow)`}/>
          <ellipse cx="59.5" cy="43.5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.25)"/>
          <rect x="40" y="33" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)"/>
          <rect x="40" y="36" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)"/>
          <rect x="40" y="39" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.1)"/>
          <path d="M 6 10 Q 8 7 16 6.5" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      </span>

    </div>
  )
}

// ── Notification Bell — global, lives here so it shows on every page ──
function NotificationBell({ dark }) {
  const navigate = useNavigate()
  const [open, setOpen]       = useState(false)
  const [requests, setReqs]   = useState([])
  const [feed, setFeed]       = useState([])
  const [dmCount, setDmCount] = useState(0)
  const [dmSenders, setDmSenders] = useState([]) // [{id, username, avatar_url, count, last_message}]
  const [unread, setUnread]   = useState(0)
  const [shaking, setShaking] = useState(false)
  const [coords, setCoords]   = useState({ top: 0, right: 0, width: 300 })
  const btnRef   = useRef(null) // the bell button — used to measure position
  const panelRef = useRef(null) // the portaled dropdown — used for outside-click detection

  const bg      = dark ? '#0d0d20' : '#f5f3ff'
  const border  = dark ? '#2a2a4a' : '#e2dcf5'
  const surface = dark ? '#111124' : '#ffffff'
  const text    = dark ? '#eae8ff' : '#1e1533'
  const textSub = dark ? '#a5b4fc' : '#6d28d9'
  const textMut = dark ? '#6b6890' : '#9b93b8'
  const accent  = '#a855f7'

  const authHeaders = {
    headers: { Authorization: `Bearer ${localStorage.getItem('gl_token')}` },
    cache: 'no-store', // never let the browser serve a stale 304-cached body for these
  }

  const fetchNotifs = useCallback(async () => {
    try {
      const [reqRes, dmRes, feedRes, xpUnreadRes] = await Promise.all([
        fetch('/api/friends/requests', authHeaders).then(r => r.ok ? r.json() : []),
        fetch('/api/dm/unread-count',  authHeaders).then(r => r.ok ? r.json() : { count: 0, senders: [] }),
        fetch('/api/xp/notifications?limit=15', authHeaders).then(r => r.ok ? r.json() : []),
        fetch('/api/xp/notifications/unread-count', authHeaders).then(r => r.ok ? r.json() : { unread: 0 }),
      ])
      setReqs(reqRes || [])
      setDmCount(dmRes?.count || 0)
      setDmSenders(dmRes?.senders || [])
      setFeed(feedRes || [])
      const total = (reqRes?.length || 0) + (dmRes?.count || 0) + (xpUnreadRes?.unread || 0)
      if (total > unread && unread !== null) { setShaking(true); setTimeout(() => setShaking(false), 600) }
      setUnread(total)
    } catch (e) {}
  }, [unread])

  useEffect(() => { fetchNotifs() }, [])
  useEffect(() => { const id = setInterval(fetchNotifs, 12000); return () => clearInterval(id) }, [fetchNotifs])

  // ── Presence heartbeat ──────────────────────────────────────
  // NotificationBell is mounted globally on every page while logged in, so
  // this is the natural place to keep the backend's User.last_seen fresh.
  // Friends only show as "Online" while they have a live heartbeat within
  // the last ~45s (see models.py) — close the tab and they fall back to
  // offline on their own, no explicit logout needed.
  useEffect(() => {
    const ping = () => fetch('/api/auth/heartbeat', { method: 'POST', ...authHeaders }).catch(() => {})
    ping()
    const id = setInterval(ping, 20000)
    return () => clearInterval(id)
  }, [])

  // The moment XP is earned anywhere in the app (Home, Discover, News,
  // Friends...) — same event the toast listens to — refresh the bell right
  // away instead of waiting for the next poll tick.
  useEffect(() => {
    return xpEventBus.subscribe((event) => {
      if (event.kind === 'xp' || event.kind === 'level_up') {
        setTimeout(fetchNotifs, 300) // tiny delay so the backend write lands first
      } else if (event.kind === 'new_dm' || event.kind === 'friend_request' || event.kind === 'friend_accepted') {
        fetchNotifs() // already committed server-side before the push fired — no delay needed
      }
    })
  }, [fetchNotifs])

  // Catch anything that happened while this tab was in the background
  // (e.g. a friend accepted your request, or messaged you) the instant you
  // switch back to it, instead of waiting out the rest of the poll interval.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifs() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [fetchNotifs])

  useEffect(() => {
    if (!open) return
    fetch('/api/xp/notifications/mark-read', { method: 'POST', ...authHeaders }).catch(() => {})
  }, [open])

  // Measure the bell's position when opening so the portaled dropdown can
  // be placed under it with position:fixed (escaping the topbar's
  // overflow:hidden, which was silently clipping it before).
  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const margin = 12
      const width = Math.min(300, window.innerWidth - margin * 2)
      // Anchor to the bell's right edge, but never let the panel's left
      // edge go past `margin` from the screen edge (was overflowing off
      // narrow mobile viewports before).
      const idealRight = window.innerWidth - rect.right
      const maxRight = window.innerWidth - width - margin
      const right = Math.max(margin, Math.min(idealRight, maxRight))
      setCoords({ top: rect.bottom + 8, right, width })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    const h = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const acceptReq = async (id) => {
    try {
      await fetch(`/api/friends/accept/${id}`, { method: 'POST', ...authHeaders })
      setReqs(r => r.filter(x => x.id !== id))
      setUnread(u => Math.max(0, u - 1))
    } catch (e) {}
  }
  const declineReq = async (id) => {
    try {
      await fetch(`/api/friends/decline/${id}`, { method: 'DELETE', ...authHeaders })
      setReqs(r => r.filter(x => x.id !== id))
      setUnread(u => Math.max(0, u - 1))
    } catch (e) {}
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={openDropdown}
        className={shaking ? 'bell-shake' : ''}
        style={{
          position: 'relative', width: 34, height: 34, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? `${accent}18` : 'transparent',
          border: `1px solid ${open ? accent + '55' : border}`,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <Bell size={15} style={{ color: unread > 0 ? accent : textMut }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, padding: '0 3px',
            borderRadius: 999, background: '#ef4444',
            border: `2px solid ${dark ? '#07070e' : '#faf8ff'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, lineHeight: 1, color: '#fff',
            fontFamily: "'Share Tech Mono', monospace",
            boxShadow: '0 0 6px rgba(239,68,68,0.6)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: coords.top, right: coords.right, zIndex: 999,
            width: coords.width, maxWidth: 'calc(100vw - 24px)', borderRadius: 16, background: surface,
            border: `1px solid ${border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Notifications</span>
            {unread > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${accent}18`, color: accent }}>{unread} new</span>}
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {requests.length === 0 && dmCount === 0 && feed.length === 0 && (
              <p style={{ textAlign: 'center', color: textMut, fontSize: 12, padding: '24px 0' }}>All caught up 🎮</p>
            )}

            {requests.map(req => (
              <div
                key={req.id}
                onClick={() => { setOpen(false); navigate('/friends?tab=Requests') }}
                style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: accent,
                }}>
                  {req.requester?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b>{req.requester?.username}</b> sent you a friend request
                  </p>
                  {req.created_at && (
                    <span style={{ fontSize: 10, color: textMut, fontFamily: "'Share Tech Mono', monospace" }}>{timeAgo(req.created_at)}</span>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => acceptReq(req.id)} style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      background: '#16a34a22', color: '#22c55e', border: '1px solid #22c55e44',
                    }}><Check size={10} style={{ verticalAlign: -1 }} /> Accept</button>
                    <button onClick={() => declineReq(req.id)} style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                      background: bg, color: textSub, border: `1px solid ${border}`,
                    }}><X size={10} style={{ verticalAlign: -1 }} /> Decline</button>
                  </div>
                </div>
              </div>
            ))}

            {dmSenders.map((s, i) => (
              <div
                key={s.id}
                onClick={() => { setOpen(false); navigate(`/friends?tab=Friends&dm=${s.id}`) }}
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  borderBottom: (i < dmSenders.length - 1 || feed.length) ? `1px solid ${border}` : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: '#3b82f618', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#3b82f6',
                }}>
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (s.username?.[0]?.toUpperCase() || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      <b>{s.username || 'Someone'}</b> sent you {s.count > 1 ? `${s.count} messages` : 'a message'}
                    </p>
                    <span style={{ fontSize: 10, color: textMut, fontFamily: "'Share Tech Mono', monospace", flexShrink: 0 }}>{timeAgo(s.last_message_at)}</span>
                  </div>
                  {s.last_message && (
                    <p style={{ fontSize: 11, color: textMut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                      {s.last_message}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {feed.map((n, i) => (
              <div
                key={n.id}
                onClick={() => { setOpen(false); if (n.type === 'friend_accepted' || n.action === 'made_friend') navigate('/friends') }}
                style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: (n.type === 'friend_accepted' || n.action === 'made_friend') ? 'pointer' : 'default',
                  borderBottom: i < feed.length - 1 ? `1px solid ${border}` : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: n.type === 'level_up' ? '#f59e0b18' : n.type === 'friend_accepted' ? '#10b98118' : '#a855f718',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {n.type === 'level_up'
                    ? '🎉'
                    : n.type === 'friend_accepted'
                      ? '🤝'
                      : (XP_LABELS[n.action]?.icon || '⚡')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 12, color: n.read ? textSub : text, fontWeight: n.read ? 400 : 600, flex: 1, minWidth: 0 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: 10, color: textMut, fontFamily: "'Share Tech Mono', monospace", flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {n.xp_earned > 0 && (
                    <span style={{
                      display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 700,
                      padding: '1px 7px', borderRadius: 8, background: `${accent}18`, color: accent,
                      fontFamily: 'monospace',
                    }}>+{n.xp_earned} XP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const TOPBAR_STYLE = (dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

  .og-topbar {
    position: sticky; top: 0; z-index: 10;
    width: 100%; height: 60px;
    background: ${dark ? '#07070e' : '#faf8ff'};
    border-bottom: 1px solid ${dark ? '#1a1a30' : '#e2dcf5'};
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; overflow: hidden;
    box-shadow: ${dark ? '0 0 40px rgba(168,85,247,0.06)' : '0 1px 12px rgba(124,58,237,0.06)'};
    transition: background 0.3s, border-color 0.3s;
  }
  .og-topbar::before {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px,
      ${dark ? 'rgba(168,85,247,0.022)' : 'rgba(124,58,237,0.018)'} 2px,
      ${dark ? 'rgba(168,85,247,0.022)' : 'rgba(124,58,237,0.018)'} 4px);
    pointer-events: none;
  }

  /* ── Logo wordmark ── */
  .tb-void-wordmark {
    display: flex; align-items: center; gap: 0;
    line-height: 1;
    animation: voidTbGlow 4s ease-in-out infinite;
    overflow: visible;
  }

  /* ── O orbital rings — CSS animated, same as LoginPage/Sidebar ── */
  .tb-wm-o-wrap {
    position: relative;
    width: 24px; height: 24px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: visible;
    margin: 0 1px;
  }
  .tb-orb-ring {
    position: absolute; border-radius: 40%;
    border-style: solid; border-color: transparent;
    pointer-events: none;
  }
  .tb-orb-ring-1 {
    width: 30px; height: 30px;
    border-top-color: rgba(147,51,234,0.55);
    border-right-color: rgba(147,51,234,0.2);
    border-width: 1px;
    animation: tbOrbSpin 8s linear infinite;
  }
  .tb-orb-ring-2 {
    width: 36px; height: 36px;
    border-bottom-color: rgba(109,40,217,0.45);
    border-left-color: rgba(109,40,217,0.15);
    border-width: 1px;
    animation: tbOrbSpin 14s linear infinite reverse;
  }
  .tb-orb-ring-3 {
    width: 42px; height: 42px;
    border-top-color: rgba(168,85,247,0.28);
    border-right-color: rgba(168,85,247,0.08);
    border-width: 0.5px;
    animation: tbOrbSpin 22s linear infinite;
  }
  .tb-orb-scanner {
    position: absolute;
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 1px solid transparent;
    border-top-color: rgba(192,132,252,0.9);
    animation: tbOrbSpin 3.5s linear infinite;
    filter: blur(0.5px);
  }
  @keyframes tbOrbSpin { to { transform: rotate(360deg); } }

  .og-ticker-wrap { flex: 1; overflow: hidden; position: relative; margin: 0 14px; }
  .og-ticker-wrap::before, .og-ticker-wrap::after { content: ''; position: absolute; top: 0; bottom: 0; width: 36px; z-index: 2; pointer-events: none; }
  .og-ticker-wrap::before { left: 0; background: linear-gradient(to right, ${dark ? '#07070e' : '#faf8ff'}, transparent); }
  .og-ticker-wrap::after  { right: 0; background: linear-gradient(to left,  ${dark ? '#07070e' : '#faf8ff'}, transparent); }
  .og-topbar-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .og-pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #a855f7; box-shadow: 0 0 8px #a855f7; animation: og-tb-pulse 2.4s ease-in-out infinite; }
  @keyframes og-tb-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.55)} }
  .og-divider { width: 1px; height: 26px; flex-shrink: 0; background: linear-gradient(to bottom, transparent, ${dark ? '#a855f722' : '#7c3aed22'}, transparent); }
  .og-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .og-theme-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid ${dark ? '#2a2a4a' : '#e2dcf5'}; background: ${dark ? '#0d0d20' : '#f0eeff'}; cursor: pointer; transition: all 0.2s; font-family: 'Share Tech Mono', monospace; font-size: 10px; color: ${dark ? '#a855f7' : '#7c3aed'}; letter-spacing: 0.06em; outline: none; }
  .og-theme-btn:hover { border-color: ${dark ? '#a855f755' : '#7c3aed55'} !important; }
  .og-avatar-btn { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 4px; border-radius: 22px; border: 1px solid ${dark ? '#2a2a4a' : '#e2dcf5'}; background: ${dark ? '#0d0d20' : '#f5f3ff'}; cursor: pointer; transition: border-color 0.2s, background 0.2s; outline: none; }
  .og-avatar-btn:hover { border-color: ${dark ? '#a855f755' : '#7c3aed44'} !important; }
  .og-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #a855f7); display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 900; color: #fff; flex-shrink: 0; overflow: hidden; }
  .og-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .og-username { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: ${dark ? '#a5b4fc' : '#6d28d9'}; letter-spacing: 0.04em; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .og-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 5px #34d399; flex-shrink: 0; }
  .og-menu-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; border: 1px solid ${dark ? '#1e1e32' : '#e2dcf5'}; background: transparent; cursor: pointer; transition: background 0.15s; outline: none; color: ${dark ? '#a855f7' : '#7c3aed'}; }
  .og-menu-btn:hover { background: ${dark ? '#a855f715' : '#7c3aed11'} !important; }
  .og-corner { position: absolute; width: 10px; height: 10px; border-style: solid; pointer-events: none; border-color: ${dark ? '#a855f722' : '#7c3aed22'}; }
  .og-corner-tl { top: 5px; left: 5px; border-width: 1px 0 0 1px; }
  .og-corner-tr { top: 5px; right: 5px; border-width: 1px 1px 0 0; }
  .og-corner-bl { bottom: 5px; left: 5px; border-width: 0 0 1px 1px; }
  .og-corner-br { bottom: 5px; right: 5px; border-width: 0 1px 1px 0; }
  @keyframes voidTbGlow {
    0%,100% { filter: drop-shadow(0 0 3px rgba(168,85,247,0.2)); }
    50%      { filter: drop-shadow(0 0 10px rgba(168,85,247,0.55)) drop-shadow(0 0 20px rgba(124,58,237,0.22)); }
  }

  /* ── Mobile fit ── */
  @media (max-width: 640px) {
    .og-topbar { padding: 0 14px; }
    .og-ticker-wrap { display: none; }
    .og-divider { display: none; }
    .og-username { display: none; }
    .og-theme-label { display: none; }
    .og-theme-btn { padding: 6px 9px; }
    .og-avatar-btn { padding: 4px; gap: 0; }
    .og-right { gap: 6px; }
  }

  /* Notification bell shake */
  @keyframes bellShake {
    0%,100% { transform: rotate(0); }
    20% { transform: rotate(-14deg); }
    40% { transform: rotate(14deg); }
    60% { transform: rotate(-8deg); }
    80% { transform: rotate(8deg); }
  }
  .bell-shake { animation: bellShake 0.5s ease; }
`

export default function Topbar({ onMenuClick, dark = true, setDark = () => {} }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <>
      <style>{TOPBAR_STYLE(dark)}</style>
      <header className="og-topbar">
        <div className="og-corner og-corner-tl" /><div className="og-corner og-corner-tr" />
        <div className="og-corner og-corner-bl" /><div className="og-corner og-corner-br" />

        <div className="og-topbar-left">
          <button className="og-menu-btn lg:hidden" onClick={onMenuClick}><Menu size={16} /></button>
          <MiniVoidLogo dark={dark} />
          <div className="og-pulse-dot" />
        </div>

        <div className="og-divider" />
        <div className="og-ticker-wrap"><GlitchTicker dark={dark} /></div>
        <div className="og-divider" />

        <div className="og-right">
          <NotificationBell dark={dark} />
          <button className="og-theme-btn" onClick={() => setDark(d => !d)}>
            {dark
              ? <><Sun size={13} style={{ color: '#f59e0b' }} /> <span className="og-theme-label">LIGHT</span></>
              : <><Moon size={13} style={{ color: '#7c3aed' }} /> <span className="og-theme-label">DARK</span></>}
          </button>
          <button className="og-avatar-btn" onClick={() => navigate('/profile')}>
            <div className="og-avatar">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" />
                : (user?.username?.[0]?.toUpperCase() || 'G')}
            </div>
            <span className="og-username">{user?.username || 'Player'}</span>
            <div className="og-online-dot" />
          </button>
        </div>
      </header>
    </>
  )
}
