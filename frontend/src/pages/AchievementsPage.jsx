import { useState } from 'react'
import { Trophy, Lock } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const TABS = ['All', 'Completed', 'In Progress', 'Rare', 'Legendary']

const ACHIEVEMENTS = [
  { id: 1, title: 'Master Explorer', desc: 'Discover all regions in any open world game', emoji: '🗺️', rarity: 'Legendary', progress: 100, xp: 500 },
  { id: 2, title: 'Speed Runner', desc: 'Complete any game in under 2 hours', emoji: '⚡', rarity: 'Rare', progress: 100, xp: 300 },
  { id: 3, title: 'Library Giant', desc: 'Own more than 20 games', emoji: '📚', rarity: 'Common', progress: 100, xp: 100 },
  { id: 4, title: 'Social Butterfly', desc: 'Add 10 friends to your list', emoji: '🦋', rarity: 'Common', progress: 70, xp: 100 },
  { id: 5, title: 'Night Owl', desc: 'Play for more than 5 hours in a single session', emoji: '🦉', rarity: 'Rare', progress: 100, xp: 250 },
  { id: 6, title: 'Completionist', desc: 'Complete 5 games at 100%', emoji: '✅', rarity: 'Legendary', progress: 40, xp: 500 },
  { id: 7, title: 'Genre Hopper', desc: 'Play games from 5 different genres', emoji: '🎯', rarity: 'Common', progress: 100, xp: 150 },
  { id: 8, title: 'RPG King', desc: 'Spend over 200 hours in RPG games', emoji: '⚔️', rarity: 'Rare', progress: 85, xp: 300 },
  { id: 9, title: 'Legendary Gamer', desc: 'Earn 10 Legendary achievements', emoji: '👑', rarity: 'Legendary', progress: 20, xp: 1000 },
  { id: 10, title: 'Early Adopter', desc: 'Play a game on its release day', emoji: '🚀', rarity: 'Rare', progress: 100, xp: 200 },
  { id: 11, title: 'Critic', desc: 'Rate 20 different games', emoji: '⭐', rarity: 'Common', progress: 55, xp: 100 },
  { id: 12, title: 'Trendsetter', desc: 'Play a trending game within 24h of it trending', emoji: '🔥', rarity: 'Rare', progress: 0, xp: 250 },
]

const RARITY_STYLES = {
  Legendary: { bg: 'achievement-legendary', label: '#fbbf24', border: '#fbbf24' },
  Rare:      { bg: 'achievement-rare',      label: '#a78bfa', border: '#a78bfa' },
  Common:    { bg: 'achievement-common',    label: '#60a5fa', border: '#60a5fa' },
}

export default function AchievementsPage() {
  const { dark: isDark } = useTheme()
  const accentColors = { primary: '#a855f7', secondary: '#7c3aed' }
  const [tab, setTab] = useState('All')

  const filtered = ACHIEVEMENTS.filter(a => {
    if (tab === 'All') return true
    if (tab === 'Completed') return a.progress === 100
    if (tab === 'In Progress') return a.progress > 0 && a.progress < 100
    if (tab === 'Rare') return a.rarity === 'Rare'
    if (tab === 'Legendary') return a.rarity === 'Legendary'
    return true
  })

  const completed = ACHIEVEMENTS.filter(a => a.progress === 100).length
  const totalXP = ACHIEVEMENTS.filter(a => a.progress === 100).reduce((s, a) => s + a.xp, 0)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900">🏆 Achievements</h1>
        <p className="text-slate-500 mt-1">Track your gaming milestones</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed', value: `${completed}/${ACHIEVEMENTS.length}`, color: accentColors.primary },
          { label: 'Total XP', value: totalXP.toLocaleString(), color: '#f59e0b' },
          { label: 'Legendary', value: ACHIEVEMENTS.filter(a => a.rarity === 'Legendary' && a.progress === 100).length, color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
            <p className="font-display text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-700">Overall Progress</span>
          <span className="font-bold text-sm" style={{ color: accentColors.primary }}>{Math.round(completed / ACHIEVEMENTS.length * 100)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${completed / ACHIEVEMENTS.length * 100}%`, background: `linear-gradient(90deg, ${accentColors.primary}, #8b5cf6)` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === t
              ? { background: 'white', color: accentColors.primary, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
              : { color: '#64748b' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ach => {
          const style = RARITY_STYLES[ach.rarity]
          const done = ach.progress === 100
          return (
            <div
              key={ach.id}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all hover:shadow-card ${!done ? 'opacity-70' : ''}`}
              style={{ borderColor: done ? style.border + '40' : '#e2e8f0' }}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${done ? style.bg : 'bg-slate-100'}`}>
                    {done ? ach.emoji : <Lock size={20} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-slate-900 text-sm">{ach.title}</h3>
                      <span
                        className="badge text-white"
                        style={{ background: style.label }}
                      >
                        {ach.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ach.desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Trophy size={12} className="text-amber-400" />
                      <span className="text-xs font-bold text-amber-500">{ach.xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs font-bold text-slate-600">{ach.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${ach.progress}%`,
                        background: done
                          ? ach.rarity === 'Legendary' ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          : ach.rarity === 'Rare' ? 'linear-gradient(90deg, #a78bfa, #8b5cf6)'
                          : `linear-gradient(90deg, ${accentColors.primary}, #60a5fa)`
                          : '#cbd5e1'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
