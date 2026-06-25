import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Check } from 'lucide-react'

const SECTIONS = ['Account', 'Appearance', 'Notifications', 'Privacy']

export default function SettingsPage() {
  const { user, changePassword } = useAuth()
  const { accent, setAccent, ACCENTS } = useTheme()
  const [section, setSection] = useState('Account')
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [notifs, setNotifs] = useState({ friends: true, achievements: true, news: false, updates: true })
  const [privacy, setPrivacy] = useState({ showProfile: true, showLibrary: true, showActivity: false })

  const submitPw = async (e) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) return toast.error("Passwords don't match!")
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      toast.success('Password changed!')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch {
      toast.error('Incorrect current password')
    }
  }

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className="w-12 h-6 rounded-full relative transition-colors"
      style={{ background: value ? '#3b82f6' : '#e2e8f0' }}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${value ? 'left-6' : 'left-0.5'}`} />
    </button>
  )

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0">
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={section === s ? { background: '#eff6ff', color: '#2563eb' } : { color: '#64748b' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl flex flex-col gap-5">

        {section === 'Account' && (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Account Info</h2>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Username', value: user?.username },
                  { label: 'Email', value: user?.email },
                  { label: 'Member Since', value: 'June 2025' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-semibold text-slate-500">{row.label}</span>
                    <span className="text-sm text-slate-800 font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Change Password</h2>
              <form onSubmit={submitPw} className="flex flex-col gap-4">
                {['current_password', 'new_password', 'confirm'].map(field => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 capitalize">
                      {field.replace('_', ' ')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={pwForm[field]}
                        onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                        placeholder="••••••••"
                        className="input-field w-full px-4 py-3 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400"
                      />
                      {field === 'current_password' && (
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="submit" className="px-6 py-2.5 rounded-xl text-white font-bold text-sm self-start transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  Update Password
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50">
              <h2 className="font-display text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-slate-500 mb-4">Once you delete your account, there is no going back.</p>
              <button className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm border border-red-200 hover:bg-red-100 transition-all">
                Delete Account
              </button>
            </div>
          </>
        )}

        {section === 'Appearance' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Accent Color</h2>
            <p className="text-sm text-slate-500 mb-5">Choose your theme color across the app</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(ACCENTS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setAccent(key)}
                  className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all"
                  style={accent === key
                    ? { borderColor: val.primary, background: val.light }
                    : { borderColor: '#e2e8f0', background: 'white' }
                  }
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: val.primary }}>
                    {accent === key && <Check size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{val.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'Notifications' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-5">Notification Preferences</h2>
            <div className="flex flex-col gap-4">
              {Object.entries(notifs).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">{key} Notifications</p>
                    <p className="text-xs text-slate-400 mt-0.5">Get notified about {key}</p>
                  </div>
                  <Toggle value={val} onChange={v => setNotifs({ ...notifs, [key]: v })} />
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'Privacy' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-display text-xl font-bold text-slate-900 mb-5">Privacy Settings</h2>
            <div className="flex flex-col gap-4">
              {[
                { key: 'showProfile', label: 'Public Profile', desc: 'Let others view your profile' },
                { key: 'showLibrary', label: 'Show Library', desc: 'Let others see your game library' },
                { key: 'showActivity', label: 'Show Activity', desc: 'Let others see your recent activity' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle value={privacy[item.key]} onChange={v => setPrivacy({ ...privacy, [item.key]: v })} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
