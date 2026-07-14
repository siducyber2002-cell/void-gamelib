import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Send, Users, Circle, ShieldCheck, ShieldAlert, UserPlus,
  Check, CheckCheck, X, Loader2, Clock, LogOut, Search, Bell, Paperclip, Smile,
  Camera, Trash2, ImagePlus, Mic, FileText, Download, MoreVertical, Eraser,
  ChevronDown, Pin, PinOff, Pencil, CornerUpLeft, UserMinus,
  MessageSquare, Image as ImageIcon, ShieldOff, Crown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageTour from '../components/onboarding/PageTour'
import { groupDetailTourSteps } from '../components/onboarding/tourSteps'

const POLL_MS = 4000
const TYPING_POLL_MS = 3000
const TYPING_PING_MS = 2500 // throttle: don't ping the typing endpoint more often than this
const AVATAR_COLORS = ['#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const EMOJI_LIST = [
  '😀','😂','😅','😊','😍','😘','😎','🤔','😴','😭','😡','🥳','😱','🤯','🥺','😇',
  '👍','👎','👏','🙌','🙏','💪','🔥','✨','⭐','💯','✅','❌','❤️','💜','💙','🖤',
  '🎮','🕹️','🏆','🎯','⚔️','🛡️','💣','🚀','🎉','🎊','☠️','👑','🐉','🦾','🎧','📸',
]

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

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

// Splits message text on @mentions and highlights them — purely visual,
// doesn't validate the mention actually resolved to a real member (the
// backend already did that work when deciding who gets notified).
function renderMessageContent(content) {
  if (!content) return null
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') && part.length > 1
      ? <span key={i} className="text-violet-600 dark:text-violet-400 font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  )
}

function AvatarStack({ members = [], size = 26 }) {
  const shown = members.slice(0, 3)
  const extra = members.length - shown.length
  return (
    <div className="flex items-center" style={{ paddingLeft: shown.length ? 8 : 0 }}>
      {shown.map((m, i) => (
        <div
          key={m.id}
          className="rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center text-white font-bold overflow-hidden"
          style={{ width: size, height: size, marginLeft: -8, zIndex: shown.length - i, background: avatarColor(m.username), fontSize: size * 0.4 }}
          title={m.username}
        >
          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold" style={{ width: size, height: size, marginLeft: -8, fontSize: size * 0.32 }}>
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
  const [removing, setRemoving] = useState({})
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [newMessagesPending, setNewMessagesPending] = useState(false)

  // ── Ownership hierarchy: demote (owner-only), leave (with mandatory
  // succession for owners), and standalone disband ──────────────────────
  const [demoting, setDemoting] = useState({})
  const [confirmDemote, setConfirmDemote] = useState(null)
  const [leaving, setLeaving] = useState(false)
  // leaveFlow: null | 'confirm' (regular member/admin) | 'transfer' (owner,
  // other members exist — must hand off first) | 'solo' (owner is the only
  // member left — leaving IS disbanding)
  const [leaveFlow, setLeaveFlow] = useState(null)
  const [transferTarget, setTransferTarget] = useState(null)
  const [transferring, setTransferring] = useState(false)
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false)
  const [disbanding, setDisbanding] = useState(false)

  // ── Mobile layout: chat / members / media are shown one at a time via
  // tabs instead of all stacking on top of each other. Desktop (lg+) keeps
  // showing all three side by side, so this only drives visibility below
  // that breakpoint — see the tab bar + section classNames in the render.
  const [activeTab, setActiveTab] = useState('chat')

  // ── Reply / edit / react / pin / mentions / typing / search ──────────
  const [replyingTo, setReplyingTo] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [reactingTo, setReactingTo] = useState(null)
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [showPinnedRail, setShowPinnedRail] = useState(true)
  const [pinningId, setPinningId] = useState(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [highlightMsgId, setHighlightMsgId] = useState(null)

  const coverInputRef = useRef(null)
  const mediaInputRef = useRef(null)
  const attachInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const textareaRef = useRef(null)
  const messageRefs = useRef({})       // msg id -> DOM node, for jump-to-message
  const typingPingRef = useRef(0)      // last time we pinged the typing endpoint
  const searchTimerRef = useRef(null)
  const highlightTimerRef = useRef(null)

  const bottomRef = useRef(null)
  const autoFollowRef = useRef(true)
  const lastMessageIdRef = useRef(null)
  const pollRef = useRef(null)
  const typingPollRef = useRef(null)

  const loadAll = useCallback(async () => {
    try {
      const [g, m] = await Promise.all([
        axios.get(`/api/community/groups/${groupId}`),
        axios.get(`/api/community/groups/${groupId}/members`),
      ])
      setGroup(g.data)
      setMembers(m.data)
      if (g.data.is_member) {
        const [msgs, med, pinned] = await Promise.all([
          axios.get(`/api/community/groups/${groupId}/messages`),
          axios.get(`/api/community/groups/${groupId}/media`),
          axios.get(`/api/community/groups/${groupId}/messages/pinned`).catch(() => ({ data: [] })),
        ])
        setMessages(msgs.data)
        setMedia(med.data)
        setPinnedMessages(pinned.data)
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

  // ── Typing indicator poll — separate, faster interval than the message
  // poll since "is typing" needs to feel closer to live. ──────────────
  useEffect(() => {
    if (!group?.is_member) return
    const tick = async () => {
      try {
        const res = await axios.get(`/api/community/groups/${groupId}/typing`)
        setTypingUsers(res.data)
      } catch { /* silent */ }
    }
    tick()
    typingPollRef.current = setInterval(tick, TYPING_POLL_MS)
    return () => clearInterval(typingPollRef.current)
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
      clearTimeout(searchTimerRef.current)
      clearTimeout(highlightTimerRef.current)
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

  // Opens the right confirmation flow depending on who's leaving:
  // - regular member/admin → simple confirm
  // - owner with others still in the group → must pick a successor first
  // - owner who's the last one left → leaving = disbanding, no successor possible
  const openLeaveFlow = () => {
    setShowOptions(false)
    if (group.is_owner) {
      const others = members.filter(m => !m.is_self)
      setTransferTarget(null)
      setLeaveFlow(others.length === 0 ? 'solo' : 'transfer')
    } else {
      setLeaveFlow('confirm')
    }
  }

  const leaveGroup = async () => {
    setLeaving(true)
    try {
      await axios.post(`/api/community/groups/${groupId}/leave`)
      toast.success(`Left ${group.name}`)
      navigate('/community')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not leave group')
      setLeaving(false)
    }
  }

  const transferAndLeave = async () => {
    if (!transferTarget) return
    setTransferring(true)
    try {
      await axios.post(`/api/community/groups/${groupId}/transfer-ownership`, { new_owner_id: transferTarget.id })
      toast.success(`Ownership transferred to ${transferTarget.username}`)
      await axios.post(`/api/community/groups/${groupId}/leave`)
      toast.success(`Left ${group.name}`)
      navigate('/community')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not complete the handover — you have not left the group')
      setTransferring(false)
    }
  }

  // Used both for the standalone "Disband Group" action and for the
  // "you're the last member" leave path — both permanently delete the group.
  const disbandGroup = async () => {
    setDisbanding(true)
    try {
      await axios.delete(`/api/community/groups/${groupId}`)
      toast.success(`${group.name} has been disbanded`)
      navigate('/community')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not disband group')
      setDisbanding(false)
    }
  }

  const demoteAdmin = async (member) => {
    setDemoting(s => ({ ...s, [member.id]: true }))
    try {
      await axios.post(`/api/community/groups/${groupId}/members/${member.id}/demote`)
      setMembers(ms => ms.map(m => (m.id === member.id ? { ...m, role: 'member' } : m)))
      toast.success(`${member.username} is no longer an admin`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not demote member')
    } finally {
      setDemoting(s => ({ ...s, [member.id]: false }))
      setConfirmDemote(null)
    }
  }

  // ── typing indicator ping/clear ─────────────────────────────────────
  const pingTyping = () => {
    const now = Date.now()
    if (now - typingPingRef.current < TYPING_PING_MS) return
    typingPingRef.current = now
    axios.post(`/api/community/groups/${groupId}/typing`).catch(() => {})
  }
  const clearTyping = () => {
    typingPingRef.current = 0
    axios.delete(`/api/community/groups/${groupId}/typing`).catch(() => {})
  }

  // ── @mention autocomplete ────────────────────────────────────────────
  const mentionCandidates = useMemo(() => {
    if (!mentionOpen) return []
    const q = mentionQuery.toLowerCase()
    return members.filter(m => !m.is_self && m.username.toLowerCase().startsWith(q)).slice(0, 6)
  }, [mentionOpen, mentionQuery, members])

  const insertMention = (username) => {
    const el = textareaRef.current
    if (!el) {
      setInput(prev => `${prev}@${username} `)
      setMentionOpen(false)
      return
    }
    const cursor = el.selectionStart
    const before = input.slice(0, cursor)
    const after = input.slice(cursor)
    const newBefore = before.replace(/@(\w*)$/, `@${username} `)
    const newVal = newBefore + after
    setInput(newVal)
    setMentionOpen(false)
    requestAnimationFrame(() => {
      el.focus()
      const pos = newBefore.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    pingTyping()

    const cursor = e.target.selectionStart
    const uptoCursor = val.slice(0, cursor)
    const match = uptoCursor.match(/(?:^|\s)@(\w*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
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
      if (replyingTo) fd.append('reply_to_id', replyingTo.id)
      const res = await axios.post(`/api/community/groups/${groupId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMessages(prev => [...prev, res.data])
      autoFollowRef.current = true
      setInput('')
      setReplyingTo(null)
      setMentionOpen(false)
      clearPendingFile()
      clearTyping()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Message failed to send')
    } finally {
      setSending(false)
    }
  }
  const handleKeyDown = (e) => {
    if (mentionOpen && (e.key === 'Escape')) {
      setMentionOpen(false)
      return
    }
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

  // ── emoji picker (for composing) ─────────────────────────────
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

  // Media Feed shows two different sources: images uploaded through the
  // panel's own button (`media` state, deletable) and images shared as chat
  // attachments (deletable in the message thread, not from here — there's no
  // backend route for that). Previously the panel only ever read `media`,
  // so anything shared via chat never showed up here even though it had
  // clearly been posted, which read as "No media shared yet" being wrong.
  // This merges both for *display* only; upload flow and delete permissions
  // are untouched.
  const combinedMedia = useMemo(() => {
    const chatImages = messages
      .filter(m => m.attachment_type === 'image')
      .map(m => ({ key: `msg-${m.id}`, image_url: m.attachment_url, created_at: m.created_at, canDelete: false, raw: null }))
    const uploads = media.map(m => ({
      key: `media-${m.id}`,
      image_url: m.image_url,
      created_at: m.created_at,
      canDelete: canManage || m.uploaded_by?.id === user?.id,
      raw: m,
    }))
    return [...uploads, ...chatImages].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [messages, media, canManage, user])

  const clearChat = async () => {
    setClearing(true)
    try {
      await axios.delete(`/api/community/groups/${groupId}/messages`)
      setMessages([])
      setPinnedMessages([])
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

  const removeMember = async (member) => {
    setRemoving(s => ({ ...s, [member.id]: true }))
    try {
      await axios.delete(`/api/community/groups/${groupId}/members/${member.id}`)
      setMembers(ms => ms.filter(m => m.id !== member.id))
      setGroup(g => ({ ...g, member_count: Math.max(0, g.member_count - 1) }))
      toast.success(`${member.username} removed from the group`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not remove member')
    } finally {
      setRemoving(s => ({ ...s, [member.id]: false }))
      setConfirmRemove(null)
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

  // ── reactions ─────────────────────────────────────────────────────
  const toggleReaction = async (msg, emoji) => {
    setReactingTo(null)
    try {
      const res = await axios.post(`/api/community/groups/${groupId}/messages/${msg.id}/reactions`, { emoji })
      setMessages(prev => prev.map(m => (m.id === msg.id ? res.data : m)))
    } catch {
      toast.error('Could not react')
    }
  }

  // ── edit ──────────────────────────────────────────────────────────
  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.content)
    setReactingTo(null)
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }
  const saveEdit = async (msg) => {
    const text = editText.trim()
    if (!text) {
      toast.error("Message can't be empty")
      return
    }
    setSavingEdit(true)
    try {
      const res = await axios.patch(`/api/community/groups/${groupId}/messages/${msg.id}`, { content: text })
      setMessages(prev => prev.map(m => (m.id === msg.id ? res.data : m)))
      cancelEdit()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not edit message')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── delete own message ───────────────────────────────────────────
  const deleteOwnMessage = async (msg) => {
    try {
      await axios.delete(`/api/community/groups/${groupId}/messages/${msg.id}`)
      setMessages(prev => prev.filter(m => m.id !== msg.id))
      setPinnedMessages(prev => prev.filter(m => m.id !== msg.id))
      toast.success('Message deleted')
    } catch {
      toast.error('Could not delete message')
    }
  }

  // ── reply ─────────────────────────────────────────────────────────
  const startReply = (msg) => {
    setReplyingTo(msg)
    setReactingTo(null)
    textareaRef.current?.focus()
  }
  const cancelReply = () => setReplyingTo(null)

  // ── pin / unpin (owner or admin) ─────────────────────────────────
  const pinMessage = async (msg) => {
    setPinningId(msg.id)
    try {
      const res = await axios.post(`/api/community/groups/${groupId}/messages/${msg.id}/pin`)
      setMessages(prev => prev.map(m => (m.id === msg.id ? res.data : m)))
      setPinnedMessages(prev => [res.data, ...prev.filter(p => p.id !== msg.id)])
      setShowPinnedRail(true)
      toast.success('Message pinned')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not pin message')
    } finally {
      setPinningId(null)
    }
  }
  const unpinMessage = async (msg) => {
    setPinningId(msg.id)
    try {
      const res = await axios.delete(`/api/community/groups/${groupId}/messages/${msg.id}/pin`)
      setMessages(prev => prev.map(m => (m.id === msg.id ? res.data : m)))
      setPinnedMessages(prev => prev.filter(p => p.id !== msg.id))
    } catch {
      toast.error('Could not unpin message')
    } finally {
      setPinningId(null)
    }
  }

  // ── jump to a message (from reply preview, pinned rail, or search) ──
  const jumpToMessage = (id) => {
    setSearchOpen(false)
    const node = messageRefs.current[id]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      clearTimeout(highlightTimerRef.current)
      setHighlightMsgId(id)
      highlightTimerRef.current = setTimeout(() => setHighlightMsgId(h => (h === id ? null : h)), 1800)
    } else {
      toast('That message is further up the thread — keep scrolling to find it')
    }
  }

  // ── search ────────────────────────────────────────────────────────
  const runSearch = async (q) => {
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await axios.get(`/api/community/groups/${groupId}/messages/search`, { params: { q } })
      setSearchResults(res.data)
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }
  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => runSearch(q), 350)
  }
  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-slate-400 dark:text-slate-500">Loading group…</div>
  if (!group) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white dark:bg-slate-950 p-2 sm:p-3 h-[100dvh] lg:static lg:h-auto lg:z-auto lg:block lg:bg-transparent lg:dark:bg-transparent lg:p-4 lg:animate-fade-in overflow-hidden lg:overflow-visible">
      {/* ── First-time guided tour ── */}
      {/* pageKey is fixed (not per-group) — the UI is identical across every
          group, so one "seen" flag covers all of them. Gated on is_member
          since the chat/members/media panels this tour targets only render
          once the user has actually joined. */}
      <PageTour
        pageKey="group-detail"
        steps={groupDetailTourSteps}
        ready={!loading && !!group?.is_member}
      />

          {/* banner header */}
          <div className="relative h-32 sm:h-40 flex-shrink-0 rounded-3xl overflow-hidden mb-3 lg:mb-4">
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

            <div className="absolute bottom-2 sm:bottom-3 left-3 sm:left-4 right-3 sm:right-4 flex items-end justify-between gap-2 sm:gap-3">
              <div className="flex items-end gap-2 sm:gap-3 min-w-0">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-violet-600 border-2 border-slate-950 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                  {group.banner_url ? <img src={group.banner_url} className="w-full h-full object-cover" alt="" /> : group.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 pb-0.5">
                  <h2 className="font-display font-bold text-white text-base sm:text-xl truncate drop-shadow">{group.name}</h2>
                  <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5 truncate">
                    <Circle size={7} className="text-emerald-400 fill-current flex-shrink-0" /> <span className="truncate">{group.activity_status} · {group.member_count.toLocaleString()} Operators</span>
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0 pb-0.5 flex items-center gap-1.5 sm:gap-2">
                {canManage && (
                  <button onClick={openAddMembers} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg flex-shrink-0">
                    <UserPlus size={14} /> <span className="hidden sm:inline">Invite</span>
                  </button>
                )}
                {group.is_member && (
                  <button
                    onClick={() => setSearchOpen(s => !s)}
                    title="Search messages"
                    className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-white flex items-center justify-center hover:bg-black/60 flex-shrink-0"
                  >
                    <Search size={15} />
                  </button>
                )}
                {group.is_member ? (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowOptions(s => !s)}
                      className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-white flex items-center justify-center hover:bg-black/60"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showOptions && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowOptions(false)} />
                        <div className="absolute right-0 top-full mt-2 w-48 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30">
                          {pinnedMessages.length > 0 && (
                            <button
                              onClick={() => { setShowOptions(false); setShowPinnedRail(true) }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-left"
                            >
                              <Pin size={14} /> Pinned Messages ({pinnedMessages.length})
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => { setShowOptions(false); setShowClearConfirm(true) }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-left"
                            >
                              <Eraser size={14} /> Clear Chat
                            </button>
                          )}
                          <button onClick={openLeaveFlow} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-left">
                            <LogOut size={14} /> Leave Group
                          </button>
                          {group.is_owner && (
                            <button
                              onClick={() => { setShowOptions(false); setShowDisbandConfirm(true) }}
                              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-rose-500 font-semibold hover:bg-rose-500/10 text-left border-t border-slate-200 dark:border-slate-800"
                            >
                              <Trash2 size={14} /> Disband Group
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : group.has_pending_request ? (
                  <button onClick={handleCancelRequest} disabled={joining} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold disabled:opacity-50 flex-shrink-0 whitespace-nowrap">
                    <Clock size={14} className="flex-shrink-0" /> <span>Cancel</span><span className="hidden sm:inline">&nbsp;Request</span>
                  </button>
                ) : (
                  <button onClick={handleRequestJoin} disabled={joining} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg disabled:opacity-50 flex-shrink-0 whitespace-nowrap">
                    {joining ? <Loader2 size={14} className="animate-spin flex-shrink-0" /> : null}
                    {joining ? 'Sending…' : <><span className="sm:hidden">Join</span><span className="hidden sm:inline">Request to Join</span></>}
                  </button>
                )}
              </div>
            </div>
          </div>

      {/* mobile tab bar — chat / members / media, one section visible at a
          time below lg. Desktop keeps the classic side-by-side layout, so
          this bar itself is hidden there. */}
      <div className="flex lg:hidden flex-shrink-0 items-center gap-1 mb-3 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        {[
          { key: 'chat', label: 'Chat', icon: MessageSquare },
          { key: 'members', label: 'Members', icon: Users, badge: members.length },
          { key: 'media', label: 'Media', icon: ImageIcon, badge: combinedMedia.length },
        ].map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === key
                ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="relative">
              <Icon size={14} />
              {key === 'members' && canManage && requests.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {requests.length}
                </span>
              )}
            </span>
            <span className="truncate">{label}</span>
            {!!badge && <span className="text-[10px] opacity-60 flex-shrink-0">{badge}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 min-h-0 flex-col bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden`}>


          {/* pinned rail */}
          {group.is_member && pinnedMessages.length > 0 && showPinnedRail && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-amber-500/5 overflow-x-auto flex-shrink-0">
              <Pin size={13} className="text-amber-500 flex-shrink-0" />
              <div className="flex gap-2 flex-1 min-w-0">
                {pinnedMessages.map(p => (
                  <button
                    key={p.id}
                    onClick={() => jumpToMessage(p.id)}
                    className="flex-shrink-0 max-w-[200px] text-left px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition"
                  >
                    <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400">{p.author.username}</span>
                    <span className="block text-xs text-slate-600 dark:text-slate-300 truncate">{p.content || 'Attachment'}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPinnedRail(false)} title="Hide pinned" className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          )}

          {/* messages */}
          <div className="relative flex-1 min-h-0 lg:min-h-[320px]">

          {/* search overlay */}
          {searchOpen && (
            <div className="absolute inset-x-0 top-0 z-30 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-2 max-h-[80%] shadow-xl">
              <div className="flex items-center gap-2">
                <Search size={15} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search messages…"
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                />
                {searching && <Loader2 size={14} className="animate-spin text-slate-400 dark:text-slate-500 flex-shrink-0" />}
                <button onClick={closeSearch} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto flex flex-col gap-1">
                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No messages found</p>
                )}
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => jumpToMessage(r.id)}
                    className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 flex items-start gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden mt-0.5">
                      {r.author.avatar_url ? <img src={r.author.avatar_url} className="w-full h-full object-cover" alt="" /> : r.author.username[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{r.author.username}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{formatMsgTime(r.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{r.content || (r.attachment_type ? `📎 ${r.attachment_type}` : '')}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            onWheel={stopAutoFollow}
            onTouchMove={stopAutoFollow}
            onScroll={handleContainerScroll}
            className="absolute inset-0 overflow-y-auto p-5 flex flex-col gap-5"
          >
            {!group.is_member ? (
              <div className="m-auto text-center max-w-xs">
                <ShieldCheck size={36} className="mx-auto mb-3 text-slate-500 dark:text-slate-600" />
                <p className="font-semibold text-slate-900 dark:text-white">
                  {group.has_pending_request ? 'Your request is pending' : `Join ${group.name} to chat`}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  {group.has_pending_request
                    ? 'The group owner needs to approve your request before you can see messages.'
                    : "Send a request above — once the owner approves, you'll see the chat here."}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center text-slate-400 dark:text-slate-500">No messages yet — say hi 👋</div>
            ) : messages.map(msg => {
              const self = msg.author_id === user?.id
              const isEditing = editingId === msg.id
              const isHighlighted = highlightMsgId === msg.id
              return (
                <div
                  key={msg.id}
                  ref={el => { messageRefs.current[msg.id] = el }}
                  className={`group/msg relative flex gap-3 rounded-2xl transition ${self ? 'flex-row-reverse' : ''} ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                    {msg.author.avatar_url ? <img src={msg.author.avatar_url} className="w-full h-full object-cover" alt="" /> : msg.author.username[0]?.toUpperCase()}
                  </div>

                  {/* hover action bar */}
                  {!isEditing && (
                    <div className={`absolute -top-3 ${self ? 'right-2' : 'left-11'} opacity-0 group-hover/msg:opacity-100 transition flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-1 py-0.5 shadow-lg z-10`}>
                      <button onClick={() => setReactingTo(r => (r === msg.id ? null : msg.id))} title="React" className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-violet-500">
                        <Smile size={13} />
                      </button>
                      <button onClick={() => startReply(msg)} title="Reply" className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-violet-500">
                        <CornerUpLeft size={13} />
                      </button>
                      {canManage && (
                        msg.pinned ? (
                          <button onClick={() => unpinMessage(msg)} disabled={pinningId === msg.id} title="Unpin" className="w-6 h-6 rounded-full flex items-center justify-center text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                            <PinOff size={13} />
                          </button>
                        ) : (
                          <button onClick={() => pinMessage(msg)} disabled={pinningId === msg.id} title="Pin" className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 disabled:opacity-50">
                            <Pin size={13} />
                          </button>
                        )
                      )}
                      {self && msg.content && (
                        <button onClick={() => startEdit(msg)} title="Edit" className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-violet-500">
                          <Pencil size={12} />
                        </button>
                      )}
                      {self && (
                        <button onClick={() => deleteOwnMessage(msg)} title="Delete" className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* quick-reaction popup */}
                  {reactingTo === msg.id && (
                    <div className={`absolute -top-11 ${self ? 'right-2' : 'left-11'} flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-xl z-20`}>
                      {QUICK_REACTIONS.map(e => (
                        <button key={e} onClick={() => toggleReaction(msg, e)} className="text-lg hover:scale-125 transition p-0.5">{e}</button>
                      ))}
                    </div>
                  )}

                  <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${self ? 'items-end' : 'items-start'}`}>
                    {!self && <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{msg.author.username}</span>}

                    {msg.reply_to && (
                      <button
                        onClick={() => jumpToMessage(msg.reply_to.id)}
                        className="flex items-start gap-1.5 max-w-[240px] px-2.5 py-1.5 rounded-xl border-l-2 border-violet-500 bg-slate-100 dark:bg-slate-800/70 text-left hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      >
                        <CornerUpLeft size={11} className="text-violet-500 flex-shrink-0 mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold text-violet-600 dark:text-violet-400">{msg.reply_to.author_username}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {msg.reply_to.content || (msg.reply_to.attachment_type ? `📎 ${msg.reply_to.attachment_type}` : '')}
                          </span>
                        </span>
                      </button>
                    )}

                    {msg.attachment_type === 'image' && (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-2xl overflow-hidden max-w-[240px] border border-slate-300 dark:border-slate-700">
                        <img src={msg.attachment_url} alt={msg.attachment_name} className="w-full max-h-64 object-cover" />
                      </a>
                    )}

                    {msg.attachment_type === 'voice' && (
                      <div className={`rounded-2xl px-3 py-2 ${self ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
                        <audio controls src={msg.attachment_url} className="h-9" style={{ maxWidth: 220 }} />
                      </div>
                    )}

                    {msg.attachment_type === 'file' && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={msg.attachment_name}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border ${self ? 'bg-violet-600 border-violet-500' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'} hover:opacity-90 transition`}
                      >
                        <FileText size={18} className={`flex-shrink-0 ${self ? 'text-white' : 'text-slate-800 dark:text-white'}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate max-w-[160px] ${self ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{msg.attachment_name}</p>
                          <p className={`text-[10px] ${self ? 'text-white/70' : 'text-slate-800/70 dark:text-white/70'}`}>{formatBytes(msg.attachment_size)}</p>
                        </div>
                        <Download size={14} className={`flex-shrink-0 ml-1 ${self ? 'text-white/80' : 'text-slate-800/80 dark:text-white/80'}`} />
                      </a>
                    )}

                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 w-full">
                        <textarea
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg) }
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          rows={2}
                          className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none border border-violet-500 resize-none min-w-[200px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={cancelEdit} className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 py-1 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                          <button onClick={() => saveEdit(msg)} disabled={savingEdit} className="flex items-center gap-1 text-xs font-bold text-white bg-violet-600 rounded-lg px-3 py-1 disabled:opacity-50">
                            {savingEdit ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : msg.content && (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${self ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}>
                        {renderMessageContent(msg.content)}
                      </div>
                    )}

                    {msg.reactions?.length > 0 && (
                      <div className={`flex flex-wrap gap-1 ${self ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map(r => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(msg, r.emoji)}
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition ${
                              r.reacted
                                ? 'bg-violet-600/15 border-violet-500 text-violet-600 dark:text-violet-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span>{r.emoji}</span><span>{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      {msg.pinned && <Pin size={10} className="text-amber-400" />}
                      {formatMsgTime(msg.created_at)}
                      {msg.edited_at && <span className="italic">(edited)</span>}
                      {self && (
                        msg.seen_by?.length > 0
                          ? <CheckCheck size={13} className="text-sky-400" />
                          : <Check size={13} className="text-slate-400 dark:text-slate-500" />
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

          {/* typing indicator */}
          {group.is_member && typingUsers.length > 0 && (
            <div className="px-5 pt-2 text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1.5 flex-shrink-0">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '240ms' }} />
              </span>
              {typingUsers.length === 1
                ? `${typingUsers[0].username} is typing…`
                : typingUsers.length === 2
                  ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing…`
                  : `${typingUsers.length} people are typing…`}
            </div>
          )}

          {/* input */}
          {group.is_member && (
            <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-800 relative flex-shrink-0">

              {showEmoji && (
                <div className="absolute bottom-full right-2 sm:right-5 mb-2 w-64 max-w-[85vw] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xl z-20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Emoji</span>
                    <button onClick={() => setShowEmoji(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                    {EMOJI_LIST.map(e => (
                      <button
                        key={e}
                        onClick={() => insertEmoji(e)}
                        className="text-lg hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg p-1 transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mentionOpen && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-2 sm:left-5 mb-2 w-56 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-20">
                  {mentionCandidates.map(m => (
                    <button
                      key={m.id}
                      onClick={() => insertMention(m.username)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
                      </div>
                      @{m.username}
                    </button>
                  ))}
                </div>
              )}

              {replyingTo && (
                <div className="flex items-center gap-2 mb-2 bg-slate-100 dark:bg-slate-900 border-l-2 border-violet-500 rounded-lg px-3 py-2">
                  <CornerUpLeft size={14} className="text-violet-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400">Replying to {replyingTo.author.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{replyingTo.content || (replyingTo.attachment_type ? `📎 ${replyingTo.attachment_type}` : '')}</p>
                  </div>
                  <button onClick={cancelReply} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0"><X size={14} /></button>
                </div>
              )}

              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 w-fit max-w-full">
                  {pendingPreviewUrl ? (
                    <img src={pendingPreviewUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <FileText size={18} className="text-violet-600 dark:text-violet-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">{pendingFile.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatBytes(pendingFile.size)}</p>
                  </div>
                  <button onClick={clearPendingFile} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex-shrink-0 ml-1"><X size={14} /></button>
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

              <div className="flex gap-1 sm:gap-2 items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-2 sm:px-3 py-2" data-tour="group-chat-input">
                <input ref={attachInputRef} type="file" onChange={handleAttachChange} className="hidden" />
                <button onClick={handleAttachPick} disabled={recording} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 p-1 disabled:opacity-40"><Paperclip size={16} /></button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onBlur={() => { setMentionOpen(false); clearTyping() }}
                  disabled={recording}
                  placeholder={recording ? 'Recording voice note…' : `Message ${group.name}...`}
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none outline-none py-1 disabled:opacity-40"
                />
                <button onClick={() => setShowEmoji(s => !s)} disabled={recording} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 p-1 disabled:opacity-40"><Smile size={16} /></button>
                <button onClick={startRecording} disabled={recording} className={`flex-shrink-0 p-1 ${recording ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}><Mic size={16} /></button>
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
        <div className={`${activeTab === 'chat' ? 'hidden' : 'flex'} lg:flex w-full lg:w-60 flex-1 min-h-0 overflow-y-auto lg:flex-shrink-0 lg:h-auto lg:overflow-visible flex-col gap-4`}>

          {/* Members tab content — join requests + member list, shown together
              since managing requests is part of managing members. */}
          <div className={`${activeTab === 'members' ? 'flex' : 'hidden'} lg:flex flex-col gap-4`}>

          {canManage && requests.length > 0 && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Bell size={12} /> Join Requests ({requests.length})
              </h4>
              <div className="flex flex-col gap-2">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      {req.user.avatar_url ? <img src={req.user.avatar_url} className="w-full h-full object-cover" alt="" /> : req.user.username[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1">{req.user.username}</span>
                    {reqActing[req.id] ? (
                      <Loader2 size={14} className="animate-spin text-slate-400 dark:text-slate-500" />
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => acceptRequest(req)} className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/25">
                          <Check size={14} />
                        </button>
                        <button onClick={() => rejectRequest(req)} className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4" data-tour="group-members-panel">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Users size={12} /> Members</h4>
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
                      <Circle size={8} className={`absolute -bottom-0.5 -right-0.5 fill-current ${m.online ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-600'}`} />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1">{m.username}</span>
                    {m.role === 'owner' && <ShieldCheck size={12} className="text-amber-400 flex-shrink-0" title="Owner" />}
                    {m.role === 'admin' && <ShieldAlert size={12} className="text-sky-400 flex-shrink-0" title="Admin" />}
                    {/* Only the owner assigns/removes moderators — admins manage regular
                        members but don't get to create or remove other admins. */}
                    {group.is_owner && !m.is_self && m.role !== 'owner' && m.role !== 'admin' && (
                      <button
                        onClick={() => setConfirmPromote(m)}
                        disabled={promoting[m.id]}
                        title="Make admin"
                        className="w-6 h-6 rounded-md bg-sky-600/15 text-sky-400 hover:bg-sky-600/25 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                      >
                        {promoting[m.id] ? <Loader2 size={11} className="animate-spin" /> : <ShieldAlert size={11} />}
                      </button>
                    )}
                    {group.is_owner && !m.is_self && m.role === 'admin' && (
                      <button
                        onClick={() => setConfirmDemote(m)}
                        disabled={demoting[m.id]}
                        title="Remove admin"
                        className="w-6 h-6 rounded-md bg-amber-600/15 text-amber-500 hover:bg-amber-600/25 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                      >
                        {demoting[m.id] ? <Loader2 size={11} className="animate-spin" /> : <ShieldOff size={11} />}
                      </button>
                    )}
                    {/* Remove: owner/admin can remove regular members; admins can't remove
                        other admins (or the owner) — only the owner can do that, same tier
                        the backend enforces. */}
                    {canManage && !m.is_self && m.role !== 'owner' && (m.role !== 'admin' || group.is_owner) && (
                      <button
                        onClick={() => setConfirmRemove(m)}
                        disabled={removing[m.id]}
                        title="Remove from group"
                        className="w-6 h-6 rounded-md bg-rose-600/15 text-rose-400 hover:bg-rose-600/25 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                      >
                        {removing[m.id] ? <Loader2 size={11} className="animate-spin" /> : <UserMinus size={11} />}
                      </button>
                    )}
                    {!m.is_self && !m.is_friend && (
                      <button
                        onClick={() => !sent && sendFriendRequest(m)}
                        disabled={sending || sent}
                        title={sent ? 'Request sent' : 'Add friend'}
                        className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${sent ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-violet-600/15 text-violet-600 dark:text-violet-400 hover:bg-violet-600/25'} disabled:cursor-not-allowed`}
                      >
                        {sending ? <Loader2 size={11} className="animate-spin" /> : sent ? <Check size={11} /> : <UserPlus size={11} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          </div>
          {/* end members tab content */}

          {/* Media tab content */}
          <div className={`${activeTab === 'media' ? 'block' : 'hidden'} lg:block`}>
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4" data-tour="group-media-panel">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Media Feed</h4>
              <div className="flex items-center gap-3">
                {media.length > 0 && <span className="text-xs text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:text-violet-500 dark:hover:text-violet-300">View All</span>}
                {group.is_member && (
                  <>
                    <input ref={mediaInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleMediaChange} className="hidden" />
                    <button
                      onClick={handleMediaPick}
                      disabled={mediaUploading}
                      title="Upload image"
                      className="w-6 h-6 rounded-md bg-violet-600/15 text-violet-600 dark:text-violet-400 flex items-center justify-center hover:bg-violet-600/25 disabled:opacity-50"
                    >
                      {mediaUploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    </button>
                  </>
                )}
              </div>
            </div>
            {combinedMedia.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-600">No media shared yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {combinedMedia.slice(0, 6).map(m => {
                  const deleting = m.raw ? mediaDeleting[m.raw.id] : false
                  return (
                    <div key={m.key} className="relative group/media aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                      <img src={m.image_url} className="w-full h-full object-cover" alt="" />
                      {m.canDelete && m.raw && (
                        <button
                          onClick={() => deleteMedia(m.raw)}
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
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Directive</h4>
              <ol className="list-decimal list-inside flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {group.directives.map((d, i) => <li key={i}>{d}</li>)}
              </ol>
            </div>
          )}
          </div>
          {/* end media tab content */}
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowClearConfirm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Clear all messages?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This permanently deletes every message in {group.name} for all members, to help free up space. This can't be undone.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setShowClearConfirm(false)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
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

      {/* ── Leave flow: branches by role + group size, never a single-click leave ── */}
      {leaveFlow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !leaving && !transferring && setLeaveFlow(null)}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            {leaveFlow === 'confirm' && (
              <>
                <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Leave {group.name}?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You'll lose access to this group's chat and media right away. You can send a new request to join later.
                </p>
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={() => setLeaveFlow(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button
                    onClick={leaveGroup}
                    disabled={leaving}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Leave Group
                  </button>
                </div>
              </>
            )}

            {leaveFlow === 'solo' && (
              <>
                <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">You're the last one here</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  There's no one left to hand ownership to. Leaving now permanently disbands <strong>{group.name}</strong> — its chat, media, and member list are erased for everyone, and this can't be undone.
                </p>
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={() => setLeaveFlow(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button
                    onClick={disbandGroup}
                    disabled={disbanding}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {disbanding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Leave &amp; Disband
                  </button>
                </div>
              </>
            )}

            {leaveFlow === 'transfer' && (
              <>
                <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  <Crown size={16} className="text-amber-400" /> Hand over ownership
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pick who takes over as owner of <strong>{group.name}</strong> before you go. They'll get full control — cover art, admins, join requests, everything.
                </p>
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                  {members.filter(m => !m.is_self).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setTransferTarget(m)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition ${
                        transferTarget?.id === m.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs overflow-hidden flex-shrink-0">
                        {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{m.username}</span>
                      {m.role === 'admin' && <span className="text-[10px] font-bold text-sky-500 flex-shrink-0">ADMIN</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={() => setLeaveFlow(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button
                    onClick={transferAndLeave}
                    disabled={!transferTarget || transferring}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {transferring ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />} Transfer &amp; Leave
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Standalone disband — separate from leaving, always available to the owner ── */}
      {showDisbandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !disbanding && setShowDisbandConfirm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-rose-500 text-lg flex items-center gap-2">
              <Trash2 size={18} /> Disband {group.name}?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This permanently deletes the group for <strong>every</strong> member — all messages, media, and the member list are erased and can't be recovered. This is different from leaving: nobody keeps access afterward, including you.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setShowDisbandConfirm(false)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={disbandGroup}
                disabled={disbanding}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {disbanding ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Disband Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Demote confirm — owner only, mirrors the promote flow ── */}
      {confirmDemote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDemote(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Remove {confirmDemote.username} as admin?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              They'll go back to a regular member — no more inviting members, approving join requests, changing the cover, or clearing chat.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setConfirmDemote(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => demoteAdmin(confirmDemote)}
                disabled={demoting[confirmDemote.id]}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {demoting[confirmDemote.id] ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />} Remove Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmPromote(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Make {confirmPromote.username} an admin?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              They'll get the same management powers as you in {group.name} — inviting members, approving join requests, changing the cover, and clearing chat.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setConfirmPromote(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
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

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmRemove(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Remove {confirmRemove.username} from the group?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              They'll lose access to {group.name}'s chat and media immediately, and would need to request to join again to come back.
            </p>
            <div className="flex gap-2 justify-end mt-1">
              <button onClick={() => setConfirmRemove(null)} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={() => removeMember(confirmRemove)}
                disabled={removing[confirmRemove.id]}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {removing[confirmRemove.id] ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />} Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col gap-3 max-h-[78vh]">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Invite Friends</h2>
              <button onClick={() => setAddOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                autoFocus
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Search your friends..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none border border-slate-300 dark:border-slate-700 focus:border-violet-500"
              />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto min-h-[140px]">
              {friendsLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-violet-400" /></div>
              ) : addableFriends.length === 0 ? (
                <p className="text-center py-7 text-slate-400 dark:text-slate-500 text-sm">
                  {friends.length === 0 ? "You don't have any friends yet — add some first!" : 'Everyone from your friends list is already here.'}
                </p>
              ) : addableFriends.map(f => {
                const sending = addSending[f.id]
                return (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" alt="" /> : f.username[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 dark:text-white truncate">{f.username}</span>
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