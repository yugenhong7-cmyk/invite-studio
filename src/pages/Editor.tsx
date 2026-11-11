import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor } from '@/store/editor'
import { useApp, toast } from '@/store/app'
import { buildTemplate } from '@/data/templates'
import { createDesign } from '@/lib/design'
import { saveProject, cloudErrorMessage } from '@/lib/repo'
import { exportDesignToDataUrl } from '@/lib/fabric-sync'
import type { DesignDoc } from '@/types'
import TopBar from '@/editor/TopBar'
import LeftPanel from '@/editor/LeftPanel'
import RightPanel from '@/editor/RightPanel'
import EditorCanvas from '@/editor/EditorCanvas'
import MobileDock from '@/editor/MobileDock'
import { useIsMobile } from '@/lib/useIsMobile'
import { takeHandoff, OPEN_DOC_KEY, OPEN_PROJECT_KEY } from '@/lib/handoff'
import { unlockBackgroundImage } from '@/lib/import'

const DRAFT_KEY = 'invite-studio:draft'

export default function Editor() {
  const { templateId } = useParams()
  const loadDesign = useEditor((s) => s.loadDesign)
  const user = useApp((s) => s.user)
  const ready = useApp((s) => s.ready)
  const [booted, setBooted] = useState(false)
  const isMobile = useIsMobile()

  /* ---------- 载入初始设计 ---------- */
  useEffect(() => {
    if (booted) return
    let cancelled = false

    void (async () => {
      // 1. 打开指定模板
      if (templateId) {
        const doc = buildTemplate(templateId)
        if (doc) {
          loadDesign(doc, { name: doc.name })
          if (!cancelled) setBooted(true)
          return
        }
      }

      // 2. 从「我的作品 / 我的模板」跳转过来（IndexedDB 手递手，支持大图）
      const parsedProject = await takeHandoff<{ projectId: number; doc: DesignDoc }>(OPEN_PROJECT_KEY)
      if (cancelled) return
      if (parsedProject?.doc?.canvas && Array.isArray(parsedProject.doc.elements)) {
        const migrated = await unlockBackgroundImage(parsedProject.doc)
        if (cancelled) return
        loadDesign(migrated, { projectId: parsedProject.projectId, name: migrated.name })
        setBooted(true)
        return
      }
      const parsedDoc = await takeHandoff<DesignDoc>(OPEN_DOC_KEY)
      if (cancelled) return
      if (parsedDoc?.canvas && Array.isArray(parsedDoc.elements)) {
        const migrated = await unlockBackgroundImage(parsedDoc)
        if (cancelled) return
        loadDesign(migrated, { name: migrated.name })
        setBooted(true)
        return
      }

      // 2b. 兼容旧版 sessionStorage 传参（可能因超限缺失，忽略即可）
      try {
        const rawProject = sessionStorage.getItem(OPEN_PROJECT_KEY)
        if (rawProject) {
          const parsed = JSON.parse(rawProject) as { projectId: number; doc: DesignDoc }
          const migrated = await unlockBackgroundImage(parsed.doc)
          if (cancelled) return
          loadDesign(migrated, { projectId: parsed.projectId, name: migrated.name })
          sessionStorage.removeItem(OPEN_PROJECT_KEY)
          setBooted(true)
          return
        }
        const rawDoc = sessionStorage.getItem(OPEN_DOC_KEY)
        if (rawDoc) {
          const parsed = JSON.parse(rawDoc) as DesignDoc
          const migrated = await unlockBackgroundImage(parsed)
          if (cancelled) return
          loadDesign(migrated, { name: migrated.name })
          sessionStorage.removeItem(OPEN_DOC_KEY)
          setBooted(true)
          return
        }
      } catch {
        sessionStorage.removeItem(OPEN_PROJECT_KEY)
        sessionStorage.removeItem(OPEN_DOC_KEY)
      }

      // 3. 本地草稿（崩溃恢复）
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as DesignDoc
          if (parsed && parsed.canvas && Array.isArray(parsed.elements)) {
            loadDesign(parsed, { name: parsed.name })
            toast('info', '已恢复上次未保存的草稿')
            if (!cancelled) setBooted(true)
            return
          }
        } catch {
          localStorage.removeItem(DRAFT_KEY)
        }
      }

      // 4. 空白新作品
      loadDesign(
        createDesign({ name: '我的请帖', category: 'other', style: 'modern', orientation: 'portrait' }),
        { name: '我的请帖' },
      )
      if (!cancelled) setBooted(true)
    })()

    return () => {
      cancelled = true
    }
  }, [booted, templateId, loadDesign])

  /* ---------- 本地草稿自动保存（崩溃恢复） ---------- */
  const doc = useEditor((s) => s.doc)
  const draftTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!booted) return
    if (draftTimer.current) window.clearTimeout(draftTimer.current)
    draftTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(doc))
      } catch {
        /* 存储空间不足时忽略 */
      }
    }, 1500)
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current)
    }
  }, [doc, booted])

  /* ---------- 云端自动保存（登录且已有项目时） ---------- */
  const projectId = useEditor((s) => s.projectId)
  const dirty = useEditor((s) => s.dirty)
  const autoTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!booted || !ready || !user || !projectId || !dirty) return
    if (autoTimer.current) window.clearTimeout(autoTimer.current)
    autoTimer.current = window.setTimeout(() => {
      void (async () => {
        const st = useEditor.getState()
        st.setSaving(true)
        try {
          let thumbnail: string | null = null
          try {
            thumbnail = await exportDesignToDataUrl(st.doc, { format: 'png', targetWidth: 320 })
          } catch {
            thumbnail = null
          }
          await saveProject(st.doc, { projectId: st.projectId, thumbnail })
          st.markSaved()
        } catch (e) {
          console.warn('[editor] autosave failed:', cloudErrorMessage(e))
        } finally {
          st.setSaving(false)
        }
      })()
    }, 8000)
    return () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current)
    }
  }, [doc, booted, ready, user, projectId, dirty])

  /* 离开前提醒未保存 */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper-warm">
        <div className="text-sm text-ink-mute">正在准备编辑器…</div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper-warm">
      <TopBar />
      {isMobile ? (
        /* 移动端（Canva 风格）：画布全宽 + 底部工具坞，二级面板走底部抽屉 */
        <>
          <div className="min-h-0 flex-1">
            <EditorCanvas />
          </div>
          <MobileDock />
        </>
      ) : (
        <div className="flex min-h-0 flex-1">
          <LeftPanel />
          <div className="min-w-0 flex-1">
            <EditorCanvas />
          </div>
          <RightPanel />
        </div>
      )}
    </div>
  )
}
