import {
  Canvas,
  StaticCanvas,
  Ellipse,
  FabricImage,
  Gradient,
  Line,
  Path,
  Polygon,
  Rect,
  Shadow,
  Textbox,
  Triangle,
  type FabricObject,
  type TFiller,
} from 'fabric'
import type {
  BackgroundSpec,
  DesignDoc,
  DesignElement,
  GradientSpec,
  ImageElement,
  ShapeElement,
  ShadowSpec,
  TextElement,
} from '@/types'

/* ============================================================
 * DesignDoc ⇄ Fabric 双向同步
 *  - DesignDoc 是权威数据源（结构化图层 + 坐标）
 *  - Fabric 只是渲染与交互层
 * ============================================================ */

export const BG_FLAG = '__invite_bg__'

type AnyObj = FabricObject & { data?: Record<string, unknown> }

const hasCJK = (s: string) => /[一-鿿㐀-䶿＀-￯]/.test(s)

export function shadowFromSpec(spec?: ShadowSpec): Shadow | undefined {
  if (!spec || !spec.enabled) return undefined
  return new Shadow({
    color: spec.color,
    blur: spec.blur,
    offsetX: spec.offsetX,
    offsetY: spec.offsetY,
  })
}

export function shadowToSpec(obj: FabricObject): ShadowSpec | undefined {
  const s = obj.shadow
  if (!s) return undefined
  return {
    enabled: true,
    color: s.color ?? 'rgba(0,0,0,0.3)',
    blur: s.blur ?? 12,
    offsetX: s.offsetX ?? 0,
    offsetY: s.offsetY ?? 0,
  }
}

/** 把 GradientSpec 转成 fabric Gradient（像素坐标系） */
export function gradientFromSpec(
  spec: GradientSpec,
  width: number,
  height: number,
): TFiller {
  const stops = spec.stops.map((s) => ({ offset: s.offset, color: s.color }))
  if (spec.type === 'radial') {
    return new Gradient({
      type: 'radial',
      gradientUnits: 'pixels',
      coords: {
        x1: width / 2,
        y1: height / 2,
        x2: width / 2,
        y2: height / 2,
        r1: 0,
        r2: Math.max(width, height) / 2,
      },
      colorStops: stops,
    }) as unknown as TFiller
  }
  const rad = ((spec.angle || 0) * Math.PI) / 180
  const len = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))
  const cx = width / 2
  const cy = height / 2
  const dx = (Math.cos(rad) * len) / 2
  const dy = (Math.sin(rad) * len) / 2
  return new Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy },
    colorStops: stops,
  }) as unknown as TFiller
}

function fillFromSpec(
  fill: string | GradientSpec | undefined,
  width: number,
  height: number,
): string | TFiller {
  if (!fill) return 'transparent'
  if (typeof fill === 'string') return fill
  return gradientFromSpec(fill, width, height)
}

/* ---------------- 星形 / 心形 / 环形 路径 ---------------- */

function starPoints(cx: number, cy: number, outer: number, inner: number, spikes = 5) {
  const pts: { x: number; y: number }[] = []
  const step = Math.PI / spikes
  let rot = -Math.PI / 2
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    pts.push({ x: cx + Math.cos(rot) * r, y: cy + Math.sin(rot) * r })
    rot += step
  }
  return pts
}

function heartPath(w: number, h: number): string {
  const s = Math.min(w, h) / 100
  return [
    `M ${50 * s} ${88 * s}`,
    `C ${20 * s} ${64 * s}, ${2 * s} ${44 * s}, ${2 * s} ${28 * s}`,
    `C ${2 * s} ${8 * s}, ${32 * s} ${-2 * s}, ${50 * s} ${18 * s}`,
    `C ${68 * s} ${-2 * s}, ${98 * s} ${8 * s}, ${98 * s} ${28 * s}`,
    `C ${98 * s} ${44 * s}, ${80 * s} ${64 * s}, ${50 * s} ${88 * s}`,
    'Z',
  ].join(' ')
}

/* ---------------- 元素 → Fabric ---------------- */

export function buildFabricObject(el: DesignElement): FabricObject {
  const common = {
    left: el.x,
    top: el.y,
    originX: 'left' as const,
    originY: 'top' as const,
    angle: el.rotation,
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
    lockMovementX: el.locked,
    lockMovementY: el.locked,
    lockRotation: el.locked,
    lockScalingX: el.locked,
    lockScalingY: el.locked,
    hasControls: !el.locked,
    borderColor: '#C2443C',
    borderScaleFactor: 2,
    cornerColor: '#C2443C',
    cornerStyle: 'circle' as const,
    cornerSize: 12,
    transparentCorners: false,
    padding: 0,
  }
  let obj: FabricObject

  if (el.type === 'text') {
    const t = el as TextElement
    obj = new Textbox(t.text, {
      ...common,
      width: t.width,
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      fontStyle: t.fontStyle,
      underline: t.underline,
      fill: t.fill,
      textAlign: t.textAlign,
      lineHeight: t.lineHeight,
      charSpacing: t.charSpacing,
      splitByGrapheme: hasCJK(t.text),
      shadow: shadowFromSpec(t.shadow),
      editable: true,
      lockMovementY: false,
    })
  } else if (el.type === 'image') {
    const im = el as ImageElement
    // 图片对象先用占位矩形创建，随后由 loadImageElement 填充真实位图
    obj = new Rect({
      ...common,
      width: im.width,
      height: im.height,
      fill: '#E7E2DC',
      rx: im.borderRadius,
      ry: im.borderRadius,
      stroke: im.stroke || undefined,
      strokeWidth: im.strokeWidth,
      shadow: shadowFromSpec(im.shadow),
    })
  } else {
    const sh = el as ShapeElement
    const fill = fillFromSpec(sh.fill, sh.width, sh.height)
    const stroke = sh.stroke || undefined
    switch (sh.shape) {
      case 'ellipse':
        obj = new Ellipse({
          ...common,
          rx: sh.width / 2,
          ry: sh.height / 2,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      case 'triangle':
        obj = new Triangle({
          ...common,
          width: sh.width,
          height: sh.height,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      case 'diamond':
        obj = new Rect({
          ...common,
          width: sh.width,
          height: sh.height,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          angle: el.rotation + 45,
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      case 'line':
        obj = new Line([0, 0, sh.width, sh.height], {
          ...common,
          stroke: sh.stroke || (typeof sh.fill === 'string' ? sh.fill : '#22201E'),
          strokeWidth: Math.max(1, sh.strokeWidth || 2),
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      case 'ring':
        obj = new Ellipse({
          ...common,
          rx: sh.width / 2,
          ry: sh.height / 2,
          fill: 'transparent',
          stroke: sh.stroke || (typeof sh.fill === 'string' ? sh.fill : '#C9A227'),
          strokeWidth: Math.max(1, sh.strokeWidth || 2),
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      case 'star': {
        const pts = starPoints(sh.width / 2, sh.height / 2, Math.min(sh.width, sh.height) / 2, Math.min(sh.width, sh.height) / 4.2)
        obj = new Polygon(pts, {
          ...common,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      }
      case 'heart': {
        obj = new Path(heartPath(sh.width, sh.height), {
          ...common,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          shadow: shadowFromSpec(sh.shadow),
        })
        break
      }
      case 'rect':
      default:
        obj = new Rect({
          ...common,
          width: sh.width,
          height: sh.height,
          rx: sh.radius,
          ry: sh.radius,
          fill,
          stroke,
          strokeWidth: sh.strokeWidth,
          shadow: shadowFromSpec(sh.shadow),
        })
    }
  }

  ;(obj as AnyObj).data = {
    elId: el.id,
    elType: el.type,
    role: el.role ?? null,
    name: el.name,
    ...(el.type === 'image' ? { src: (el as ImageElement).src, radius: (el as ImageElement).borderRadius } : {}),
    ...(el.type === 'shape' ? { shape: (el as ShapeElement).shape, radius: (el as ShapeElement).radius, fillSpec: (el as ShapeElement).fill } : {}),
  }
  return obj
}

/** 为图片元素异步加载真实位图，替换占位矩形 */
export async function loadImageObject(el: ImageElement): Promise<FabricObject | null> {
  try {
    const img = await FabricImage.fromURL(el.src, { crossOrigin: 'anonymous' })
    img.set({
      left: el.x,
      top: el.y,
      originX: 'left',
      originY: 'top',
      angle: el.rotation,
      opacity: el.opacity,
      visible: el.visible,
      selectable: !el.locked,
      evented: !el.locked,
      lockMovementX: el.locked,
      lockMovementY: el.locked,
      lockRotation: el.locked,
      lockScalingX: el.locked,
      lockScalingY: el.locked,
      hasControls: !el.locked,
      borderColor: '#C2443C',
      borderScaleFactor: 2,
      cornerColor: '#C2443C',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      padding: 0,
      flipX: el.flipX,
      flipY: el.flipY,
      shadow: shadowFromSpec(el.shadow),
    })
    const natW = img.width || 1
    const natH = img.height || 1
    img.set({ scaleX: el.width / natW, scaleY: el.height / natH })
    ;(img as AnyObj).data = {
      elId: el.id,
      elType: 'image',
      role: el.role ?? null,
      name: el.name,
      src: el.src,
      radius: el.borderRadius,
    }
    return img
  } catch {
    return null
  }
}

/* ---------------- Fabric → 元素 ---------------- */

export function elementFromFabric(obj: FabricObject): DesignElement | null {
  const data = ((obj as AnyObj).data ?? {}) as Record<string, unknown>
  if (data.isBg || data.elId === BG_FLAG) return null
  const elType = (data.elType as DesignElement['type']) || 'shape'
  const base = {
    id: (data.elId as string) || `el_${Math.random().toString(36).slice(2)}`,
    name: (data.name as string) || '图层',
    role: (data.role as DesignElement['role']) ?? undefined,
    x: Math.round(obj.left ?? 0),
    y: Math.round(obj.top ?? 0),
    width: Math.round(obj.getScaledWidth()),
    height: Math.round(obj.getScaledHeight()),
    rotation: Math.round((obj.angle ?? 0) * 100) / 100,
    opacity: obj.opacity ?? 1,
    visible: obj.visible !== false,
    locked: obj.selectable === false,
  }

  if (elType === 'text') {
    const t = obj as unknown as Textbox
    const scale = t.scaleX || 1
    return {
      ...base,
      type: 'text',
      text: t.text ?? '',
      fontFamily: t.fontFamily || 'Noto Serif SC',
      fontSize: Math.round((t.fontSize || 40) * scale),
      fontWeight: (t.fontWeight === 'bold' ? 'bold' : 'normal') as 'bold' | 'normal',
      fontStyle: (t.fontStyle === 'italic' ? 'italic' : 'normal') as 'italic' | 'normal',
      underline: !!t.underline,
      fill: typeof t.fill === 'string' ? t.fill : '#22201E',
      textAlign: (t.textAlign || 'left') as 'left' | 'center' | 'right',
      lineHeight: t.lineHeight || 1.4,
      charSpacing: t.charSpacing || 0,
      shadow: shadowToSpec(obj),
    } satisfies TextElement
  }

  if (elType === 'image') {
    return {
      ...base,
      type: 'image',
      src: (data.src as string) || '',
      borderRadius: (data.radius as number) || 0,
      stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
      strokeWidth: obj.strokeWidth || 0,
      flipX: !!obj.flipX,
      flipY: !!obj.flipY,
      shadow: shadowToSpec(obj),
    } satisfies ImageElement
  }

  const fillSpec = data.fillSpec as ShapeElement['fill'] | undefined
  let fill: string | GradientSpec = 'transparent'
  if (fillSpec) {
    fill = fillSpec
  } else if (typeof obj.fill === 'string') {
    fill = obj.fill
  }

  return {
    ...base,
    type: 'shape',
    shape: (data.shape as ShapeElement['shape']) || 'rect',
    fill,
    stroke: typeof obj.stroke === 'string' ? obj.stroke : '',
    strokeWidth: obj.strokeWidth || 0,
    radius: (data.radius as number) || 0,
    shadow: shadowToSpec(obj),
  } satisfies ShapeElement
}

/* ---------------- 背景 ---------------- */

export async function buildBackgroundObject(bg: BackgroundSpec, w: number, h: number): Promise<FabricObject> {
  const base = {
    left: 0,
    top: 0,
    width: w,
    height: h,
    originX: 'left' as const,
    originY: 'top' as const,
    selectable: false,
    evented: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hasControls: false,
    hasBorders: false,
    opacity: bg.opacity ?? 1,
    excludeFromExport: false,
  }
  let obj: FabricObject
  if (bg.type === 'image' && bg.imageSrc) {
    try {
      const img = await FabricImage.fromURL(bg.imageSrc, { crossOrigin: 'anonymous' })
      img.set(base)
      const natW = img.width || 1
      const natH = img.height || 1
      const fit = bg.imageFit || 'cover'
      if (fit === 'stretch') {
        img.set({ scaleX: w / natW, scaleY: h / natH })
      } else {
        const ratio = fit === 'contain' ? Math.min(w / natW, h / natH) : Math.max(w / natW, h / natH)
        const sw = natW * ratio
        const sh = natH * ratio
        img.set({
          scaleX: ratio,
          scaleY: ratio,
          left: (w - sw) / 2,
          top: (h - sh) / 2,
        })
      }
      obj = img
    } catch {
      obj = new Rect({ ...base, fill: bg.color || '#FFFFFF' })
    }
  } else if (bg.type === 'gradient' && bg.gradient) {
    obj = new Rect({
      ...base,
      fill: gradientFromSpec(bg.gradient, w, h),
    })
  } else {
    obj = new Rect({ ...base, fill: bg.color || '#FFFFFF' })
  }
  ;(obj as AnyObj).data = { isBg: true, elId: BG_FLAG }
  return obj
}

/* ---------------- 增量同步 ---------------- */

function applyCommonProps(obj: FabricObject, el: DesignElement) {
  obj.set({
    left: el.x,
    top: el.y,
    angle: el.rotation,
    opacity: el.opacity,
    visible: el.visible,
    selectable: !el.locked,
    evented: !el.locked,
    lockMovementX: el.locked,
    lockMovementY: el.locked,
    lockRotation: el.locked,
    lockScalingX: el.locked,
    lockScalingY: el.locked,
    hasControls: !el.locked,
    hasBorders: !el.locked,
    scaleX: 1,
    scaleY: 1,
  })
}

/** 把最新元素属性写回已有 fabric 对象（不重建，避免图片闪烁） */
export function updateObjectFromElement(obj: FabricObject, el: DesignElement): boolean {
  const data = ((obj as AnyObj).data ?? {}) as Record<string, unknown>
  applyCommonProps(obj, el)

  if (el.type === 'text') {
    const t = el as TextElement
    const tb = obj as unknown as Textbox
    if (tb.text !== t.text) tb.text = t.text
    tb.set({
      width: t.width,
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      fontStyle: t.fontStyle,
      underline: t.underline,
      fill: t.fill,
      textAlign: t.textAlign,
      lineHeight: t.lineHeight,
      charSpacing: t.charSpacing,
      splitByGrapheme: hasCJK(t.text),
      shadow: shadowFromSpec(t.shadow),
    })
    data.elType = 'text'
    data.role = t.role ?? null
    data.name = t.name
  } else if (el.type === 'image') {
    const im = el as ImageElement
    data.elType = 'image'
    data.role = im.role ?? null
    data.name = im.name
    data.radius = im.borderRadius
    obj.set({
      stroke: im.stroke || undefined,
      strokeWidth: im.strokeWidth,
      flipX: im.flipX,
      flipY: im.flipY,
      shadow: shadowFromSpec(im.shadow),
    })
    // 只有 src 变化才需要重建位图
    if (data.src !== im.src) {
      data.src = im.src
      data.needsImageReload = true
    }
    const natW = obj.width || 1
    const natH = obj.height || 1
    obj.set({ scaleX: im.width / natW, scaleY: im.height / natH })
  } else {
    const sh = el as ShapeElement
    data.elType = 'shape'
    data.role = sh.role ?? null
    data.name = sh.name
    data.shape = sh.shape
    data.radius = sh.radius
    data.fillSpec = sh.fill
    obj.set({
      fill: fillFromSpec(sh.fill, sh.width, sh.height),
      stroke: sh.stroke || undefined,
      strokeWidth: sh.strokeWidth,
      shadow: shadowFromSpec(sh.shadow),
    })
    const natW = obj.width || 1
    const natH = obj.height || 1
    obj.set({ scaleX: sh.width / natW, scaleY: sh.height / natH })
    if (sh.shape === 'ellipse' || sh.shape === 'ring') {
      const e = obj as Ellipse
      e.set({ rx: sh.width / 2, ry: sh.height / 2, scaleX: 1, scaleY: 1 })
    }
    if (sh.shape === 'diamond') obj.set({ angle: el.rotation + 45 })
    if (sh.shape === 'rect') obj.set({ rx: sh.radius, ry: sh.radius } as Partial<Rect>)
  }
  return true
}

/**
 * 让画布与 DesignDoc 增量一致：
 * - 已存在的对象只更新属性（不重载图片）
 * - 新元素创建，多余元素移除
 * - 末尾按 doc 顺序对齐图层
 */
export async function syncCanvasWithDoc(canvas: Canvas, doc: DesignDoc): Promise<void> {
  const { width, height } = doc.canvas

  // 背景
  const bgObj = canvas.getObjects().find((o) => ((o as AnyObj).data as Record<string, unknown> | undefined)?.isBg)
  const bgNeeds =
    !bgObj || JSON.stringify(((bgObj as AnyObj).data as Record<string, unknown> | undefined)?.bgSpec ?? null) !== JSON.stringify(doc.canvas.background)
  if (bgNeeds) {
    const nextBg = await buildBackgroundObject(doc.canvas.background, width, height)
    ;((nextBg as AnyObj).data as Record<string, unknown>).bgSpec = doc.canvas.background
    if (bgObj) {
      canvas.remove(bgObj)
      canvas.insertAt(0, nextBg)
    } else {
      canvas.insertAt(0, nextBg)
    }
  }

  const existing = new Map<string, FabricObject>()
  for (const o of canvas.getObjects()) {
    const d = (o as AnyObj).data as Record<string, unknown> | undefined
    if (d?.isBg) continue
    const id = d?.elId as string | undefined
    if (id) existing.set(id, o)
  }

  const seen = new Set<string>()
  for (const el of doc.elements) {
    seen.add(el.id)
    const cur = existing.get(el.id)
    if (!cur) {
      if (el.type === 'image') {
        const img = await loadImageObject(el)
        if (img) canvas.add(img)
      } else {
        canvas.add(buildFabricObject(el))
      }
      continue
    }
    const data = (cur as AnyObj).data as Record<string, unknown>
    const prevSrc = data.src
    const prevShape = data.shape
    const elTypeChanged = data.elType !== el.type
    const shapeChanged = el.type === 'shape' && prevShape !== (el as ShapeElement).shape
    const imageSrcChanged = el.type === 'image' && prevSrc !== (el as ImageElement).src

    if (elTypeChanged || shapeChanged) {
      // 类型/形状变了，直接重建
      canvas.remove(cur)
      existing.delete(el.id)
      if (el.type === 'image') {
        const img = await loadImageObject(el)
        if (img) canvas.add(img)
      } else {
        canvas.add(buildFabricObject(el))
      }
      continue
    }

    updateObjectFromElement(cur, el)

    if (imageSrcChanged) {
      canvas.remove(cur)
      existing.delete(el.id)
      const img = await loadImageObject(el)
      if (img) canvas.add(img)
    }
  }

  for (const [id, obj] of existing) {
    if (!seen.has(id)) canvas.remove(obj)
  }

  // 图层顺序（背景固定在 index 0）
  doc.elements.forEach((el, i) => {
    const obj = canvas.getObjects().find((o) => ((o as AnyObj).data as Record<string, unknown> | undefined)?.elId === el.id)
    if (obj) canvas.moveObjectTo(obj, i + 1)
  })

  canvas.requestRenderAll()
}

/* ---------------- 画布渲染 ---------------- */

export async function renderDesignToCanvas(canvas: Canvas, doc: DesignDoc): Promise<void> {
  const { width, height } = doc.canvas
  canvas.setDimensions({ width, height })
  canvas.clear()
  canvas.backgroundColor = 'transparent'

  const bgObj = await buildBackgroundObject(doc.canvas.background, width, height)
  canvas.add(bgObj)

  for (const el of doc.elements) {
    if (el.type === 'image') {
      const img = await loadImageObject(el)
      if (img) canvas.add(img)
      else canvas.add(buildFabricObject(el))
    } else {
      canvas.add(buildFabricObject(el))
    }
  }
  canvas.renderAll()
}

/** 只更新背景，不重建图层 */
export async function applyBackgroundToCanvas(canvas: Canvas, bg: BackgroundSpec): Promise<void> {
  const w = canvas.getWidth()
  const h = canvas.getHeight()
  const objs = canvas.getObjects()
  const old = objs.find((o) => ((o as AnyObj).data as Record<string, unknown> | undefined)?.isBg)
  const bgObj = await buildBackgroundObject(bg, w, h)
  if (old) {
    canvas.remove(old)
    canvas.insertAt(0, bgObj)
  } else {
    canvas.insertAt(0, bgObj)
  }
  canvas.requestRenderAll()
}

/** 从画布读回完整元素列表（跳过背景） */
export function readElementsFromCanvas(canvas: Canvas): DesignElement[] {
  const out: DesignElement[] = []
  for (const obj of canvas.getObjects()) {
    const el = elementFromFabric(obj)
    if (el) out.push(el)
  }
  return out
}

/** 按元素 id 在画布上找对象 */
export function findObjectByElementId(canvas: Canvas, elId: string): FabricObject | null {
  return (
    canvas.getObjects().find((o) => ((o as AnyObj).data as Record<string, unknown> | undefined)?.elId === elId) ??
    null
  )
}

export function getElementTypeOfObject(obj: FabricObject): DesignElement['type'] | null {
  const data = ((obj as AnyObj).data ?? {}) as Record<string, unknown>
  if (data.isBg) return null
  return (data.elType as DesignElement['type']) ?? null
}

/* ---------------- 导出 ---------------- */

export interface ExportOptions {
  format: 'png' | 'jpeg'
  /** 目标宽度；等比换算 multiplier */
  targetWidth?: number
  quality?: number
}

export async function exportCanvasToDataUrl(
  canvas: Canvas,
  doc: DesignDoc,
  options: ExportOptions,
): Promise<string> {
  // 导出前必须丢弃选中态，避免选框/辅助线进入成品
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  await new Promise((r) => requestAnimationFrame(() => r(null)))

  const baseW = doc.canvas.width || canvas.getWidth()
  const targetW = options.targetWidth || baseW
  const multiplier = Math.max(0.1, targetW / baseW)

  return canvas.toDataURL({
    format: options.format,
    multiplier,
    quality: options.quality ?? (options.format === 'jpeg' ? 0.92 : 1),
    enableRetinaScaling: false,
  })
}

/** 导出前等待设计用到的 Web 字体就绪，避免离屏渲染落到回退字体（封面/导出与画布不一致） */
async function ensureFontsReady(doc: DesignDoc): Promise<void> {
  try {
    const families = new Set<string>()
    for (const el of doc.elements) {
      if (el.type === 'text' && el.fontFamily) families.add(el.fontFamily)
    }
    if (families.size && 'fonts' in document) {
      const loads: Promise<unknown>[] = []
      for (const fam of families) {
        for (const weight of ['400', '700']) {
          loads.push(document.fonts.load(`${weight} 48px "${fam}"`).catch(() => []))
        }
      }
      await Promise.all(loads)
    }
    await document.fonts?.ready
  } catch {
    /* 字体加载失败不阻塞导出 */
  }
}

/**
 * 离屏导出：用一份干净的画布重新渲染设计再导出。
 * 保证成品里没有编辑器选框、辅助线、缩放与任何交互态，
 * 也完全不受编辑器视口缩放影响。
 */
export async function exportDesignToDataUrl(
  doc: DesignDoc,
  options: ExportOptions,
): Promise<string> {
  await ensureFontsReady(doc)
  const el = document.createElement('canvas')
  const temp = new StaticCanvas(el, {
    width: doc.canvas.width,
    height: doc.canvas.height,
    renderOnAddRemove: false,
    enableRetinaScaling: false,
    selection: false,
    interactive: false,
  })
  try {
    await renderDesignToCanvas(temp as never, doc)
    temp.requestRenderAll()
    await new Promise((r) => requestAnimationFrame(() => r(null)))

    const baseW = doc.canvas.width
    const targetW = options.targetWidth || baseW
    const multiplier = Math.max(0.1, targetW / baseW)
    return temp.toDataURL({
      format: options.format,
      multiplier,
      quality: options.quality ?? (options.format === 'jpeg' ? 0.92 : 1),
      enableRetinaScaling: false,
    })
  } finally {
    try {
      temp.dispose()
    } catch {
      /* noop */
    }
    el.remove()
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 生成缩略图（小尺寸 PNG dataURL），用于作品列表 */
export async function renderThumbnail(canvas: Canvas, doc: DesignDoc, maxW = 320): Promise<string> {
  return exportCanvasToDataUrl(canvas, doc, { format: 'png', targetWidth: maxW })
}
