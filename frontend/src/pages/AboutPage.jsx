import { Code2, Palette, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import teamPhoto from '../assets/team-duo.jpg'
import sidPhoto from '../assets/sid.jpeg'
import subhraPhoto from '../assets/subhra.jpeg'
import watermark from '../assets/watermark.jpeg'

// ── About Us — VOID ─────────────────────────────────────────────
// Drop this in as src/pages/AboutPage.jsx.
//
// Images to add to src/assets/ (same folder as team-duo.jpg):
//   sid.jpeg        — Siddhartha's individual photo
//   subhra.jpeg     — Subhranil's individual photo
//   watermark.jpeg  — full-page background watermark

const PEOPLE = [
  {
    name: 'Siddhartha Dhar',
    role: 'So-Called Full Stack Developer™',
    photo: sidPhoto,
    accent: '#a855f7',
    icon: Code2,
    blurb:
      "Professionally converts caffeine into bugs... and eventually into features. Can spend four hours hunting a problem only to discover the missing semicolon was simply \"testing his patience.\" Frequently says, \"This will take just 10 minutes,\" which in developer time roughly translates to tomorrow.",
  },
  {
    name: 'Subhranil Manna',
    role: 'Designer',
    photo: subhraPhoto,
    accent: '#f97316',
    icon: Palette,
    blurb:
      "The reason the app doesn't look like a government website from 2004. Believes every pixel deserves emotional support and every button should have a personality. Occasionally requests \"just one small UI change\" that accidentally becomes a complete redesign.",
  },
]

const WHY_WE_BUILT_THIS = [
  '"Bro, what should I play next?"',
  '"I have 300 games and nothing to play."',
  '"One last match." (Narrator: It wasn\'t.)',
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
    <div className="min-h-full relative overflow-hidden" style={{ background: pageBg }}>
      {/* Background watermark — low-opacity full-page image, with a light
          tint on top so text stays readable in both light and dark mode.
          (Previous version stacked a near-opaque tint over an already-faint
          image, which made the watermark invisible — fixed by giving the
          image more presence and the tint less.) */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${watermark})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isDark ? 0.18 : 0.12,
        }}
      />
      <div className="absolute inset-0 z-0" style={{ background: pageBg, opacity: 0.7 }} />

      <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10">
        <div className="max-w-5xl mx-auto">

          {/* Eyebrow + title */}
          <p className="text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-2" style={{ color: eyebrowCol }}>
            The Void · Origin Story
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3" style={{ color: textMain }}>
            About Us
          </h1>
          <p className="text-sm sm:text-base max-w-2xl mb-8 sm:mb-10" style={{ color: textMuted }}>
            This product is brought to you by Subhranil Manna and Siddhartha Dhar — two college
            friends who somehow survived assignments, attendance shortages, surprise presentations,
            and the education system's favorite horror dialogue: "You are short of attendance."
          </p>

          {/* Hero photo — full image, no cropping, sized to its own aspect ratio */}
          <div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden mb-8 sm:mb-12"
            style={{ border: `1px solid ${borderCol}` }}
          >
            <img
              src={teamPhoto}
              alt="Siddhartha Dhar and Subhranil Manna, the two people behind VOID"
              className="w-full h-auto block"
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-2 flex-wrap"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
            >
              <Sparkles size={15} className="flex-shrink-0" color="#e9d5ff" />
              <span className="text-xs sm:text-sm font-semibold text-purple-100">
                Siddhartha &amp; Subhranil — friends since 2020, still not sick of each other
              </span>
            </div>
          </div>

          {/* Our story */}
          <div
            className="rounded-2xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8"
            style={{ background: cardBg, border: `1px solid ${borderCol}` }}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ color: textMain }}>
              Our story
            </h2>
            <div className="text-sm leading-relaxed space-y-3" style={{ color: textMuted }}>
              <p>
                Our college life was a beautiful mix of backbench gossip, canteen food, questionable
                notes, and the daily debate: "Bro... is today's class actually important?" The
                answer was usually maybe. We attended anyway, only to discover the professor had
                taken a surprise holiday.
              </p>
              <p>
                Then college ended. Everyone scattered faster than a project group after the
                submission deadline. But our friendship survived, evolving into endless memes,
                random calls, and the most dangerous sentence known to mankind: "Bro... I have an
                idea." History has shown that this sentence has started more unfinished projects
                than motivation videos ever have.
              </p>
              <p>
                Until one day... "Bro, let's build a game library." And against all common sense...
                we actually did.
              </p>
            </div>
          </div>

          {/* Meet the team */}
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5" style={{ color: textMain }}>
            Meet the team
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {PEOPLE.map((person) => {
              const Icon = person.icon
              return (
                <div
                  key={person.name}
                  className="rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-transform hover:-translate-y-1"
                  style={{ background: cardBg, border: `1px solid ${borderCol}` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="overflow-visible flex-shrink-0 relative z-0 hover:z-20">
                      <img
                        src={person.photo}
                        alt={person.name}
                        className="w-14 h-14 rounded-full object-cover transition-transform duration-300 ease-out hover:scale-[2.2] hover:shadow-2xl cursor-pointer relative"
                        style={{ border: `2px solid ${person.accent}` }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-base" style={{ color: textMain }}>
                        {person.name}
                      </p>
                      <p
                        className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 mt-0.5 flex-wrap"
                        style={{ color: person.accent }}
                      >
                        <Icon size={13} className="flex-shrink-0" />
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

          {/* Why we built this */}
          <div
            className="rounded-2xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8"
            style={{ background: cardBg, border: `1px solid ${borderCol}` }}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ color: textMain }}>
              Why we built this
            </h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: textMuted }}>
              Because every gamer has asked:
            </p>
            <ul className="text-sm leading-relaxed space-y-1.5 mb-3 list-disc pl-5" style={{ color: textMuted }}>
              {WHY_WE_BUILT_THIS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
              So we built a place where gamers can discover games, save favorites, explore genres,
              and spend more time deciding what to play than actually playing. Just like the rest
              of us.
            </p>
          </div>

          {/* The reality */}
          <div
            className="rounded-2xl p-5 sm:p-6 md:p-8 mb-8 sm:mb-12"
            style={{ background: cardBg, border: `1px solid ${borderCol}` }}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ color: textMain }}>
              The reality
            </h2>
            <div className="text-sm leading-relaxed space-y-3" style={{ color: textMuted }}>
              <p>
                We're not a billion-dollar startup. No fancy office. No board meetings. No CEO
                saying "Let's leverage synergy." Just two friends, two laptops, terrible sleep
                schedules, 47 browser tabs, and unlimited confidence in saying: "Bro, this feature
                should be easy." It never is.
              </p>
              <p>
                This project isn't just about games. It's about friendship, terrible ideas that
                somehow worked, fixing bugs at 2 AM, laughing through the chaos, and replying "I'll
                do it tomorrow." Tomorrow is still under development.
              </p>
              <p>Thanks for being here.</p>
            </div>
          </div>

          {/* Footer credit line */}
          <p className="text-xs text-center mt-10 sm:mt-14 pb-4 px-2 font-semibold" style={{ color: textMuted }}>
            Two friends. One game library. Built for gamers, by gamers.
          </p>
        </div>
      </div>
    </div>
  )
}
