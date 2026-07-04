import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  UserPlus, Check, X, MessageCircle, Shield,
  Search, Loader2, Users, Wifi, Bell, Ban, UserX, AlertTriangle
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import DMChatPanel from '../components/chat/DMChatPanel'
import { useXPToast } from '../components/XPToast'
import { awardXP } from '../utils/xpService'

const TABS = ['Friends', 'Requests', 'Find People', 'Online', 'Blocked']
const ACCENT = { primary: '#a855f7', secondary: '#7c3aed' }

const AVATAR_PALETTE = ['#a855f7','#f43f5e','#10b981','#f59e0b','#8b5cf6','#3b82f6','#ec4899','#14b8a6']
const avatarColor = (name = '') => AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length]

// Column count derived from an explicit minimum card width, rather than
// fixed breakpoints. The old breakpoints were computed from window width
// alone and never accounted for the DM panel's 384px push — so with the
// panel open, cards could still land in a 3-column layout even though the
// *actual* remaining width per card was too narrow for the 3-button row,
// squashing the flexible "Message" button down to almost nothing. Basing
// the column count on available width (window width minus the panel push
// and page padding) guarantees every card gets at least CARD_MIN_WIDTH,
// so the button row always has room — while still only being recomputed
// on real resize/panel-toggle events, not continuously during the
// marginRight transition (see the note where gridCols is set).
const CARD_MIN_WIDTH = 210
const GRID_GAP = 20
const computeCols = (availableWidth) => {
  const cols = Math.floor((availableWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP))
  return Math.max(1, Math.min(cols, 6))
}

export default function FriendsPage() {
  const { dark: isDark } = useTheme()
  const { user }         = useAuth()

  // XP toast hook
  const { showFriendAccepted, showFriendRequest, showNewMessage } = useXPToast()

  // Deep-link support: the Homepage notification bell links here with
  // e.g. /friends?tab=Requests — honor that as the initial tab.
  const [searchParams] = useSearchParams()
  const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'Friends'

  const [tab, setTab]                     = useState(initialTab)
  const [friends, setFriends]             = useState([])
  const [requests, setRequests]           = useState([])
  const [blocked, setBlocked]             = useState([])
  const [searchQ, setSearchQ]             = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friendSearch, setFriendSearch]   = useState('')
  const [loading, setLoading]             = useState(true)
  const [searching, setSearching]         = useState(false)
  const [sending, setSending]             = useState({})
  const [sentTo, setSentTo]               = useState(new Set()) // user ids we've sent a request to this session
  const [chatFriend, setChatFriend]       = useState(null)

  // Pending destructive action awaiting confirmation (remove / block / decline).
  // Shape: { title, message, confirmLabel, danger, onConfirm }
  const [confirm, setConfirm] = useState(null)

  // ── theme tokens ──────────────────────────────────────────
  const bgPage    = isDark ? '#0b0b14'               : '#f4f4f8'
  const bgCard    = isDark ? '#13131f'               : '#ffffff'
  const bgInput   = isDark ? '#1a1a2a'               : '#ffffff'
  const borderClr = isDark ? 'rgba(255,255,255,0.08)': '#e8e8f0'
  const txtPri    = isDark ? '#eae8ff'               : '#0f0f1f'
  const txtSec    = isDark ? '#8c8aaa'               : '#6b7280'
  const txtMut    = isDark ? '#504e6a'               : '#a0a0b0'

  // ── responsive chat-open push ────────────────────────────
  // DMChatPanel is only 384px wide at sm (>=640px) and up — below that it's
  // full-width. Pushing the page by a fixed 384px regardless of viewport
  // squeezes/distorts the tab bar and cards on narrower screens. Only push
  // when there's actually room for a fixed 384px side panel.
  const [isWideEnough, setIsWideEnough] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  useEffect(() => {
    const onResize = () => setIsWideEnough(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const chatPushPx = chatFriend && isWideEnough ? 384 : 0

  // ── mobile layout detection ──────────────────────────────
  // This page is styled with inline styles (no Tailwind breakpoints), so
  // responsive behavior for the stats strip / tabs row / top row is driven
  // from JS instead of CSS media queries.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── grid column count (see computeCols comment above) ────
  // Previously derived available width from window.innerWidth minus
  // guessed constants for panel push / page padding — but that has no
  // idea the app has a left sidebar eating real horizontal space, so the
  // guess was still wrong (e.g. picking 2 columns when only ~180px was
  // actually available per card). Measuring the outer wrapper directly
  // with a ResizeObserver gives the real number regardless of sidebar
  // width, collapsed/expanded state, etc.
  //
  // Crucially, the observed element (outerRef, attached to the outermost
  // div below) never has `marginRight` applied to it — only the inner
  // content div does — so this observer only fires on genuine layout
  // changes (window resize, sidebar toggle), never on our own DM-panel
  // push animation. That's what avoids reintroducing the mid-transition
  // snapping/shaking bug: the column count still only changes at the two
  // endpoints of the push animation, never during it.
  const outerRef = useRef(null)
  const [outerWidth, setOuterWidth] = useState(0)
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      setOuterWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [gridCols, setGridCols] = useState(3)
  useEffect(() => {
    if (!outerWidth) return
    const pagePadding = isMobile ? 32 : 64
    setGridCols(computeCols(outerWidth - chatPushPx - pagePadding))
  }, [outerWidth, chatPushPx, isMobile])

  // ── helpers ───────────────────────────────────────────────
  const getPartner = (f) => (f.requester.id === user?.id ? f.addressee : f.requester)

  // ── data fetching ─────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true)
      const [fr, rr] = await Promise.all([
        axios.get('/api/friends/'),
        axios.get('/api/friends/requests'),
      ])
      setFriends(fr.data)
      setRequests(rr.data)
    } catch { toast.error('Failed to load friends') }
    finally   { setLoading(false) }

    // Blocked list is fetched separately so a missing/older endpoint here
    // doesn't take down the rest of the page — it just leaves the Blocked
    // tab empty until the backend route exists.
    try {
      const br = await axios.get('/api/friends/blocked')
      setBlocked(br.data)
    } catch { /* optional */ }
  }, [])
  useEffect(() => { loadFriends() }, [loadFriends])

  // If a chat panel is open, keep its friend data (avatar, online status,
  // etc.) in sync with the periodic refresh above — otherwise it's stuck
  // showing whatever was true the moment the panel was opened.
  useEffect(() => {
    if (!chatFriend) return
    const updated = friends.map(f => getPartner(f)).find(f => f.id === chatFriend.id)
    if (updated && updated.online !== chatFriend.online) setChatFriend(updated)
  }, [friends])

  // ── deep-link: notification bell → /friends?tab=Friends&dm=<friendId> ──
  // Auto-open that friend's DM panel once friends have loaded. Guarded by a
  // ref so it only fires once per page load — if the user closes the panel
  // themselves afterward, it shouldn't keep popping back open.
  const autoOpenedDM = useRef(false)
  useEffect(() => {
    if (autoOpenedDM.current || loading) return
    const dmParam = searchParams.get('dm')
    if (!dmParam) return
    const match = friends
      .map(f => getPartner(f))
      .find(f => String(f.id) === dmParam)
    if (match) {
      setChatFriend(match)
      autoOpenedDM.current = true
    }
  }, [searchParams, loading, friends])

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        setSearching(true)
        const res = await axios.get('/api/auth/users/search', { params: { q: searchQ } })
        setSearchResults(res.data)
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [searchQ])

  // ── actions ───────────────────────────────────────────────
  const sendRequest = async (userId) => {
    try {
      setSending(s => ({ ...s, [userId]: true }))
      await axios.post(`/api/friends/request/${userId}`)
      toast.success('Friend request sent!')
      setSentTo(s => new Set(s).add(userId))
    } catch (err) {
      // Backend already has a pending/duplicate request — treat it the same
      // as success from a UI standpoint rather than showing a scary error
      if (err.response?.status === 400 && /already exists/i.test(err.response?.data?.detail || '')) {
        setSentTo(s => new Set(s).add(userId))
      } else {
        toast.error(err.response?.data?.detail || 'Could not send request')
      }
    } finally { setSending(s => ({ ...s, [userId]: false })) }
  }

  const acceptRequest = async (req) => {
    try {
      await axios.post(`/api/friends/accept/${req.id}`)
      toast.success('Request accepted! 🎮')

      // Award XP for making a friend — the shared xpService shows the
      // matching XP / level-up toast(s) globally on its own.
      awardXP('made_friend', req.requester.username)

      // Show friend accepted toast
      showFriendAccepted(req.requester.username)

      await loadFriends()
    } catch {
      toast.error('Failed to accept')
    }
  }

  const declineRequest = async (id) => {
    try {
      await axios.delete(`/api/friends/decline/${id}`)
      setRequests(r => r.filter(x => x.id !== id))
      toast.success('Declined')
    } catch { toast.error('Failed to decline') }
  }

  const removeFriend = async (partnerId) => {
    try {
      await axios.delete(`/api/friends/remove/${partnerId}`)
      setFriends(f => f.filter(x => getPartner(x).id !== partnerId))
      if (chatFriend?.id === partnerId) setChatFriend(null)
      toast.success('Friend removed')
    } catch { toast.error('Failed to remove') }
  }

  const blockUser = async (userId, username) => {
    try {
      await axios.post(`/api/friends/block/${userId}`)
      setFriends(f => f.filter(x => getPartner(x).id !== userId))
      setBlocked(b => [...b, { id: userId, username }])
      if (chatFriend?.id === userId) setChatFriend(null)
      toast.success(`Blocked ${username}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not block user')
    }
  }

  const unblockUser = async (userId, username) => {
    try {
      await axios.delete(`/api/friends/unblock/${userId}`)
      setBlocked(b => b.filter(x => x.id !== userId))
      toast.success(`Unblocked ${username}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not unblock user')
    }
  }

  // ── confirmation wrappers ────────────────────────────────
  // Every destructive action (remove / block / decline) routes through here
  // instead of firing immediately, so the person always sees exactly what
  // they're about to do before it happens.
  const requestRemoveFriend = (friend) => {
    setConfirm({
      title: 'Remove friend?',
      message: `${friend.username} will be removed from your friends list. You can always send a new request later.`,
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: () => removeFriend(friend.id),
    })
  }

  const requestBlockUser = (friend) => {
    setConfirm({
      title: 'Block this user?',
      message: `${friend.username} won't be able to message you, see your activity, or send you a new request. This also removes them as a friend.`,
      confirmLabel: 'Block',
      danger: true,
      onConfirm: () => blockUser(friend.id, friend.username),
    })
  }

  const requestDeclineRequest = (req) => {
    setConfirm({
      title: 'Decline request?',
      message: `${req.requester.username}'s friend request will be declined.`,
      confirmLabel: 'Decline',
      danger: false,
      onConfirm: () => declineRequest(req.id),
    })
  }

  // Open DM and show new message toast (called from DMChatPanel via prop)
  const handleIncomingMessage = (senderName) => {
    showNewMessage(senderName)
  }

  // ── derived ───────────────────────────────────────────────
  const friendPartners  = friends.map(f => ({ ...getPartner(f), friendshipId: f.id }))
  const filteredFriends = friendPartners.filter(f =>
    f.username?.toLowerCase().includes(friendSearch.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────
  // SUB-COMPONENTS
  // ─────────────────────────────────────────────────────────

  // Portrait friend card — visually distinct from Library game cards
  const FriendCard = ({ friend }) => {
    const color  = avatarColor(friend.username)
    const active = chatFriend?.id === friend.id
    const online = friend.online

    return (
      <div
        style={{
          background: bgCard,
          border: `1px solid ${active ? ACCENT.primary : borderClr}`,
          borderRadius: 20, overflow: 'hidden',
          // Active card used to glow with a 40px blur, which — with only a
          // 16px grid gap — visibly bled over the neighboring card's
          // buttons. Tightened the blur so the glow stays inside the gap.
          boxShadow: active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 6px 18px ${ACCENT.primary}22`
            : isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'transform 0.18s, box-shadow 0.18s',
          cursor: 'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 10px 24px ${ACCENT.primary}28`
            : isDark ? `0 16px 40px rgba(0,0,0,0.4)` : '0 12px 32px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 6px 18px ${ACCENT.primary}22`
            : isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)'
        }}
      >
        {/* Colored banner */}
        <div style={{
          height: 80,
          background: `linear-gradient(135deg, ${color}60 0%, ${color}20 60%, transparent 100%)`,
          backgroundColor: isDark ? '#1a1a2e' : '#f8f6ff',
          position: 'relative',
        }}>
          {/* Online ring + avatar */}
          <div style={{
            position: 'absolute', bottom: -26, left: '50%', transform: 'translateX(-50%)',
            padding: 3,
            borderRadius: 18,
            background: online
              ? `linear-gradient(135deg, #22c55e, #16a34a)`
              : isDark ? '#2a2a3f' : '#e2e8f0',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 22,
              border: `3px solid ${bgCard}`,
            }}>
              {friend.avatar_url
                ? <img src={friend.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11 }} />
                : friend.username?.[0]?.toUpperCase()
              }
            </div>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '36px 16px 16px', textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: txtPri, marginBottom: 6 }}>
            {friend.username}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              background: `${ACCENT.primary}18`, color: ACCENT.primary,
            }}>Lv.{friend.level ?? 1}</span>
            {friend.country && <span style={{ fontSize: 11, color: txtMut }}>{friend.country}</span>}
          </div>

          <p style={{ fontSize: 12, color: txtSec, lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
            {friend.bio || 'No bio yet'}
          </p>

          {/* Status chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 99, marginBottom: 14,
            background: online ? 'rgba(34,197,94,0.1)' : isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
            color: online ? '#22c55e' : txtMut, fontSize: 11, fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#22c55e' : txtMut }} />
            {online ? 'Online now' : 'Offline'}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setChatFriend(active ? null : friend)}
              style={{
                flex: 1, minWidth: 0, padding: '8px 4px', borderRadius: 10, border: 'none',
                background: active ? ACCENT.primary : `${ACCENT.primary}18`,
                color: active ? '#fff' : ACCENT.primary,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? `0 4px 16px ${ACCENT.primary}40` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={13} style={{ flexShrink: 0 }} />
              {/* minWidth:0 + ellipsis: without this, "Chatting…" (longer
                  than "Message") forced the button past the card's edge
                  whenever the card got narrower — the other visible piece
                  of the same overlap bug from the screenshot. */}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {active ? 'Chatting…' : 'Message'}
              </span>
            </button>
            <button
              onClick={() => requestBlockUser(friend)}
              title="Block"
              style={{
                padding: '8px 9px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(239,68,68,0.08)',
                border: `1px solid ${borderClr}`,
                color: '#ef4444', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = borderClr }}
            >
              <Ban size={14} />
            </button>
            <button
              onClick={() => requestRemoveFriend(friend)}
              title="Remove"
              style={{
                padding: '8px 9px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent',
                border: `1px solid ${borderClr}`,
                color: txtMut, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.color = txtMut; e.currentTarget.style.borderColor = borderClr; e.currentTarget.style.background = 'transparent' }}
            >
              <UserX size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Compact row for Requests / Find People / Online / Blocked tabs
  const PersonRow = ({ person, actions }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderRadius: 14,
      background: bgCard, border: `1px solid ${borderClr}`,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: avatarColor(person.username),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: 18, overflow: 'hidden',
      }}>
        {person.avatar_url
          ? <img src={person.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : person.username?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: txtPri }}>{person.username}</p>
        <p style={{ fontSize: 12, color: txtMut }}>Lv.{person.level ?? 1} · {person.country || 'Unknown'}</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>
    </div>
  )

  const iconBtn = (onClick, icon, colorOn, bgOn) => (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: bgOn, color: colorOn,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >{icon}</button>
  )

  // Confirmation modal for remove / block / decline. Renders nothing when
  // there's no pending action.
  const ConfirmDialog = () => {
    if (!confirm) return null
    return (
      <div
        onClick={() => setConfirm(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(6,6,12,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: bgCard, border: `1px solid ${borderClr}`, borderRadius: 20,
            padding: '28px 26px', maxWidth: 380, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: confirm.danger ? 'rgba(239,68,68,0.14)' : `${ACCENT.primary}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <AlertTriangle size={22} style={{ color: confirm.danger ? '#ef4444' : ACCENT.primary }} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: txtPri, marginBottom: 8 }}>{confirm.title}</h3>
          <p style={{ fontSize: 13, color: txtSec, lineHeight: 1.6, marginBottom: 22 }}>{confirm.message}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setConfirm(null)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: `1px solid ${borderClr}`, background: 'transparent',
                color: txtPri, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { confirm.onConfirm(); setConfirm(null) }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: confirm.danger ? '#ef4444' : ACCENT.primary,
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {confirm.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Original Gotham-noir watermark: layered skyline with lit windows,
  // ground fog, and a bat silhouette crossing a spotlight beam. Built from
  // scratch for this redesign — not traced from or copied out of any game,
  // film, or fan artwork. Windows are seeded off username/theme so the
  // scene stays static per render instead of re-randomizing on every
  // re-paint. Dimmer in light mode since dark shapes read much heavier on
  // a white page than on the near-black dark theme.
  const BackgroundArt = () => {
    // Deterministic pseudo-random window placement (no re-shuffle per render)
    const seeded = (n) => { const x = Math.sin(n * 999) * 10000; return x - Math.floor(x) }
    const windows = (buildingX, buildingY, w, h, seedBase) => {
      const cols = Math.max(2, Math.floor(w / 14))
      const rows = Math.max(2, Math.floor(h / 18))
      const cells = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (seeded(seedBase + r * 31 + c * 7) > 0.62) {
            cells.push(
              <rect
                key={`${seedBase}-${r}-${c}`}
                x={buildingX + 6 + c * 14}
                y={buildingY + 10 + r * 18}
                width="5" height="7"
                fill={ACCENT.primary}
                opacity={isDark ? 0.8 : 0.5}
              />
            )
          }
        }
      }
      return cells
    }

    const backBuildings = [
      [0, 780, 90, 120], [100, 820, 70, 80], [180, 760, 60, 140], [250, 800, 100, 100],
      [360, 740, 50, 160], [420, 810, 90, 90], [520, 770, 60, 130], [590, 800, 110, 100],
      [710, 750, 60, 150], [780, 820, 80, 80], [870, 790, 100, 110], [980, 760, 60, 140],
      [1050, 810, 90, 90], [1150, 780, 70, 120], [1230, 820, 100, 80], [1340, 750, 60, 150],
    ]
    const frontBuildings = [
      [-10, 830, 80, 220], [70, 870, 50, 180], [130, 800, 70, 250], [210, 860, 90, 190],
      [310, 780, 55, 270], [375, 850, 100, 200], [485, 810, 60, 240], [555, 870, 85, 180],
      [650, 790, 65, 260], [725, 840, 110, 210], [845, 800, 60, 250], [915, 860, 90, 190],
      [1015, 780, 55, 270], [1080, 850, 100, 200], [1190, 810, 65, 240], [1265, 870, 90, 180],
      [1365, 800, 45, 250],
    ]

    return (
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
      >
        <svg viewBox="0 0 1400 1000" preserveAspectRatio="xMidYMax slice" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="fp-spot" cx="76%" cy="16%" r="46%">
              <stop offset="0%" stopColor={ACCENT.primary} stopOpacity={isDark ? 0.55 : 0.25} />
              <stop offset="55%" stopColor={ACCENT.primary} stopOpacity={isDark ? 0.18 : 0.08} />
              <stop offset="100%" stopColor={ACCENT.primary} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="fp-fog" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgPage} stopOpacity="0" />
              <stop offset="100%" stopColor={bgPage} stopOpacity={isDark ? 0.9 : 0.75} />
            </linearGradient>
            <linearGradient id="fp-top-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bgPage} stopOpacity="1" />
              <stop offset="35%" stopColor={bgPage} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* spotlight glow */}
          <circle cx="1064" cy="160" r="440" fill="url(#fp-spot)" />
          <line x1="1064" y1="160" x2="640" y2="1000" stroke={ACCENT.primary} strokeOpacity={isDark ? 0.10 : 0.05} strokeWidth="90" />
          <line x1="1064" y1="160" x2="1360" y2="1000" stroke={ACCENT.primary} strokeOpacity={isDark ? 0.10 : 0.05} strokeWidth="90" />

          {/* bat silhouette, sitting inside the spotlight */}
          <g transform="translate(1064,150) scale(2.1)" fill={isDark ? '#0b0b14' : '#1b1230'} opacity={isDark ? 0.75 : 0.45}>
            <path d="M0,-6
              C-6,-16 -18,-20 -26,-14
              C-34,-22 -48,-20 -52,-10
              C-70,-16 -96,-6 -108,10
              C-84,4 -66,6 -54,14
              C-64,20 -78,34 -80,50
              C-60,38 -42,32 -30,32
              C-34,40 -32,50 -24,54
              C-20,42 -12,34 -2,32
              L0,30 L2,32
              C12,34 20,42 24,54
              C32,50 34,40 30,32
              C42,32 60,38 80,50
              C78,34 64,20 54,14
              C66,6 84,4 108,10
              C96,-6 70,-16 52,-10
              C48,-20 34,-22 26,-14
              C18,-20 6,-16 0,-6 Z" />
          </g>

          {/* far skyline */}
          <g fill={isDark ? '#1a1830' : '#c9c6dc'} opacity={isDark ? 0.55 : 0.5}>
            {backBuildings.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} />)}
          </g>

          {/* near skyline with lit windows */}
          <g>
            {frontBuildings.map(([x, y, w, h], i) => (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill={isDark ? '#100e1c' : '#8f8aac'} opacity={isDark ? 0.85 : 0.4} />
                {windows(x, y, w, h, i + 1)}
              </g>
            ))}
          </g>

          {/* ground fog + top fade so the art blends into the page rather than hard-cutting */}
          <rect x="0" y="700" width="1400" height="300" fill="url(#fp-fog)" />
          <rect x="0" y="0" width="1400" height="260" fill="url(#fp-top-fade)" />
        </svg>
      </div>
    )
  }

  // ── loading ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <Loader2 size={24} className="animate-spin" style={{ color: ACCENT.primary }} />
      <span style={{ color: txtSec, fontWeight: 600 }}>Loading friends…</span>
    </div>
  )

  const onlineCount = friendPartners.filter(f => f.online).length

  const stats = [
    { label: 'Friends',  value: friendPartners.length, color: ACCENT.primary },
    { label: 'Online',   value: onlineCount,            color: '#22c55e' },
    { label: 'Requests', value: requests.length,       color: '#f59e0b' },
    { label: 'Blocked',  value: blocked.length,        color: txtMut    },
  ]

  // ── main render ───────────────────────────────────────────
  return (
    <div ref={outerRef} style={{ position: 'relative', background: bgPage, minHeight: '100%' }}>
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <BackgroundArt />

      <div
        className="animate-fade-in"
        style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 22,
          padding: isMobile ? '18px 16px' : '28px 32px',
          marginRight: chatPushPx,
          transition: 'margin-right 0.3s',
          minHeight: '100%',
        }}
      >

        {/* ── TOP ROW: title + add btn ─────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          justifyContent: 'space-between',
          gap: isMobile ? 14 : 0,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT.primary, marginBottom: 4 }}>
              YOUR SQUAD
            </p>
            <h1 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, color: txtPri, lineHeight: 1, marginBottom: 6 }}>
              Friends
            </h1>
            <p style={{ fontSize: 13, color: txtSec }}>
              {friendPartners.length} friends &nbsp;·&nbsp;
              <span style={{ color: '#22c55e', fontWeight: 600 }}>{onlineCount} online</span>
            </p>
          </div>
          <button
            onClick={() => setTab('Find People')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${ACCENT.primary}, ${ACCENT.secondary})`,
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: `0 6px 20px ${ACCENT.primary}50`, transition: 'opacity 0.15s',
              width: isMobile ? '100%' : 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <UserPlus size={16} /> Add Friend
          </button>
        </div>

        {/* ── STATS STRIP ──────────────────────────────────── */}
        <div
          className="no-scrollbar"
          style={{
            display: 'flex', alignItems: 'center',
            background: bgCard, border: `1px solid ${borderClr}`,
            borderRadius: 16, padding: isMobile ? '0 16px' : '0 24px',
            overflowX: isMobile ? 'auto' : 'hidden',
          }}
        >
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
              {i > 0 && (
                <div style={{ width: 1, background: borderClr, margin: isMobile ? '0 16px' : '0 24px', alignSelf: 'stretch', minHeight: 64, flexShrink: 0 }} />
              )}
              <div style={{ padding: '18px 0', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: txtMut, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 28, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                  {s.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS (underline style) + search ──────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 10 : 0,
        }}>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex', gap: 0,
              overflowX: 'auto',
              borderBottom: `1px solid ${borderClr}`,
            }}
          >
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  position: 'relative', padding: '10px 18px', flexShrink: 0,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: tab === t ? ACCENT.primary : txtSec,
                  borderBottom: tab === t ? `2px solid ${ACCENT.primary}` : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {t}
                {t === 'Requests' && requests.length > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 15, height: 15, borderRadius: '50%',
                    background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{requests.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'Friends' && (
            <div style={{ position: 'relative', marginBottom: isMobile ? 0 : 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: txtMut }} />
              <input
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                placeholder="Search friends…"
                style={{
                  paddingLeft: 30, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 9, border: `1px solid ${borderClr}`,
                  fontSize: 12, background: bgInput, color: txtPri,
                  outline: 'none', width: isMobile ? '100%' : 190,
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT.primary }}
                onBlur={e => { e.target.style.borderColor = borderClr }}
              />
            </div>
          )}
        </div>

        {/* ── FRIENDS TAB ──────────────────────────────────── */}
        {tab === 'Friends' && (
          filteredFriends.length === 0
            ? <div style={{ textAlign: 'center', padding: '72px 0' }}>
                <Users size={48} style={{ margin: '0 auto 16px', color: txtMut, display: 'block' }} />
                <p style={{ fontSize: 20, fontWeight: 800, color: txtPri, marginBottom: 8 }}>No friends yet</p>
                <p style={{ color: txtSec }}>Use "Find People" to grow your squad</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gap: 20 }}>
                {filteredFriends.map(f => <FriendCard key={f.id} friend={f} />)}
              </div>
        )}

        {/* ── REQUESTS TAB ─────────────────────────────────── */}
        {tab === 'Requests' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 540 }}>
            {requests.length === 0
              ? <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <Bell size={44} style={{ margin: '0 auto 14px', color: txtMut, display: 'block' }} />
                  <p style={{ fontSize: 18, fontWeight: 800, color: txtPri, marginBottom: 8 }}>No pending requests</p>
                  <p style={{ color: txtSec, fontSize: 13 }}>When someone adds you, they'll appear here</p>
                </div>
              : requests.map(req => (
                  <PersonRow key={req.id} person={req.requester} actions={<>
                    {iconBtn(() => acceptRequest(req),  <Check size={16} />, '#10b981', 'rgba(16,185,129,0.14)')}
                    {iconBtn(() => requestDeclineRequest(req), <X size={16} />, txtSec, isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6')}
                  </>} />
                ))
            }
          </div>
        )}

        {/* ── FIND PEOPLE TAB ──────────────────────────────── */}
        {tab === 'Find People' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 540 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: txtMut }} />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by username…"
                style={{
                  width: '100%', paddingLeft: 42, paddingRight: 42, paddingTop: 12, paddingBottom: 12,
                  borderRadius: 12, border: `1.5px solid ${borderClr}`,
                  fontSize: 14, background: bgInput, color: txtPri,
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = ACCENT.primary }}
                onBlur={e => { e.target.style.borderColor = borderClr }}
              />
              {searching && <Loader2 size={15} className="animate-spin" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: txtMut }} />}
            </div>

            {searchQ && !searching && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', padding: '32px 0', color: txtSec, fontWeight: 600 }}>
                No users found for "{searchQ}"
              </p>
            )}

            {searchResults.map(u => {
              const requested = sentTo.has(u.id)
              return (
                <PersonRow key={u.id} person={u} actions={
                  <button
                    onClick={() => !requested && sendRequest(u.id)}
                    disabled={sending[u.id] || requested}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: requested
                        ? (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6')
                        : `linear-gradient(135deg, ${ACCENT.primary}, #8b5cf6)`,
                      color: requested ? txtSec : '#fff', fontSize: 13, fontWeight: 700,
                      cursor: (sending[u.id] || requested) ? 'not-allowed' : 'pointer',
                      opacity: sending[u.id] ? 0.6 : 1, transition: 'opacity 0.15s',
                    }}
                  >
                    {sending[u.id]
                      ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                      : requested
                        ? <><Check size={13} /> Requested</>
                        : <><UserPlus size={13} /> Add</>}
                  </button>
                } />
              )
            })}

            {!searchQ && (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Search size={44} style={{ margin: '0 auto 14px', color: txtMut, display: 'block' }} />
                <p style={{ fontWeight: 800, color: txtPri, fontSize: 17, marginBottom: 8 }}>Find your gaming squad</p>
                <p style={{ color: txtSec, fontSize: 13 }}>Type a username above to search</p>
              </div>
            )}
          </div>
        )}

        {/* ── ONLINE TAB ───────────────────────────────────── */}
        {tab === 'Online' && (
          friendPartners.filter(f => f.online).length === 0
            ? <div style={{ textAlign: 'center', padding: '72px 0' }}>
                <Wifi size={44} style={{ margin: '0 auto 14px', color: txtMut, display: 'block' }} />
                <p style={{ fontWeight: 800, color: txtPri, marginBottom: 8 }}>Nobody online right now</p>
                <p style={{ color: txtSec, fontSize: 13 }}>Your friends will appear here when active</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gap: 20 }}>
                {friendPartners.filter(f => f.online).map(f => (
                  <div
                    key={f.id}
                    onClick={() => setChatFriend(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      background: bgCard, border: `1px solid ${borderClr}`, borderRadius: 14,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${ACCENT.primary}60`; e.currentTarget.style.background = isDark ? 'rgba(168,85,247,0.07)' : '#faf5ff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = borderClr; e.currentTarget.style.background = bgCard }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: avatarColor(f.username), overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 16,
                      boxShadow: '0 0 0 2px #22c55e, 0 0 10px rgba(34,197,94,0.35)',
                    }}>
                      {f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : f.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: txtPri }}>{f.username}</p>
                      <p style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Online</p>
                    </div>
                    <MessageCircle size={14} style={{ color: txtMut, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
        )}

        {/* ── BLOCKED TAB ──────────────────────────────────── */}
        {tab === 'Blocked' && (
          blocked.length === 0
            ? <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <Shield size={48} style={{ margin: '0 auto 16px', color: txtMut, display: 'block' }} />
                <p style={{ fontSize: 20, fontWeight: 800, color: txtPri, marginBottom: 8 }}>No blocked users</p>
                <p style={{ color: txtSec, fontSize: 13 }}>Users you block won't be able to contact you</p>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 540 }}>
                {blocked.map(u => (
                  <PersonRow key={u.id} person={u} actions={
                    <button
                      onClick={() => unblockUser(u.id, u.username)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 10, border: `1px solid ${borderClr}`,
                        background: 'transparent', color: txtPri, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT.primary; e.currentTarget.style.color = ACCENT.primary }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = borderClr; e.currentTarget.style.color = txtPri }}
                    >
                      <Ban size={13} /> Unblock
                    </button>
                  } />
                ))}
              </div>
        )}

      </div>

      {chatFriend && (
        <DMChatPanel
          friend={chatFriend}
          onClose={() => setChatFriend(null)}
          onNewMessage={handleIncomingMessage}
          onRequestRemove={requestRemoveFriend}
          onRequestBlock={requestBlockUser}
          requestConfirm={setConfirm}
        />
      )}

      <ConfirmDialog />
    </div>
  )
}
