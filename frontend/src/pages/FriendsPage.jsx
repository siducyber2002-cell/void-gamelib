import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Check, X, MessageCircle, Shield,
  Search, Loader2, Users, Wifi, Bell, Ban, UserX
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import DMChatPanel from '../components/chat/DMChatPanel'

const TABS = ['Friends', 'Requests', 'Find People', 'Online', 'Blocked']
const ACCENT = { primary: '#a855f7', secondary: '#7c3aed' }

const AVATAR_PALETTE = ['#a855f7','#f43f5e','#10b981','#f59e0b','#8b5cf6','#3b82f6','#ec4899','#14b8a6']
const avatarColor = (name = '') => AVATAR_PALETTE[(name.charCodeAt(0) || 0) % AVATAR_PALETTE.length]

export default function FriendsPage() {
  const { dark: isDark } = useTheme()
  const { user }         = useAuth()

  const [tab, setTab]                     = useState('Friends')
  const [friends, setFriends]             = useState([])
  const [requests, setRequests]           = useState([])
  const [searchQ, setSearchQ]             = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friendSearch, setFriendSearch]   = useState('')
  const [loading, setLoading]             = useState(true)
  const [searching, setSearching]         = useState(false)
  const [sending, setSending]             = useState({})
  const [chatFriend, setChatFriend]       = useState(null)

  // ── theme tokens ──────────────────────────────────────────
  const bgPage    = isDark ? '#0b0b14'               : '#f4f4f8'
  const bgCard    = isDark ? '#13131f'               : '#ffffff'
  const bgInput   = isDark ? '#1a1a2a'               : '#ffffff'
  const borderClr = isDark ? 'rgba(255,255,255,0.08)': '#e8e8f0'
  const txtPri    = isDark ? '#eae8ff'               : '#0f0f1f'
  const txtSec    = isDark ? '#8c8aaa'               : '#6b7280'
  const txtMut    = isDark ? '#504e6a'               : '#a0a0b0'

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
  }, [])
  useEffect(() => { loadFriends() }, [loadFriends])

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
      setSearchResults(r => r.filter(u => u.id !== userId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send request')
    } finally { setSending(s => ({ ...s, [userId]: false })) }
  }

  const acceptRequest = async (id) => {
    try { await axios.post(`/api/friends/accept/${id}`); toast.success('Request accepted! 🎮'); await loadFriends() }
    catch { toast.error('Failed to accept') }
  }
  const declineRequest = async (id) => {
    try { await axios.delete(`/api/friends/decline/${id}`); setRequests(r => r.filter(x => x.id !== id)); toast.success('Declined') }
    catch { toast.error('Failed to decline') }
  }
  const removeFriend = async (partnerId) => {
    try {
      await axios.delete(`/api/friends/remove/${partnerId}`)
      setFriends(f => f.filter(x => getPartner(x).id !== partnerId))
      if (chatFriend?.id === partnerId) setChatFriend(null)
      toast.success('Friend removed')
    } catch { toast.error('Failed to remove') }
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
    const online = true // TODO: real presence

    return (
      <div
        style={{
          background: bgCard,
          border: `1px solid ${active ? ACCENT.primary : borderClr}`,
          borderRadius: 20, overflow: 'hidden',
          boxShadow: active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 12px 40px ${ACCENT.primary}18`
            : isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'transform 0.18s, box-shadow 0.18s',
          cursor: 'default',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 20px 48px ${ACCENT.primary}25`
            : isDark ? `0 16px 40px rgba(0,0,0,0.4)` : '0 12px 32px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.boxShadow = active
            ? `0 0 0 1px ${ACCENT.primary}50, 0 12px 40px ${ACCENT.primary}18`
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setChatFriend(active ? null : friend)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                background: active ? ACCENT.primary : `${ACCENT.primary}18`,
                color: active ? '#fff' : ACCENT.primary,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? `0 4px 16px ${ACCENT.primary}40` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={13} />
              {active ? 'Chatting…' : 'Message'}
            </button>
            <button
              onClick={() => removeFriend(friend.id)}
              title="Remove"
              style={{
                padding: '8px 11px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent',
                border: `1px solid ${borderClr}`,
                color: txtMut, display: 'flex', alignItems: 'center', transition: 'all 0.15s',
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

  // Compact row for Requests / Find People / Online tabs
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

  // ── loading ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <Loader2 size={24} className="animate-spin" style={{ color: ACCENT.primary }} />
      <span style={{ color: txtSec, fontWeight: 600 }}>Loading friends…</span>
    </div>
  )

  const stats = [
    { label: 'Friends',  value: friendPartners.length, color: ACCENT.primary },
    { label: 'Online',   value: friendPartners.length, color: '#22c55e' },
    { label: 'Requests', value: requests.length,       color: '#f59e0b' },
    { label: 'Blocked',  value: 0,                     color: txtMut    },
  ]

  // ── main render ───────────────────────────────────────────
  return (
    <>
      <div
        className="animate-fade-in"
        style={{
          display: 'flex', flexDirection: 'column', gap: 22,
          padding: '28px 32px',
          marginRight: chatFriend ? 384 : 0,
          transition: 'margin-right 0.3s',
          minHeight: '100%',

        }}
      >

        {/* ── TOP ROW: title + add btn ─────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT.primary, marginBottom: 4 }}>
              YOUR SQUAD
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: txtPri, lineHeight: 1, marginBottom: 6 }}>
              Friends
            </h1>
            <p style={{ fontSize: 13, color: txtSec }}>
              {friendPartners.length} friends &nbsp;·&nbsp;
              <span style={{ color: '#22c55e', fontWeight: 600 }}>{friendPartners.length} online</span>
            </p>
          </div>
          <button
            onClick={() => setTab('Find People')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${ACCENT.primary}, ${ACCENT.secondary})`,
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: `0 6px 20px ${ACCENT.primary}50`, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <UserPlus size={16} /> Add Friend
          </button>
        </div>

        {/* ── STATS STRIP ──────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: bgCard, border: `1px solid ${borderClr}`,
          borderRadius: 16, padding: '0 24px', overflow: 'hidden',
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'stretch' }}>
              {i > 0 && (
                <div style={{ width: 1, background: borderClr, margin: '0 24px', alignSelf: 'stretch', minHeight: 64 }} />
              )}
              <div style={{ padding: '18px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: txtMut }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${borderClr}` }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  position: 'relative', padding: '10px 18px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: tab === t ? ACCENT.primary : txtSec,
                  borderBottom: tab === t ? `2px solid ${ACCENT.primary}` : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s',
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
            <div style={{ position: 'relative', marginBottom: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: txtMut }} />
              <input
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                placeholder="Search friends…"
                style={{
                  paddingLeft: 30, paddingRight: 14, paddingTop: 7, paddingBottom: 7,
                  borderRadius: 9, border: `1px solid ${borderClr}`,
                  fontSize: 12, background: bgInput, color: txtPri,
                  outline: 'none', width: 190,
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
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
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
                    {iconBtn(() => acceptRequest(req.id),  <Check size={16} />, '#10b981', 'rgba(16,185,129,0.14)')}
                    {iconBtn(() => declineRequest(req.id), <X size={16} />,     txtSec,   isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6')}
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

            {searchResults.map(u => (
              <PersonRow key={u.id} person={u} actions={
                <button
                  onClick={() => sendRequest(u.id)}
                  disabled={sending[u.id]}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10, border: 'none',
                    background: `linear-gradient(135deg, ${ACCENT.primary}, #8b5cf6)`,
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: sending[u.id] ? 'not-allowed' : 'pointer',
                    opacity: sending[u.id] ? 0.6 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  {sending[u.id]
                    ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                    : <><UserPlus size={13} /> Add</>}
                </button>
              } />
            ))}

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
          friendPartners.length === 0
            ? <div style={{ textAlign: 'center', padding: '72px 0' }}>
                <Wifi size={44} style={{ margin: '0 auto 14px', color: txtMut, display: 'block' }} />
                <p style={{ fontWeight: 800, color: txtPri, marginBottom: 8 }}>Nobody online right now</p>
                <p style={{ color: txtSec, fontSize: 13 }}>Your friends will appear here when active</p>
              </div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {friendPartners.map(f => (
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
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Shield size={48} style={{ margin: '0 auto 16px', color: txtMut, display: 'block' }} />
            <p style={{ fontSize: 20, fontWeight: 800, color: txtPri, marginBottom: 8 }}>No blocked users</p>
            <p style={{ color: txtSec, fontSize: 13 }}>Users you block won't be able to contact you</p>
          </div>
        )}

      </div>

      {chatFriend && <DMChatPanel friend={chatFriend} onClose={() => setChatFriend(null)} />}
    </>
  )
}
