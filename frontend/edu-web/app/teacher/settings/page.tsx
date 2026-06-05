'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, CalendarDays, Settings, LogOut, RefreshCw, AlertTriangle,
  User, Palette, Bell, Shield, ChevronRight, Sun, Moon, Monitor,
  Eye, EyeOff,
} from 'lucide-react'
import { api } from '@/lib/api'
import NotificationBell from '@/components/NotificationBell'

type Section = 'general' | 'appearance' | 'notifications' | 'privacy'

const ACCENT = '#C5D000'
const ACCENT_TEXT = '#0f0e0e'

const SUB_NAV: { id: Section; label: string; icon: typeof User }[] = [
  { id: 'general',       label: 'General',           icon: User    },
  { id: 'appearance',    label: 'Appearance',         icon: Palette },
  { id: 'notifications', label: 'Notifications',      icon: Bell    },
  { id: 'privacy',       label: 'Privacy & Security', icon: Shield  },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>{children}</p>
}

function Input({ type = 'text', value, onChange, placeholder, readOnly }: {
  type?: string; value?: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="relative">
      <input
        type={isPassword && show ? 'text' : type}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
        style={{
          border: '1.5px solid #E8E5DC',
          background: readOnly ? '#FAFAF8' : 'white',
          color: '#0f0e0e',
        }}
        onFocus={e => { if (!readOnly) e.target.style.borderColor = ACCENT }}
        onBlur={e => e.target.style.borderColor = '#E8E5DC'}
      />
      {isPassword && (
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="font-black text-sm px-6 py-3 rounded-xl transition-all hover:-translate-y-px disabled:opacity-40 disabled:translate-y-0"
      style={danger
        ? { background: '#EF4444', color: 'white' }
        : { background: ACCENT, color: ACCENT_TEXT }}>
      {children}
    </button>
  )
}

function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="font-semibold text-sm px-5 py-3 rounded-xl transition-colors hover:bg-gray-50"
      style={{ border: '1.5px solid #E8E5DC', color: '#374151', background: 'white' }}>
      {children}
    </button>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-7" style={{ border: '1px solid #E8E5DC' }}>
      <h2 className="text-xl font-black tracking-tight mb-1" style={{ color: '#0f0e0e' }}>{title}</h2>
      {subtitle && <p className="text-sm text-gray-400 mb-6">{subtitle}</p>}
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-7 h-px" style={{ background: '#F0EDE8' }} />
}

// ── General ──────────────────────────────────────────────────────────────────

function GeneralSection({
  name: initialName, email, role, token,
  onNameUpdated,
  showSwitch, setShowSwitch, switching, switchError, onSwitch, onCancelSwitch,
}: {
  name: string; email: string; role: string; token: string
  onNameUpdated: (newName: string) => void
  showSwitch: boolean; setShowSwitch: (v: boolean) => void
  switching: boolean; switchError: string
  onSwitch: () => void; onCancelSwitch: () => void
}) {
  const [editName, setEditName]   = useState(initialName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')

  const saveProfile = async () => {
    if (!editName.trim()) return
    setSavingProfile(true); setProfileMsg(''); setProfileErr('')
    try {
      const res = await api.auth.updateProfile(token, editName.trim())
      onNameUpdated(res.user.name)
      setProfileMsg('Profile saved')
      setTimeout(() => setProfileMsg(''), 3000)
    } catch (e: any) {
      setProfileErr(e.message ?? 'Failed to save')
    } finally { setSavingProfile(false) }
  }

  const changePassword = async () => {
    if (!currentPw || !newPw) return
    setPwSaving(true); setPwMsg(''); setPwErr('')
    try {
      await api.auth.changePassword(token, currentPw, newPw)
      setPwMsg('Password updated successfully')
      setCurrentPw(''); setNewPw('')
      setTimeout(() => setPwMsg(''), 4000)
    } catch (e: any) {
      setPwErr(e.message ?? 'Failed to change password')
    } finally { setPwSaving(false) }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="General Settings" subtitle="Manage your basic account information">
        {/* Profile */}
        <p className="text-base font-black mb-5" style={{ color: '#0f0e0e' }}>Profile</p>
        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <Input value={editName} onChange={setEditName} />
          </div>
          <div>
            <FieldLabel>Email Address</FieldLabel>
            <Input value={email} readOnly type="email" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <div className="w-full rounded-xl px-4 py-3 text-sm flex items-center justify-between"
              style={{ border: '1.5px solid #E8E5DC', background: '#FAFAF8', color: '#0f0e0e' }}>
              <span>{role}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-md" style={{ background: ACCENT, color: ACCENT_TEXT }}>{role}</span>
            </div>
          </div>
        </div>
        {profileMsg && <p className="text-sm text-green-600 mb-3">{profileMsg}</p>}
        {profileErr && <p className="text-sm text-red-500 mb-3">{profileErr}</p>}
        <PrimaryBtn onClick={saveProfile} disabled={savingProfile || !editName.trim()}>
          {savingProfile ? 'Saving…' : 'Save Changes'}
        </PrimaryBtn>

        <Divider />

        {/* Password */}
        <p className="text-base font-black mb-5" style={{ color: '#0f0e0e' }}>Password</p>
        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>Current Password</FieldLabel>
            <Input type="password" value={currentPw} onChange={setCurrentPw} />
          </div>
          <div>
            <FieldLabel>New Password</FieldLabel>
            <Input type="password" value={newPw} onChange={setNewPw} />
          </div>
        </div>
        {pwMsg && <p className="text-sm text-green-600 mb-3">{pwMsg}</p>}
        {pwErr && <p className="text-sm text-red-500 mb-3">{pwErr}</p>}
        <PrimaryBtn onClick={changePassword} disabled={pwSaving || !currentPw || !newPw}>
          {pwSaving ? 'Updating…' : 'Update Password'}
        </PrimaryBtn>
      </SectionCard>

      {/* Role switch */}
      <SectionCard title="Switch Role" subtitle="Change your account role">
        <div className="flex items-start gap-3 rounded-xl p-4 mb-5"
          style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-0.5">Before switching to Student</p>
            <p className="text-xs text-amber-700 leading-relaxed">You must <strong>delete all your classrooms</strong> first. Sessions and channel history will be permanently deleted.</p>
          </div>
        </div>
        {switchError && (
          <p className="text-sm text-red-600 mb-4 px-4 py-3 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>{switchError}</p>
        )}
        {!showSwitch ? (
          <OutlineBtn onClick={() => setShowSwitch(true)}>
            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Switch to Student</span>
          </OutlineBtn>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Are you sure? You will be switched to a student account immediately.</p>
            <div className="flex gap-3">
              <PrimaryBtn danger onClick={onSwitch} disabled={switching}>
                {switching ? 'Switching…' : 'Yes, switch to Student'}
              </PrimaryBtn>
              <OutlineBtn onClick={onCancelSwitch}>Cancel</OutlineBtn>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Sign out */}
      <SectionCard title="Account">
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2.5 font-black text-sm px-6 py-3 rounded-xl transition-all hover:-translate-y-px text-white"
          style={{ background: '#0f0e0e' }}>
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </SectionCard>
    </div>
  )
}

// ── Appearance ───────────────────────────────────────────────────────────────

function applyTheme(t: string) {
  const resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t
  document.documentElement.setAttribute('data-theme', resolved)
  localStorage.setItem('kattral-theme', t)
}
function applyFont(f: string) {
  document.documentElement.setAttribute('data-fontsize', f)
  localStorage.setItem('kattral-fontsize', f)
}

function AppearanceSection() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (localStorage.getItem('kattral-theme') as any) ?? 'light'
  })
  const [fontSize, setFont] = useState<'small' | 'medium' | 'large'>(() => {
    if (typeof window === 'undefined') return 'medium'
    return (localStorage.getItem('kattral-fontsize') as any) ?? 'medium'
  })
  const [saved, setSaved] = useState(false)

  const THEMES = [
    { id: 'light',  label: 'Light Mode',        icon: Sun     },
    { id: 'dark',   label: 'Dark Mode',          icon: Moon    },
    { id: 'system', label: 'System Preferences', icon: Monitor },
  ] as const

  const save = () => {
    applyTheme(theme)
    applyFont(fontSize)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SectionCard title="Appearance" subtitle="Customize how the app looks">
      <p className="text-base font-black mb-4" style={{ color: '#0f0e0e' }}>Theme</p>
      <div className="grid grid-cols-3 gap-3 mb-7">
        {THEMES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTheme(id)}
            className="flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl transition-all"
            style={{
              border: theme === id ? `2px solid ${ACCENT}` : '1.5px solid #E8E5DC',
              background: theme === id ? '#FAFFF0' : 'white',
            }}>
            <Icon className="w-5 h-5" style={{ color: theme === id ? ACCENT_TEXT : '#9ca3af' }} />
            <span className="text-xs font-semibold" style={{ color: theme === id ? '#0f0e0e' : '#6b7280' }}>{label}</span>
          </button>
        ))}
      </div>

      <Divider />

      <p className="text-base font-black mb-4" style={{ color: '#0f0e0e' }}>Font Size</p>
      <div className="flex gap-3 mb-7">
        {(['small', 'medium', 'large'] as const).map(s => (
          <button key={s} onClick={() => setFont(s)}
            className="px-5 py-3 rounded-xl text-sm font-semibold capitalize transition-all"
            style={fontSize === s
              ? { background: ACCENT, color: ACCENT_TEXT, border: `1.5px solid ${ACCENT}` }
              : { border: '1.5px solid #E8E5DC', color: '#6b7280', background: 'white' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {saved && <p className="text-sm text-green-600 mb-3">Appearance saved and applied</p>}
      <PrimaryBtn onClick={save}>Save Appearance</PrimaryBtn>
    </SectionCard>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────

const NOTIF_KEY = 'kattral-notif-teacher'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: checked ? ACCENT : '#E8E5DC' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

function NotifRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4" style={{ borderBottom: '1px solid #F5F3EE' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: '#0f0e0e' }}>{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

const DEFAULT_NOTIF = { session: true, classroom: true, email: false, live: true, remind: false }

function NotificationsSection() {
  const [n, setN] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_NOTIF
    try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY) ?? '{}') } }
    catch { return DEFAULT_NOTIF }
  })
  const [saved, setSaved] = useState(false)
  const toggle = (k: keyof typeof DEFAULT_NOTIF) => setN((prev: typeof DEFAULT_NOTIF) => ({ ...prev, [k]: !prev[k] }))

  const save = () => {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(n))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SectionCard title="Notifications" subtitle="Control what you hear about">
      <NotifRow label="Session Alerts" desc="Get notified when a session starts or changes" checked={n.session} onChange={() => toggle('session')} />
      <NotifRow label="Live Session" desc="Alert when a class goes live right now" checked={n.live} onChange={() => toggle('live')} />
      <NotifRow label="Classroom Updates" desc="Changes to classrooms you manage" checked={n.classroom} onChange={() => toggle('classroom')} />
      <NotifRow label="Session Reminders" desc="15-minute reminder before scheduled sessions" checked={n.remind} onChange={() => toggle('remind')} />
      <NotifRow label="Email Notifications" desc="Receive a summary of activity via email" checked={n.email} onChange={() => toggle('email')} />
      <div className="mt-6 flex items-center gap-3">
        <PrimaryBtn onClick={save}>Save Preferences</PrimaryBtn>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </SectionCard>
  )
}

// ── Privacy & Security ────────────────────────────────────────────────────────

function TwoFactorCard({ token }: { token: string }) {
  const [step, setStep]     = useState<'idle' | 'setup' | 'enabled'>('idle')
  const [secret, setSecret] = useState('')
  const [uri, setUri]       = useState('')
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]       = useState('')
  const [msg, setMsg]       = useState('')

  const startSetup = async () => {
    setLoading(true); setErr('')
    try {
      const res = await api.auth.twoFaSetup(token)
      setSecret(res.secret); setUri(res.uri); setStep('setup')
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  const verify = async () => {
    if (code.length !== 6) return
    setLoading(true); setErr('')
    try {
      await api.auth.twoFaVerify(token, code)
      setMsg('2FA enabled successfully'); setStep('enabled'); setCode('')
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="rounded-xl p-5" style={{ border: '1px solid #E8E5DC', background: 'white' }}>
      <p className="text-sm font-black mb-1" style={{ color: '#0f0e0e' }}>Two-Factor Authentication</p>
      <p className="text-xs text-gray-400 mb-4">Add an extra layer of security to your account</p>

      {step === 'idle' && (
        <OutlineBtn onClick={startSetup}>{loading ? 'Setting up…' : 'Enable 2FA'}</OutlineBtn>
      )}

      {step === 'setup' && (
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: '#F7F6F3' }}>
            <p className="text-xs font-black text-gray-700 mb-1">1. Open your authenticator app</p>
            <p className="text-xs text-gray-500 mb-3">Google Authenticator, Authy, or any TOTP app works.</p>
            <p className="text-xs font-black text-gray-700 mb-1">2. Add account manually with this secret</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs font-mono px-3 py-2 rounded-lg break-all"
                style={{ background: '#0f0e0e', color: '#C5D000' }}>
                {secret}
              </code>
              <button onClick={() => navigator.clipboard.writeText(secret)}
                className="text-xs font-black px-3 py-2 rounded-lg shrink-0 transition-colors hover:bg-gray-200"
                style={{ border: '1px solid #E8E5DC' }}>
                Copy
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Or scan this URI in your app: <span className="break-all">{uri.substring(0, 60)}…</span></p>
          </div>
          <div>
            <p className="text-xs font-black text-gray-700 mb-2">3. Enter the 6-digit code from your app</p>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6}
                className="w-36 rounded-xl px-4 py-2.5 text-sm text-center font-mono tracking-widest outline-none"
                style={{ border: '1.5px solid #E8E5DC', background: '#F7F6F3' }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = '#E8E5DC'}
                onKeyDown={e => e.key === 'Enter' && verify()} />
              <PrimaryBtn onClick={verify} disabled={code.length !== 6 || loading}>
                {loading ? 'Verifying…' : 'Verify & Enable'}
              </PrimaryBtn>
            </div>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button onClick={() => { setStep('idle'); setCode(''); setErr('') }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
        </div>
      )}

      {step === 'enabled' && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <p className="text-sm text-green-700 font-semibold">{msg || '2FA is enabled'}</p>
        </div>
      )}
    </div>
  )
}

function PrivacySection({ token, onDeleteAccount }: { token: string; onDeleteAccount: () => void }) {
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deletePw, setDeletePw]     = useState('')
  const [deleteErr, setDeleteErr]   = useState('')
  const [sessions] = useState([{ device: 'Current browser', location: 'Active now', current: true }])

  const doDelete = async () => {
    setDeleteStep('deleting'); setDeleteErr('')
    try {
      await api.auth.deleteAccount(token, deletePw || undefined)
      onDeleteAccount()
    } catch (e: any) {
      setDeleteErr(e.message ?? 'Failed to delete account')
      setDeleteStep('confirm')
    }
  }

  return (
    <SectionCard title="Privacy & Security" subtitle="Manage your security and privacy settings">
      <div className="space-y-4">
        <TwoFactorCard token={token} />

        {/* Active Sessions */}
        <div className="rounded-xl p-5" style={{ border: '1px solid #E8E5DC', background: 'white' }}>
          <p className="text-sm font-black mb-1" style={{ color: '#0f0e0e' }}>Active Sessions</p>
          <p className="text-xs text-gray-400 mb-4">Your active login sessions</p>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: '#F7F6F3' }}>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{s.device}</p>
                  <p className="text-[10px] text-gray-400">{s.location}</p>
                </div>
                {s.current && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md"
                    style={{ background: ACCENT, color: ACCENT_TEXT }}>Current</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Delete Account */}
        <div className="rounded-xl p-5" style={{ border: '1.5px solid #FECACA', background: '#FEF2F2' }}>
          <p className="text-sm font-black mb-1 text-red-600">Delete Account</p>
          <p className="text-xs text-red-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          {deleteStep === 'idle' && (
            <button onClick={() => setDeleteStep('confirm')}
              className="font-black text-sm px-5 py-3 rounded-xl text-white transition-all hover:-translate-y-px"
              style={{ background: '#EF4444' }}>
              Delete Account
            </button>
          )}
          {deleteStep === 'confirm' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-red-700">Enter your password to confirm deletion:</p>
              <Input type="password" value={deletePw} onChange={setDeletePw} />
              {deleteErr && <p className="text-xs text-red-600">{deleteErr}</p>}
              <div className="flex gap-3">
                <button onClick={doDelete}
                  className="font-black text-sm px-5 py-3 rounded-xl text-white"
                  style={{ background: '#DC2626' }}>
                  Yes, delete permanently
                </button>
                <OutlineBtn onClick={() => { setDeleteStep('idle'); setDeletePw(''); setDeleteErr('') }}>Cancel</OutlineBtn>
              </div>
            </div>
          )}
          {deleteStep === 'deleting' && (
            <p className="text-sm text-red-500 font-semibold">Deleting account…</p>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherSettings() {
  const { data: session, status, update } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  const [section, setSection]     = useState<Section>('general')
  const [menuOpen, setMenuOpen]   = useState(false)
  const [showSwitch, setShowSwitch]   = useState(false)
  const [switching, setSwitching]     = useState(false)
  const [switchError, setSwitchError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.apiToken) { router.replace('/'); return }
  }, [session, status, router])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSwitchRole = async () => {
    if (!session?.apiToken || switching) return
    setSwitching(true); setSwitchError('')
    try {
      const data = await api.auth.switchRole(session.apiToken)
      await update({ role: data.role, apiToken: data.token })
      router.replace('/student/dashboard')
    } catch (e: any) {
      setSwitchError(e.message ?? 'Could not switch role.')
      setSwitching(false)
    }
  }

  const initials = (session?.user?.name ?? 'T').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()

  const nav = [
    { icon: <BookOpen className="w-4 h-4" />,     label: 'Classrooms', href: '/teacher/dashboard' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Schedule',   href: '/teacher/schedule'  },
    { icon: <Settings className="w-4 h-4" />,     label: 'Settings',   href: '/teacher/settings'  },
  ]

  return (
    <div className="min-h-screen font-sans" style={{ background: '#E8EDE5', color: '#0f0e0e' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white flex items-center justify-between px-6 h-16"
        style={{ borderBottom: '1px solid #E8E5DC' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0f0e0e' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-black text-sm tracking-tight">Kattral Academy</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.apiToken && <NotificationBell token={session.apiToken} />}
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-8 h-8 rounded-full text-[#0f0e0e] text-xs font-black flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ background: ACCENT }}>
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-60 bg-white rounded-xl py-1 z-50"
                style={{ border: '1px solid #E8E5DC', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #E8E5DC' }}>
                  <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 break-all">{session?.user?.email}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-xs font-black" style={{ background: ACCENT, color: ACCENT_TEXT }}>Teacher</span>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <LogOut className="w-4 h-4 text-gray-400" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] px-3 py-4 flex flex-col gap-2.5"
          style={{ background: '#F5F4F0', borderRight: '1px solid rgba(15,14,14,0.06)' }}>
          <div className="rounded-2xl bg-white px-2 py-2">
            {nav.map(({ icon, label, href }) => (
              <Link key={label} href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  pathname === href ? 'text-white' : 'text-gray-500 hover:bg-[#F5F3EE] hover:text-gray-900'
                }`}
                style={pathname === href ? { background: '#0f0e0e' } : {}}>
                {icon} {label}
              </Link>
            ))}
          </div>
          <div className="mt-auto rounded-2xl px-4 py-3" style={{ background: '#EAE8E3' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Educator Portal</p>
            <p className="text-xs font-semibold text-gray-600">{session?.user?.name?.split(' ')[0] ?? 'Teacher'}</p>
          </div>
        </aside>

        <main className="flex-1 min-h-[calc(100vh-4rem)] px-8 py-8">
          {/* Page title */}
          <div className="mb-7">
            <h1 className="text-2xl font-black tracking-tight">Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences</p>
          </div>

          <div className="flex gap-6 items-start">
            {/* Settings sub-nav */}
            <div className="w-52 shrink-0 rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
              {SUB_NAV.map(({ id, label, icon: Icon }) => {
                const active = section === id
                return (
                  <button key={id} onClick={() => setSection(id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold transition-colors text-left"
                    style={{
                      background: active ? ACCENT : 'transparent',
                      color: active ? ACCENT_TEXT : '#6b7280',
                      borderBottom: '1px solid #F5F3EE',
                    }}>
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </span>
                    {active && <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {section === 'general' && (
                <GeneralSection
                  name={session?.user?.name ?? ''}
                  email={session?.user?.email ?? ''}
                  role="Educator"
                  token={session?.apiToken ?? ''}
                  onNameUpdated={async (newName) => { await update({ name: newName }) }}
                  showSwitch={showSwitch}
                  setShowSwitch={setShowSwitch}
                  switching={switching}
                  switchError={switchError}
                  onSwitch={handleSwitchRole}
                  onCancelSwitch={() => { setShowSwitch(false); setSwitchError('') }}
                />
              )}
              {section === 'appearance'    && <AppearanceSection />}
              {section === 'notifications' && <NotificationsSection />}
              {section === 'privacy'       && (
                <PrivacySection
                  token={session?.apiToken ?? ''}
                  onDeleteAccount={() => signOut({ callbackUrl: '/' })}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
