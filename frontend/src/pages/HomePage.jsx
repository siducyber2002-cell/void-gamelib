import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Play, Plus, ChevronLeft, ChevronRight, Star,
  TrendingUp, Sparkles, X, Loader2, Search,
  Sword, Crosshair, Map, Ghost, Brain, Skull, Flag, Trophy,
  Zap, BookOpen,
} from 'lucide-react'
import { useLibrary } from '../context/LibraryContext'
import { useTheme } from '../context/ThemeContext'
import { awardXP } from '../utils/xpService'

// ─── API KEYS ─────────────────────────────────────────────────────────────────
const RAWG_KEY = 'cf38811b97cf43bbb8d88c606ed4e73c'
const YT_KEY   = 'AIzaSyAH92kSbIuWj-if5suELQQCkoJXESmIrVk'

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
const DARK = {
  bg:          '#08080f',
  surface:     '#0f0f1a',
  card:        '#13131f',
  cardHover:   '#1a1a2e',
  border:      '#1e1e32',
  borderHover: '#a855f740',
  text:        '#f0eeff',
  textSub:     '#8880b0',
  textMuted:   '#3d3960',
  accent:      '#a855f7',
  accentDim:   '#7c3aed',
  accentGlow:  'rgba(168,85,247,0.13)',
  green:       '#22c55e',
  amber:       '#f59e0b',
  scanline:    'rgba(99,102,241,0.025)',
}
const LIGHT = {
  bg:          '#f0eeff',
  surface:     '#ffffff',
  card:        '#faf8ff',
  cardHover:   '#f3f0ff',
  border:      '#e2dcf5',
  borderHover: '#a855f760',
  text:        '#1a1230',
  textSub:     '#5a4e8a',
  textMuted:   '#9490b5',
  accent:      '#7c3aed',
  accentDim:   '#6d28d9',
  accentGlow:  'rgba(124,58,237,0.09)',
  green:       '#16a34a',
  amber:       '#d97706',
  scanline:    'rgba(124,58,237,0.018)',
}

const GLOBAL_STYLE = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');
  * { box-sizing: border-box; }
  @media (max-width: 640px) {
    html, body { overflow-x: hidden; max-width: 100vw; }
  }
  .tnr  { font-family: 'Orbitron', serif !important; letter-spacing: -0.01em; }
  .mono { font-family: 'Share Tech Mono', monospace; }

  .filmstrip::-webkit-scrollbar { height: 3px; }
  .filmstrip::-webkit-scrollbar-track { background: transparent; }
  .filmstrip::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }

  .game-glow:hover { box-shadow: 0 0 0 1.5px ${t.accentDim}, 0 8px 28px ${t.accentGlow}; }

  @keyframes hp-fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  .hero-in { animation: hp-fadeUp 0.5s ease forwards; }

  @keyframes fillBar { from{width:0} to{width:var(--fill)} }
  .bar-fill { animation: fillBar 1s ease 0.3s both; }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Category card emoji bounce */
  .cat-card:hover .cat-emoji { transform: scale(1.3) rotate(-8deg); }
  .cat-emoji { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); display: inline-block; }

  .sr-btn { transition: background 0.15s, color 0.15s, border-color 0.15s; }
  .hero-dot { transition: width 0.3s ease, background 0.3s ease; }

  .scanlines::before {
    content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, ${t.scanline} 2px, ${t.scanline} 4px);
  }

  /* Genre panel scrollbar */
  .genre-scroll::-webkit-scrollbar { width: 4px; }
  .genre-scroll::-webkit-scrollbar-track { background: transparent; }
  .genre-scroll::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }

  /* Body scroll lock */
  body.panel-open { overflow: hidden; }

  /* Added-to-library pop animation */
  @keyframes addedPop {
    0%   { transform: scale(1); }
    45%  { transform: scale(1.22); }
    100% { transform: scale(1); }
  }
  .added-pop { animation: addedPop 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards; }

  /* Notification bell shake */
  @keyframes bellShake {
    0%,100% { transform: rotate(0); }
    20% { transform: rotate(-14deg); }
    40% { transform: rotate(14deg); }
    60% { transform: rotate(-8deg); }
    80% { transform: rotate(8deg); }
  }
  .bell-shake { animation: bellShake 0.5s ease; }

  /* Notification dropdown fade-in */
  @keyframes notifIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .notif-in { animation: notifIn 0.18s ease forwards; }

  @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }

  /* ── Mobile fit ── */
  .hp-cat-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; }
  .hp-tnr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  @media (max-width: 900px) {
    .hp-cat-grid { grid-template-columns: repeat(4, 1fr); }
    .hp-tnr-grid { grid-template-columns: 1fr; gap: 28px; }
  }
  @media (max-width: 480px) {
    .hp-cat-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  }
`

// ─── ACCENT PALETTE ───────────────────────────────────────────────────────────
const ACCENTS = ['#a855f7','#7c3aed','#6366f1','#ec4899','#3b82f6','#8b5cf6','#c026d3','#2563eb']
const accentFor = (id) => ACCENTS[Math.abs(id) % ACCENTS.length]

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label:'RPG',       icon:Sword,     slug:'role-playing-games-rpg', count:'4,215', emoji:'⚔️',  color:'#a855f7' },
  { label:'Action',    icon:Crosshair, slug:'action',                  count:'5,621', emoji:'🎯',  color:'#ef4444' },
  { label:'Adventure', icon:Map,       slug:'adventure',               count:'3,248', emoji:'🗺️',  color:'#f59e0b' },
  { label:'Indie',     icon:Ghost,     slug:'indie',                   count:'3,246', emoji:'👻',  color:'#22c55e' },
  { label:'Strategy',  icon:Brain,     slug:'strategy',                count:'2,104', emoji:'🧠',  color:'#3b82f6' },
  { label:'Horror',    icon:Skull,     slug:'horror',                  count:'1,348', emoji:'💀',  color:'#f97316' },
  { label:'Racing',    icon:Flag,      slug:'racing',                  count:'1,026', emoji:'🏁',  color:'#06b6d4' },
  { label:'Sports',    icon:Trophy,    slug:'sports',                  count:'987',   emoji:'🏆',  color:'#eab308' },
]

// ─── UTILS ────────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]
  }
  return a
}
function fmt(n) {
  if (!n) return '—'
  if (n>=1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (n>=1_000)     return `${(n/1_000).toFixed(0)}K`
  return `${n}`
}
function toGame(g) {
  return {
    id:       g.id,
    title:    g.name,
    rawgSlug: g.slug,
    genre:    g.genres?.map(x=>x.name).join(' / ') || 'Game',
    rating:   g.rating ? parseFloat(g.rating.toFixed(1)) : 0,
    imageUrl: g.background_image || null,
    accent:   accentFor(g.id),
    year:     g.released ? new Date(g.released).getFullYear() : null,
    description: g.description_raw
      ? g.description_raw.replace(/\n/g,' ').trim().slice(0,200)+'…'
      : `${g.name} — a ${g.genres?.[0]?.name||'acclaimed'} title.`,
    caption:  g.genres?.[0]?.name ? `An acclaimed ${g.genres[0].name} experience.` : '',
    players:  fmt(g.ratings_count),
    platform: g.platforms?.map(p=>p.platform.name).slice(0,2).join(', ')||'',
    progress: Math.floor(Math.random()*60)+20,
    hours:    Math.floor(Math.random()*180)+10,
    rank:     0,
  }
}
const rawg = (path) =>
  fetch(`https://api.rawg.io/api/${path}${path.includes('?')?'&':'?'}key=${RAWG_KEY}`)
    .then(r=>r.json())

// ─── HERO DATA HOOK ────────────────────────────────────────────────────────────
// Fetches pages 1-10 quietly = up to 400 hero games (near-unlimited scroll feel)
function useHeroGames() {
  const [games, setGames]     = useState([])
  const [loading, setLoading] = useState(true)
  const allRef = useRef([])

  const fetchPage = useCallback(async (page) => {
    try {
      const today  = new Date().toISOString().split('T')[0]
      const yr5ago = new Date(Date.now()-5*365*86400000).toISOString().split('T')[0]
      const res = await rawg(`games?ordering=-rating&metacritic=70,100&dates=${yr5ago},${today}&page_size=40&page=${page}`)
      const batch = shuffle((res.results||[]).map(toGame))
      allRef.current = [...allRef.current, ...batch]
      setGames([...allRef.current])
    } catch(e) { console.error(e) }
  }, [])

  // Fetch first 3 pages immediately, then load more quietly
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPage(1),fetchPage(2),fetchPage(3)]).then(()=>setLoading(false))
  }, [fetchPage])

  useEffect(() => {
    let cancelled=false
    const load = async () => {
      for (let p=4; p<=10; p++) {
        if(cancelled) break
        await fetchPage(p)
        await new Promise(r=>setTimeout(r,700))
      }
    }
    const t=setTimeout(load,2500)
    return()=>{cancelled=true;clearTimeout(t)}
  }, [fetchPage])

  // Re-shuffle pool every 5 min so returning users see fresh ordering
  useEffect(() => {
    const id=setInterval(()=>{
      allRef.current=shuffle(allRef.current)
      setGames([...allRef.current])
    }, 5*60*1000)
    return()=>clearInterval(id)
  }, [])

  return { games, loading }
}

// ─── HOME DATA HOOK ────────────────────────────────────────────────────────────
function useHomeData() {
  const [data,setData]=useState({newReleases:[],trending:[],recommended:[],loading:true})
  const fetchAll=useCallback(async()=>{
    setData(d=>({...d,loading:true}))
    try {
      const today  = new Date().toISOString().split('T')[0]
      const yr1ago = new Date(Date.now()-365*86400000).toISOString().split('T')[0]
      const mo6ago = new Date(Date.now()-180*86400000).toISOString().split('T')[0]
      const [nR,tR,rR]=await Promise.all([
        rawg(`games?ordering=-released&dates=${mo6ago},${today}&page_size=20`),
        rawg(`games?ordering=-added&dates=${yr1ago},${today}&page_size=20`),
        rawg(`games?ordering=-rating&metacritic=90,100&page_size=20`),
      ])
      setData({
        newReleases: shuffle((nR.results||[]).map(toGame)).slice(0,10),
        trending:    shuffle((tR.results||[]).map(toGame)).slice(0,5).map((g,i)=>({...g,rank:i+1})),
        recommended: shuffle((rR.results||[]).map(toGame)).slice(0,5),
        loading:false,
      })
    } catch(e){setData(d=>({...d,loading:false}))}
  },[])
  useEffect(()=>{fetchAll()},[fetchAll])
  useEffect(()=>{const id=setInterval(fetchAll,5*60*1000);return()=>clearInterval(id)},[fetchAll])
  return data
}

// ─── SEARCH HOOK ──────────────────────────────────────────────────────────────
function useSearch() {
  const [query,setQuery]=[...useState('')]
  const [results,setResults]=useState([])
  const [searching,setSearching]=useState(false)
  const timer=useRef(null)
  useEffect(()=>{
    if(!query.trim()||query.length<2){setResults([]);setSearching(false);return}
    setSearching(true);clearTimeout(timer.current)
    timer.current=setTimeout(async()=>{
      try{const res=await rawg(`games?search=${encodeURIComponent(query)}&page_size=10`);setResults((res.results||[]).map(toGame))}
      catch(e){setResults([])}finally{setSearching(false)}
    },350)
    return()=>clearTimeout(timer.current)
  },[query])
  const clear=useCallback(()=>{setQuery('');setResults([])},[])
  return{query,setQuery,results,searching,clear}
}

// ─── COVER HOOK ───────────────────────────────────────────────────────────────
function useCovers(games) {
  const [covers,setCovers]=useState({})
  const prevKey=useRef('')
  useEffect(()=>{
    if(!games?.length) return
    const key=games.map(g=>g.rawgSlug).join(',')
    if(key===prevKey.current) return
    prevKey.current=key
    const map={};const need=[]
    games.forEach(g=>{if(g.imageUrl)map[g.rawgSlug]=g.imageUrl;else need.push(g)})
    setCovers(p=>({...p,...map}))
    if(!need.length) return
    let cancelled=false
    Promise.all(need.map(g=>
      fetch(`https://api.rawg.io/api/games/${g.rawgSlug}?key=${RAWG_KEY}`)
        .then(r=>r.json()).then(d=>({slug:g.rawgSlug,url:d.background_image||null}))
        .catch(()=>({slug:g.rawgSlug,url:null}))
    )).then(res=>{
      if(cancelled) return
      const ex={};res.forEach(({slug,url})=>{ex[slug]=url})
      setCovers(p=>({...p,...ex}))
    })
    return()=>{cancelled=true}
  },[games])
  return covers
}

// ─── YOUTUBE TRAILER ──────────────────────────────────────────────────────────
function useTrailer(title, enabled) {
  const [videoId,setVideoId]=useState(null)
  const [loading,setLoading]=useState(false)
  useEffect(()=>{
    if(!enabled||!title) return
    let cancelled=false;setLoading(true);setVideoId(null)
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(title+' official trailer')}&type=video&maxResults=1&key=${YT_KEY}`)
      .then(r=>r.json())
      .then(d=>{if(!cancelled){setVideoId(d.items?.[0]?.id?.videoId||null);setLoading(false)}})
      .catch(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[title,enabled])
  return{videoId,loading}
}

// ─── ADD BUTTON ───────────────────────────────────────────────────────────────
function AddButton({ game, coverUrl, t, className='', label, addedLabel, style={} }) {
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary()
  const libInLib = isInLibrary(game.rawgSlug)
  const [inLib, setInLib]   = useState(libInLib)
  const [busy, setBusy]     = useState(false)
  const [popped, setPopped] = useState(false)

  // Re-sync whenever the game itself changes (e.g. hero carousel sliding to a new game),
  // not just when the boolean flips — otherwise two different games that both evaluate
  // to the same inLib value won't trigger a re-check and the label goes stale.
  useEffect(() => { setInLib(libInLib) }, [game.rawgSlug, libInLib])

  const handle = async (e) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      if (inLib) {
        await removeFromLibrary(game.rawgSlug)
        setInLib(false)
      } else {
        const added = await addToLibrary({
          slug: game.rawgSlug, title: game.title, genre: game.genre,
          rating: game.rating, cover: coverUrl || null, accent: game.accent || '#a855f7',
        })
        setInLib(true)
        if (added) awardXP('added_game', game.title)
        setPopped(true)
        setTimeout(() => setPopped(false), 400)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`${className} ${popped ? 'added-pop' : ''}`}
      style={{
        ...style,
        cursor: busy ? 'wait' : 'pointer',
        ...(inLib ? { background:'#16a34a22', color:'#22c55e', borderColor:'#22c55e55' } : {}),
      }}
    >
      {busy ? '…' : inLib ? (addedLabel || '✓ Added') : (label || '+ Add')}
    </button>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({pct,t}) {
  return(
    <div style={{height:3,borderRadius:4,background:t.border,overflow:'hidden'}}>
      <div className="bar-fill" style={{
        '--fill':`${pct}%`,width:`${pct}%`,height:'100%',borderRadius:4,
        background:`linear-gradient(90deg,${t.accentDim},${t.accent})`
      }}/>
    </div>
  )
}

// ─── TRAILER + LIBRARY MODAL ─────────────────────────────────────────────────
function TrailerModal({game,coverUrl,onClose,t}) {
  const{videoId,loading}=useTrailer(game?.title,true)
  const{isInLibrary,addToLibrary,removeFromLibrary}=useLibrary()
  const libInLib=game?isInLibrary(game.rawgSlug):false
  const [inLib,setInLib]=useState(libInLib)
  const [busy,setBusy]=useState(false)
  const [popped,setPopped]=useState(false)

  useEffect(()=>{setInLib(libInLib)},[game?.rawgSlug, libInLib])

  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')onClose()}
    window.addEventListener('keydown',h)
    return()=>window.removeEventListener('keydown',h)
  },[onClose])

  if(!game) return null

  const toggleLib=async(e)=>{
    e.stopPropagation()
    if(busy) return
    setBusy(true)
    try {
      if(inLib) {
        await removeFromLibrary(game.rawgSlug)
        setInLib(false)
      } else {
        const added = await addToLibrary({
          slug: game.rawgSlug, title: game.title, genre: game.genre,
          rating: game.rating, cover: coverUrl || null, accent: game.accent || '#a855f7',
        })
        setInLib(true)
        if (added) awardXP('added_game', game.title)
        setPopped(true)
        setTimeout(() => setPopped(false), 400)
      }
    } finally { setBusy(false) }
  }

  return(
    <div style={{
      position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16,
      background:'rgba(0,0,0,0.92)',backdropFilter:'blur(12px)',
    }} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{
        position:'relative',width:'100%',maxWidth:760,borderRadius:20,overflow:'hidden',
        background:t.card,border:`1px solid ${t.borderHover}`,boxShadow:`0 0 60px ${t.accentGlow}`,
      }}>
        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'16px 20px',borderBottom:`1px solid ${t.border}`,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {(coverUrl||game.imageUrl)&&(
              <img src={coverUrl||game.imageUrl} alt={game.title}
                style={{width:44,height:44,borderRadius:8,objectFit:'cover',border:`1px solid ${t.border}`}}/>
            )}
            <div>
              <p style={{fontSize:10,letterSpacing:'0.14em',color:t.textMuted,textTransform:'uppercase',fontFamily:'monospace'}}>Official Trailer</p>
              <h3 className="tnr" style={{fontSize:18,fontWeight:700,color:t.text,marginTop:2}}>{game.title}</h3>
              {game.genre&&<p style={{fontSize:11,color:t.textSub,marginTop:1}}>{game.genre.split('/')[0]?.trim()} {game.year?`· ${game.year}`:''}</p>}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {/* Add to Library */}
            <button onClick={toggleLib} disabled={busy}
              className={popped?'added-pop':''}
              style={{
              display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,
              fontSize:12,fontWeight:700,cursor:busy?'wait':'pointer',transition:'all 0.15s',
              ...(inLib
                ?{background:'#16a34a22',color:'#22c55e',border:'1px solid #22c55e55'}
                :{background:t.accentGlow,color:t.accent,border:`1px solid ${t.accentDim}44`}
              )
            }}>
              {busy?'…':inLib?<><Star size={13} fill="currentColor"/>In Library</>:<><Plus size={13}/>Add to Library</>}
            </button>
            <button onClick={onClose} style={{
              width:34,height:34,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              background:t.surface,border:`1px solid ${t.border}`,cursor:'pointer',color:t.textSub,
            }}>
              <X size={15}/>
            </button>
          </div>
        </div>
        {/* Video */}
        <div style={{position:'relative',width:'100%',paddingBottom:'56.25%'}}>
          {loading&&(
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,background:t.surface}}>
              <Loader2 size={30} style={{color:t.accent,animation:'spin 1s linear infinite'}}/>
              <p style={{fontSize:13,color:t.textSub}}>Loading trailer…</p>
            </div>
          )}
          {!loading&&!videoId&&(
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,background:t.surface}}>
              {(coverUrl||game.imageUrl)&&<img src={coverUrl||game.imageUrl} alt={game.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.3}}/>}
              <Play size={44} style={{color:t.textMuted,position:'relative',zIndex:1}}/>
              <p style={{fontSize:13,color:t.textSub,position:'relative',zIndex:1}}>Trailer unavailable</p>
            </div>
          )}
          {videoId&&(
            <iframe style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={game.title} allow="autoplay; fullscreen" allowFullScreen/>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SEARCH ROW ITEM (own state for busy/pop) ─────────────────────────────────
function SearchLibBtn({ game, inLib, addToLibrary, removeFromLibrary, onOpen, onClose, t }) {
  const [busy, setBusy]   = useState(false)
  const [popped, setPopped] = useState(false)
  const toggleLib = async (e) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      if (inLib) await removeFromLibrary(game.rawgSlug)
      else {
        const added = await addToLibrary({ slug:game.rawgSlug, title:game.title, genre:game.genre, rating:game.rating, cover:game.imageUrl||null, accent:game.accent })
        if (added) awardXP('added_game', game.title)
        setPopped(true); setTimeout(()=>setPopped(false),400)
      }
    } finally { setBusy(false) }
  }
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
      borderBottom:`1px solid ${t.border}`,cursor:'pointer',transition:'background 0.12s'}}
      onMouseEnter={e=>e.currentTarget.style.background=t.cardHover}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      <div style={{width:46,height:46,borderRadius:8,overflow:'hidden',flexShrink:0,background:t.card}}>
        {game.imageUrl
          ?<img src={game.imageUrl} alt={game.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><Search size={14} style={{color:t.textMuted}}/></div>
        }
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p className="tnr" style={{fontSize:13,fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{game.title}</p>
        <p style={{fontSize:11,color:t.textMuted,marginTop:2}}>{game.genre?.split('/')[0]?.trim()} {game.year?`· ${game.year}`:''}</p>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
        <Star size={11} style={{color:t.amber,fill:t.amber}}/>
        <span style={{fontSize:12,fontWeight:600,color:t.textSub}}>{game.rating}</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <button className="sr-btn" onClick={()=>{onOpen(game);onClose()}}
          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
            fontSize:11,fontWeight:700,background:t.accentGlow,color:t.accent,border:`1px solid ${t.accentDim}44`}}
          onMouseEnter={e=>{e.currentTarget.style.background=t.accentDim;e.currentTarget.style.color='#fff'}}
          onMouseLeave={e=>{e.currentTarget.style.background=t.accentGlow;e.currentTarget.style.color=t.accent}}>
          <Play size={10} fill="currentColor"/> Trailer
        </button>
        <button className={`sr-btn ${popped?'added-pop':''}`} onClick={toggleLib} disabled={busy}
          style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,
            fontSize:11,fontWeight:700,cursor:busy?'wait':'pointer',
            ...(inLib
              ?{background:'#16a34a22',color:'#22c55e',border:'1px solid #22c55e55'}
              :{background:t.card,color:t.textSub,border:`1px solid ${t.border}`})}}
          onMouseEnter={e=>{if(!inLib&&!busy){e.currentTarget.style.borderColor=t.accentDim;e.currentTarget.style.color=t.accent}}}
          onMouseLeave={e=>{if(!inLib&&!busy){e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.textSub}}}>
          {busy?'…':inLib?'✓ Saved':'+ Library'}
        </button>
      </div>
    </div>
  )
}

// ─── SEARCH PANEL ─────────────────────────────────────────────────────────────
function SearchPanel({results,searching,query,onOpen,onClose,t}) {
  const{isInLibrary,addToLibrary,removeFromLibrary}=useLibrary()
  if(!query.trim()||query.length<2) return null
  return(
    <div style={{
      position:'absolute',left:0,right:0,top:'100%',marginTop:8,zIndex:40,
      borderRadius:16,overflow:'hidden',boxShadow:`0 8px 40px rgba(0,0,0,0.5)`,
      background:t.surface,border:`1px solid ${t.border}`,
    }}>
      {searching&&(
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 18px'}}>
          <Loader2 size={15} style={{color:t.accent,animation:'spin 1s linear infinite'}}/>
          <span style={{fontSize:13,color:t.textSub}}>Searching…</span>
        </div>
      )}
      {!searching&&results.length===0&&(
        <div style={{padding:'14px 18px',fontSize:13,color:t.textMuted}}>No results for "{query}"</div>
      )}
      {!searching&&results.map(game=>{
        const inLib=isInLibrary(game.rawgSlug)
        return(
          <SearchLibBtn key={game.id} game={game} inLib={inLib}
            addToLibrary={addToLibrary} removeFromLibrary={removeFromLibrary}
            onOpen={onOpen} onClose={onClose} t={t}/>
        )
      })}
    </div>
  )
}

// ─── NOTIFICATION BELL ───────────────────────────────────────────────────────

// ─── GENRE PANEL ─────────────────────────────────────────────────────────────
function useGenreGames(slug) {
  const [games, setGames]   = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!slug) return
    setGames([]); setLoading(true)
    rawg(`games?genres=${slug}&ordering=-rating&page_size=24`)
      .then(res => setGames((res.results || []).map(toGame)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])
  return { games, loading }
}

function GenrePanel({ cat, onClose, t }) {
  const { games, loading } = useGenreGames(cat?.slug)
  const covers = useCovers(games)
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary()
  const [busyId,  setBusyId]  = useState(null)
  const [poppedId, setPoppedId] = useState(null)

  useEffect(() => {
    document.body.classList.add('panel-open')
    return () => document.body.classList.remove('panel-open')
  }, [])

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleAdd = async (e, game) => {
    e.stopPropagation()
    if (busyId === game.id) return
    const url = covers[game.rawgSlug] || game.imageUrl
    const inLib = isInLibrary(game.rawgSlug)
    setBusyId(game.id)
    try {
      if (inLib) await removeFromLibrary(game.rawgSlug)
      else {
        const added = await addToLibrary({ slug:game.rawgSlug, title:game.title, genre:game.genre, rating:game.rating, cover:url||null, accent:game.accent||'#a855f7' })
        if (added) awardXP('added_game', game.title)
        setPoppedId(game.id); setTimeout(() => setPoppedId(null), 400)
      }
    } finally { setBusyId(null) }
  }

  if (!cat) return null

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}/>
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, zIndex:51,
        width:'min(440px,94vw)', background:t.surface,
        borderLeft:`1px solid ${t.border}`,
        display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 48px rgba(0,0,0,0.55)',
        animation:'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:28 }} className="cat-emoji">{cat.emoji}</span>
            <div>
              <h2 className="tnr" style={{ fontSize:15, fontWeight:700, color:t.text }}>{cat.label} Games</h2>
              <p style={{ fontSize:11, color:t.textMuted, marginTop:2 }}>{cat.count} titles</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:t.card, border:`1px solid ${t.border}`, cursor:'pointer', color:t.textSub }}><X size={14}/></button>
        </div>

        <div className="genre-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
          {loading && Array.from({ length:10 }).map((_,i) => (
            <div key={i} style={{ height:64, borderRadius:12, background:t.card, opacity:1-i*0.07 }}/>
          ))}
          {!loading && games.map(game => {
            const url   = covers[game.rawgSlug] || game.imageUrl
            const inLib = isInLibrary(game.rawgSlug)
            return (
              <div key={game.id} style={{
                display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                borderRadius:12, background:t.card, border:`1px solid ${t.border}`,
                transition:'border-color 0.15s,background 0.15s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.background=t.cardHover}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.card}}
              >
                <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:t.surface }}>
                  {url && <img src={url} alt={game.title} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p className="tnr" style={{ fontSize:11, fontWeight:700, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{game.title}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                    <Star size={10} style={{ fill:t.amber, color:t.amber }}/>
                    <span style={{ fontSize:10, color:t.textMuted }}>{game.rating}</span>
                    {game.year && <span style={{ fontSize:10, color:t.textMuted }}>· {game.year}</span>}
                  </div>
                </div>
                <button onClick={e=>handleAdd(e,game)} disabled={busyId===game.id}
                  className={poppedId===game.id?'added-pop':''}
                  style={{
                    fontSize:10, fontWeight:700, padding:'5px 11px', borderRadius:8,
                    cursor:busyId===game.id?'wait':'pointer', flexShrink:0, transition:'all 0.15s',
                    ...(inLib
                      ?{background:'#16a34a22',color:'#22c55e',border:'1px solid #22c55e55'}
                      :{background:t.surface,color:t.textSub,border:`1px solid ${t.border}`}),
                  }}>
                  {busyId===game.id?'…':inLib?'✓ Added':'+ Add'}
                </button>
              </div>
            )
          })}
          {!loading && games.length===0 && <p style={{ textAlign:'center', color:t.textMuted, fontSize:13, marginTop:40 }}>No games found</p>}
        </div>
      </div>
    </>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { dark } = useTheme()
  const t = dark ? DARK : LIGHT

  const [heroIdx, setHeroIdx]           = useState(0)
  const [trailerGame, setTrailerGame]   = useState(null)
  const [trailerCover, setTrailerCover] = useState(null)
  const [showSearch, setShowSearch]     = useState(false)
  const [genrePanel, setGenrePanel]     = useState(null)
  const searchRef = useRef(null)
  const filmRef   = useRef(null)
  const autoRef   = useRef(null)

  // Mobile/Android layout detection — the hero card's text block and the
  // floating nav arrows both sit inside the same relatively-positioned card
  // with only a fixed 36px right padding, which is enough clearance on wide
  // desktop cards but not on narrow Android widths, where the text runs out
  // toward the right edge and collides with the arrow buttons. We detect
  // mobile widths here so we can give the content extra right-side padding
  // and pull the arrows in, without touching anything on desktop.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const{games:hero,loading:heroLoading}=useHeroGames()
  const{newReleases,trending,recommended,loading}=useHomeData()
  const heroCovers = useCovers(hero.slice(0,60))
  const trendCovers= useCovers(trending)
  const recCovers  = useCovers(recommended)
  const newCovers  = useCovers(newReleases)

  // Real library data for "Recently Added" section
  const { library, loading: libraryLoading } = useLibrary()
  const recentLibrary = [...library].sort((a,b) => new Date(b.added_at||0) - new Date(a.added_at||0)).slice(0,10)

  const{query,setQuery,results,searching,clear:clearSearch}=useSearch()

  const current      = hero[heroIdx]||{}
  const heroCoverUrl = heroCovers[current.rawgSlug]||current.imageUrl

  // Auto-advance hero (5s intervals)
  const resetAuto=useCallback(()=>{
    clearInterval(autoRef.current)
    if(!hero.length) return
    autoRef.current=setInterval(()=>setHeroIdx(i=>(i+1)%hero.length),5000)
  },[hero])

  useEffect(()=>{resetAuto();return()=>clearInterval(autoRef.current)},[resetAuto])

  // Scroll filmstrip thumb into view
  useEffect(()=>{
    if(!filmRef.current||!hero.length) return
    const strip = filmRef.current
    const thumb = strip.children[heroIdx]
    if(!thumb) return
    const stripRect = strip.getBoundingClientRect()
    const thumbRect = thumb.getBoundingClientRect()
    const offset = thumbRect.left - stripRect.left - (stripRect.width/2) + (thumbRect.width/2)
    strip.scrollLeft += offset
  },[heroIdx])

  // Close search on outside click
  useEffect(()=>{
    const h=e=>{if(searchRef.current&&!searchRef.current.contains(e.target))setShowSearch(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  const prev=()=>{setHeroIdx(i=>(i-1+hero.length)%hero.length);resetAuto()}
  const next=()=>{setHeroIdx(i=>(i+1)%hero.length);resetAuto()}

  const openTrailer=useCallback((game,coverUrl)=>{
    setTrailerGame(game)
    setTrailerCover(coverUrl||null)
  },[])
  const closeTrailer=useCallback(()=>setTrailerGame(null),[])

  const MAX_DOTS=18

  return (
    <>
      <style>{GLOBAL_STYLE(t)}</style>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div className="inter" style={{
        background:t.bg, color:t.text, minHeight:'100vh',
        padding: isMobile ? '16px 14px 32px' : '20px 24px 40px',
        display:'flex', flexDirection:'column', gap: isMobile ? 24 : 32,
        maxWidth:'100vw', overflowX:'hidden',
        transition:'background 0.3s, color 0.3s',
      }}>

        {/* ── Trailer Modal ── */}
        {trailerGame&&<TrailerModal game={trailerGame} coverUrl={trailerCover} onClose={closeTrailer} t={t}/>}

        {/* ── Genre Panel ── */}
        {genrePanel&&<GenrePanel cat={genrePanel} onClose={()=>setGenrePanel(null)} t={t}/>}

        {/* ── Top Controls (Search) ── */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {/* Search */}
          <div ref={searchRef} style={{flex:1,position:'relative'}}>
            <div
              style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,
                background:t.surface,border:`1px solid ${t.border}`,cursor:'text',
                transition:'border-color 0.2s',
              }}
              onClick={()=>setShowSearch(true)}
              onFocus={()=>setShowSearch(true)}
            >
              <Search size={14} style={{color:t.textMuted,flexShrink:0}}/>
              <input
                type="text" value={query}
                onChange={e=>{setQuery(e.target.value);setShowSearch(true)}}
                onFocus={()=>setShowSearch(true)}
                placeholder="Search games, genres, players…"
                style={{
                  flex:1,fontSize:13,background:'transparent',outline:'none',
                  color:t.text,fontFamily:'Inter,sans-serif',border:'none',
                }}
              />
              {query&&(
                <button onClick={e=>{e.stopPropagation();clearSearch()}} style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}>
                  <X size={13} style={{color:t.textMuted}}/>
                </button>
              )}
              <span style={{
                fontSize:10,padding:'2px 7px',borderRadius:6,letterSpacing:'0.04em',
                background:t.card,color:t.textMuted,border:`1px solid ${t.border}`,fontFamily:'monospace',
              }}>Ctrl K</span>
            </div>
            {showSearch&&(
              <SearchPanel results={results} searching={searching} query={query}
                onOpen={openTrailer} onClose={()=>setShowSearch(false)} t={t}/>
            )}
          </div>
        </div>

        {/* ── Hero Section ── */}
        <section>
          {heroLoading&&!hero.length?(
            <div style={{height:448,borderRadius:24,background:t.card,animation:'pulse 1.5s ease infinite'}}/>
          ):(
            <>
              {/* Main hero card */}
              <div className="scanlines" style={{
                position:'relative',borderRadius:24,overflow:'hidden',height:448,
                border:`1.5px solid ${t.border}`,
              }}>
                {/* BG image */}
                {heroCoverUrl?(
                  <>
                    <img key={heroCoverUrl} src={heroCoverUrl} alt={current.title}
                      style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transition:'opacity 0.6s ease'}}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(8,8,15,0.97) 0%,rgba(8,8,15,0.7) 50%,rgba(8,8,15,0.15) 100%)'}}/>
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,8,15,0.85) 0%,transparent 55%)'}}/>
                  </>
                ):(
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#08080f,#1a1a2e)'}}/>
                )}

                {/* Content */}
                <div className="hero-in" key={heroIdx} style={{
                  position:'relative',zIndex:3,height:'100%',
                  display:'flex',flexDirection:'column',justifyContent:'flex-end',
                  padding: isMobile ? '28px 64px 32px 20px' : '32px 36px 36px',
                  maxWidth:580,gap:0,boxSizing:'border-box',
                }}>
                  {/* Genre + Year badge */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                    <span style={{
                      fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',
                      padding:'5px 12px',borderRadius:20,
                      background:t.accentGlow,color:t.accent,border:`1px solid ${t.accentDim}55`,
                    }}>
                      {current.genre?.split('/')[0]?.trim()||'Game'}
                    </span>
                    {current.year&&(
                      <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>· {current.year}</span>
                    )}
                    {current.platform&&(
                      <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',letterSpacing:'0.05em'}}>{current.platform}</span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="tnr" style={{
                    fontSize:'clamp(28px,5vw,52px)',fontWeight:900,color:'#fff',
                    lineHeight:1.08,marginBottom:14,letterSpacing:'-0.02em',
                  }}>
                    {current.title}
                  </h1>

                  {/* Caption */}
                  {current.caption&&(
                    <p style={{fontSize:13,fontStyle:'italic',color:'rgba(255,255,255,0.55)',marginBottom:10}}>
                      {current.caption}
                    </p>
                  )}

                  {/* Description */}
                  <p style={{
                    fontSize:13,lineHeight:1.7,color:'rgba(200,190,230,0.8)',
                    marginBottom:26,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
                  }}>
                    {current.description}
                  </p>

                  {/* Buttons */}
                  <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                    <button
                      onClick={()=>openTrailer(current,heroCoverUrl)}
                      style={{
                        display:'flex',alignItems:'center',gap:7,padding:'11px 22px',borderRadius:12,
                        fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s',
                        background:`linear-gradient(135deg,${t.accentDim},${t.accent})`,
                        color:'#fff',border:'none',boxShadow:`0 4px 22px ${t.accentGlow}`,
                      }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
                      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                    >
                      <Play size={13} fill="white"/> Play Trailer
                    </button>

                    <AddButton key={current.rawgSlug} game={current} coverUrl={heroCoverUrl} t={t}
                      style={{
                        display:'flex',alignItems:'center',gap:7,padding:'11px 20px',borderRadius:12,
                        fontSize:13,fontWeight:700,cursor:'pointer',transition:'all 0.2s',
                        background:'rgba(255,255,255,0.09)',color:'#fff',border:'1px solid rgba(255,255,255,0.18)',
                      }}
                      label={<><Plus size={13}/> Add to Library</>}
                      addedLabel="✓ In Library"
                    />

                    <div style={{display:'flex',alignItems:'center',gap:5}}>
                      <Star size={13} style={{fill:t.amber,color:t.amber}}/>
                      <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{current.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Nav arrows */}
                <div style={{
                  position:'absolute',right: isMobile ? 10 : 16,top:'50%',transform:'translateY(-50%)',
                  display:'flex',flexDirection:'column',gap:8,zIndex:4,
                }}>
                  <button onClick={prev} style={{
                    width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.1)',
                    cursor:'pointer',
                  }}><ChevronLeft size={16} color="#fff"/></button>
                  <button onClick={next} style={{
                    width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.1)',
                    cursor:'pointer',
                  }}><ChevronRight size={16} color="#fff"/></button>
                </div>

                {/* Dot indicators */}
                <div style={{
                  position:'absolute',bottom:16,left: isMobile ? 20 : 32,display:'flex',gap:5,zIndex:4,alignItems:'center',
                }}>
                  {hero.slice(0,Math.min(hero.length,MAX_DOTS)).map((_,i)=>(
                    <button key={i} className="hero-dot"
                      onClick={()=>{setHeroIdx(i);resetAuto()}}
                      style={{
                        height:5,borderRadius:4,border:'none',cursor:'pointer',
                        width:i===heroIdx?22:5,
                        background:i===heroIdx?t.accent:'rgba(255,255,255,0.25)',
                        padding:0,
                      }}/>
                  ))}
                  {hero.length>MAX_DOTS&&(
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginLeft:4}}>+{hero.length-MAX_DOTS}</span>
                  )}
                </div>

                {/* Hero counter badge */}
                {hero.length>0&&(
                  <div style={{
                    position:'absolute',top:14,right:14,zIndex:4,
                    display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:20,
                    background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',
                    color:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:600,
                    border:'1px solid rgba(255,255,255,0.1)',
                  }}>
                    <Zap size={10} style={{color:t.accent}}/> {heroIdx+1} / {hero.length}
                  </div>
                )}
              </div>

              {/* Filmstrip */}
              <div ref={filmRef} className="filmstrip" style={{
                display:'flex',gap:8,marginTop:10,overflowX:'auto',paddingBottom:4,
              }}>
                {heroLoading&&!hero.length
                  ?Array.from({length:14}).map((_,i)=>(
                      <div key={i} style={{flexShrink:0,width:80,height:48,borderRadius:10,background:t.card,animation:'pulse 1.5s ease infinite'}}/>
                    ))
                  :hero.map((g,i)=>{
                      const url=heroCovers[g.rawgSlug]||g.imageUrl
                      const active=i===heroIdx
                      return(
                        <button key={g.id} onClick={()=>{setHeroIdx(i);resetAuto()}}
                          style={{
                            flexShrink:0,width:80,height:48,borderRadius:10,overflow:'hidden',
                            border:active?`2px solid ${t.accent}`:'2px solid transparent',
                            opacity:active?1:0.45,
                            transform:active?'scale(1.06)':'scale(1)',
                            transition:'all 0.2s',
                            boxShadow:active?`0 0 14px ${t.accentGlow}`:'none',
                            padding:0,cursor:'pointer',background:t.card,
                          }}>
                          {url?<img src={url} alt={g.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
                        </button>
                      )
                    })
                }
              </div>
            </>
          )}
        </section>

        {/* ── Top Categories ── */}
        <section>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <h2 className="tnr" style={{fontSize:18,fontWeight:700,color:t.text}}>Top Categories</h2>
          </div>
          <div className="hp-cat-grid">
            {CATEGORIES.map(cat=>(
              <button key={cat.label} className="cat-card game-glow"
                onClick={()=>setGenrePanel(cat)}
                style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                  padding:'14px 8px',borderRadius:16,background:t.card,border:`1px solid ${t.border}`,
                  cursor:'pointer',transition:'background 0.15s,border-color 0.15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background=t.cardHover;e.currentTarget.style.borderColor=cat.color+'55'}}
                onMouseLeave={e=>{e.currentTarget.style.background=t.card;e.currentTarget.style.borderColor=t.border}}>
                <div style={{
                  width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',
                  background:`${cat.color}18`,border:`1px solid ${cat.color}30`,
                }}>
                  <span className="cat-emoji" style={{fontSize:20}}>{cat.emoji}</span>
                </div>
                <span className="tnr" style={{fontSize:10,fontWeight:700,color:t.text}}>{cat.label}</span>
                <span style={{fontSize:9,color:t.textMuted}}>{cat.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Trending + Recommended ── */}
        <div className="hp-tnr-grid">

          {/* Trending */}
          <section>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <TrendingUp size={15} style={{color:t.accent}}/>
                <h2 className="tnr" style={{fontSize:17,fontWeight:700,color:t.text}}>Trending This Week</h2>
              </div>
              <button style={{fontSize:12,fontWeight:600,color:t.accent,background:'none',border:'none',cursor:'pointer'}}>View All</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {loading
                ?Array.from({length:5}).map((_,i)=><div key={i} style={{height:60,borderRadius:12,background:t.card,animation:'pulse 1.5s ease infinite'}}/>)
                :trending.map(game=>{
                    const url=trendCovers[game.rawgSlug]||game.imageUrl
                    return(
                      <div key={game.id}
                        style={{display:'flex',alignItems:'center',gap: isMobile?8:10,padding: isMobile?'10px 12px':'10px 14px',borderRadius:12,cursor:'pointer',
                          background:t.card,border:`1px solid ${t.border}`,transition:'border-color 0.15s,background 0.15s',
                          maxWidth:'100%',boxSizing:'border-box',flexWrap: isMobile?'wrap':'nowrap'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.background=t.cardHover}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.card}}
                        onClick={()=>openTrailer(game,url)}>
                        <span className="tnr" style={{fontSize:13,fontWeight:700,width:18,textAlign:'center',color:t.textMuted,flexShrink:0}}>{game.rank}</span>
                        <div style={{width:38,height:38,borderRadius:8,overflow:'hidden',flexShrink:0,background:t.surface}}>
                          {url?<img src={url} alt={game.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
                        </div>
                        <div style={{flex:1,minWidth: isMobile?100:0}}>
                          <p className="tnr" style={{fontSize:12,fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{game.title}</p>
                          <p style={{fontSize:10,color:t.textMuted,marginTop:2}}>{game.players} ratings</p>
                        </div>
                        {!isMobile&&(
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 7px',borderRadius:6,background:'#22c55e18',color:'#22c55e',flexShrink:0}}>
                            +{Math.floor(Math.random()*18)+2}%
                          </span>
                        )}
                        <AddButton game={game} coverUrl={url} t={t}
                          style={{fontSize:10,fontWeight:700,padding:'5px 10px',borderRadius:8,transition:'all 0.15s',flexShrink:0,
                            background:t.surface,color:t.textSub,border:`1px solid ${t.border}`,cursor:'pointer'}}
                          label="+ Add" addedLabel="✓"/>
                      </div>

                    )
                  })
              }
            </div>
          </section>

          {/* Recommended */}
          <section>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Sparkles size={15} style={{color:t.accent}}/>
                <h2 className="tnr" style={{fontSize:17,fontWeight:700,color:t.text}}>Recommended For You</h2>
              </div>
              <button style={{fontSize:12,fontWeight:600,color:t.accent,background:'none',border:'none',cursor:'pointer'}}>View All</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {loading
                ?Array.from({length:5}).map((_,i)=><div key={i} style={{height:60,borderRadius:12,background:t.card,animation:'pulse 1.5s ease infinite'}}/>)
                :recommended.map(game=>{
                    const url=recCovers[game.rawgSlug]||game.imageUrl
                    const match=`${Math.floor(Math.random()*12)+87}%`
                    return(
                      <div key={game.id}
                        style={{display:'flex',alignItems:'center',gap: isMobile?8:10,padding: isMobile?'10px 12px':'10px 14px',borderRadius:12,cursor:'pointer',
                          background:t.card,border:`1px solid ${t.border}`,transition:'border-color 0.15s,background 0.15s',
                          maxWidth:'100%',boxSizing:'border-box',flexWrap: isMobile?'wrap':'nowrap'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHover;e.currentTarget.style.background=t.cardHover}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.background=t.card}}
                        onClick={()=>openTrailer(game,url)}>
                        <div style={{width:38,height:38,borderRadius:8,overflow:'hidden',flexShrink:0,background:t.surface}}>
                          {url?<img src={url} alt={game.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:null}
                        </div>
                        <div style={{flex:1,minWidth: isMobile?100:0}}>
                          <p className="tnr" style={{fontSize:12,fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{game.title}</p>
                          <p style={{fontSize:10,color:t.textMuted,marginTop:2}}>{game.genre?.split('/')[0]?.trim()}</p>
                        </div>
                        {!isMobile&&(
                          <span style={{fontSize:10,fontWeight:700,padding:'3px 7px',borderRadius:6,background:t.accentGlow,color:t.accent,flexShrink:0}}>
                            {match}
                          </span>
                        )}
                        <AddButton game={game} coverUrl={url} t={t}
                          style={{fontSize:10,fontWeight:700,padding:'5px 10px',borderRadius:8,transition:'all 0.15s',flexShrink:0,
                            background:t.surface,color:t.textSub,border:`1px solid ${t.border}`,cursor:'pointer'}}
                          label="+ Add" addedLabel="✓"/>
                      </div>
                    )
                  })
              }
            </div>
          </section>
        </div>

        {/* ── Recently Added to Library ── */}
        <section>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <BookOpen size={15} style={{color:t.accent}}/>
              <h2 className="tnr" style={{fontSize:17,fontWeight:700,color:t.text}}>Recently Added to Library</h2>
            </div>
            <button style={{fontSize:12,fontWeight:600,color:t.accent,background:'none',border:'none',cursor:'pointer'}}>View All</button>
          </div>
          <div className="filmstrip" style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:6}}>
            {libraryLoading
              ? Array.from({length:8}).map((_,i)=><div key={i} style={{flexShrink:0,width:130,height:185,borderRadius:14,background:t.card,animation:'pulse 1.5s ease infinite'}}/>)
              : recentLibrary.length === 0
                ? <p style={{fontSize:13,color:t.textMuted,padding:'20px 0'}}>No games in library yet — add some above!</p>
                : recentLibrary.map(entry=>{
                    const url = entry.cover || null
                    const game = {
                      rawgSlug: entry.slug, title: entry.title, genre: entry.genre,
                      rating: entry.rating, accent: entry.accent || '#a855f7',
                      imageUrl: url, id: entry.id,
                    }
                    return (
                      <div key={entry.id} className="game-glow"
                        style={{flexShrink:0,width:130,borderRadius:14,overflow:'hidden',cursor:'pointer',
                          background:t.card,border:`1px solid ${t.border}`,transition:'border-color 0.2s'}}
                        onClick={()=>openTrailer(game, url)}>
                        <div style={{height:130,position:'relative',overflow:'hidden'}}>
                          {url
                            ? <img src={url} alt={entry.title} loading="lazy"
                                style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform 0.4s ease'}}
                                onMouseEnter={e=>e.currentTarget.style.transform='scale(1.08)'}
                                onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
                            : <div style={{width:'100%',height:'100%',background:t.surface,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>🎮</div>
                          }
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                            opacity:0,transition:'opacity 0.2s',background:'rgba(0,0,0,0.55)'}}
                            onMouseEnter={e=>e.currentTarget.style.opacity=1}
                            onMouseLeave={e=>e.currentTarget.style.opacity=0}>
                            <Play size={24} fill="white" color="white"/>
                          </div>
                          <div style={{position:'absolute',bottom:6,left:6}}>
                            <span style={{fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:6,
                              background:'rgba(0,0,0,0.7)',color:'#fff',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                              {entry.status || 'wishlist'}
                            </span>
                          </div>
                        </div>
                        <div style={{padding:10}}>
                          <p className="tnr" style={{fontSize:11,fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.title}</p>
                          <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                            <Star size={10} style={{fill:t.amber,color:t.amber}}/>
                            <span style={{fontSize:10,color:t.textMuted}}>{entry.rating || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
            }
          </div>
        </section>

      </div>
    </>
  )
}
