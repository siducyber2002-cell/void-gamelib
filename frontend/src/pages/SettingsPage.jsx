import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, AlertTriangle, X as XIcon, Settings as SettingsIcon } from 'lucide-react'
import PageTour from '../components/onboarding/PageTour'
import { settingsTourSteps } from '../components/onboarding/tourSteps'

function memberSince(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SettingsPage() {
  const { user, changePassword, deleteAccount } = useAuth()
  const { dark: isDark, accent, ACCENTS } = useTheme()
  const navigate = useNavigate()

  // `accent` from context is a KEY (e.g. "purple"), not a color — resolve the real hex once here.
  const accentColor = ACCENTS?.[accent]?.primary || '#a855f7'

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current_password: false, new_password: false, confirm: false })
  const [saving, setSaving] = useState(false)

  // ── Delete account modal ──
  const [deleteStep, setDeleteStep] = useState(0) // 0 = closed, 1 = warning, 2 = password confirm
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const closeDeleteModal = () => {
    setDeleteStep(0)
    setDeletePassword('')
  }

  const confirmDelete = async (e) => {
    e.preventDefault()
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      toast.success('Your account has been deleted')
      navigate('/login')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Incorrect password')
      setDeleting(false)
    }
  }

  // ── Theme tokens (matches ProfilePage so Settings looks native to the site) ──
  const cardBg      = isDark ? 'rgba(20,27,44,0.96)'    : 'rgba(255,255,255,0.97)'
  const cardBorder  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const cardShadow  = isDark ? '0 2px 16px rgba(0,0,0,0.5)' : '0 2px 16px rgba(0,0,0,0.08)'
  const inputBg     = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  const tabBarBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const divider     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textPrimary = isDark ? '#e8edf5' : '#0f172a'
  const textSub     = isDark ? '#8892a4' : '#64748b'

  const submitPw = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) return toast.error("Passwords don't match!")
    if (pwForm.new_password.length < 6) return toast.error('New password must be at least 6 characters')
    setSaving(true)
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password changed!')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch {
      toast.error('Incorrect current password')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: inputBg,
    border: `1.5px solid ${inputBorder}`,
    color: textPrimary,
  }

  // Small helper so each card fades/slides in with a stagger
  const cardAnim = (i) => ({
    animation: 'settingsCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
    animationDelay: `${i * 0.06}s`,
  })

  return (
    <div className="px-6 py-7 max-w-2xl animate-fade-in relative" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* ── First-time guided tour ── */}
      <PageTour pageKey="settings" steps={settingsTourSteps} />
      <style>{`
        @keyframes settingsCardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes settingsSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes settingsGlowPulse {
          0%   { transform: scale(0.85); opacity: 0.55; }
          80%  { transform: scale(1.55); opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        .settings-gear { animation: settingsSpin 9s linear infinite; }
        .settings-ring       { animation: settingsGlowPulse 2.6s ease-out infinite; }
        .settings-ring-delay { animation: settingsGlowPulse 2.6s ease-out 1.3s infinite; }
      `}</style>

      {/* ── Animated header / logo ── */}
      <div className="flex items-center gap-4 mb-7">
        <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
          <span className="absolute inset-0 rounded-2xl settings-ring"       style={{ background: accentColor + '35' }} />
          <span className="absolute inset-0 rounded-2xl settings-ring-delay" style={{ background: accentColor + '35' }} />
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #7c3aed)`, boxShadow: `0 8px 24px ${accentColor}55` }}
          >
            <SettingsIcon size={24} className="text-white settings-gear" strokeWidth={2.25} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: textPrimary }}>Settings</h1>
          <p className="text-sm" style={{ color: textSub }}>Manage your account</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">

        <div style={{ ...cardAnim(0), background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }} className="rounded-2xl p-6" data-tour="settings-account-info">
          <h2 className="font-display text-xl font-bold mb-4" style={{ color: textPrimary }}>Account Info</h2>
          <div className="flex flex-col gap-1">
            {[
              { label: 'Username', value: user?.username || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Member Since', value: memberSince(user?.created_at || user?.date_joined) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-3"
                style={{ borderBottom: `1px solid ${divider}` }}>
                <span className="text-sm font-semibold" style={{ color: textSub }}>{row.label}</span>
                <span className="text-sm font-medium" style={{ color: textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardAnim(1), background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }} className="rounded-2xl p-6" data-tour="settings-change-password">
          <h2 className="font-display text-xl font-bold mb-4" style={{ color: textPrimary }}>Change Password</h2>
          <form onSubmit={submitPw} className="flex flex-col gap-4">
            {[
              { field: 'current_password', label: 'Current Password' },
              { field: 'new_password', label: 'New Password' },
              { field: 'confirm', label: 'Confirm' },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: textPrimary }}>
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    required
                    value={pwForm[field]}
                    onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl outline-none transition-colors"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, [field]: !showPw[field] })}
                    className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: textSub }}>
                    {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-sm self-start transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #7c3aed)` }}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div style={{ ...cardAnim(2), background: cardBg, border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : '#fee2e2'}`, boxShadow: cardShadow }} className="rounded-2xl p-6" data-tour="settings-danger-zone">
          <h2 className="font-display text-xl font-bold text-red-500 mb-2">Danger Zone</h2>
          <p className="text-sm mb-4" style={{ color: textSub }}>Once you delete your account, there is no going back.</p>
          <button
            onClick={() => setDeleteStep(1)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-105 active:scale-95"
            style={{
              background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
              color: '#ef4444',
              borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
            }}>
            Delete Account
          </button>
        </div>
      </div>

      {/* ── Delete Account Modal ── */}
      {deleteStep > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 relative"
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: '0 20px 50px rgba(0,0,0,0.4)', animation: 'settingsCardIn 0.25s cubic-bezier(0.16,1,0.3,1) both' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeDeleteModal} className="absolute top-4 right-4" style={{ color: textSub }}>
              <XIcon size={18} />
            </button>

            {deleteStep === 1 && (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }}>
                  <AlertTriangle size={22} color="#ef4444" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: textPrimary }}>Delete your account?</h3>
                <p className="text-sm mb-4" style={{ color: textSub }}>
                  This permanently deletes your account and everything tied to it — your game library,
                  achievements, friends, reviews, messages, and activity history. This cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={closeDeleteModal}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: tabBarBg, color: textSub }}>
                    Cancel
                  </button>
                  <button onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#ef4444' }}>
                    I understand, continue
                  </button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <form onSubmit={confirmDelete}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }}>
                  <AlertTriangle size={22} color="#ef4444" />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: textPrimary }}>Confirm with your password</h3>
                <p className="text-sm mb-4" style={{ color: textSub }}>
                  Enter your password to permanently delete <strong style={{ color: textPrimary }}>{user?.username}</strong>.
                </p>
                <input
                  type="password"
                  required
                  autoFocus
                  value={deletePassword}
                  onChange={e => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-3 rounded-xl outline-none mb-4"
                  style={inputStyle}
                />
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={closeDeleteModal}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: tabBarBg, color: textSub }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={deleting || !deletePassword}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ background: '#ef4444' }}>
                    {deleting ? 'Deleting...' : 'Permanently delete account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
