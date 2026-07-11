import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Send, Users, Circle, ShieldCheck, ShieldAlert, UserPlus,
  Check, CheckCheck, X, Loader2, Clock, LogOut, Search, Bell, Paperclip, Smile,
  Camera, Trash2, ImagePlus, Mic, FileText, Download, MoreVertical, Eraser,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const POLL_MS = 4000
const AVATAR_COLORS = ['#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const EMOJI_LIST = [
  '😀','😂','😅','😊','😍','😘','😎','🤔','😴','😭','😡','🥳','😱','🤯','🥺','😇',
  '👍','👎','👏','🙌','🙏','💪','🔥','✨','⭐','💯','✅','❌','❤️','💜','💙','🖤',
  '🎮','🕹️','🏆','🎯','⚔️','🛡️','💣','🚀','🎉','🎊','☠️','👑','🐉','🦾','🎧','📸',
]

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatMsgTime(iso) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`
}

function AvatarStack({ members = [], size = 26 }) {
  const shown = members.slice(0, 3)
  const extra = members.length - shown.length
  return (
    <div className="flex items-center" style={{ paddingLeft: shown.length ? 8 : 0 }}>
      {shown.map((m, i) => (
        <div
          key={m.id}
          className="rounded-full border-2 border-slate-950 flex items-center justify-center text-white font-bold overflow-hidden"
          style={{ width: size, height: size, marginLeft: -8, zIndex: shown.length - i, background: avatarColor(m.username), fontSize: size * 0.4 }}
          title={m.username}
        >
          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-slate-300 font-bold" style={{ width: size, height: size, marginLeft: -8, fontSize: size * 0.32 }}>
          +{extra}
        </div>
      )}
    </div>
  )
}

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [media, setMedia] = useState([])
  const [requests, setRequests] = useState([])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null)
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [friendSending, setFriendSending] = useState({})
  const [friendSent, setFriendSent] = useState(new Set())
  const [reqActing, setReqActing] = useState({})

  const [addOpen, setAddOpen] = useState(false)
  const [friends, setFriends] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addSending, setAddSending] = useState({})
  const [coverUploading, setCoverUploading] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaDeleting, setMediaDeleting] = useState({})
  const [showOptions, setShowOptions] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [promoting, setPromoting] = useState({})
  const [confirmPromote, setConfirmPromote] = useState(null)
  const [newMessagesPending, setNewMessagesPending] = useState(false)
  const coverInputRef = useRef(null)
  const mediaInputRef = useRef(null)
  const attachInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordTimerRef = useRef(null)

  const bottomRef = useRef(null)
  const autoFollowRef = useRef(true)
  const lastMessageIdRef = useRef(null)
  const pollRef = useRef(null)

  const loadAll = useCallback(async () => {
    try {
      const [g, m] = await Promise.all([
        axios.get(`/api/community/groups/${groupId}`),
        axios.get(`/api/community/groups/${groupId}/members`),
      ])
      setGroup(g.data)
      setMembers(m.data)
      if (g.data.is_member) {
        const [msgs, med] = await Promise.all([
          axios.get(`/api/community/groups/${groupId}/messages`),
          axios.get(`/api/community/groups/${groupId}/media`),
        ])
        setMessages(msgs.data)
        setMedia(med.data)
      }
      const selfRole = m.data.find(x => x.is_self)?.role
      if (g.data.is_owner || selfRole === 'admin') {
        const reqs = await axios.get(`/api/community/groups/${groupId}/requests`)
        setRequests(reqs.data)
      }
    } catch {
      toast.error('Group not found')
      navigate('/community')
    } finally {
      setLoading(false)
    }
  }, [groupId, navigate])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!group?.is_member) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/community/groups/${groupId}/messages`)
        setMessages(prev => {
          // Cheap fingerprint (count + last id) instead of a deep compare —
          // messages are effectively append-only, so this is enough to tell
          // "nothing new arrived" apart from "something changed". Skipping
          // setState on a no-op poll avoids re-rendering the whole thread
          // and re-firing the auto-scroll effect every 4 seconds for chats
          // that are just sitting idle.
          const next = res.data
          const same = next.length === prev.length &&
            next[next.length - 1]?.id === prev[prev.length - 1]?.id
          return same ? prev : next
        })
      } catch { /* silent */ }
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [group?.is_member, groupId])

  // Detect the user's *intent* to scroll (wheel/touch) rather than trying to
  // infer it from scroll position. Position-based checks (scrollTop math,
  // IntersectionObserver) all assume we know which element is actually the
  // one scrolling — but that can be the inner pane on some layouts/viewports
  // and an outer page container on others, which is what kept breaking this.
  // A wheel or touch-drag originating over the thread is unambiguous proof
  // the person took control, no matter which ancestor ends up scrolling.
  const stopAutoFollow = () => { autoFollowRef.current = false }

  // Optional convenience: if they scroll back down to the very bottom
  // themselves, resume auto-follow. Harmless if this container isn't the
  // actual scrolling element — it just won't fire, and the Jump to Latest
  // pill still works either way.
  const handleContainerScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      autoFollowRef.current = true
      setNewMessagesPending(false)
    }
  }

  const jumpToLatest = () => {
    autoFollowRef.current = true
    setNewMessagesPending(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const last = messages[messages.length - 1]
    const isNewLastMessage = last && last.id !== lastMessageIdRef.current
    if (last) lastMessageIdRef.current = last.id

    if (autoFollowRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setNewMessagesPending(false)
    } else if (isNewLastMessage) {
      setNewMessagesPending(true)
    }
  }, [messages])

  // NOTE: there used to be a POST to `/messages/read` here on every new
  // message. There's no backend route for it (405 in the logs) and no
  // per-member read-state model for group chat to back one — GroupMessage
  // has no is_read column, and unlike DMs a group needs per-user read
  // tracking (a table keyed on user+group), not a single boolean. Nothing
  // in this page currently reads back an unread state either, so this was
  // a guaranteed-failing request firing on every poll that returned new
  // messages, for no effect. Removed. If per-group unread badges become a
  // real feature, this needs a proper GroupReadState table + route first.

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
      clearInterval(recordTimerRef.current)
    }
  }, [pendingPreviewUrl])

  const handleRequestJoin = async () => {
    setJoining(true)
    try {
      const res = await axios.post(`/api/community/groups/${groupId}/join`)
      setGroup(res.data)
      toast.success('Request sent — waiting on the owner')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send request')
    } finally {
      setJoining(false)
    }
  }

  const handleCancelRequest = async () => {
    setJoining(true)
    try {
      await axios.delete(`/api/community/groups/${groupId}/join`)
      setGroup(g => ({ ...g, has_pending_request: false }))
      toast.success('Request cancelled')
    } catch {
      toast.error('Could not cancel request')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    try {
      await axios.post(`/api/community/groups/${groupId}/leave`)
      toast.success(`Left ${group.name}`)
      navigate('/community')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not leave group')
    }
  }

  const sendMsg = async () => {
    const text = input.trim()
    if (!text && !pendingFile) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('content', text)
      if (pendingFile) fd.append('file', pendingFile)
      const res = await axios.post(`/api/community/groups/${groupId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessages(prev => [...prev, res.data])
      autoFollowRef.current = true
      setInput('')
      clearPendingFile()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Message failed to send')
    } finally {
      setSending(false)
    }
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMsg()
    }
  }

  // ── file attachment picker ──────────────────────────────────
  const handleAttachPick = () => attachInputRef.current?.click()

  const handleAttachChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Attachments must be under 15MB')
      return
    }
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingFile(file)
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  const clearPendingFile = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    setPendingFile(null)
    setPendingPreviewUrl(null)
  }

  // ── emoji picker ─────────────────────────────────────────────
  const insertEmoji = (emoji) => setInput(prev => prev + emoji)

  // ── voice note recording (browser MediaRecorder) ────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(recordTimerRef.current)
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setRecording(false)
        setRecordSeconds(0)
        if (blob.size > 0) await sendVoiceNote(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch {
      toast.error('Microphone access denied or unavailable')
    }
  }

  const stopRecording = () => mediaRecorderRef.current?.stop()

  const sendVoiceNote = async (blob) => {
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('content', '')
      fd.append('file', new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' }))
      const res = await axios.post(`/api/community/groups/${groupId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessages(prev => [...prev, res.data])
      autoFollowRef.current = true
    } catch {
      toast.error('Voice note failed to send')
    } finally {
      setSending(false)
    }
  }

  const sendFriendRequest = async (member) => {
    setFriendSending(s => ({ ...s, [member.id]: true }))
    try {
      await axios.post(`/api/friends/request/${member.id}`)
      setFriendSent(s => new Set(s).add(member.id))
      toast.success(`Friend request sent to ${member.username}`)
    } catch (err) {
      if (err.response?.status === 400 && /already exists/i.test(err.response?.data?.detail || '')) {
        setFriendSent(s => new Set(s).add(member.id))
      } else {
        toast.error(err.response?.data?.detail || 'Could not send request')
      }
    } finally {
      setFriendSending(s => ({ ...s, [member.id]: false }))
    }
  }

  const isAdmin = useMemo(() => members.find(m => m.is_self)?.role === 'admin', [members])
  const canManage = group?.is_owner || isAdmin

  const clearChat = async () => {
    setClearing(true)
    try {
      await axios.delete(`/api/community/groups/${groupId}/messages`)
      setMessages([])
      toast.success('Chat cleared')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not clear chat')
    } finally {
      setClearing(false)
      setShowClearConfirm(false)
      setShowOptions(false)
    }
  }

  const promoteToAdmin = async (member) => {
    setPromoting(s => ({ ...s, [member.id]: true }))
    try {
      await axios.post(`/api/community/groups/${groupId}/members/${member.id}/promote`)
      setMembers(ms => ms.map(m => (m.id === member.id ? { ...m, role: 'admin' } : m)))
      toast.success(`${member.username} is now an admin`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not promote member')
    } finally {
      setPromoting(s => ({ ...s, [member.id]: false }))
      setConfirmPromote(null)
    }
  }

  const acceptRequest = async (req) => {
    setReqActing(s => ({ ...s, [req.id]: true }))
    try {
      await axios.post(`/api/community/groups/${groupId}/requests/${req.id}/accept`)
      setRequests(r => r.filter(x => x.id !== req.id))
      toast.success(`${req.user.username} added to the group`)
      loadAll()
    } catch {
      toast.error('Could not accept request')
    } finally {
      setReqActing(s => ({ ...s, [req.id]: false }))
    }
  }
  const rejectRequest = async (req) => {
    setReqActing(s => ({ ...s, [req.id]: true }))
    try {
      await axios.post(`/api/community/groups/${groupId}/requests/${req.id}/reject`)
      setRequests(r => r.filter(x => x.id !== req.id))
      toast('Request declined')
    } catch {
      toast.error('Could not decline request')
    } finally {
      setReqActing(s => ({ ...s, [req.id]: false }))
    }
  }

  const openAddMembers = async () => {
    setAddOpen(true)
    setFriendsLoading(true)
    try {
      const res = await axios.get('/api/friends/')
      setFriends(res.data)
    } catch {
      toast.error('Could not load friends')
    } finally {
      setFriendsLoading(false)
    }
  }

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members])
  const addableFriends = useMemo(() => {
    return friends
      .map(f => (f.requester.id === user?.id ? f.addressee : f.requester))
      .filter(f => !memberIds.has(f.id))
      .filter(f => f.username.toLowerCase().includes(addSearch.toLowerCase()))
  }, [friends, memberIds, addSearch, user])

  const addMember = async (friend) => {
    setAddSending(s => ({ ...s, [friend.id]: true }))
    try {
      await axios.post(`/api/community/groups/${groupId}/members/${friend.id}`)
      toast.success(`${friend.username} added to ${group.name}`)
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not add member')
    } finally {
      setAddSending(s => ({ ...s, [friend.id]: false }))
    }
  }

  // ── cover art (owner only) ──────────────────────────────────
  const handleCoverPick = () => coverInputRef.current?.click()

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file next time
    if (!file) return
    setCoverUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post(`/api/community/groups/${groupId}/cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setGroup(res.data)
      toast.success('Cover updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not upload cover')
    } finally {
      setCoverUploading(false)
    }
  }

  // ── media feed uploads (any member) ─────────────────────────
  const handleMediaPick = () => mediaInputRef.current?.click()

  const handleMediaChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMediaUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post(`/api/community/groups/${groupId}/media`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMedia(prev => [res.data, ...prev])
      toast.success('Added to media feed')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not upload image')
    } finally {
      setMediaUploading(false)
    }
  }

  const deleteMedia = async (item) => {
    setMediaDeleting(s => ({ ...s, [item.id]: true }))
    try {
      await axios.delete(`/api/community/groups/${groupId}/media/${item.id}`)
      setMedia(prev => prev.filter(m => m.id !== item.id))
    } catch {
      toast.error('Could not remove image')
    } finally {
      setMediaDeleting(s => ({ ...s, [item.id]: false }))
    }
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-slate-500">Loading group…</div>
  if (!group) return null

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 flex flex-col bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden">

          {/* banner header */}
          <div className="relative h-32 sm:h-40 flex-shrink-0">
            {group.banner_url ? (
              <img src={group.banner_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <button
              onClick={() => navigate('/community')}
              className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
            >
              <ArrowLeft size={16} />
            </button>

            {canManage && (
              <>
                <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverChange} className="hidden" />
                <button
                  onClick={handleCoverPick}
                  disabled={coverUploading}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur text-white text-xs font-semibold hover:bg-black/60 disabled:opacity-60"
                >
                  {coverUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  <span className="hidden sm:inline">{coverUploading ? 'Uploading…' : 'Change Cover'}</span>
                </button>
              </>
            )}

            <div className="absolute bottom-2 sm:bottom-3 left-3 sm:left-4 right-3 sm:right-4 flex items-end justify-between gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-end gap-2 sm:gap-3 min-w-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-violet-600 border-2 border-slate-950 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                  {group.banner_url ? <img src={group.banner_url} className="w-full h-full object-cover" alt="" /> : group.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 pb-0.5">
                  <h2 className="font-display font-bold text-white text-base sm:text-xl truncate drop-shadow">{group.name}</h2>
                  <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5">
                    <Circle size={7} className="text-emerald-400 fill-current" /> {group.activity_status} · {group.member_count.toLocaleString()} Operators
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0 pb-0.5 flex items-center gap-2">
                {canManage && (
                  <button onClick={openAddMembers} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg">
                    <UserPlus size={14} /> Invite
                  </button>
                )}
                {group.is_member ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowOptions(s => !s)}
                      className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-white flex items-center justify-center hover:bg-black/60"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showOptions && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowOptions(false)} />
                        <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30">
                          {canManage && (
                            <button
                              onClick={() => { setShowOptions(false); setShowClearConfirm(true) }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 text-left"
                            >
                              <Eraser size={14} /> Clear Chat
                            </button>
                          )}
                          <button onClick={handleLeave} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-rose-400 hover:bg-slate-800 text-left">
                            <LogOut size={14} /> Leave Group
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : group.has_pending_request ? (
                  <button onClick={handleCancelRequest} disabled={joining} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-slate-300 text-xs sm:text-sm font-bold disabled:opacity-50">
                    <Clock size={14} /> <span>Cancel</span><span className="hidden sm:inline">&nbsp;Request</span>
                  </button>
                ) : (
                  <button onClick={handleRequestJoin} disabled={joining} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg disabled:opacity-50">
                    {joining ? <Loader2 size={14} className="animate-spin" /> : null}
                    {joining ? 'Sending…' : 'Request to Join'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* messages */}
          <div className="relative flex-1 min-h-[320px]">
          <div
            onWheel={stopAutoFollow}
            onTouchMove={stopAutoFollow}
            onScroll={handleContainerScroll}
            className="absolute inset-0 overflow-y-auto p-5 flex flex-col gap-4"
          >
            {!group.is_member ? (
              <div className="m-auto text-center max-w-xs">
                <ShieldCheck size={36} className="mx-auto mb-3 text-slate-600" />
                <p className="font-semibold text-white">
                  {group.has_pending_request ? 'Your request is pending' : `Join ${group.name} to chat`}
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  {group.has_pending_request
                    ? 'The group owner needs to approve your request before you can see messages.'
                    : "Send a request above — once the owner approves, you'll see the chat here."}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center text-slate-500">No messages yet — say hi 👋</div>
            ) : messages.map(msg => {
              const self = msg.author_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-3 ${self ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {msg.author.avatar_url ? <img src={msg.author.avatar_url} className="w-full h-full object-cover" alt="" /> : msg.author.username[0]?.toUpperCase()}
                  </div>
                  <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${self ? 'items-end' : 'items-start'}`}>
                    {!self && <span className="text-xs font-bold text-violet-400">{msg.author.username}</span>}

                    {msg.attachment_type === 'image' && (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden max-w-[240px] border border-slate-700">
                        <img src={msg.attachment_url} alt={msg.attachment_name} className="w-full max-h-64 object-cover" />
                      </a>
                    )}

                    {msg.attachment_type === 'voice' && (
                      <div className={`rounded-2xl px-3 py-2 ${self ? 'bg-violet-600' : 'bg-slate-800'}`}>
                        <audio controls src={msg.attachment_url} className="h-9" style={{ maxWidth: 220 }} />
                      </div>
                    )}

                    {msg.attachment_type === 'file' && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={msg.attachment_name}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border ${self ? 'bg-violet-600 border-violet-500' : 'bg-slate-800 border-slate-700'} hover:opacity-90 transition`}
                      >
                        <FileText size={18} className="text-white flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-[160px]">{msg.attachment_name}</p>
                          <p className="text-[10px] text-white/70">{formatBytes(msg.attachment_size)}</p>
                        </div>
                        <Download size={14} className="text-white/80 flex-shrink-0 ml-1" />
                      </a>
                    )}

                    {msg.content && (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${self ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                        {msg.content}
                      </div>
                    )}

                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {formatMsgTime(msg.created_at)}
                      {self && (
                        msg.seen_by?.length > 0
                          ? <CheckCheck size={13} className="text-sky-400" />
                          : <Check size={13} className="text-slate-500" />
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {newMessagesPending && (
            <button
              onClick={jumpToLatest}
              className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-xl shadow-violet-950/40 z-20"
            >
              <ChevronDown size={13} /> New messages
            </button>
          )}
          </div>

          {/* input */}
          {group.is_member && (
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-slate-800 relative">

              {showEmoji && (
                <div className="absolute bottom-full right-2 sm:right-5 mb-2 w-64 max-w-[85vw] bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl z-20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Emoji</span>
                    <button onClick={() => setShowEmoji(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                    {EMOJI_LIST.map(e => (
                      <button
                        key={e}
                        onClick={() => insertEmoji(e)}
                        className="text-lg hover:bg-slate-800 rounded-lg p-1 transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 w-fit max-w-full">
                  {pendingPreviewUrl ? (
                    <img src={pendingPreviewUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <FileText size={18} className="text-violet-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate max-w-[180px]">{pendingFile.name}</p>
                    <p className="text-[10px] text-slate-500">{formatBytes(pendingFile.size)}</p>
                  </div>
                  <button onClick={clearPendingFile} className="text-slate-500 hover:text-white flex-shrink-0 ml-1"><X size={14} /></button>
                </div>
              )}

              {recording && (
                <button
                  onClick={stopRecording}
                  title="Tap to stop and send"
                  className="absolute -top-14 right-3 sm:right-5 flex items-center gap-2.5 bg-rose-600 hover:bg-rose-500 text-white pl-3 pr-4 py-2 rounded-full shadow-xl shadow-rose-950/40 animate-fade-in z-20"
                >
                  <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-xs font-bold tabular-nums">
                    {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:{String(recordSeconds % 60).padStart(2, '0')}
                  </span>
                  <Mic size={14} />
                </button>
              )}

              <div className="flex gap-1 sm:gap-2 items-center bg-slate-900 border border-slate-800 rounded-2xl px-2 sm:px-3 py-2">
                <input ref={attachInputRef} type="file" onChange={handleAttachChange} className="hidden" />
                <button onClick={handleAttachPick} disabled={recording} className="text-slate-500 hover:text-slate-300 flex-shrink-0 p-1 disabled:opacity-40"><Paperclip size={16} /></button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={recording}
                  placeholder={recording ? 'Recording voice note…' : `Message ${group.name}...`}
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none py-1 disabled:opacity-40"
                />
                <button onClick={() => setShowEmoji(s => !s)} disabled={recording} className="text-slate-500 hover:text-slate-300 flex-shrink-0 p-1 disabled:opacity-40"><Smile size={16} /></button>
                <button onClick={startRecording} disabled={recording} className={`flex-shrink-0 p-1 ${recording ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}><Mic size={16} /></button>
                <button
                  onClick={sendMsg}
                  disabled={recording || (!input.trim() && !pendingFile) || sending}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-violet-600 to-purple-500 disabled:opacity-40 flex-shrink-0"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

          {canManage && requests.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Bell size={12} /> Join Requests ({requests.length})
              </h4>
              <div className="flex flex-col gap-2">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      {req.user.avatar_url ? <img src={req.user.avatar_url} className="w-full h-full object-cover" alt="" /> : req.user.username[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-300 truncate flex-1">{req.user.username}</span>
                    {reqActing[req.id] ? (
                      <Loader2 size={14} className="animate-spin text-slate-500" />
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => acceptRequest(req)} className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/25">
                          <Check size={14} />
                        </button>
                        <button onClick={() => rejectRequest(req)} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Users size={12} /> Members</h4>
              <AvatarStack members={members} size={22} />
            </div>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {members.map(m => {
                const sent = friendSent.has(m.id)
                const sending = friendSending[m.id]
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
                      </div>
                      <Circle size={8} className={`absolute -bottom-0.5 -right-0.5 fill-current ${m.online ? 'text-emerald-400' : 'text-slate-600'}`} />
                    </div>
                    <span className="text-sm text-slate-300 truncate flex-1">{m.username}</span>
                    {m.role === 'owner' && <ShieldCheck size={12} className="text-amber-400 flex-shrink-0" title="Owner" />}
                    {m.role === 'admin' && <ShieldAlert size={12} className="text-sky-400 flex-shrink-0" title="Admin" />}
                    {canManage && !m.is_self && m.role !== 'owner' && m.role !== 'admin' && (
                      <button
                        onClick={() => setConfirmPromote(m)}
                        disabled={promoting[m.id]}
                        title="Make admin"
                        className="w-6 h-6 rounded-md bg-sky-600/15 text-sky-400 hover:bg-sky-600/25 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                      >
                        {promoting[m.id] ? <Loader2 size={11} className="animate-spin" /> : <ShieldAlert size={11} />}
                      </button>
                    )}
                    {!m.is_self && !m.is_friend && (
                      <button
                        onClick={() => !sent && sendFriendRequest(m)}
                        disabled={sending || sent}
                        title={sent ? 'Request sent' : 'Add friend'}
                        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${sent ? 'bg-slate-800 text-slate-500' : 'bg-violet-600/15 text-violet-400 hover:bg-violet-600/25'} disabled:cursor-not-allowed`}
                      >
                        {sending ? <Loader2 size={11} className="animate-spin" /> : sent ? <Check size={11} /> : <UserPlus size={11} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Media Feed</h4>
              <div className="flex items-center gap-3">
                {media.length > 0 && <span className="text-xs text-violet-400 font-semibold cursor-pointer hover:text-violet-300">View All</span>}
                {group.is_member && (
                  <>
                    <input ref={mediaInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleMediaChange} className="hidden" />
                    <button
                      onClick={handleMediaPick}
                      disabled={mediaUploading}
                      title="Upload image"
                      className="w-6 h-6 rounded-md bg-violet-600/15 text-violet-400 flex items-center justify-center hover:bg-violet-600/25 disabled:opacity-50"
                    >
                      {mediaUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    </button>
                  </>
                )}
              </div>
            </div>
            {media.length === 0 ? (
              <p className="text-xs text-slate-600">No media shared yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {media.slice(0, 6).map(m => {
                  const canDelete = canManage || m.uploaded_by?.id === user?.id
                  const deleting = mediaDeleting[m.id]
                  return (
                    <div key={m.id} className="relative group/media aspect-square rounded-lg overflow-hidden bg-slate-800">
                      <img src={m.image_url} className="w-full h-full object-cover" alt="" />
                      {canDelete && (
                        <button
                          onClick={() => deleteMedia(m)}
                          disabled={deleting}
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition disabled:opacity-60"
                        >
                          {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {group.directives.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Directive</h4>
              <ol className="list-decimal list-inside flex flex-col gap-1.5 text-xs text-slate-400">
                {group.directives.map((d, i) => <li key={i}>{d}</li>)}
              </ol>
            </div>
          )}
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowClearConfirm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-white text-lg">Clear all messages?</h2>
            <p className="text-sm text-slate-400">
              This permanently deletes every message in {group.name} for all members, to help free up space. This can't be undone.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setShowClearConfirm(false)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={clearChat}
                disabled={clearing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {clearing ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />} Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmPromote(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-white text-lg">Make {confirmPromote.username} an admin?</h2>
            <p className="text-sm text-slate-400">
              They'll get the same management powers as you in {group.name} — inviting members, approving join requests, changing the cover, and clearing chat.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setConfirmPromote(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => promoteToAdmin(confirmPromote)}
                disabled={promoting[confirmPromote.id]}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {promoting[confirmPromote.id] ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />} Make Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-3 max-h-[78vh]">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-lg">Invite Friends</h2>
              <button onClick={() => setAddOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Search your friends..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700 focus:border-violet-500"
              />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto min-h-[140px]">
              {friendsLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
              ) : addableFriends.length === 0 ? (
                <p className="text-center py-7 text-slate-500 text-sm">
                  {friends.length === 0 ? "You don't have any friends yet — add some first!" : 'Everyone from your friends list is already here.'}
                </p>
              ) : addableFriends.map(f => {
                const sending = addSending[f.id]
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-800">
                    <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" alt="" /> : f.username[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{f.username}</span>
                    <button
                      onClick={() => addMember(f)}
                      disabled={sending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Add
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
