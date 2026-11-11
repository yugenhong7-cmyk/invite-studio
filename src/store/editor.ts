import { create } from 'zustand'
import type { BackgroundSpec, DesignDoc, DesignElement, EventInfo, PresentationConfig } from '@/types'
import { cloneDesign, createDesign, applyEventInfoToDesign, touch } from '@/lib/design'

/* ============================================================
 * 编辑器状态
 *  - DesignDoc 是唯一权威数据源
 *  - 撤销/重做 = DesignDoc 快照栈（天然覆盖图层与坐标）
 *  - 画布对象通过 lib/fabric-sync 双向同步
 * ============================================================ */

const HISTORY_LIMIT = 60

interface EditorState {
  doc: DesignDoc
  projectId: number | null
  projectName: string
  selectedId: string | null
  zoom: number
  dirty: boolean
  saving: boolean
  lastSavedAt: number | null
  past: DesignDoc[]
  future: DesignDoc[]
  /** 当前 Fabric 画布实例（导出 / 预览复用），不参与序列化 */
  fabricCanvas: unknown | null
  setFabricCanvas: (c: unknown | null) => void

  /** 载入一份设计（模板 / 作品 / AI 生成），重置历史 */
  loadDesign: (doc: DesignDoc, opts?: { projectId?: number | null; name?: string }) => void
  /** 修改设计并记录历史 */
  commit: (mutator: (doc: DesignDoc) => DesignDoc) => void
  /** 修改设计但不记录历史（拖拽过程中的连续更新） */
  patchSilent: (mutator: (doc: DesignDoc) => DesignDoc) => void
  /** 拖拽/缩放结束时把当前状态压入历史 */
  checkpoint: () => void

  select: (id: string | null) => void
  setZoom: (zoom: number) => void
  setProject: (id: number | null, name?: string) => void
  setSaving: (saving: boolean) => void
  markSaved: () => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  addElement: (el: DesignElement) => void
  updateElement: (id: string, patch: Partial<DesignElement>) => void
  removeElement: (id: string) => void
  reorderElement: (id: string, dir: 'up' | 'down' | 'top' | 'bottom') => void
  renameElement: (id: string, name: string) => void
  toggleLock: (id: string) => void
  toggleVisible: (id: string) => void
  setBackground: (bg: BackgroundSpec) => void
  setEventInfo: (info: EventInfo) => void
  setPresentation: (patch: Partial<PresentationConfig>) => void
  renameDesign: (name: string) => void
}

function pushHistory(doc: DesignDoc, past: DesignDoc[]): DesignDoc[] {
  const next = [...past, cloneDesign(doc)]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: createDesign({ name: '未命名请帖', category: 'other', style: 'modern', orientation: 'portrait' }),
  projectId: null,
  projectName: '未命名请帖',
  selectedId: null,
  zoom: 0.55,
  dirty: false,
  saving: false,
  lastSavedAt: null,
  past: [],
  future: [],
  fabricCanvas: null,
  setFabricCanvas: (c) => set({ fabricCanvas: c }),

  loadDesign: (doc, opts) => {
    set({
      doc: cloneDesign(doc),
      projectId: opts?.projectId ?? null,
      projectName: opts?.name ?? doc.name,
      selectedId: null,
      past: [],
      future: [],
      dirty: false,
    })
  },

  commit: (mutator) => {
    const state = get()
    const next = touch(mutator(cloneDesign(state.doc)))
    set({
      doc: next,
      past: pushHistory(state.doc, state.past),
      future: [],
      dirty: true,
    })
  },

  patchSilent: (mutator) => {
    const state = get()
    set({ doc: touch(mutator(cloneDesign(state.doc))), dirty: true })
  },

  checkpoint: () => {
    const state = get()
    set({ past: pushHistory(state.doc, state.past), future: [] })
  },

  select: (id) => set({ selectedId: id }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.12, zoom)) }),
  setProject: (id, name) => set({ projectId: id, ...(name ? { projectName: name } : {}) }),
  setSaving: (saving) => set({ saving }),
  markSaved: () => set({ dirty: false, lastSavedAt: Date.now() }),

  undo: () => {
    const { past, future, doc } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      doc: previous,
      past: past.slice(0, -1),
      future: [cloneDesign(doc), ...future].slice(0, HISTORY_LIMIT),
      dirty: true,
      selectedId: null,
    })
  },

  redo: () => {
    const { past, future, doc } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      doc: next,
      future: future.slice(1),
      past: pushHistory(doc, past),
      dirty: true,
      selectedId: null,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (el) => {
    get().commit((doc) => ({ ...doc, elements: [...doc.elements, el] }))
    set({ selectedId: el.id })
  },

  updateElement: (id, patch) => {
    get().commit((doc) => ({
      ...doc,
      elements: doc.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as DesignElement) : el)),
    }))
  },

  removeElement: (id) => {
    get().commit((doc) => ({ ...doc, elements: doc.elements.filter((el) => el.id !== id) }))
    if (get().selectedId === id) set({ selectedId: null })
  },

  reorderElement: (id, dir) => {
    get().commit((doc) => {
      const arr = [...doc.elements]
      const i = arr.findIndex((e) => e.id === id)
      if (i < 0) return doc
      const [item] = arr.splice(i, 1)
      const target =
        dir === 'up'
          ? Math.min(arr.length, i + 1)
          : dir === 'down'
            ? Math.max(0, i - 1)
            : dir === 'top'
              ? arr.length
              : 0
      arr.splice(target, 0, item)
      return { ...doc, elements: arr }
    })
  },

  renameElement: (id, name) => {
    get().commit((doc) => ({
      ...doc,
      elements: doc.elements.map((el) => (el.id === id ? { ...el, name } : el)),
    }))
  },

  toggleLock: (id) => {
    get().commit((doc) => ({
      ...doc,
      elements: doc.elements.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el)),
    }))
  },

  toggleVisible: (id) => {
    get().commit((doc) => ({
      ...doc,
      elements: doc.elements.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el)),
    }))
  },

  setBackground: (bg) => {
    get().commit((doc) => ({ ...doc, canvas: { ...doc.canvas, background: bg } }))
  },

  setEventInfo: (info) => {
    get().commit((doc) => applyEventInfoToDesign(doc, info))
  },

  setPresentation: (patch) => {
    get().commit((doc) => ({
      ...doc,
      presentation: {
        ...doc.presentation,
        ...patch,
        cover: { ...doc.presentation.cover, ...(patch.cover ?? {}) },
        backgroundFx: { ...doc.presentation.backgroundFx, ...(patch.backgroundFx ?? {}) },
        music: { ...doc.presentation.music, ...(patch.music ?? {}) },
        sections: { ...doc.presentation.sections, ...(patch.sections ?? {}) },
      },
    }))
  },

  renameDesign: (name) => {
    get().commit((doc) => ({ ...doc, name }))
    set({ projectName: name })
  },
}))
