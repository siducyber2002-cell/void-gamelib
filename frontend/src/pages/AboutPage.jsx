import { Code2, Palette, Github, Linkedin, Mail, Sparkles } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import teamPhoto from '../../assets/team-duo.jpg'

// ── About Us — VOID ─────────────────────────────────────────────
// Drop this in as src/pages/AboutPage.jsx (or wherever your other
// top-level pages like FriendsPage.jsx live) and wire up a route/sidebar
// link to it the same way you did for Friends/Dashboard/etc.
//
// Image: copy team-duo.jpg into src/assets/ (adjust the import path above
// if your assets folder lives somewhere else).

const PEOPLE = [
  {
    name: 'Siddhartha Dhar',
    role: 'Lead Full Stack AI Software Engineer',
    initial: 'S',
    accent: '#a855f7',
    icon: Code2,
    blurb:
      "Builds everything under the hood — the backend, the real-time systems, the AI pieces, the parts that make VOID actually work, not just look like it works.",
  },
  {
    name: 'Subhranil Manna',
    role: 'Lead Designer & Ideas',
    initial: 'A',
    accent: '#f97316',
    icon: Palette,
    blurb:
      "Shapes how VOID looks and feels, and keeps throwing out the ideas that turn a working app into a place people actually want to hang out.",
  },
]

export default function AboutPage() {
  const { dark: isDark } = useTheme()

  const pageBg     = isDark ? '#0b0b12' : '#f8fafc'
  const cardBg     = isDark ? '#111827' : 'white'
  const borderCol  = isDark ? '#374151' : '#e2e8f0'
  const textMain   = isDark ? '#f3f4f6' : '#0f172a'
  const textMuted  = isDark ? '#9ca3af' : '#64748b'
  const eyebrowCol = isDark ? '#c084fc' : '#9333ea'

  return (
    <div className="min-h-full px-6 py-8 md:px-10 md:py-10" style={{ background: pageBg }}>
      <div className="max-w-5xl mx-auto">

        {/* Eyebrow + title, matching the "YOUR SQUAD / Friends" pattern */}
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: eyebrowCol }}>
          The Void · Origin Story
        </p>
        <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ color: textMain }}>
          About Us
        </h1>
        <p className="text-base max-w-2xl mb-10" style={{ color: textMuted }}>
          Two people, one library. VOID is built and maintained by us — no studio,
          no team of fifty, just two friends who wanted a game library that
          didn't feel like a spreadsheet.
        </p>

        {/* Hero photo */}
        <div
          className="relative rounded-3xl overflow-hidden mb-12"
          style={{ border: `1px solid ${borderCol}` }}
        >
          <img
            src={teamPhoto}
            alt="Siddhartha Dhar and Subhranil Manna, the two people behind VOID"
            className="w-full h-72 md:h-96 object-cover"
            style={{ objectPosition: '50% 20%' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 50%)' }}
          />
          <div className="absolute bottom-5 left-6 right-6 flex items-center gap-2">
            <Sparkles size={16} color="#e9d5ff" />
            <span className="text-sm font-semibold text-purple-100">
              Siddhartha &amp; Subhranil — building VOID since day one
            </span>
          </div>
        </div>

        {/* Mission */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-12"
          style={{ background: cardBg, border: `1px solid ${borderCol}` }}
        >
          <h2 className="text-xl font-bold mb-3" style={{ color: textMain }}>
            Why we built this
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
            We were tired of scattered game lists, half-finished trackers, and
            libraries that felt like an afterthought. VOID is our answer —
            a home for your games, your friends, and your progress, built
            by two people who actually play the games they're building this for.
          </p>
        </div>

        {/* Team cards */}
        <h2 className="text-xl font-bold mb-5" style={{ color: textMain }}>
          The people behind VOID
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {PEOPLE.map((person) => {
            const Icon = person.icon
            return (
              <div
                key={person.name}
                className="rounded-2xl p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1"
                style={{ background: cardBg, border: `1px solid ${borderCol}` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${person.accent}, #8b5cf6)` }}
                  >
                    {person.initial}
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: textMain }}>
                      {person.name}
                    </p>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 mt-0.5"
                      style={{ color: person.accent }}
                    >
                      <Icon size={13} />
                      {person.role}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                  {person.blurb}
                </p>
              </div>
            )
          })}
        </div>

        {/* Footer credit line, echoing the topbar credit */}
        <p className="text-xs text-center mt-14 pb-4" style={{ color: textMuted }}>
          VOID — designed and developed by Subhranil Manna and Siddhartha Dhar.
        </p>
      </div>
    </div>
  )
}
