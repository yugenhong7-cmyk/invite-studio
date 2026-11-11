import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useEditor } from '@/store/editor'
import { useApp, toast } from '@/store/app'
import { Logo } from '@/components/ui'
import { exportDesignToDataUrl } from '@/lib/fabric-sync'
import { saveProject, cloudErrorMessage } from '@/lib/repo'
import { PreviewDialog, ExportDialog, ShareDialog } from './Dialogs'

export default function TopBar() {
  const navigate = useNavigate()
  const doc = useEditor((s) => s.doc)
  const projectId = useEditor((s) => s.projectId)
  const projectName = useEditor((s) => s.projectName)
  const dirty = useEditor((s) => s.dirty)
  const saving = useEditor((s) => s.saving)
  const zoom = useEditor((s) => s.zoom)
  const session = useApp((s) => s.user)

  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const setZoom = useEditor((s) => s.setZoom)
  const renameDesign = useEditor((s) => s.renameDesign)
  const setProject = useEditor((s) => s.setProject)
  const setSaving = useEditor((s) => s.setSaving)
  const markSaved = useEditor((s) => s.markSaved)

  const [showPreview, setShowPreview] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)

  async function handleSave() {
    setSaving(true)
    try {
      let thumbnail: string | null = null
      try {
        thumbnail = await exportDesignToDataUrl(doc, { format: 'png', targetWidth: 320 })
      } catch {
        thumbnail = null
      }
      const saved = await saveProject(doc, { projectId, thumbnail })
      setProject(saved.projectId, doc.name)
      markSaved()
      toast('success', '作品已保存')
    } catch (e) {
      const msg = cloudErrorMessage(e, '保存失败')
      toast('error', msg)
      if (/登录/.test(msg)) navigate('/login')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-paper-line/70 bg-white px-3 sm:gap-3 sm:px-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-ink-soft hover:text-ink">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden text-sm sm:inline">返回</span>
        </button>
        <div className="hidden md:block">
          <Logo compact />
        </div>

        <input
          value={projectName}
          onChange={(e) => renameDesign(e.target.value)}
          className="ml-0 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-ink outline-none ring-1 ring-transparent transition hover:bg-paper-warm focus:bg-white focus:ring-primary-200 sm:ml-1 sm:w-[220px] sm:flex-none"
          placeholder="作品名称"
        />
        {dirty && <span className="hidden text-[11px] text-gold-600 sm:inline">未保存</span>}

        <div className="flex items-center gap-1.5">
          {/* 缩放：桌面专属 */}
          <div className="mr-1 hidden items-center gap-1 rounded-full bg-paper-warm p-1 lg:flex">
            <button
              onClick={() => setZoom(zoom / 1.15)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-white"
              title="缩小"
            >
              −
            </button>
            <span className="w-11 text-center text-[11px] text-ink-soft">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(zoom * 1.15)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-white"
              title="放大"
            >
              ＋
            </button>
            <button
              onClick={() => setZoom(0.5)}
              className="rounded-full px-2.5 py-1 text-[11px] text-ink-soft hover:bg-white"
              title="重置缩放"
            >
              50%
            </button>
          </div>

          <button
            onClick={undo}
            disabled={!canUndo}
            className={clsx('btn-ghost btn-sm', !canUndo && 'opacity-40')}
            title="撤销 (Ctrl+Z)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12h-1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">撤销</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={clsx('btn-ghost btn-sm', !canRedo && 'opacity-40')}
            title="重做 (Ctrl+Shift+Z)"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 7l5 5-5 5M20 12H10a6 6 0 000 12h1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">重做</span>
          </button>

          <span className="mx-1 hidden h-5 w-px bg-paper-line sm:block" />

          {/* 桌面：直接展示 */}
          <button onClick={() => setShowPreview(true)} className="btn-ghost btn-sm hidden sm:inline-flex">
            预览
          </button>
          <button onClick={() => setShowExport(true)} className="btn-ghost btn-sm hidden sm:inline-flex">
            导出
          </button>
          <button onClick={() => setShowShare(true)} className="btn-gold btn-sm hidden sm:inline-flex">
            分享
          </button>

          {/* 移动端：更多菜单 */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMore((v) => !v)}
              className="btn-ghost btn-sm"
              aria-label="更多操作"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <circle cx="5" cy="12" r="1.7" />
                <circle cx="12" cy="12" r="1.7" />
                <circle cx="19" cy="12" r="1.7" />
              </svg>
            </button>
            {showMore && (
              <>
                <div className="fixed inset-0 z-[70]" onClick={() => setShowMore(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full z-[71] mt-1 w-36 overflow-hidden rounded-xl border border-paper-line/70 bg-white py-1 shadow-lg">
                  {(
                    [
                      ['预览', () => setShowPreview(true)],
                      ['导出', () => setShowExport(true)],
                      ['分享', () => setShowShare(true)],
                    ] as const
                  ).map(([label, fn]) => (
                    <button
                      key={label}
                      onClick={() => {
                        setShowMore(false)
                        fn()
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-paper-warm"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => void handleSave()} disabled={saving} className="btn-primary btn-sm">
            {saving ? '保存中…' : session ? '保存' : '保存'}
          </button>
        </div>
      </header>

      <PreviewDialog open={showPreview} onClose={() => setShowPreview(false)} />
      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
      <ShareDialog open={showShare} onClose={() => setShowShare(false)} />
    </>
  )
}
