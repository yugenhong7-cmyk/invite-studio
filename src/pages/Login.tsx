import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cloud, cloudErrorMessage } from '@/lib/cloud'
import { useApp, toast } from '@/store/app'
import { Logo } from '@/components/ui'
import clsx from 'clsx'

type Tab = 'phone' | 'email' | 'other'

interface PendingOtp {
  target: string
  channel: 'phone' | 'email'
  verificationId: string
  isExistingUser: boolean
}

const PHONE_RE = /^1\d{10}$/

export default function Login() {
  const navigate = useNavigate()
  const session = useApp((s) => s.session)
  const [tab, setTab] = useState<Tab>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const pending = useRef<PendingOtp | null>(null)

  useEffect(() => {
    if (session) navigate('/my', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [countdown])

  const identifier = tab === 'phone' ? phone.trim() : email.trim()

  async function sendCode() {
    setError('')
    if (tab === 'phone') {
      if (!PHONE_RE.test(phone.trim())) {
        setPhoneError('请输入正确的 11 位手机号')
        return
      }
      setPhoneError('')
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError('请输入正确的邮箱地址')
        return
      }
    }
    setSending(true)
    try {
      const sent = tab === 'phone' ? await cloud.auth.sendOtp({ phone: phone.trim() }) : await cloud.auth.sendOtp({ email: email.trim() })
      if (sent.error) {
        setError(cloudErrorMessage(sent.error, '验证码发送失败'))
        return
      }
      const data = sent.data as { verificationId: string; isExistingUser: boolean }
      pending.current = {
        target: identifier,
        channel: tab === 'phone' ? 'phone' : 'email',
        verificationId: data.verificationId,
        isExistingUser: data.isExistingUser,
      }
      setCountdown(60)
      toast('success', '验证码已发送')
    } catch (e) {
      setError(cloudErrorMessage(e, '验证码发送失败'))
    } finally {
      setSending(false)
    }
  }

  async function submit() {
    setError('')
    const p = pending.current
    if (!p || p.target !== identifier) {
      setError('请先为当前手机号 / 邮箱获取验证码')
      return
    }
    if (!code.trim()) {
      setError('请输入验证码')
      return
    }
    setSubmitting(true)
    try {
      const completed = await cloud.auth.verifyOtp({
        verificationId: p.verificationId,
        isExistingUser: p.isExistingUser,
        token: code.trim(),
        ...(p.channel === 'phone' ? { phone: p.target } : { email: p.target }),
      } as never)
      if (completed.error) {
        setError(cloudErrorMessage(completed.error, '登录失败'))
        return
      }
      pending.current = null
      await useApp.getState().refresh()
      toast('success', '登录成功')
      navigate('/my', { replace: true })
    } catch (e) {
      setError(cloudErrorMessage(e, '登录失败'))
    } finally {
      setSubmitting(false)
    }
  }

  async function startOAuth(provider: 'wechat' | 'workbuddy') {
    setError('')
    try {
      const back = new URL(location.href)
      back.pathname = '/'
      for (const key of ['code', 'state', 'provider']) back.searchParams.delete(key)
      const res = await cloud.auth.signInWithOAuth({
        provider,
        redirectTo: back.toString(),
      })
      if (res.error) {
        setError(cloudErrorMessage(res.error, '无法发起授权登录'))
        return
      }
      // 必须在同一个标签页跳转，否则 PKCE 证明丢失
      location.assign(res.data.url)
    } catch (e) {
      setError(cloudErrorMessage(e, '无法发起授权登录'))
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-5 py-14">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-gold-100/50 blur-3xl" />

      <div className="relative w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <div className="mx-auto w-fit">
            <Logo />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">欢迎回来</h1>
          <p className="mt-2 text-sm text-ink-mute">登录后可保存作品、生成电子请帖链接、查看宾客回执</p>
        </div>

        <div className="card p-6">
          <div className="flex rounded-full bg-paper-soft p-1">
            {(
              [
                { id: 'phone', label: '手机号登录' },
                { id: 'email', label: '邮箱登录' },
                { id: 'other', label: '其他方式' },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setError('')
                  setPhoneError('')
                }}
                className={clsx(
                  'flex-1 rounded-full px-3 py-2 text-[13px] transition',
                  tab === t.id ? 'bg-white font-medium text-ink shadow-sm' : 'text-ink-mute hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'other' ? (
            <div className="mt-6 space-y-3">
              <button onClick={() => startOAuth('wechat')} className="btn w-full bg-[#07C160] py-3 text-white hover:bg-[#06AD56]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M8.7 4C4.9 4 2 6.6 2 9.8c0 1.8 1 3.4 2.6 4.5l-.7 2 2.3-1.2c.7.2 1.5.3 2.3.3h.5a5 5 0 01-.2-1.4c0-3 2.9-5.4 6.5-5.4h.5C15.2 5.9 12.3 4 8.7 4zm-2.4 3.2a.9.9 0 110 1.8.9.9 0 010-1.8zm4.9 0a.9.9 0 110 1.8.9.9 0 010-1.8z" />
                  <path d="M22 14.3c0-2.7-2.6-4.9-5.9-4.9s-5.9 2.2-5.9 4.9 2.6 4.9 5.9 4.9c.7 0 1.4-.1 2-.3l2 1-.6-1.8c1.4-.9 2.5-2.3 2.5-3.8zm-7.9-1.3a.8.8 0 110 1.6.8.8 0 010-1.6zm4 0a.8.8 0 110 1.6.8.8 0 010-1.6z" />
                </svg>
                使用微信登录
              </button>
              <button onClick={() => startOAuth('workbuddy')} className="btn w-full bg-ink py-3 text-white hover:bg-black">
                使用 WorkBuddy 登录
              </button>
              <p className="pt-1 text-center text-[11px] leading-relaxed text-ink-mute">
                第三方登录需要在已发布的站点域名下完成授权回调。
                <br />
                未发布前推荐使用手机号或邮箱验证码登录。
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {tab === 'phone' ? (
                <div>
                  <label className="label">手机号</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入 11 位手机号"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))
                      setPhoneError('')
                    }}
                  />
                  {phoneError && <p className="mt-1.5 text-xs text-primary-600">{phoneError}</p>}
                </div>
              ) : (
                <div>
                  <label className="label">邮箱</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="label">验证码</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="6 位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={(e) => e.key === 'Enter' && void submit()}
                  />
                  <button
                    type="button"
                    onClick={() => void sendCode()}
                    disabled={sending || countdown > 0}
                    className="btn-ghost w-[112px] shrink-0 disabled:opacity-50"
                  >
                    {sending ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-primary-50 px-4 py-2.5 text-xs text-primary-600">{error}</div>
              )}

              <button onClick={() => void submit()} disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-60">
                {submitting ? '登录中…' : '登录 / 注册'}
              </button>

              <p className="text-center text-[11px] leading-relaxed text-ink-mute">
                未注册的手机号 / 邮箱验证后将自动创建账号。
                <br />
                登录即表示同意仅将信息用于作品保存与请帖分享。
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
