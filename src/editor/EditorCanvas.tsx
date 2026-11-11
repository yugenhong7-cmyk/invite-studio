import { useEffect, useRef } from 'react'
import { Canvas, type FabricObject } from 'fabric'
import { useEditor } from '@/store/editor'
import { useIsMobile } from '@/lib/useIsMobile'
import {
  readElementsFromCanvas,
  syncCanvasWithDoc,
  findObjectByElementId,
  getElementTypeOfObject,
} from '@/lib/fabric-sync'
import type { DesignElement } from '@/types'

/**
 * 编辑器画布宿主。
 * DesignDoc ↔ Fabric 双向同步：
 *  - 画布上的拖拽/缩放/旋转/文字编辑 → 回写结构化图层
 *  - 属性面板 / 模板 / AI 生成 → 增量同步到画布
 */
export default function EditorCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const fromCanvasRef = useRef(false)
  const zoom = useEditor((s) => s.zoom)
  const doc = useEditor((s) => s.doc)

  /* ---------- 初始化 ---------- */
  useEffect(() => {
    if (!canvasElRef.current) return
    const canvas = new Canvas(canvasElRef.current, {
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
      stopContextMenu: true,
      fireRightClick: false,
      uniformScaling: false,
    })
    fabricRef.current = canvas
    useEditor.getState().setFabricCanvas(canvas)

    const pushFromCanvas = (checkpoint: boolean) => {
      fromCanvasRef.current = true
      try {
        const els = readElementsFromCanvas(canvas)
        const st = useEditor.getState()
        if (checkpoint) st.commit((d) => ({ ...d, elements: els }))
        else st.patchSilent((d) => ({ ...d, elements: els }))
      } finally {
        window.setTimeout(() => {
          fromCanvasRef.current = false
        }, 0)
      }
    }

    const onModified = () => pushFromCanvas(true)
    const onTextChanged = () => pushFromCanvas(false)
    const onEditingExited = () => pushFromCanvas(true)
    const onSelection = (e: { selected?: FabricObject[] }) => {
      const obj = e.selected?.[0]
      const data = (obj as { data?: Record<string, unknown> } | undefined)?.data
      useEditor.getState().select((data?.elId as string) ?? null)
    }
    const onCleared = () => useEditor.getState().select(null)

    canvas.on('object:modified', onModified)
    canvas.on('text:changed', onTextChanged)
    canvas.on('text:editing:exited', onEditingExited)
    canvas.on('selection:created', onSelection as never)
    canvas.on('selection:updated', onSelection as never)
    canvas.on('selection:cleared', onCleared)

    // 双击文字进入编辑
    canvas.on('mouse:dblclick', (e) => {
      const obj = e.target
      if (obj && getElementTypeOfObject(obj) === 'text') {
        canvas.setActiveObject(obj)
        ;(obj as { enterEditing?: () => void }).enterEditing?.()
        ;(obj as { selectAll?: () => void }).selectAll?.()
        canvas.requestRenderAll()
      }
    })

    return () => {
      useEditor.getState().setFabricCanvas(null)
      try {
        canvas.dispose()
      } catch {
        /* noop */
      }
      fabricRef.current = null
    }
  }, [])

  /* ---------- store → 画布（增量） ---------- */
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || fromCanvasRef.current) return
    void syncCanvasWithDoc(canvas, doc)
  }, [doc])

  /* ---------- 选中态同步 ---------- */
  const selectedId = useEditor((s) => s.selectedId)
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (!selectedId) {
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      return
    }
    const obj = findObjectByElementId(canvas, selectedId)
    if (obj) {
      canvas.setActiveObject(obj)
      canvas.requestRenderAll()
    }
  }, [selectedId])

  /* ---------- 缩放：视口缩放 + 画布尺寸同步，指针坐标始终正确 ---------- */
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const w = doc.canvas.width
    const h = doc.canvas.height
    canvas.setDimensions({ width: Math.round(w * zoom), height: Math.round(h * zoom) })
    canvas.setZoom(zoom)
    canvas.requestRenderAll()
  }, [zoom, doc.canvas.width, doc.canvas.height])

  /* ---------- 键盘：删除 / 方向键微调 / 撤销重做 ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      const st = useEditor.getState()

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        st.redo()
        return
      }
      if (inField) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) {
        e.preventDefault()
        const id = st.selectedId as string
        const canvas = fabricRef.current
        if (canvas) {
          const obj = findObjectByElementId(canvas, id)
          if (obj) {
            fromCanvasRef.current = true
            canvas.remove(obj)
            canvas.requestRenderAll()
            window.setTimeout(() => {
              fromCanvasRef.current = false
            }, 0)
          }
        }
        st.removeElement(id)
        return
      }

      const nudge = e.shiftKey ? 10 : 1
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-nudge, 0],
        ArrowRight: [nudge, 0],
        ArrowUp: [0, -nudge],
        ArrowDown: [0, nudge],
      }
      const delta = map[e.key]
      if (delta && st.selectedId) {
        e.preventDefault()
        st.commit((d) => ({
          ...d,
          elements: d.elements.map((el) =>
            el.id === st.selectedId ? ({ ...el, x: el.x + delta[0], y: el.y + delta[1] } as DesignElement) : el,
          ),
        }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------- 滚轮缩放 ---------- */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const st = useEditor.getState()
      const next = st.zoom * (e.deltaY > 0 ? 0.92 : 1.08)
      st.setZoom(next)
    }
    wrap.addEventListener('wheel', onWheel, { passive: false })
    return () => wrap.removeEventListener('wheel', onWheel)
  }, [])

  /* ---------- 移动端：自适应宽度，保证整页设计可见（Canva 式） ---------- */
  const isMobile = useIsMobile()
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !isMobile) return
    const fit = () => {
      const avail = wrap.clientWidth - 24
      if (avail <= 0) return
      const next = Math.min(1, avail / doc.canvas.width)
      useEditor.getState().setZoom(Math.max(0.12, next))
    }
    fit()
    const onResize = () => fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // 仅在切换到移动端 / 设计画布宽度变化时重新适配，用户手动缩放不被打断
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, doc.canvas.width])

  return (
    <div ref={wrapRef} className="checker relative flex h-full w-full items-start justify-center overflow-auto p-3 sm:p-8">
      <div className="shadow-lift">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
