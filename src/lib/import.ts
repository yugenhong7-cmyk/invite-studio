import type { BackgroundSpec, DesignDoc, EventCategory, ImageElement, Orientation, ShapeElement, StyleTag, TextElement } from '@/types'
import { createDesign, makeText, makeImage, makeShape, sizeFor, FONTS } from './design'
import { uid } from './id'
import { parsePptx, parsePptBinary, type ParsedSlide, type ExtractedText, type SlideImage, type SlideShape } from './pptx'

/* ============================================================
 * 模板导入
 *  - 图片（PNG/JPG/GIF/WebP）→ 可编辑图层（可移动/缩放/旋转/调透明度）
 *  - SVG → 文字提取为可编辑文字，图形部分栅格化为可编辑图层
 *  - PDF → 取首页渲染为高清可编辑图片图层
 *  - PPT/PPTX → 逐页解析：文字 → 可编辑文字元素，图片 → 可编辑图层
 *  - URL → 直连 + CORS 中转回退抓取；网页链接自动提取 og:image
 * 文件类型以魔数嗅探为准（中转/短链常缺失 content-type 与扩展名）。
 * ============================================================ */

export const ACCEPTED_IMAGE = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
export const ACCEPTED_SVG = ['image/svg+xml']
export const ACCEPTED_PDF = ['application/pdf']
export const ACCEPTED_PPT = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export type ImportFormat = 'png' | 'jpg' | 'webp' | 'gif' | 'svg' | 'pdf' | 'pptx' | 'ppt' | 'unknown'

export function detectFormat(file: File): ImportFormat {
  const t = (file.type || '').toLowerCase()
  const n = file.name.toLowerCase()
  if (ACCEPTED_PDF.includes(t) || n.endsWith('.pdf')) return 'pdf'
  if (n.endsWith('.pptx') || t.includes('presentationml')) return 'pptx'
  if (n.endsWith('.ppt') || ACCEPTED_PPT.includes(t)) return 'ppt'
  if (ACCEPTED_SVG.includes(t) || n.endsWith('.svg')) return 'svg'
  if (t.includes('png') || n.endsWith('.png')) return 'png'
  if (t.includes('jpeg') || t.includes('jpg') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpg'
  if (t.includes('webp') || n.endsWith('.webp')) return 'webp'
  if (t.includes('gif') || n.endsWith('.gif')) return 'gif'
  return 'unknown'
}

export const MAX_FILE_SIZE = 60 * 1024 * 1024

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请控制在 60MB 以内`
  const fmt = detectFormat(file)
  if (fmt === 'unknown') return '不支持的文件格式，请上传 PNG / JPG / GIF / SVG / PDF / PPT / PPTX'
  return null
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片解析失败'))
    img.src = src
  })
}

/** PDF 首页渲染为 PNG dataURL */
export async function pdfToImage(file: File, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const pdfjs = await import('pdfjs-dist')
  const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc.default

  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  await page.render({ canvasContext: ctx, viewport }).promise
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

/** SVG 字符串栅格化为 PNG dataURL（保证在画布中稳定渲染与导出） */
export async function svgToImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const text = await file.text()
  const blob = new Blob([text], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const w = img.naturalWidth || 1080
    const h = img.naturalHeight || 1920
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    ctx.drawImage(img, 0, 0)
    return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ---------------- SVG 文字提取（文字 → 可编辑元素） ---------------- */

interface SvgTextHit {
  el: Element
  text: string
  x: number
  y: number
  fontSize: number
  fill: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  fontFamily?: string
}

function parseSvgLen(v: string | null, fallback: number): number {
  if (!v) return fallback
  const m = /-?\d+(\.\d+)?/.exec(v)
  return m ? Number(m[0]) : fallback
}

/** 在 SVG DOM 中收集 <text>/<tspan> 文字（含坐标与样式），并从 DOM 中移除 */
function collectSvgTexts(doc: Document): { hits: SvgTextHit[]; width: number; height: number } {
  const svg = doc.documentElement
  const vb = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  const width = parseSvgLen(svg.getAttribute('width'), vb?.[2] ?? 1080)
  const height = parseSvgLen(svg.getAttribute('height'), vb?.[3] ?? 1920)

  const hits: SvgTextHit[] = []
  const nodes = Array.from(doc.querySelectorAll('text'))
  for (const el of nodes) {
    // tspan 归并：取首个 x/y 与整体文本
    const tspans = Array.from(el.querySelectorAll('tspan'))
    const content = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!content) {
      el.remove()
      continue
    }
    const anchor = tspans[0] ?? el
    const x = parseSvgLen(anchor.getAttribute('x') ?? el.getAttribute('x'), parseSvgLen(el.getAttribute('x'), 0))
    const y = parseSvgLen(anchor.getAttribute('y') ?? el.getAttribute('y'), parseSvgLen(el.getAttribute('y'), 0))
    const fontSize = parseSvgLen(
      anchor.getAttribute('font-size') ?? el.getAttribute('font-size'),
      parseSvgLen(el.getAttribute('font-size'), 16),
    )
    const styleStr = `${el.getAttribute('style') ?? ''};${anchor.getAttribute('style') ?? ''}`
    const fillMatch = /(?:^|;)\s*fill\s*:\s*([^;]+)/i.exec(styleStr)
    const fillAttr = anchor.getAttribute('fill') ?? el.getAttribute('fill') ?? ''
    const fill = (fillMatch?.[1] ?? fillAttr ?? '').trim() || '#22201E'
    const fwMatch = /(?:^|;)\s*font-weight\s*:\s*([^;]+)/i.exec(styleStr)
    const fsMatch = /(?:^|;)\s*font-style\s*:\s*([^;]+)/i.exec(styleStr)
    const fontWeight: 'normal' | 'bold' = /bold|[5-9]00/i.test(
      `${fwMatch?.[1] ?? ''} ${anchor.getAttribute('font-weight') ?? ''} ${el.getAttribute('font-weight') ?? ''}`,
    )
      ? 'bold'
      : 'normal'
    const fontStyle: 'normal' | 'italic' = /italic/i.test(
      `${fsMatch?.[1] ?? ''} ${anchor.getAttribute('font-style') ?? ''} ${el.getAttribute('font-style') ?? ''}`,
    )
      ? 'italic'
      : 'normal'
    const anchorAttr = anchor.getAttribute('text-anchor') ?? el.getAttribute('text-anchor') ?? ''
    const textAlign = anchorAttr === 'middle' ? 'center' : anchorAttr === 'end' ? 'right' : 'left'
    const fontFamily =
      el.getAttribute('font-family') ?? anchor.getAttribute('font-family') ?? undefined

    hits.push({
      el,
      text: content,
      x,
      y,
      fontSize,
      fill: /^#|rgb|hsl|[a-z]+$/i.test(fill) ? fill : '#22201E',
      fontWeight,
      fontStyle,
      textAlign,
      fontFamily,
    })
  }
  return { hits, width, height }
}

/**
 * SVG 导入：文字 → 可编辑文字元素；剩余图形栅格化为可编辑图层。
 * 返回结构化 slide（与 PPT 共用同一条 designFromSlide 组装链路）。
 */
export async function svgToSlide(file: File): Promise<ParsedSlide> {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('SVG 解析失败，请检查文件是否完整')

  const { hits, width, height } = collectSvgTexts(doc)

  // 移除文字后栅格化（避免文字出现两份）
  const svgEl = doc.documentElement
  const cleaned = new XMLSerializer().serializeToString(svgEl)
  const blob = new Blob([cleaned], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  let dataUrl: string
  try {
    const img = await loadImage(url)
    const w = img.naturalWidth || width
    const h = img.naturalHeight || height
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    ctx.drawImage(img, 0, 0)
    dataUrl = canvas.toDataURL('image/png')
  } catch (e) {
    throw new Error(`SVG 图形栅格化失败：${e instanceof Error ? e.message : String(e)}`)
  } finally {
    URL.revokeObjectURL(url)
  }

  // 坐标按 viewBox → 实际像素等比映射（无 viewBox 时 1:1）
  const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  const sx = vb && vb[2] > 0 ? width / vb[2] : 1
  const sy = vb && vb[3] > 0 ? height / vb[3] : 1
  const texts: ExtractedText[] = hits.map((h) => ({
    text: h.text,
    x: (h.x - (vb?.[0] ?? 0)) * sx,
    y: (h.y - (vb?.[1] ?? 0)) * sy - h.fontSize * 0.85, // 基线 → 顶部近似
    width: Math.max(h.fontSize * 0.6 * h.text.length, h.fontSize) * sx,
    height: h.fontSize * 1.4 * sy,
    fontSize: h.fontSize * sy,
    fill: h.fill,
    fontWeight: h.fontWeight,
    fontStyle: h.fontStyle,
    textAlign: h.textAlign,
    fontFamily: h.fontFamily,
  }))

  return {
    width,
    height,
    texts,
    images: [{ dataUrl, x: 0, y: 0, width, height, name: 'SVG 图形' }],
    shapes: [],
  }
}

export interface ImportedAsset {
  dataUrl: string
  width: number
  height: number
  format: ImportFormat
  name: string
  /** 结构化内容（PPT/PPTX/SVG）：文字可编辑、图片为独立图层 */
  slides?: ParsedSlide[]
}

export async function importFile(file: File): Promise<ImportedAsset> {
  const err = validateFile(file)
  if (err) throw new Error(err)
  const fmt = detectFormat(file)
  const name = file.name.replace(/\.[^.]+$/, '')

  if (fmt === 'pdf') {
    const { dataUrl, width, height } = await pdfToImage(file)
    return { dataUrl, width, height, format: 'pdf', name }
  }
  if (fmt === 'pptx' || fmt === 'ppt') {
    const buf = await file.arrayBuffer()
    let slides: ParsedSlide[]
    try {
      slides = fmt === 'pptx' ? parsePptx(buf) : parsePptBinary(buf)
    } catch (e) {
      throw new Error(`PPT 解析失败：${e instanceof Error ? e.message : String(e)}`)
    }
    const first = slides[0]
    const preview = first.images[0]?.dataUrl ?? first.backgroundImage ?? TRANSPARENT_PX
    return { dataUrl: preview, width: first.width, height: first.height, format: fmt, name, slides }
  }
  if (fmt === 'svg') {
    try {
      const slide = await svgToSlide(file)
      return {
        dataUrl: slide.images[0]?.dataUrl ?? TRANSPARENT_PX,
        width: slide.width,
        height: slide.height,
        format: 'svg',
        name,
        slides: [slide],
      }
    } catch {
      // 旧路径兜底：整体栅格化
      const { dataUrl, width, height } = await svgToImage(file)
      return { dataUrl, width, height, format: 'svg', name }
    }
  }
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  return {
    dataUrl,
    width: img.naturalWidth,
    height: img.naturalHeight,
    format: fmt,
    name,
  }
}

/** 1×1 透明 PNG（无预览图时的占位） */
const TRANSPARENT_PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const FORMAT_LABEL: Record<ImportFormat, string> = {
  png: 'PNG 图片',
  jpg: 'JPG 图片',
  webp: 'WebP 图片',
  gif: 'GIF 动图',
  svg: 'SVG 矢量图',
  pdf: 'PDF 文档',
  pptx: 'PPTX 演示',
  ppt: 'PPT 演示',
  unknown: '未知格式',
}

export function formatLabel(fmt: ImportFormat): string {
  return FORMAT_LABEL[fmt] ?? FORMAT_LABEL.unknown
}

/** 编辑能力说明：让用户清楚知道哪些部分可编辑 */
export function editabilityNote(fmt: ImportFormat): string {
  switch (fmt) {
    case 'pdf':
      return 'PDF 首页已作为高清可编辑图层导入：可自由移动、缩放、旋转、调透明度与圆角；PDF 原有内容整体作为一个图层，可叠加独立编辑文字与装饰。'
    case 'svg':
      return 'SVG 中的文字已提取为可独立编辑的文字元素（可改内容、字号、颜色、字体），图形部分栅格化为可编辑图层，可自由移动、缩放、旋转、调透明度。'
    case 'pptx':
    case 'ppt':
      return 'PPT 每页的文字已提取为可独立编辑的文字元素（可改内容、字号、颜色、加粗/斜体、对齐），图片作为可编辑图层导入，可自由移动、缩放、旋转、调透明度。'
    case 'png':
    case 'jpg':
    case 'webp':
    case 'gif':
      return '图片已作为可编辑图层导入：可自由移动、缩放、旋转、调透明度与圆角，也可删除或替换；文字与装饰可叠加独立编辑。'
    default:
      return '文件已导入为可编辑图层，可叠加独立编辑文字与装饰。'
  }
}

/** 把导入的图组装成一份可编辑设计（图片为独立可编辑图层，铺底） */
export function designFromAsset(
  asset: ImportedAsset,
  options: {
    category?: EventCategory
    style?: StyleTag
    orientation?: Orientation
    addSampleText?: boolean
  } = {},
): DesignDoc {
  // 结构化内容（PPT/PPTX/SVG）：文字 → 可编辑文字元素，图片 → 可编辑图层
  if (asset.slides?.length) {
    return designFromSlide(asset, asset.slides[0], options)
  }

  const ratio = asset.width / asset.height
  const orientation: Orientation = options.orientation ?? (ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square')

  // 等比 cover 铺满画布（与原背景 cover 语义一致），生成可编辑图片图层
  const { width: cw, height: ch } = sizeFor(orientation)
  const scale = Math.max(cw / asset.width, ch / asset.height)
  const w = asset.width * scale
  const h = asset.height * scale
  const imageEl: ImageElement = makeImage({
    src: asset.dataUrl,
    name: '导入图片',
    x: (cw - w) / 2,
    y: (ch - h) / 2,
    width: w,
    height: h,
  })

  const sampleTexts = options.addSampleText
    ? [
        makeText({
          text: '诚 邀 莅 临',
          name: '主标题',
          role: 'title',
          x: orientation === 'landscape' ? 200 : 90,
          y: orientation === 'landscape' ? 320 : 620,
          width: orientation === 'landscape' ? 1520 : 900,
          height: 130,
          fontFamily: FONTS.serif,
          fontSize: orientation === 'landscape' ? 78 : 92,
          fontWeight: 'bold',
          fill: '#FFFFFF',
          textAlign: 'center',
          shadow: { enabled: true, color: 'rgba(0,0,0,0.35)', blur: 16, offsetX: 0, offsetY: 6 },
        }),
        makeText({
          text: '2026年10月1日 · 敬备薄酌',
          name: '宴会日期',
          role: 'date',
          x: orientation === 'landscape' ? 200 : 90,
          y: orientation === 'landscape' ? 470 : 780,
          width: orientation === 'landscape' ? 1520 : 900,
          height: 70,
          fontFamily: FONTS.serif,
          fontSize: 36,
          fill: '#FFFFFF',
          textAlign: 'center',
          shadow: { enabled: true, color: 'rgba(0,0,0,0.3)', blur: 12, offsetX: 0, offsetY: 4 },
        }),
      ]
    : []

  return createDesign({
    name: asset.name || '导入的模板',
    category: options.category ?? 'other',
    style: options.style ?? 'modern',
    orientation,
    background: {
      type: 'color',
      color: '#FFFFFF',
      opacity: 1,
    },
    elements: [imageEl, ...sampleTexts],
    eventInfo: { eventName: '', eventType: options.category ?? 'other' } as never,
  })
}

/**
 * 结构化幻灯片（PPT/PPTX/SVG）→ 可编辑元素数组（装饰形状 + 图片 + 文字），
 * 等比 contain 映射到目标画布尺寸，整体居中。
 * 供 designFromSlide 与编辑器「上传模板」注入复用。
 */
export function elementsFromSlide(slide: ParsedSlide, targetW: number, targetH: number): (ImageElement | TextElement | ShapeElement)[] {
  const scale = Math.min(targetW / slide.width, targetH / slide.height)
  const ox = (targetW - slide.width * scale) / 2
  const oy = (targetH - slide.height * scale) / 2
  const mapX = (x: number) => ox + x * scale
  const mapY = (y: number) => oy + y * scale

  const shapeEls: ShapeElement[] = (slide.shapes ?? []).map((s: SlideShape, i: number) =>
    makeShape({
      shape: s.kind,
      name: s.name || `PPT 形状 ${i + 1}`,
      x: mapX(s.x),
      y: mapY(s.y),
      width: Math.max(2, s.width * scale),
      height: Math.max(2, s.height * scale),
      fill: s.fill,
      stroke: s.stroke ?? '',
      strokeWidth: s.strokeWidth ?? 0,
      rotation: s.rotation ?? 0,
    }),
  )

  const imageEls: ImageElement[] = slide.images.map((img: SlideImage, i: number) =>
    makeImage({
      src: img.dataUrl,
      name: img.name || `PPT 图片 ${i + 1}`,
      x: mapX(img.x),
      y: mapY(img.y),
      width: Math.max(1, img.width * scale),
      height: Math.max(1, img.height * scale),
      rotation: img.rotation ?? 0,
    }),
  )

  const textEls: TextElement[] = slide.texts.map((t: ExtractedText, i: number) =>
    makeText({
      text: t.text,
      name: `PPT 文字 ${i + 1}`,
      x: mapX(t.x),
      y: mapY(t.y),
      width: Math.max(40, t.width * scale),
      height: Math.max(24, t.height * scale),
      fontSize: Math.max(12, t.fontSize * scale),
      fontFamily: t.fontFamily ?? FONTS.serif,
      fontWeight: t.fontWeight,
      fontStyle: t.fontStyle,
      fill: t.fill,
      textAlign: t.textAlign,
      rotation: t.rotation ?? 0,
    }),
  )

  return [...shapeEls, ...imageEls, ...textEls]
}

/** 幻灯片背景 → BackgroundSpec（图 > 渐变 > 纯色） */
export function backgroundFromSlide(slide: ParsedSlide): BackgroundSpec {
  if (slide.backgroundImage) {
    return { type: 'image', imageSrc: slide.backgroundImage, imageFit: 'cover', opacity: 1 }
  }
  if (slide.backgroundGradient) {
    return { type: 'gradient', gradient: slide.backgroundGradient, opacity: 1 }
  }
  return { type: 'color', color: slide.background ?? '#FFFFFF', opacity: 1 }
}

/** 结构化幻灯片（PPT/PPTX/SVG）→ 可编辑设计：文字与图片均映射为独立元素 */
export function designFromSlide(
  asset: ImportedAsset,
  slide: ParsedSlide,
  options: {
    category?: EventCategory
    style?: StyleTag
    orientation?: Orientation
  } = {},
): DesignDoc {
  const ratio = slide.width / slide.height
  const orientation: Orientation = options.orientation ?? (ratio > 1.15 ? 'landscape' : ratio < 0.87 ? 'portrait' : 'square')
  const { width: cw, height: ch } = sizeFor(orientation)
  const elements = elementsFromSlide(slide, cw, ch)

  return createDesign({
    name: asset.name || '导入的模板',
    category: options.category ?? 'other',
    style: options.style ?? 'modern',
    orientation,
    background: backgroundFromSlide(slide),
    elements,
    eventInfo: { eventName: '', eventType: options.category ?? 'other' } as never,
  })
}

/**
 * 旧文档迁移：把「锁死的背景图」转为可编辑图片图层（铺底），
 * 让此前导入的模板也能选中/移动/缩放图片本身。
 */
export async function unlockBackgroundImage(doc: DesignDoc): Promise<DesignDoc> {
  const bg = doc.canvas.background
  if (bg.type !== 'image' || !bg.imageSrc) return doc

  const { width: cw, height: ch } = doc.canvas
  let x = 0
  let y = 0
  let w = cw
  let h = ch
  try {
    const img = await loadImage(bg.imageSrc)
    const natW = img.naturalWidth || cw
    const natH = img.naturalHeight || ch
    const fit = bg.imageFit || 'cover'
    if (fit !== 'stretch') {
      const ratio = fit === 'contain' ? Math.min(cw / natW, ch / natH) : Math.max(cw / natW, ch / natH)
      w = natW * ratio
      h = natH * ratio
      x = (cw - w) / 2
      y = (ch - h) / 2
    }
  } catch {
    /* 图片解析失败时保底铺满画布 */
  }

  const el = makeImage({
    src: bg.imageSrc,
    name: '背景图片',
    x,
    y,
    width: w,
    height: h,
    opacity: bg.opacity ?? 1,
  })
  return {
    ...doc,
    canvas: { ...doc.canvas, background: { type: 'color', color: '#FFFFFF', opacity: 1 } },
    elements: [el, ...doc.elements],
  }
}

/* ---------------- URL 抓取（直连 + CORS 中转回退） ---------------- */

const PROXY_BUILDERS: ((url: string) => string)[] = [
  (u) => u,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
]

async function fetchWithFallback(url: string): Promise<Response> {
  let lastError: unknown = null
  for (const build of PROXY_BUILDERS) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      try {
        const res = await fetch(build(url), { signal: ctrl.signal, mode: 'cors', redirect: 'follow' })
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status}`)
          continue
        }
        return res
      } finally {
        clearTimeout(timer)
      }
    } catch (e) {
      lastError = e
    }
  }
  const raw = lastError instanceof Error ? lastError.message : String(lastError)
  // 原始浏览器错误（如 "Failed to fetch"）不直接暴露给用户，映射为友好描述
  const friendly = /failed to fetch|networkerror|load failed/i.test(raw)
    ? '网络受限或跨域被拒'
    : /abort|timeout/i.test(raw)
      ? '请求超时'
      : raw.startsWith('HTTP ')
        ? raw
        : '未知网络错误'
  throw new Error(
    `无法获取该链接（${friendly}）。目标站点可能不允许跨域读取，请先下载文件后使用「上传本地文件」导入。`,
  )
}

/** 魔数嗅探文件类型（不依赖 content-type 与扩展名） */
export function sniffFormatFromBytes(bytes: Uint8Array): ImportFormat | 'html' | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'gif'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return 'webp'
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf'

  // PPTX：ZIP 头（PK\x03\x04）+ 归档内含 ppt/ 路径
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const probe = new TextDecoder('latin1').decode(bytes.slice(0, 8192))
    return probe.includes('ppt/') ? 'pptx' : null
  }
  // 旧版 PPT：OLE 复合文档头（D0 CF 11 E0 A1 B1 1A E1）
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  )
    return 'ppt'

  // 文本类：SVG / HTML
  const head = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 400))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg'
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.startsWith('<head')) return 'html'
  return null
}

const EXT_BY_FORMAT: Record<ImportFormat, string> = {
  png: '.png',
  jpg: '.jpg',
  webp: '.webp',
  gif: '.gif',
  svg: '.svg',
  pdf: '.pdf',
  pptx: '.pptx',
  ppt: '.ppt',
  unknown: '',
}

const MIME_BY_FORMAT: Record<ImportFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  unknown: 'application/octet-stream',
}

function formatFromContentType(type: string): ImportFormat | null {
  const t = type.toLowerCase()
  if (t.includes('presentationml')) return 'pptx'
  if (t.includes('ms-powerpoint')) return 'ppt'
  if (t.includes('pdf')) return 'pdf'
  if (t.includes('svg')) return 'svg'
  if (t.includes('png')) return 'png'
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg'
  if (t.includes('webp')) return 'webp'
  if (t.includes('gif')) return 'gif'
  return null
}

async function blobToFile(blob: Blob, baseName: string, fmt: ImportFormat): Promise<File> {
  const name = (baseName || 'imported-template').replace(/\.[^.]+$/, '') + (EXT_BY_FORMAT[fmt] || '')
  return new File([blob], name, { type: MIME_BY_FORMAT[fmt] })
}

/** 从 URL 导入模板文件（图片/SVG/PDF/PPT/PPTX 直链；网页链接自动提取 og:image 预览图） */
export async function importFromUrl(url: string): Promise<ImportedAsset> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('链接格式不正确，请输入完整的 http(s) 地址')
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('仅支持 http / https 链接')
  }

  const res = await fetchWithFallback(parsed.href)
  const blob = await res.blob()
  const head = new Uint8Array(await blob.slice(0, 8192).arrayBuffer())
  const sniffed = sniffFormatFromBytes(head)
  const contentType = (res.headers.get('content-type') || blob.type || '').toLowerCase()
  const pathName = decodeURIComponent(parsed.pathname.split('/').pop() || 'imported-template')

  // 网页链接（如 Canva 公开设计页 / 任意分享页）：提取 og:image 预览图后导入
  if (sniffed === 'html' || (!sniffed && contentType.includes('text/html'))) {
    const html = await blob.text()
    const og =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html)?.[1] ??
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1]
    if (!og) {
      throw new Error(
        '这是一个网页链接，但没有找到可导入的预览图（og:image）。建议在来源站「下载/导出」图片或 PDF 后，使用本地上传导入。',
      )
    }
    const abs = new URL(og, parsed.href).href
    const imgRes = await fetchWithFallback(abs)
    const imgBlob = await imgRes.blob()
    const imgHead = new Uint8Array(await imgBlob.slice(0, 8192).arrayBuffer())
    const imgSniffed = sniffFormatFromBytes(imgHead)
    const imgFmt: ImportFormat =
      imgSniffed && imgSniffed !== 'html' ? imgSniffed : formatFromContentType(imgRes.headers.get('content-type') || '') ?? 'unknown'
    if (imgFmt === 'unknown') {
      throw new Error('页面预览图不是可识别的图片格式，请改用本地上传导入。')
    }
    const file = await blobToFile(imgBlob, `${pathName}-preview`, imgFmt)
    return importFile(file)
  }

  const fmt: ImportFormat = sniffed ?? formatFromContentType(contentType) ?? detectFormat(new File([blob], pathName))
  if (fmt === 'unknown') {
    throw new Error('无法识别链接指向的文件类型，请确认是 PNG / JPG / GIF / SVG / PDF / PPT / PPTX 直链，或含预览图的网页链接。')
  }
  const file = await blobToFile(blob, pathName, fmt)
  return importFile(file)
}

export function newAssetId(): string {
  return uid('tpl')
}
