import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, Plus, Users, Circle, X, Clock, ShieldCheck, Loader2, Globe2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TIER_STYLES = {
  'Elite Tier': 'bg-fuchsia-500 text-white',
  'Casual':     'bg-emerald-500 text-black',
  'Hardcore':   'bg-rose-500 text-white',
  'Tech':       'bg-sky-500 text-black',
}
const tierClass = (tier) => TIER_STYLES[tier] || 'bg-violet-500 text-white'

const AVATAR_COLORS = ['#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]

function AvatarStack({ members = [], size = 28 }) {
  const shown = members.slice(0, 3)
  const extra = members.length - shown.length
  return (
    <div className="flex items-center flex-shrink-0" style={{ paddingLeft: shown.length ? 8 : 0 }}>
      {shown.map((m, i) => (
        <div
          key={m.id}
          className="rounded-full border-2 border-slate-900 flex items-center justify-center text-white font-bold overflow-hidden"
          style={{
            width: size, height: size, marginLeft: -8, zIndex: shown.length - i,
            background: avatarColor(m.username), fontSize: size * 0.4,
          }}
          title={m.username}
        >
          {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : m.username[0]?.toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-slate-300 font-bold"
          style={{ width: size, height: size, marginLeft: -8, fontSize: size * 0.32 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

export default function CommunityPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [membersByGroup, setMembersByGroup] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState({})
  const [form, setForm] = useState({
    name: '', description: '',
    tier: 'Casual', activity_status: 'Active now', highlight_tag: '', directives: '',
  })

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/api/community/groups')
      setGroups(res.data)
      // fetch a light member preview per group for the avatar stack
      const entries = await Promise.all(
        res.data.map(async (g) => {
          try {
            const m = await axios.get(`/api/community/groups/${g.id}/members`)
            return [g.id, m.data]
          } catch {
            return [g.id, []]
          }
        })
      )
      setMembersByGroup(Object.fromEntries(entries))
    } catch {
      toast.error('Could not load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(g => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
  }, [groups, search])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await axios.post('/api/community/groups', form)
      setShowCreate(false)
      toast.success('Group created')
      navigate(`/community/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const requestJoin = async (e, group) => {
    e.stopPropagation()
    setJoining(j => ({ ...j, [group.id]: true }))
    try {
      const res = await axios.post(`/api/community/groups/${group.id}/join`)
      setGroups(gs => gs.map(g => g.id === group.id ? res.data : g))
      toast.success(`Request sent to ${group.name}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not send request')
    } finally {
      setJoining(j => ({ ...j, [group.id]: false }))
    }
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-violet-400">Find Your Squad</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">
            Connect with millions of gamers across the globe. Join specialized groups, participate in tournaments, and dominate the leaderboard.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups or games..."
              className="pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 w-56"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white text-sm font-bold hover:opacity-90 transition whitespace-nowrap"
          >
            <Plus size={16} /> Create Group
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading groups…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">No groups found. Be the first to create one.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(g => {
            const previewMembers = membersByGroup[g.id] || []
            return (
              <div
                key={g.id}
                onClick={() => navigate(`/community/${g.id}`)}
                className="flex gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-left hover:border-violet-600/60 transition group cursor-pointer"
              >
                <div className="relative w-36 h-24 sm:w-44 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800">
                  {g.banner_url && <img src={g.banner_url} alt={g.name} className="w-full h-full object-cover" />}
                  {g.tier && (
                    <span className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide ${tierClass(g.tier)}`}>
                      {g.tier.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-0.5 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-lg text-violet-400 group-hover:text-violet-300 truncate">{g.name}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {g.highlight_tag && <span className="text-xs text-amber-400 font-semibold whitespace-nowrap">{g.highlight_tag}</span>}
                      <AvatarStack members={previewMembers} size={26} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2 max-w-2xl">{g.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {g.member_count.toLocaleString()} Members</span>
                    <span className="flex items-center gap-1"><Circle size={7} className="text-emerald-400 fill-current" /> {g.activity_status}</span>
                    {g.is_owner && <span className="flex items-center gap-1 text-amber-400 font-semibold"><ShieldCheck size={12} /> Owner</span>}
                    {g.is_owner && g.pending_requests_count > 0 && (
                      <span className="text-amber-400 font-semibold">{g.pending_requests_count} pending</span>
                    )}
                  </div>
                  <div className="mt-auto pt-2">
                    {g.is_member ? (
                      <span className="text-violet-400 text-xs font-semibold">Joined — click to open →</span>
                    ) : g.has_pending_request ? (
                      <button disabled className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg border border-slate-700 cursor-not-allowed">
                        <Clock size={12} /> Request Pending
                      </button>
                    ) : (
                      <button
                        onClick={(e) => requestJoin(e, g)}
                        disabled={joining[g.id]}
                        className="flex items-center gap-1.5 text-xs font-bold text-violet-400 px-3 py-1.5 rounded-lg border border-violet-600/60 hover:bg-violet-600/10 transition disabled:opacity-50"
                      >
                        {joining[g.id] ? <Loader2 size={12} className="animate-spin" /> : null}
                        {joining[g.id] ? 'Sending…' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleCreate} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-bold text-white text-lg">Create a Group</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <input required placeholder="Group name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700 focus:border-violet-500" />
            <textarea placeholder="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700 focus:border-violet-500 resize-none" />
            <p className="text-xs text-slate-500 -mt-1">You can upload cover art once the group is created.</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700">
                <option>Casual</option>
                <option>Elite Tier</option>
                <option>Hardcore</option>
                <option>Tech</option>
              </select>
              <input placeholder="Highlight tag (optional)" value={form.highlight_tag} onChange={e => setForm(f => ({ ...f, highlight_tag: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700 focus:border-violet-500" />
            </div>
            <textarea placeholder="Directives / rules — one per line" rows={3} value={form.directives} onChange={e => setForm(f => ({ ...f, directives: e.target.value }))} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm outline-none border border-slate-700 focus:border-violet-500 resize-none" />
            <button disabled={creating} type="submit" className="mt-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-white font-bold text-sm disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Group'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
