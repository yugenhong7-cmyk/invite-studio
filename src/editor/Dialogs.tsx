import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/components/ui'
import DynamicInvite from '@/dynamic/DynamicInvite'
import { useEditor } from '@/store/editor'
import { useApp, toast } from '@/store/app'
import { exportDesignToDataUrl, downloadDataUrl } from '@/lib/fabric-sync'
import { exportPresets } from '@/lib/design'
import { publishInvitation, getProjectInvitation, deleteInvitation, cloudErrorMessage } from '@/lib/repo'
import { withShareCode } from '@/lib/share'
import type { ExportFormat, InvitationRecord } from '@/types'

/* ============================================================
 * 预览
 * ============================================================ */
export function PreviewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  return (
    <Modal open={open} onClose={onClose} title="电子请帖动态预览" width="max-w-2xl">
      <p className="mb-3 text-center text-xs leading-relaxed text-ink-mute">
        这是访客打开电子请帖时的真实体验：开场封面 → 点击开启 → 滚动分段动画。
        <br />
        导出图片时不会包含任何编辑器辅助线与选框。
      </p>
      <div className="flex justify-center">
        {/* 手机框内实时动态预览 */}
        <div className="relative w-[320px] overflow-hidden rounded-[28px] bg-black p-2 shadow-2xl">
          <div className="h-[580px] overflow-y-auto rounded-[22px] bg-white">
            <DynamicInvite doc={doc} title={doc.name} preview />
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ============================================================
 * 导出
 * ============================================================ */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  const presets = useMemo(() => exportPresets(doc), [doc])
  const [presetId, setPresetId] = useState('original')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)
  const [busy, setBusy] = useState(false)
  const [customW, setCustomW] = useState(doc.canvas.width)

  const preset = presets.find((p) => p.id === presetId) ?? presets[0]
  const targetWidth = presetId === 'custom' ? customW : preset.width

  async function doExport() {
    setBusy(true)
    try {
      const dataUrl = await exportDesignToDataUrl(doc, {
        format,
        targetWidth,
        quality,
      })
      const safeName = (doc.name || '请帖').replace(/[\\/:*?"<>|]/g, '_')
      downloadDataUrl(dataUrl, `${safeName}_${targetWidth}w.${format === 'jpeg' ? 'jpg' : 'png'}`)
      toast('success', '图片已导出')
      onClose()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '导出失败'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="导出图片" width="max-w-xl">
      <div className="space-y-5">
        <div>
          <div className="label">导出规格</div>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => setPresetId(p.id)}
                className={`rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                  presetId === p.id ? 'bg-primary-50 ring-primary-300' : 'bg-white ring-paper-line hover:bg-paper-warm'
                }`}
              >
                <div className="text-xs font-medium text-ink">{p.label}</div>
                <div className="mt-0.5 text-[10px] text-ink-mute">{p.description}</div>
              </button>
            ))}
            <button
              onClick={() => setPresetId('custom')}
              className={`rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                presetId === 'custom' ? 'bg-primary-50 ring-primary-300' : 'bg-white ring-paper-line hover:bg-paper-warm'
              }`}
            >
              <div className="text-xs font-medium text-ink">自定义尺寸</div>
              <div className="mt-0.5 text-[10px] text-ink-mute">按宽度等比缩放</div>
            </button>
          </div>
          {presetId === 'custom' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-ink-mute">宽度</span>
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={customW}
                min={200}
                max={8000}
                onChange={(e) => setCustomW(Number(e.target.value) || 1080)}
              />
              <span className="text-xs text-ink-mute">px</span>
            </div>
          )}
        </div>

        <div>
          <div className="label">图片格式</div>
          <div className="flex gap-2">
            {(
              [
                ['png', 'PNG · 无损透明'],
                ['jpeg', 'JPG · 体积更小'],
              ] as [ExportFormat, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs ring-1 transition ${
                  format === f ? 'bg-primary-50 text-primary-600 ring-primary-300' : 'bg-white text-ink-soft ring-paper-line'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {format === 'jpeg' && (
          <div>
            <div className="label">图片质量 · {Math.round(quality * 100)}%</div>
            <input type="range" min={0.5} max={1} step={0.02} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
          </div>
        )}

        <div className="rounded-xl bg-paper-warm px-4 py-3 text-[11px] leading-relaxed text-ink-mute">
          导出使用离屏画布重新渲染，保证成品中不包含选框、辅助线、工具栏与任何编辑器界面元素。
          中文字体会先加载完成再渲染，避免字体回退。
        </div>

        <button className="btn-primary w-full py-3" onClick={() => void doExport()} disabled={busy}>
          {busy ? '导出中…' : `导出 ${format === 'jpeg' ? 'JPG' : 'PNG'} 图片`}
        </button>
      </div>
    </Modal>
  )
}

/* ============================================================
 * 分享 / 电子请帖链接
 * ============================================================ */
export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)
  const projectId = useEditor((s) => s.projectId)
  const projectName = useEditor((s) => s.projectName)
  const session = useApp((s) => s.session)
  const [title, setTitle] = useState(projectName || doc.name)
  const [descText, setDescText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [record, setRecord] = useState<InvitationRecord | null>(null)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coverPreview, setCoverPreview] = useState('')

  const shareUrl = useMemo(() => {
    if (!record) return ''
    // 路径式 /i/{slug}（而非 #/i/{slug}）让服务端能为分享卡片注入 Open Graph 元数据；
    // 打开后由入口脚本转回 hash 路由，动态请帖体验不变。
    // withShareCode：凭 cookie 进站时地址栏没有 sharecode，必须补码 —— 否则宾客与
    // 微信爬虫打开都是门禁 403「链接不完整」，聊天里只剩裸链接、也没有分享卡片封面。
    const { origin, pathname, search } = window.location
    const base = pathname.replace(/index\.html$/, '').replace(/\/?$/, '/')
    return withShareCode(`${origin}${base}i/${record.shareSlug}${search}`)
  }, [record])

  useEffect(() => {
    if (!open || !projectId) return
    setLoading(true)
    getProjectInvitation(projectId)
      .then((inv) => setRecord(inv))
      .catch(() => setRecord(null))
      .finally(() => setLoading(false))
  }, [open, projectId])

  // 打开弹窗时把分享卡片封面刷新为「当前画布设计」的渲染图，
  // 保证复制出去的链接封面与画布产出一致（此前封面是发布瞬间的旧快照）。
  const recordId = record?.id ?? null
  useEffect(() => {
    if (!open || !recordId || !projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const cover = await exportDesignToDataUrl(doc, { format: 'jpeg', targetWidth: 750, quality: 0.82 })
        if (cancelled || !cover) return
        setCoverPreview(cover)
        const current = await getProjectInvitation(projectId)
        const rec = current ?? record
        if (!rec || cancelled) return
        const updated = await publishInvitation({
          projectId,
          title: rec.title,
          isPublic: rec.isPublic,
          accessPassword: rec.accessPassword,
          expiresAt: rec.expiresAt,
          coverImage: cover,
        })
        if (!cancelled) setRecord(updated)
      } catch {
        /* 封面刷新失败不打扰用户；旧封面仍保留 */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recordId, projectId])

  useEffect(() => {
    if (!shareUrl) {
      setQr('')
      return
    }
    QRCode.toDataURL(shareUrl, { width: 280, margin: 1, color: { dark: '#22201E', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [shareUrl])

  async function handlePublish() {
    if (!projectId) {
      toast('error', '请先保存作品后再生成链接')
      return
    }
    if (!session) {
      toast('error', '请先登录后再生成电子请帖链接')
      return
    }
    setBusy(true)
    try {
      const finalTitle = title.trim() || doc.name
      const finalDesc =
        descText.trim() || `诚挚邀请您参加${finalTitle || '我们的宴会'}，点击查看精美电子请帖`
      // 分享卡片封面 = 当前请帖设计的渲染图（与导出同一渲染链路，保持原有设计风格）
      let cover: string | null = null
      try {
        cover = await exportDesignToDataUrl(doc, { format: 'jpeg', targetWidth: 750, quality: 0.82 })
      } catch {
        cover = null // 封面渲染失败不阻塞发布
      }
      const inv = await publishInvitation({
        projectId,
        title: finalTitle,
        isPublic,
        accessPassword: isPublic ? null : password.trim() || null,
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
        description: finalDesc,
        // 渲染失败时传 undefined（不改动已存封面），避免把旧封面清空
        coverImage: cover ?? undefined,
      })
      if (cover) setCoverPreview(cover)
      setRecord(inv)
      toast('success', '电子请帖已生成')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '生成链接失败'))
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast('success', '链接已复制')
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      toast('error', '复制失败，请手动复制')
    }
  }

  async function handleRevoke() {
    if (!record) return
    if (!window.confirm('确定取消发布吗？分享链接将立即失效。')) return
    try {
      await deleteInvitation(record.id)
      setRecord(null)
      toast('success', '已取消发布')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '取消发布失败'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="生成电子请帖链接" width="max-w-2xl">
      {!session ? (
        <div className="py-6 text-center">
          <div className="text-sm text-ink-soft">生成电子请帖链接需要登录账号。</div>
          <a href="#/login" className="btn-primary mt-4 inline-flex">
            去登录 / 注册
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {!record ? (
            <>
              <div>
                <label className="label">请帖标题</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：陈亦舟 & 林知夏 的婚礼邀请" />
              </div>
              <div>
                <label className="label">分享卡片描述（可选）</label>
                <textarea
                  className="input min-h-[72px] resize-y"
                  value={descText}
                  onChange={(e) => setDescText(e.target.value)}
                  placeholder="例如：诚挚邀请您参加我们的婚礼，点击查看精美电子请帖"
                />
                <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
                  复制链接到微信 / QQ 等平台时，分享卡片将展示请帖封面、标题与这段描述；留空则自动生成。
                </p>
              </div>
              <div>
                <div className="label">访问权限</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs ring-1 transition ${isPublic ? 'bg-primary-50 text-primary-600 ring-primary-300' : 'bg-white ring-paper-line'}`}
                  >
                    公开 · 任何拿到链接的人都能查看
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs ring-1 transition ${!isPublic ? 'bg-primary-50 text-primary-600 ring-primary-300' : 'bg-white ring-paper-line'}`}
                  >
                    私密 · 需要访问码才能查看
                  </button>
                </div>
              </div>
              {!isPublic && (
                <div>
                  <label className="label">访问码</label>
                  <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置一个访问码，分享给宾客" />
                </div>
              )}
              <div>
                <label className="label">链接有效期（可选）</label>
                <input type="datetime-local" className="input" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
              <div className="rounded-xl bg-paper-warm px-4 py-3 text-[11px] leading-relaxed text-ink-mute">
                生成后，宾客无需注册即可查看请帖。你之后在编辑器里修改设计，线上页面会自动同步最新内容。
                <br />
                请帖包含完整展示、地图导航、联系方式、分享按钮与出席回执（RSVP）。
              </div>
              <button className="btn-primary w-full py-3" onClick={() => void handlePublish()} disabled={busy || loading}>
                {busy ? '生成中…' : '生成电子请帖链接'}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                {qr && (
                  <div className="shrink-0 rounded-2xl bg-white p-3 ring-1 ring-paper-line">
                    <img src={qr} alt="请帖二维码" className="h-[160px] w-[160px]" />
                    <div className="mt-2 text-center text-[11px] text-ink-mute">微信扫码查看</div>
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{record.title}</div>
                  <div className="mt-1 text-xs text-ink-mute">
                    {record.isPublic ? '公开访问' : '私密 · 需访问码'} · {record.visitCount} 人次查看
                    {record.expiresAt && <span> · 有效期至 {new Date(record.expiresAt).toLocaleString('zh-CN')}</span>}
                  </div>
                  {(coverPreview || record.coverImage) && (
                    <div className="mt-3">
                      <div className="text-[11px] text-ink-mute">分享卡片封面（与当前画布同步）</div>
                      <img
                        src={coverPreview || record.coverImage || ''}
                        alt="分享卡片封面"
                        className="mt-1 h-[132px] w-auto rounded-lg ring-1 ring-paper-line"
                      />
                    </div>
                  )}
                  <div className="mt-3 rounded-xl bg-paper-warm px-4 py-3 text-[12px] leading-relaxed text-ink-soft break-all">
                    {shareUrl}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-primary btn-sm" onClick={() => void handleCopy()}>
                      {copied ? '已复制' : '复制链接'}
                    </button>
                    <a className="btn-ghost btn-sm" href={shareUrl} target="_blank" rel="noreferrer">
                      打开请帖
                    </a>
                    <button className="btn-ghost btn-sm !text-primary-600" onClick={() => void handleRevoke()}>
                      取消发布
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
                    修改设计后点击「保存」，线上页面会自动同步为最新内容。
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
