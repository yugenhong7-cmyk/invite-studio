import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DesignPreview from '@/components/DesignPreview'
import { EmptyState, Modal, Spinner } from '@/components/ui'
import { useApp, toast } from '@/store/app'
import { cloudErrorMessage } from '@/lib/cloud'
import { listUserTemplates, saveUserTemplate, deleteUserTemplate } from '@/lib/repo'
import {
  importFile,
  importFromUrl,
  designFromAsset,
  designFromSlide,
  editabilityNote,
  formatLabel,
  validateFile,
  unlockBackgroundImage,
  type ImportedAsset,
} from '@/lib/import'
import { setHandoff, OPEN_DOC_KEY } from '@/lib/handoff'
import type { DesignDoc } from '@/types'

interface LocalTemplate {
  id: number | string
  name: string
  format: string
  note: string
  doc: DesignDoc
  createdAt: string
  remote: boolean
}

export default function MyTemplates() {
  const navigate = useNavigate()
  const session = useApp((s) => s.session)
  const ready = useApp((s) => s.ready)
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<LocalTemplate[]>([])
  const [uploading, setUploading] = useState(false)
  const [urlModal, setUrlModal] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlBusy, setUrlBusy] = useState(false)
  const [previewNote, setPreviewNote] = useState<{ title: string; note: string } | null>(null)

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await listUserTemplates()
      setItems(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          format: r.sourceFormat,
          note: editabilityNote(r.sourceFormat as never),
          doc: r.designJson as DesignDoc,
          createdAt: r.createdAt,
          remote: true,
        })),
      )
    } catch (e) {
      toast('error', cloudErrorMessage(e, '加载我的模板失败'))
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const v = validateFile(file)
        if (v) {
          toast('error', `${file.name}：${v}`)
          continue
        }
        const asset: ImportedAsset = await importFile(file)
        // 多页 PPT/PPTX：每页生成一个可编辑模板；其余格式单模板
        const slides = asset.slides?.length ? asset.slides : [null]
        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i]
          const doc = slide
            ? designFromSlide(asset, slide, {})
            : designFromAsset(asset, { addSampleText: true })
          const name =
            slides.length > 1 ? `${asset.name || file.name} · 第 ${i + 1} 页` : asset.name || file.name
          if (session) {
            try {
              await saveUserTemplate({
                name,
                importType: 'upload',
                sourceFormat: asset.format,
                fileUrl: asset.dataUrl,
                designJson: doc,
              })
            } catch (e) {
              toast('error', cloudErrorMessage(e, '模板保存到云端失败'))
            }
          }
        }
      }
      toast('success', '导入完成')
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '导入失败'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleUrlImport() {
    const url = urlValue.trim()
    if (!url) return
    setUrlBusy(true)
    try {
      const asset = await importFromUrl(url)
      const doc = designFromAsset(asset, { addSampleText: true })
      if (session) {
        await saveUserTemplate({
          name: asset.name || '链接导入模板',
          importType: 'url',
          sourceFormat: asset.format,
          fileUrl: asset.dataUrl,
          designJson: doc,
        })
      }
      toast('success', '链接导入成功')
      setUrlModal(false)
      setUrlValue('')
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '链接导入失败'))
    } finally {
      setUrlBusy(false)
    }
  }

  async function handleDelete(item: LocalTemplate) {
    if (!window.confirm(`确定删除模板「${item.name}」吗？`)) return
    try {
      if (typeof item.id === 'number') await deleteUserTemplate(item.id)
      await load()
      toast('success', '模板已删除')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '删除失败'))
    }
  }

  async function useTemplate(item: LocalTemplate) {
    try {
      // 旧文档迁移：锁死的背景图 → 可编辑图片图层
      const doc = await unlockBackgroundImage(item.doc)
      // 走 IndexedDB 手递手：高清图 dataURL 可达数 MB，sessionStorage 会超限失败
      await setHandoff(OPEN_DOC_KEY, doc)
      navigate('/editor')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '打开模板失败'))
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">我的模板</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mute">
            导入你自己的设计，作为可编辑的请帖模板。支持 PNG / JPG / GIF / SVG / PDF / PPT / PPTX 本地上传，也支持从可访问的文件链接导入；PPT 与 SVG 中的文字会提取为可编辑文字。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '导入中…' : '上传本地文件'}
          </button>
          <button className="btn-ghost" onClick={() => setUrlModal(true)}>
            链接导入
          </button>
          <Link to="/templates" className="btn-soft">
            使用官方模板
          </Link>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ppt,.pptx,image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* Canva 导入说明 */}
      <div className="mt-7 rounded-2xl border border-gold-200/70 bg-gold-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-200/70 text-gold-700">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gold-800">Canva 模板导入（官方合规路径）</div>
            <p className="mt-1.5 text-[13px] leading-[1.85] text-gold-800/85">
              依据 Canva 服务条款，本站<b className="mx-1">不会</b>通过爬虫或非官方接口抓取 Canva 模板库。合法且好用的做法有三条：
            </p>
            <ol className="mt-2 space-y-1.5 text-[13px] leading-[1.85] text-gold-800/85">
              <li>
                <b>① 导出后上传（推荐）</b>：在 Canva 中「分享 → 下载」，选
                <b className="mx-1">PNG / JPG / PDF / SVG</b>导出，再用上方「上传本地文件」导入。需要保留清晰文字细节时优先导出 PDF。
              </li>
              <li>
                <b>② 公开链接导入</b>：对公开可访问的设计分享链接（含 Canva 公开设计页），粘贴到「链接导入」，自动提取页面预览图导入。
              </li>
              <li>
                <b>③ 从零制作</b>：直接使用模板中心的
                <b className="mx-1">40+ 套可编辑模板</b>或「AI 设计」生成，全部为独立图层、可二次编辑，无需依赖外部设计文件。
              </li>
            </ol>
            <p className="mt-2 text-[12px] leading-[1.8] text-gold-800/70">
              提示：Canva 免费素材可随设计导出使用；Pro 素材需相应授权。请勿将 Canva 素材单独转售或再分发为模板包。
            </p>
            <button className="btn-gold btn-sm mt-3" onClick={() => fileRef.current?.click()}>
              上传 Canva 导出文件
            </button>
          </div>
        </div>
      </div>

      {/* 编辑能力说明 */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { t: '图片模板', d: '作为可编辑图层导入（可移动/缩放/旋转/调透明度），文字与装饰均可独立编辑。' },
          { t: 'PDF 模板', d: '取首页渲染为高清可编辑图层，原内容整体保留，可叠加编辑。' },
          { t: 'SVG 模板', d: '栅格化为可编辑图层以保证渲染与导出一致，叠加内容可独立编辑。' },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <div className="text-sm font-semibold text-ink">{c.t}</div>
            <div className="mt-1.5 text-[12.5px] leading-[1.8] text-ink-mute">{c.d}</div>
          </div>
        ))}
      </div>

      {ready && !session ? (
        <div className="mt-10">
          <EmptyState
            title="登录后保存你的模板库"
            desc="登录后导入的模板会保存到你的账号，随时在任何设备上使用。"
            action={
              <Link to="/login" className="btn-primary">
                去登录 / 注册
              </Link>
            }
          />
        </div>
      ) : loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="模板库还是空的"
            desc="上传你自己的设计文件，或从链接导入模板。"
            action={
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>
                上传第一个模板
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 text-sm text-ink-mute">
            共 <b className="text-ink">{items.length}</b> 个模板
          </div>
          <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="group">
                <div className="overflow-hidden rounded-2xl bg-paper-soft transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
                  <DesignPreview doc={item.doc} width={1000} className="!w-full" showBorder={false} />
                </div>
                <div className="mt-3">
                  <div className="truncate text-sm font-medium text-ink">{item.name}</div>
                  <div className="mt-0.5 text-xs text-ink-mute">
                    {formatLabel(item.format as never)} · {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className="btn-primary btn-sm" onClick={() => useTemplate(item)}>
                      使用模板
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setPreviewNote({ title: item.name, note: item.note })}>
                      编辑说明
                    </button>
                    <button className="btn-ghost btn-sm !text-primary-600" onClick={() => void handleDelete(item)}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal open={urlModal} onClose={() => setUrlModal(false)} title="从链接导入模板" width="max-w-md">
        <p className="text-[13px] leading-relaxed text-ink-mute">
          粘贴一个可公开访问的文件链接（PNG / JPG / SVG / PDF）。我们会校验文件类型与可访问性后导入。
        </p>
        <input
          className="input mt-4"
          placeholder="https://example.com/template.png"
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleUrlImport()}
        />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setUrlModal(false)}>
            取消
          </button>
          <button className="btn-primary" onClick={() => void handleUrlImport()} disabled={urlBusy || !urlValue.trim()}>
            {urlBusy ? '导入中…' : '导入'}
          </button>
        </div>
      </Modal>

      <Modal open={!!previewNote} onClose={() => setPreviewNote(null)} title={previewNote?.title ?? '编辑说明'} width="max-w-md">
        <p className="text-[13px] leading-[1.9] text-ink-soft">{previewNote?.note}</p>
      </Modal>
    </div>
  )
}
