import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useApp, useToast } from '@/store/app'

/* ---------------- Logo ---------------- */

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white shadow-soft transition group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3 8l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">Invite Studio</span>
          <span className="block text-[10px] tracking-[0.18em] text-ink-mute">AI 请帖工坊</span>
        </span>
      )}
    </Link>
  )
}

/* ---------------- 导航栏 ---------------- */

const NAV = [
  { to: '/templates', label: '模板中心' },
  { to: '/my-templates', label: '我的模板' },
  { to: '/my', label: '我的作品' },
]

export function Navbar() {
  const user = useApp((s) => s.user)
  const signOut = useApp((s) => s.signOut)
  const location = useLocation()
  const navigate = useNavigate()
  const hide = location.pathname.startsWith('/editor')
  if (hide) return null

  return (
    <header className="sticky top-0 z-40 border-b border-paper-line/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5">
        <Logo />
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-4 py-2 text-sm transition',
                  isActive ? 'bg-primary-50 font-medium text-primary-600' : 'text-ink-soft hover:bg-paper-warm hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/editor" className="btn-primary btn-sm hidden sm:inline-flex">
            立即制作
          </Link>
          {user ? (
            <div className="group relative">
              <button className="flex h-9 items-center gap-2 rounded-full bg-paper-warm px-3 text-sm text-ink-soft ring-1 ring-paper-line transition hover:bg-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-[11px] font-semibold text-white">
                  {(user.name || user.email || user.phone || 'U').slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[110px] truncate">{user.name || user.email || user.phone || '我的账号'}</span>
              </button>
              <div className="invisible absolute right-0 top-full w-44 translate-y-1 rounded-xl bg-white p-1.5 opacity-0 shadow-lift ring-1 ring-paper-line transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <Link to="/my" className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-paper-warm">
                  我的作品
                </Link>
                <Link to="/my-templates" className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-paper-warm">
                  我的模板
                </Link>
                <button
                  onClick={() => {
                    void signOut()
                    navigate('/')
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50"
                >
                  退出登录
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-ghost btn-sm">
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

/* ---------------- 页脚 ---------------- */

export function Footer() {
  return (
    <footer className="mt-20 border-t border-paper-line/70 bg-white">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-mute">
            让每一场宴会都有一份独特的邀请。模板导入、在线编辑、AI 辅助设计、高清导出、电子请帖分享，
            全部在一个网站里完成。
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">产品</div>
          <div className="mt-3 space-y-2 text-sm text-ink-mute">
            <Link className="block hover:text-primary-600" to="/templates">模板中心</Link>
            <Link className="block hover:text-primary-600" to="/editor">在线编辑器</Link>
            <Link className="block hover:text-primary-600" to="/my-templates">导入模板</Link>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">支持</div>
          <div className="mt-3 space-y-2 text-sm text-ink-mute">
            <span className="block">婚礼 · 生日 · 寿宴</span>
            <span className="block">满月 · 升学 · 乔迁</span>
            <span className="block">商务 · 节日 · 家庭聚会</span>
          </div>
        </div>
      </div>
      <div className="border-t border-paper-line/60 py-5 text-center text-xs text-ink-mute">
        © {new Date().getFullYear()} Invite Studio · AI 智能宴会请帖制作平台
      </div>
    </footer>
  )
}

/* ---------------- Toast ---------------- */

export function ToastHost() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-full px-5 py-3 text-sm shadow-lift',
            t.type === 'success' && 'bg-ink text-white',
            t.type === 'error' && 'bg-primary-600 text-white',
            t.type === 'info' && 'bg-white text-ink ring-1 ring-paper-line',
          )}
        >
          <span>{t.text}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className={clsx('relative w-full animate-scale-in rounded-2xl bg-white shadow-lift', width)}>
        <div className="flex items-center justify-between border-b border-paper-line/70 px-6 py-4">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-mute hover:bg-paper-warm hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- 其他 ---------------- */

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin text-primary-500', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-paper-line bg-white/60 px-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M3 8l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-mute">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  )
}
