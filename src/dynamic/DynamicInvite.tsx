import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import QRCode from 'qrcode'
import type { DesignDoc, RsvpStatus, StoryPhoto } from '@/types'
import { formatChineseDate } from '@/lib/design'
import { resolveCoverStyle } from '@/lib/presentation'
import CoverAnimation from './CoverAnimation'
import Countdown from './Countdown'
import DesignLayers from './DesignLayers'
import MusicPlayer from './MusicPlayer'
import ParticleBackground from './ParticleBackground'
import ScrollReveal from './ScrollReveal'
import { prefersReducedMotion } from './useInView'

const STATUS_LABEL: Record<RsvpStatus, string> = {
  attend: '确认参加',
  decline: '无法参加',
  maybe: '待定',
}

export interface RsvpInput {
  guestName: string
  /** 宾客联系电话（必填，11 位手机号） */
  phone: string
  status: RsvpStatus
  partySize: number
  message: string
}

export interface DynamicInviteProps {
  doc: DesignDoc
  title: string
  shareUrl?: string
  visitCount?: number
  expiresAt?: string | null
  onSubmitRsvp?: (input: RsvpInput) => Promise<void>
  /** 编辑器内预览：不显示真实分享链接 */
  preview?: boolean
}

/**
 * 动态电子请帖渲染引擎：
 * 开场封面 → 动态背景 + 分段滚动动画正文 → 互动 RSVP → 结束动画。
 * 支持单页沉浸 / 多屏翻页 / 故事式三种展示形式。
 */
export function DynamicInvite({ doc, title, shareUrl, visitCount, expiresAt, onSubmitRsvp, preview = false }: DynamicInviteProps) {
  const pres = doc.presentation
  const info = doc.eventInfo
  const [opened, setOpened] = useState(false)
  const [animOff, setAnimOff] = useState(() => prefersReducedMotion())
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const coverStyle = resolveCoverStyle(pres, doc.category, doc.style)
  const dateText = info.date ? formatChineseDate(info.date) : ''
  const animate = !animOff

  /* 首屏视差：滚动时轻微位移英雄卡 */
  useEffect(() => {
    if (!animate) return
    const el = rootRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        el.style.setProperty('--di-scroll', `${Math.min(y, 600) * 0.06}px`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [animate])

  /* 分享二维码 */
  useEffect(() => {
    if (!shareUrl || preview) return
    QRCode.toDataURL(shareUrl, { width: 240, margin: 1, color: { dark: '#22201E', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [shareUrl, preview])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      /* 剪贴板不可用 */
    }
  }, [shareUrl])

  const handleShare = useCallback(async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title, text: info.inviteText || '', url: shareUrl || '' })
        return
      } catch {
        return
      }
    }
    await handleCopy()
  }, [title, info.inviteText, shareUrl, handleCopy])

  /* ---------------- 各内容分区 ---------------- */

  const heroWidth = typeof window !== 'undefined' ? Math.min(420, window.innerWidth - 48) : 380

  const sectionHero = (
    <div key="hero" className="di-hero">
      <ScrollReveal type="zoom" duration={900} trigger="load" disabled={!animate}>
        <div className="di-hero-card" style={{ transform: animate ? 'translateY(var(--di-scroll, 0px))' : undefined }}>
          <DesignLayers doc={doc} presentation={pres} animate={animate} width={heroWidth} />
        </div>
      </ScrollReveal>
    </div>
  )

  const sectionTitle = (
    <div key="title" className="di-section di-titles">
      <ScrollReveal type="slide-up" duration={800} disabled={!animate}>
        <div className="di-kicker">诚 邀 您 的 莅 临</div>
        <h1 className="di-title">{title}</h1>
        {info.hostName && (
          <div className="di-names">
            {info.hostName.split(/\s+/).map((n, i) => (
              <ScrollReveal key={n + i} type="slide-up" duration={700} delay={180 * i} disabled={!animate} className="di-name-item">
                <span>{n}</span>
                {i < info.hostName.split(/\s+/).length - 1 && <em>·</em>}
              </ScrollReveal>
            ))}
          </div>
        )}
        {info.guestName && (
          <ScrollReveal type="fade" duration={700} delay={320} disabled={!animate}>
            <div className="di-guest-chip">{info.guestName} 亲启</div>
          </ScrollReveal>
        )}
      </ScrollReveal>
    </div>
  )

  const sectionInvite = info.inviteText ? (
    <div key="invite" className="di-section">
      <ScrollReveal type="slide-up" duration={800} disabled={!animate}>
        <div className="di-ornament" aria-hidden="true">
          ❦
        </div>
        <p className="di-invite-text">{info.inviteText}</p>
        <div className="di-ornament" aria-hidden="true">
          ❦
        </div>
      </ScrollReveal>
    </div>
  ) : null

  const sectionCountdown = pres.sections.countdown && info.date ? (
    <div key="countdown" className="di-section">
      <ScrollReveal type="zoom" duration={800} disabled={!animate}>
        <Countdown date={info.date} time={info.time} />
      </ScrollReveal>
    </div>
  ) : null

  const sectionDate = dateText || info.time ? (
    <div key="date" className="di-section">
      <ScrollReveal type="slide-up" duration={750} disabled={!animate}>
        <div className="di-info-card">
          <div className="di-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="di-info-label">宴会时间</div>
          <div className="di-info-main">{dateText}</div>
          {info.time && <div className="di-info-sub">{info.time}</div>}
        </div>
      </ScrollReveal>
    </div>
  ) : null

  const mapHref = info.address || info.venue ? `https://uri.amap.com/search?keyword=${encodeURIComponent(info.address || info.venue)}` : ''

  const sectionVenue = pres.sections.venue && (info.venue || info.address) ? (
    <div key="venue" className="di-section">
      <ScrollReveal type="slide-up" duration={750} delay={80} disabled={!animate}>
        <div className="di-info-card">
          <div className="di-info-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>
          <div className="di-info-label">宴会地点</div>
          <div className="di-info-main">{info.venue}</div>
          {info.address && <div className="di-info-sub">{info.address}</div>}
          <div className="di-venue-actions">
            {mapHref && (
              <a className="di-btn di-btn-gold" href={mapHref} target="_blank" rel="noreferrer">
                一键导航
              </a>
            )}
            <button
              type="button"
              className="di-btn di-btn-ghost"
              onClick={() => {
                void navigator.clipboard?.writeText(`${info.venue} ${info.address}`.trim())
              }}
            >
              复制地址
            </button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  ) : null

  const sectionContact = pres.sections.contact && info.phone ? (
    <div key="contact" className="di-section">
      <ScrollReveal type="fade" duration={700} disabled={!animate}>
        <a className="di-contact" href={`tel:${info.phone.replace(/\s/g, '')}`}>
          <span>联系方式</span>
          <strong>{info.phone}</strong>
        </a>
      </ScrollReveal>
    </div>
  ) : null

  /* 故事式照片展示 */
  const storyPhotos: StoryPhoto[] = pres.story.filter((s) => s.src)
  const sectionStory =
    pres.sections.story && storyPhotos.length > 0 ? (
      <div key="story" className="di-section di-story">
        <ScrollReveal type="fade" duration={700} disabled={!animate}>
          <div className="di-kicker">我 们 的 时 光</div>
        </ScrollReveal>
        <div className="di-story-strip">
          {storyPhotos.map((p, i) => (
            <ScrollReveal key={p.src + i} type={i % 2 ? 'slide-up' : 'zoom'} duration={850} delay={i * 140} disabled={!animate} className="di-story-item">
              <div className="di-story-frame">
                <img src={p.src} alt={p.caption || `照片 ${i + 1}`} loading="lazy" />
              </div>
              {p.caption && <div className="di-story-caption">{p.caption}</div>}
            </ScrollReveal>
          ))}
        </div>
      </div>
    ) : null

  /* RSVP */
  const sectionRsvp = pres.sections.rsvp ? (
    <div key="rsvp" className="di-section">
      <ScrollReveal type="slide-up" duration={800} disabled={!animate}>
        <RsvpCard onSubmit={onSubmitRsvp} preview={preview} />
      </ScrollReveal>
    </div>
  ) : null

  const sectionShare =
    pres.sections.share && !preview && shareUrl ? (
      <div key="share" className="di-section">
        <ScrollReveal type="slide-up" duration={800} disabled={!animate}>
          <div className="di-share-card">
            <h3 className="di-share-title">分享这份请帖</h3>
            <div className="di-share-body">
              {qr && (
                <div className="di-qr">
                  <img src={qr} alt="请帖二维码" />
                  <div className="di-qr-tip">微信扫码查看</div>
                </div>
              )}
              <div className="di-share-side">
                <div className="di-share-url">{shareUrl}</div>
                <div className="di-share-btns">
                  <button type="button" className="di-btn di-btn-gold" onClick={() => void handleCopy()}>
                    {copied ? '已复制' : '复制链接'}
                  </button>
                  <button type="button" className="di-btn di-btn-ghost" onClick={() => void handleShare()}>
                    转发给好友
                  </button>
                </div>
                <div className="di-share-meta">
                  {typeof visitCount === 'number' && <span>已有 {visitCount} 人次查看</span>}
                  {expiresAt && <span>有效期至 {new Date(expiresAt).toLocaleString('zh-CN')}</span>}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    ) : null

  const sectionEnding = pres.sections.ending ? (
    <div key="ending" className="di-section di-ending">
      <ScrollReveal type="fade" duration={1000} disabled={!animate}>
        <div className="di-ending-deco" aria-hidden="true">
          ✦
        </div>
        <div className="di-ending-thanks">期待您的到来</div>
        {info.hostName && <div className="di-ending-host">{info.hostName} 敬邀</div>}
        {info.note && <div className="di-ending-note">{info.note}</div>}
        <div className="di-ending-btns">
          <button
            type="button"
            className="di-btn di-btn-ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: animate ? 'smooth' : 'auto' })}
          >
            再看一次
          </button>
          {!preview && (
            <button type="button" className="di-btn di-btn-gold" onClick={() => void handleShare()}>
              分享给好友
            </button>
          )}
        </div>
      </ScrollReveal>
    </div>
  ) : null

  const sections = [sectionHero, sectionTitle, sectionInvite, sectionCountdown, sectionDate, sectionVenue, sectionContact, sectionStory, sectionRsvp, sectionShare, sectionEnding].filter(
    Boolean,
  ) as ReactNode[]

  const mode = pres.mode
  const isFlip = mode === 'flip'

  return (
    <div ref={rootRef} className="di-root" data-mode={mode}>
      <ParticleBackground
        type={pres.backgroundFx.type}
        speed={pres.backgroundFx.speed * (pres.globalSpeed || 1)}
        intensity={pres.backgroundFx.intensity}
        opacity={pres.backgroundFx.opacity}
        disabled={!pres.backgroundFx.enabled || animOff}
      />
      <MusicPlayer
        src={pres.music.src}
        name={pres.music.name}
        volume={pres.music.volume}
        loop={pres.music.loop}
        autoStart={opened}
        disabled={!pres.music.enabled}
      />

      {!opened && (
        <CoverAnimation
          style={coverStyle}
          title={info.eventName || title}
          hostNames={info.hostName}
          hint={pres.cover.hint}
          reducedMotion={!animate}
          onOpen={() => setOpened(true)}
        />
      )}

      <div className={`di-body ${opened ? 'is-open' : ''} ${isFlip ? 'di-body-flip' : ''}`}>
        {isFlip ? (
          <div className="di-flip-wrap">
            {sections.map((s, i) => (
              <section key={i} className="di-screen">
                {s}
              </section>
            ))}
            <FlipNav count={sections.length} />
          </div>
        ) : (
          <div className="di-single-wrap">{sections}</div>
        )}

        <button
          type="button"
          className="di-anim-toggle"
          onClick={() => setAnimOff((v) => !v)}
          aria-label={animOff ? '开启动画' : '关闭动画'}
        >
          {animOff ? '动画 已关' : '动画 已开'}
        </button>
      </div>
    </div>
  )
}

/* ---------------- 翻页导航点 ---------------- */

function FlipNav({ count }: { count: number }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const screens = Array.from(document.querySelectorAll<HTMLElement>('.di-screen'))
    if (!screens.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = screens.indexOf(e.target as HTMLElement)
            if (idx >= 0) setActive(idx)
          }
        }
      },
      { threshold: 0.55 },
    )
    screens.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [count])

  return (
    <div className="di-flip-nav" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={i === active ? 'is-active' : ''} />
      ))}
    </div>
  )
}

/* ---------------- RSVP 卡片（含成功动画） ---------------- */

const PHONE_RE = /^1[3-9]\d{9}$/

function RsvpCard({ onSubmit, preview }: { onSubmit?: (input: RsvpInput) => Promise<void>; preview: boolean }) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [status, setStatus] = useState<RsvpStatus>('attend')
  const [partySize, setPartySize] = useState(1)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const nameOk = !!guestName.trim()
  const phoneOk = PHONE_RE.test(phone.trim())

  async function submit() {
    const trimmedPhone = phone.trim().replace(/\s/g, '')
    if (!guestName.trim()) return
    if (!PHONE_RE.test(trimmedPhone)) {
      setPhoneError('请填写正确的 11 位手机号')
      return
    }
    setPhoneError('')
    setSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit({ guestName: guestName.trim(), phone: trimmedPhone, status, partySize: status === 'decline' ? 0 : Math.max(1, partySize), message: message.trim() })
      } else {
        await new Promise((r) => setTimeout(r, 400))
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="di-rsvp-card">
      <h3 className="di-share-title">出席回执</h3>
      <p className="di-rsvp-sub">期待您的到来，请确认是否参加本次宴会。</p>

      {submitted ? (
        <div className="di-rsvp-ok">
          <div className="di-rsvp-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="di-rsvp-ok-title">回执已提交</div>
          <div className="di-rsvp-ok-sub">
            {guestName} · {STATUS_LABEL[status]}
            {status !== 'decline' && ` · ${partySize} 人`}
          </div>
          <div className="di-rsvp-ok-sub">{phone.trim()}</div>
          <div className="di-burst di-burst-static" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ ['--bi' as string]: i }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="di-rsvp-form">
          <label className="di-field">
            <span>你的称呼</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="例如：王叔叔 / 张三全家" autoComplete="name" />
          </label>
          <label className="di-field">
            <span>联系电话</span>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^\d\s]/g, ''))
                if (phoneError) setPhoneError('')
              }}
              onBlur={() => {
                const v = phone.trim().replace(/\s/g, '')
                if (v && !PHONE_RE.test(v)) setPhoneError('请填写正确的 11 位手机号')
                else setPhoneError('')
              }}
              placeholder="请填写 11 位手机号"
              inputMode="numeric"
              maxLength={13}
              autoComplete="tel"
              className={phoneError ? 'is-err' : ''}
              aria-invalid={!!phoneError}
            />
            {phoneError && <em className="di-field-err">{phoneError}</em>}
          </label>
          <div className="di-field">
            <span>是否出席</span>
            <div className="di-chip-row">
              {(Object.keys(STATUS_LABEL) as RsvpStatus[]).map((s) => (
                <button key={s} type="button" className={`di-chip ${status === s ? 'is-on' : ''}`} onClick={() => setStatus(s)}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          {status !== 'decline' && (
            <div className="di-field">
              <span>参加人数</span>
              <div className="di-stepper">
                <button type="button" aria-label="减少人数" onClick={() => setPartySize((n) => Math.max(1, n - 1))}>
                  −
                </button>
                <b>{partySize}</b>
                <button type="button" aria-label="增加人数" onClick={() => setPartySize((n) => Math.min(20, n + 1))}>
                  ＋
                </button>
              </div>
            </div>
          )}
          <label className="di-field">
            <span>留言祝福（可选）</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="给主人留句话…" />
          </label>
          <button type="button" className="di-btn di-btn-gold di-btn-block" disabled={submitting || !nameOk || !phoneOk} onClick={() => void submit()}>
            {submitting ? '提交中…' : preview ? '提交回执（预览）' : '提交回执'}
          </button>
          {!phoneOk && phone.trim().length > 0 && <p className="di-form-tip">请填写正确的 11 位手机号后提交</p>}
        </div>
      )}
    </div>
  )
}

export default DynamicInvite
