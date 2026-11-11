import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import DynamicInvite, { type RsvpInput } from '@/dynamic/DynamicInvite'
import { cloudErrorMessage } from '@/lib/cloud'
import { fetchPublicInvitation, recordInvitationVisit, submitGuestResponse, type PublicInvitation } from '@/lib/repo'
import { withShareCode } from '@/lib/share'
import type { DesignDoc } from '@/types'
import { useToast, toast } from '@/store/app'

export default function Invite() {
  const { slug = '' } = useParams()
  const [search] = useSearchParams()
  const codeFromUrl = search.get('code') ?? undefined

  const [data, setData] = useState<PublicInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [codeInput, setCodeInput] = useState('')

  const toasts = useToast((s) => s.toasts)
  void toasts

  const load = useCallback(
    async (code?: string) => {
      setLoading(true)
      setError('')
      setNeedCode(false)
      try {
        const inv = await fetchPublicInvitation(slug, code)
        if (!inv) {
          setError('请帖不存在、已过期，或访问码不正确。')
          setData(null)
          return
        }
        setData(inv)
        void recordInvitationVisit(slug)
      } catch (e) {
        const msg = cloudErrorMessage(e, '请帖加载失败')
        setError(msg)
        if (/password|访问码|401|unauthorized/i.test(msg)) setNeedCode(true)
      } finally {
        setLoading(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    void load(codeFromUrl)
  }, [load, codeFromUrl])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    // 保留 search（含站点访问 sharecode），保证二次转发的链接仍可打开；
    // 路径式 /i/{slug} 让被转发的链接带上 Open Graph 分享卡片（封面/标题/描述）
    const { origin, pathname, search: s } = window.location
    const base = pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')
    return withShareCode(`${origin}${base}i/${slug}${s}`)
  }, [slug])

  const doc: DesignDoc | null = useMemo(() => {
    if (!data) return null
    return {
      id: `pub_${data.project.id}`,
      name: data.project.name,
      category: data.project.category,
      style: data.project.style,
      orientation: data.project.orientation,
      canvas: {
        width: data.project.canvasWidth,
        height: data.project.canvasHeight,
        background: data.project.background,
      },
      elements: data.elements,
      eventInfo: data.project.eventInfo,
      presentation: data.project.presentation,
      createdAt: 0,
      updatedAt: 0,
    }
  }, [data])

  const handleSubmitRsvp = useCallback(
    async (input: RsvpInput) => {
      try {
        await submitGuestResponse({
          slug,
          guestName: input.guestName,
          phone: input.phone,
          status: input.status,
          partySize: input.partySize,
          message: input.message,
        })
        toast('success', '回执已提交，谢谢！')
      } catch (e) {
        toast('error', cloudErrorMessage(e, '回执提交失败'))
        throw e
      }
    },
    [slug],
  )

  /* ---------- 加载 / 错误 ---------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warm">
        <Spinner className="h-9 w-9" />
      </div>
    )
  }

  if (needCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warm px-5">
        <div className="card w-full max-w-sm p-7">
          <h1 className="text-lg font-semibold text-ink">这是一份加密请帖</h1>
          <p className="mt-2 text-sm text-ink-mute">请输入主人提供的访问码后查看。</p>
          <input
            className="input mt-5"
            placeholder="访问码"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load(codeInput || undefined)}
          />
          <button className="btn-primary mt-4 w-full" onClick={() => void load(codeInput || undefined)}>
            查看请帖
          </button>
          {error && <p className="mt-3 text-xs text-primary-600">{error}</p>}
        </div>
      </div>
    )
  }

  if (error || !data || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-warm px-5">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink">无法查看这份请帖</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-mute">{error || '请帖不存在或已过期。'}</p>
          <Link to="/" className="btn-primary mt-6">
            制作我的请帖
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DynamicInvite
        doc={doc}
        title={data.title}
        shareUrl={shareUrl}
        visitCount={data.visitCount}
        expiresAt={data.expiresAt}
        onSubmitRsvp={handleSubmitRsvp}
      />
      <div className="relative z-10 pb-10 text-center">
        <Link to="/" className="text-xs text-ink-mute/80 transition hover:text-primary-600">
          也想做一份这样的请帖？→ 使用 Invite Studio
        </Link>
      </div>
    </div>
  )
}
