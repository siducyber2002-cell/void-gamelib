import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Send, Users, Circle, ShieldCheck, UserPlus,
  Check, X, Loader2, Clock, LogOut, Search, Bell, Paperclip, Smile,
  Camera, Trash2, ImagePlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const POLL_MS = 4000
const AVATAR_COLORS = ['#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

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
  const coverInputRef = useRef(null)
  const mediaInputRef = useRef(null)

  const bottomRef = useRef(null)
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
      if (g.data.is_owner) {
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
        setMessages(res.data)
      } catch { /* silent */ }
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [group?.is_member, groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    try {
      const res = await axios.post(`/api/community/groups/${groupId}/messages`, { content })
      setMessages(prev => [...prev, res.data])
    } catch {
      toast.error('Message failed to send')
    }
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMsg()
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

            {group.is_owner && (
              <>
                <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverChange} className="hidden" />
                <button
                  onClick={handleCoverPick}
                  disabled={coverUploading}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur text-white text-xs font-semibold hover:bg-black/60 disabled:opacity-60"
                >
                  {coverUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  {coverUploading ? 'Uploading…' : 'Change Cover'}
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
              <div className="flex items-end gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-violet-600 border-2 border-slate-950 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {group.banner_url ? <img src={group.banner_url} className="w-full h-full object-cover" alt="" /> : group.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 pb-0.5">
                  <h2 className="font-display font-bold text-white text-lg sm:text-xl truncate drop-shadow">{group.name}</h2>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Circle size={7} className="text-emerald-400 fill-current" /> {group.activity_status} · {group.member_count.toLocaleString()} Operators
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0 pb-0.5">
                {group.is_owner ? (
                  <button onClick={openAddMembers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg">
                    <UserPlus size={14} /> Invite
                  </button>
                ) : group.is_member ? (
                  <button onClick={handleLeave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-rose-300 text-xs sm:text-sm font-bold hover:bg-rose-500/20">
                    <LogOut size={14} /> Leave
                  </button>
                ) : group.has_pending_request ? (
                  <button onClick={handleCancelRequest} disabled={joining} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-white/10 text-slate-300 text-xs sm:text-sm font-bold disabled:opacity-50">
                    <Clock size={14} /> Cancel Request
                  </button>
                ) : (
                  <button onClick={handleRequestJoin} disabled={joining} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg disabled:opacity-50">
                    {joining ? <Loader2 size={14} className="animate-spin" /> : null}
                    {joining ? 'Sending…' : 'Request to Join'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-[320px]">
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
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${self ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          {group.is_member && (
            <div className="px-5 py-4 border-t border-slate-800">
              <div className="flex gap-2 items-center bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2">
                <button className="text-slate-500 hover:text-slate-300 flex-shrink-0"><Paperclip size={17} /></button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Transmit message to ${group.name}...`}
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none py-1"
                />
                <button className="text-slate-500 hover:text-slate-300 flex-shrink-0"><Smile size={17} /></button>
                <button onClick={sendMsg} disabled={!input.trim()} className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-violet-600 to-purple-500 disabled:opacity-40 flex-shrink-0">
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">

          {group.is_owner && requests.length > 0 && (
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
                    {m.role === 'owner' && <ShieldCheck size={12} className="text-amber-400 flex-shrink-0" />}
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
                  const canDelete = group.is_owner || m.uploaded_by?.id === user?.id
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

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3 max-h-[78vh]">
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
