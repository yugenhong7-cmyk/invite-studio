import { unzipSync } from 'fflate'

/* ============================================================
 * PPT / PPTX 导入解析
 *  - PPTX（ZIP + DrawingML）：提取每页的文字（可编辑）与图片（可编辑图层），
 *    含位置/字号/颜色/对齐/加粗/斜体，EMUs 按 96DPI 换算为 px
 *  - 旧版 PPT（OLE 复合文档）：解析 PowerPoint Document 流的
 *    TextCharsAtom / TextBytesAtom 记录，尽力提取文字内容（版式需自行调整）
 * ============================================================ */

/** 源文件坐标系（px，96DPI）中的一段可编辑文字 */
export interface ExtractedText {
  text: string
  x: number
  y: number
  width: number
  height: number
  /** px */
  fontSize: number
  fill: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  fontFamily?: string
  /** 旋转（度） */
  rotation?: number
}

export interface SlideImage {
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  name?: string
  rotation?: number
}

/** 实心/渐变填充的装饰形状（无文字的色块、金带、边框等） */
export interface SlideShape {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  /** 近似几何形状 */
  kind: 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'line' | 'ring' | 'star' | 'heart'
  fill: string
  /** 描边（线条/边框装饰） */
  stroke?: string
  strokeWidth?: number
  name?: string
}

/** 渐变背景（线性/径向） */
export interface SlideGradient {
  type: 'linear' | 'radial'
  /** 线性角度（度），0 = 从左到右 */
  angle: number
  stops: { offset: number; color: string }[]
}

/** 一页幻灯片/一版导入内容（源像素坐标系） */
export interface ParsedSlide {
  width: number
  height: number
  /** 背景纯色（含主题色解析） */
  background?: string
  /** 背景图（p:bg blipFill 或版式整幅底图） */
  backgroundImage?: string
  /** 渐变背景 */
  backgroundGradient?: SlideGradient
  texts: ExtractedText[]
  images: SlideImage[]
  shapes: SlideShape[]
}

const EMU_PER_PX = 9525 // 914400 EMU/英寸 ÷ 96 px/英寸

function emuToPx(v: number): number {
  return Math.round((v / EMU_PER_PX) * 100) / 100
}

/** OOXML DrawingML 命名空间 */
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function q(doc: Document | Element, ns: string, tag: string): Element[] {
  return Array.from(doc.getElementsByTagNameNS(ns, tag))
}

function firstEl(root: Element | Document | null, ns: string, tag: string): Element | null {
  return root?.getElementsByTagNameNS(ns, tag)[0] ?? null
}

function attr(el: Element | null, name: string): string {
  return el?.getAttribute(name) ?? ''
}

function parseXml(text: string): Document | null {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (firstEl(doc, '*', 'parsererror')) return null
  return doc
}

/** bytes → dataURL（大文件分块 btoa） */
function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

function mimeFromName(name: string): string {
  const n = name.toLowerCase()
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
  if (n.endsWith('.gif')) return 'image/gif'
  if (n.endsWith('.webp')) return 'image/webp'
  if (n.endsWith('.bmp')) return 'image/bmp'
  if (n.endsWith('.svg')) return 'image/svg+xml'
  if (n.endsWith('.tiff') || n.endsWith('.tif')) return 'image/tiff'
  return 'image/png'
}

/* ---------------- PPTX（ZIP + XML） ---------------- */

interface Xfrm {
  x: number
  y: number
  cx: number
  cy: number
  /** 旋转（度） */
  rot: number
}

function xfrmFrom(el: Element | null): Xfrm | null {
  if (!el) return null
  const off = firstEl(el, NS_A, 'off')
  const ext = firstEl(el, NS_A, 'ext')
  if (!off || !ext) return null
  return {
    x: emuToPx(Number(attr(off, 'x')) || 0),
    y: emuToPx(Number(attr(off, 'y')) || 0),
    cx: emuToPx(Number(attr(ext, 'cx')) || 0),
    cy: emuToPx(Number(attr(ext, 'cy')) || 0),
    rot: (Number(attr(el, 'rot')) || 0) / 60000,
  }
}

function readXfrm(spPr: Element | null): Xfrm | null {
  if (!spPr) return null
  return xfrmFrom(firstEl(spPr, NS_A, 'xfrm'))
}

/** 组合组的坐标映射（chOff/chExt → off/ext） */
function groupMapper(g: Element): ((p: Xfrm) => Xfrm) | null {
  const grpSpPr = firstEl(g, NS_P, 'grpSpPr') ?? firstEl(g, NS_A, 'xfrm')?.parentElement ?? null
  const xfrm = grpSpPr ? firstEl(grpSpPr, NS_A, 'xfrm') : null
  if (!xfrm) return null
  const off = firstEl(xfrm, NS_A, 'off')
  const ext = firstEl(xfrm, NS_A, 'ext')
  const chOff = firstEl(xfrm, NS_A, 'chOff')
  const chExt = firstEl(xfrm, NS_A, 'chExt')
  if (!off || !ext || !chOff || !chExt) return null
  const o = { x: Number(attr(off, 'x')), y: Number(attr(off, 'y')) }
  const e = { cx: Number(attr(ext, 'cx')), cy: Number(attr(ext, 'cy')) }
  const co = { x: Number(attr(chOff, 'x')), y: Number(attr(chOff, 'y')) }
  const ce = { cx: Number(attr(chExt, 'cx')) || 1, cy: Number(attr(chExt, 'cy')) || 1 }
  return (p: Xfrm) => ({
    x: emuToPx(o.x + ((p.x * EMU_PER_PX - co.x) * e.cx) / ce.cx),
    y: emuToPx(o.y + ((p.y * EMU_PER_PX - co.y) * e.cy) / ce.cy),
    cx: emuToPx((p.cx * EMU_PER_PX * e.cx) / ce.cx),
    cy: emuToPx((p.cy * EMU_PER_PX * e.cy) / ce.cy),
    rot: p.rot,
  })
}

/* ---------------- 主题色 / 填充解析 ---------------- */

type ThemeColors = Map<string, string>

const THEME_COLOR_DEFAULTS: Record<string, string> = {
  dk1: '#000000',
  lt1: '#FFFFFF',
  dk2: '#44546A',
  lt2: '#E7E6E6',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  hlink: '#0563C1',
  folHlink: '#954F72',
}

/** 色彩映射别名（slideMaster/clrMap 常见语义位） */
const THEME_ALIAS: Record<string, string> = {
  bg1: 'lt1',
  tx1: 'dk1',
  bg2: 'lt2',
  tx2: 'dk2',
  phClr: 'lt1',
}

function resolveThemeColor(val: string, theme: ThemeColors): string {
  const key = THEME_ALIAS[val] ?? val
  return theme.get(key) ?? THEME_COLOR_DEFAULTS[key] ?? '#22201E'
}

/** 解析 ppt/theme/themeN.xml 的 a:clrScheme（schemeClr → hex 的映射表） */
function parseThemeColors(xmlText: string, theme: ThemeColors): void {
  const doc = parseXml(xmlText)
  if (!doc) return
  const scheme = firstEl(doc, NS_A, 'clrScheme')
  if (!scheme) return
  for (const slot of Array.from(scheme.children)) {
    const name = slot.localName
    if (!name || theme.has(name)) continue
    const srgb = firstEl(slot, NS_A, 'srgbClr')
    const sys = firstEl(slot, NS_A, 'sysClr')
    const val = attr(srgb, 'val') || attr(sys, 'lastClr')
    if (val) theme.set(name, `#${val.replace(/^#/, '')}`)
  }
}

/** 颜色容器（solidFill/gs/fillRef/ln 等）→ hex：srgbClr / schemeClr / sysClr */
function colorFromContainer(el: Element | null, theme: ThemeColors): string | null {
  if (!el) return null
  const sval = attr(firstEl(el, NS_A, 'srgbClr'), 'val')
  if (sval) return `#${sval.replace(/^#/, '')}`
  const cval = attr(firstEl(el, NS_A, 'schemeClr'), 'val')
  if (cval) return resolveThemeColor(cval, theme)
  const last = attr(firstEl(el, NS_A, 'sysClr'), 'lastClr')
  if (last) return `#${last.replace(/^#/, '')}`
  return null
}

interface FillInfo {
  color?: string
  gradient?: SlideGradient
  image?: string
}

function gradientFromFill(gradFill: Element, theme: ThemeColors): SlideGradient {
  const stops: { offset: number; color: string }[] = []
  const gsLst = firstEl(gradFill, NS_A, 'gsLst')
  if (gsLst) {
    for (const gs of Array.from(gsLst.children)) {
      if (gs.localName !== 'gs') continue
      const pos = Number(attr(gs, 'pos')) || 0
      stops.push({
        offset: Math.min(1, Math.max(0, pos / 100000)),
        color: colorFromContainer(gs, theme) ?? '#FFFFFF',
      })
    }
  }
  if (!stops.length) stops.push({ offset: 0, color: '#FFFFFF' }, { offset: 1, color: '#E0E0E0' })
  const lin = firstEl(gradFill, NS_A, 'lin')
  if (lin) {
    const ang = Number(attr(lin, 'ang')) || 0
    return { type: 'linear', angle: Math.round((ang / 60000) * 10) / 10, stops }
  }
  return { type: 'radial', angle: 0, stops }
}

function blipToDataUrl(
  container: Element,
  rels: Map<string, string>,
  media: Map<string, Uint8Array>,
): string | null {
  const blip = firstEl(container, NS_A, 'blip')
  if (!blip) return null
  const rid =
    blip.getAttributeNS(NS_R, 'embed') ||
    attr(blip, 'embed') ||
    blip.getAttributeNS(NS_R, 'link') ||
    attr(blip, 'link') ||
    ''
  const mediaPath = resolveMediaPath(rels.get(rid) || '')
  const bytes = mediaPath ? media.get(mediaPath) : undefined
  return bytes ? bytesToDataUrl(bytes, mimeFromName(mediaPath!)) : null
}

/** 解析 spPr/bgPr 的填充（solidFill / gradFill / blipFill / noFill） */
function parseFillOf(
  container: Element | null,
  theme: ThemeColors,
  rels: Map<string, string>,
  media: Map<string, Uint8Array>,
): FillInfo | null {
  if (!container) return null
  for (const ch of Array.from(container.children)) {
    const ln = ch.localName
    if (ln === 'noFill') return null
    if (ln === 'solidFill') {
      const c = colorFromContainer(ch, theme)
      return c ? { color: c } : null
    }
    if (ln === 'gradFill') return { gradient: gradientFromFill(ch, theme) }
    if (ln === 'blipFill') {
      const img = blipToDataUrl(ch, rels, media)
      return img ? { image: img } : null
    }
  }
  return null
}

/** p:bg → 背景色 / 背景图 / 渐变背景（bgPr 填充优先，bgRef 主题色兜底） */
function parseBgOf(
  doc: Document | null,
  rels: Map<string, string>,
  media: Map<string, Uint8Array>,
  theme: ThemeColors,
): Pick<ParsedSlide, 'background' | 'backgroundImage' | 'backgroundGradient'> {
  const out: Pick<ParsedSlide, 'background' | 'backgroundImage' | 'backgroundGradient'> = {}
  const bg = firstEl(doc, NS_P, 'bg')
  if (!bg) return out
  const bgPr = firstEl(bg, NS_P, 'bgPr')
  if (bgPr) {
    const f = parseFillOf(bgPr, theme, rels, media)
    if (f?.image) out.backgroundImage = f.image
    else if (f?.gradient) out.backgroundGradient = f.gradient
    else if (f?.color) out.background = f.color
    return out
  }
  const c = colorFromContainer(firstEl(bg, NS_P, 'bgRef'), theme)
  if (c) out.background = c
  return out
}

/** spPr 的 prstGeom → 近似几何形状 */
function geomKind(spPr: Element | null): SlideShape['kind'] {
  const prst = attr(firstEl(spPr, NS_A, 'prstGeom'), 'prst').toLowerCase()
  if (/ellipse|oval/.test(prst)) return 'ellipse'
  if (/triangle/.test(prst)) return 'triangle'
  if (/diamond/.test(prst)) return 'diamond'
  if (/line|connector/.test(prst)) return 'line'
  if (/donut|ring/.test(prst)) return 'ring'
  if (/star/.test(prst)) return 'star'
  if (/heart/.test(prst)) return 'heart'
  return 'rect'
}

/** p:style/a:fillRef 主题填充（无显式填充的装饰形状回退） */
function styleFillColor(sp: Element, theme: ThemeColors): string | null {
  const fillRef = firstEl(firstEl(sp, NS_P, 'style'), NS_A, 'fillRef')
  if (!fillRef || !Number(attr(fillRef, 'idx'))) return null
  return colorFromContainer(fillRef, theme)
}

/** 关系目标关键词匹配（如 slideLayout / slideMaster） */
function findRelByKeyword(rels: Map<string, string>, keyword: string): string | null {
  for (const t of rels.values()) if (t.includes(keyword)) return t
  return null
}

/** 部件相对路径解析：'ppt/slides/slide1.xml' + '../slideLayouts/slideLayout1.xml' */
function resolvePartPath(fromPart: string, target: string): string {
  const base = fromPart.split('/').slice(0, -1)
  for (const seg of target.replace(/^\.\//, '').split('/')) {
    if (seg === '..') base.pop()
    else if (seg && seg !== '.') base.push(seg)
  }
  return base.join('/')
}

/** 部件 → 其 .rels 路径 */
function relsPathFor(part: string): string {
  const i = part.lastIndexOf('/')
  return `${part.slice(0, i + 1)}_rels/${part.slice(i + 1)}.rels`
}

interface RunStyle {
  fontSize: number
  fill: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  fontFamily?: string
}

const DEFAULT_RUN: RunStyle = {
  fontSize: 28,
  fill: '#22201E',
  fontWeight: 'normal',
  fontStyle: 'normal',
}

function readRunStyle(rPr: Element | null, theme: ThemeColors): RunStyle {
  const st = { ...DEFAULT_RUN }
  if (!rPr) return st
  const sz = Number(attr(rPr, 'sz'))
  if (sz > 0) st.fontSize = Math.round((sz / 100) * (4 / 3) * 10) / 10 // pt → px
  if (attr(rPr, 'b') === '1') st.fontWeight = 'bold'
  if (attr(rPr, 'i') === '1') st.fontStyle = 'italic'
  const c = colorFromContainer(firstEl(rPr, NS_A, 'solidFill'), theme)
  if (c) st.fill = c
  const latin = firstEl(rPr, NS_A, 'latin')
  const face = attr(latin, 'typeface')
  if (face) st.fontFamily = face
  return st
}

function extractShapeText(sp: Element, theme: ThemeColors): { text: string; style: RunStyle; align: 'left' | 'center' | 'right' } | null {
  const txBody = firstEl(sp, NS_P, 'txBody')
  if (!txBody) return null
  const paras = q(txBody, NS_A, 'p')
  const lines: string[] = []
  let style = DEFAULT_RUN
  let align: 'left' | 'center' | 'right' = 'left'
  for (const p of paras) {
    const pPr = firstEl(p, NS_A, 'pPr')
    const algn = attr(pPr, 'algn')
    if (algn === 'ctr') align = 'center'
    else if (algn === 'r') align = 'right'
    else if (algn === 'l' || algn === 'just') align = 'left'
    const runs = q(p, NS_A, 'r')
    let line = ''
    for (const r of runs) {
      const t = firstEl(r, NS_A, 't')
      line += t?.textContent ?? ''
      if (line && style === DEFAULT_RUN) style = readRunStyle(firstEl(r, NS_A, 'rPr'), theme)
    }
    // 无 run 的段落保留空行
    if (!runs.length) line = firstEl(p, NS_A, 'endParaRPr') ? '' : ''
    lines.push(line)
    if (runs.length && style === DEFAULT_RUN) {
      const fld = firstEl(p, NS_A, 'fld')
      if (fld) style = readRunStyle(firstEl(fld, NS_A, 'rPr'), theme)
    }
  }
  const text = lines.join('\n').replace(/\s+$/, '')
  if (!text.trim()) return null
  return { text, style, align }
}

/** walkSlideShapes 选项：slide 提取文字；layout/master 只取装饰（避免占位符提示语） */
interface WalkOpts {
  theme: ThemeColors
  extractText: boolean
}

function shapeName(sp: Element): string {
  return attr(firstEl(sp, NS_P, 'cNvPr'), 'name') || ''
}

function walkSlideShapes(
  node: Element,
  map: ((p: Xfrm) => Xfrm) | null,
  rels: Map<string, string>,
  media: Map<string, Uint8Array>,
  out: ParsedSlide,
  opts: WalkOpts,
): void {
  for (const child of Array.from(node.children)) {
    const local = child.localName
    if (local === 'AlternateContent') {
      // PowerPoint 常把 p:pic/p:sp 包在 mc:AlternateContent/mc:Choice 中
      const choices = Array.from(child.children).filter((c) => c.localName === 'Choice')
      const fallbacks = Array.from(child.children).filter((c) => c.localName === 'Fallback')
      for (const tgt of choices.length ? choices : fallbacks) {
        walkSlideShapes(tgt, map, rels, media, out, opts)
      }
    } else if (local === 'sp' || local === 'cxnSp') {
      const spPr = firstEl(child, NS_P, 'spPr')
      const xf = readXfrm(spPr)
      const mapped = xf ? (map ? map(xf) : xf) : { x: 40, y: 40, cx: out.width - 80, cy: 120, rot: 0 }
      const t = opts.extractText ? extractShapeText(child, opts.theme) : null

      const fill = parseFillOf(spPr, opts.theme, rels, media)
      const explicitFill = !!(fill?.color || fill?.gradient)
      let fillHex = fill?.color ?? fill?.gradient?.stops[0]?.color ?? null
      if (!fillHex && !t) fillHex = styleFillColor(child, opts.theme)

      const ln = firstEl(spPr, NS_A, 'ln')
      const strokeColor = colorFromContainer(ln, opts.theme)
      const strokeW = ln ? emuToPx(Number(attr(ln, 'w')) || 0) : 0

      if (fill?.image) {
        // 图片填充形状 → 可编辑图层
        out.images.push({
          dataUrl: fill.image,
          x: mapped.x,
          y: mapped.y,
          width: mapped.cx,
          height: mapped.cy,
          name: shapeName(child) || 'PPT 图片',
          rotation: mapped.rot || undefined,
        })
      } else {
        const isLine = local === 'cxnSp' || geomKind(spPr) === 'line'
        const decor = !t && (!!fillHex || !!strokeColor)
        const textChip = !!t && explicitFill
        if (decor || textChip) {
          out.shapes.push({
            x: mapped.x,
            y: mapped.y,
            width: mapped.cx,
            height: mapped.cy,
            rotation: mapped.rot || undefined,
            kind: isLine ? 'line' : geomKind(spPr),
            fill: fillHex ?? 'rgba(0,0,0,0)',
            stroke: strokeColor && strokeW > 0 ? strokeColor : undefined,
            strokeWidth: strokeColor && strokeW > 0 ? strokeW : undefined,
            name: shapeName(child) || undefined,
          })
        }
      }

      if (t) {
        // 文字基线修正：ppt 的 y 是文本框顶部
        out.texts.push({
          text: t.text,
          x: mapped.x,
          y: mapped.y,
          width: mapped.cx || out.width - mapped.x * 2,
          height: mapped.cy || t.style.fontSize * 1.6,
          fontSize: t.style.fontSize,
          fill: t.style.fill,
          fontWeight: t.style.fontWeight,
          fontStyle: t.style.fontStyle,
          textAlign: t.align,
          fontFamily: t.style.fontFamily,
          rotation: mapped.rot || undefined,
        })
      }
    } else if (local === 'pic') {
      const spPr = firstEl(child, NS_P, 'spPr')
      const xf = readXfrm(spPr)
      const mapped = xf ? (map ? map(xf) : xf) : { x: 0, y: 0, cx: out.width, cy: out.height, rot: 0 }
      const dataUrl = blipToDataUrl(child, rels, media)
      if (dataUrl) {
        // 整幅底图（版式/母版铺满）→ 背景图（背景槽空闲时）
        const bleed =
          mapped.cx >= out.width * 0.85 &&
          mapped.cy >= out.height * 0.85 &&
          !out.backgroundImage &&
          !out.backgroundGradient &&
          !out.background
        if (bleed) {
          out.backgroundImage = dataUrl
        } else {
          out.images.push({
            dataUrl,
            x: mapped.x,
            y: mapped.y,
            width: mapped.cx,
            height: mapped.cy,
            name: shapeName(child) || 'PPT 图片',
            rotation: mapped.rot || undefined,
          })
        }
      }
    } else if (local === 'grpSp') {
      const inner = groupMapper(child)
      walkSlideShapes(child, inner ?? map, rels, media, out, opts)
    } else if (local === 'graphicFrame') {
      // 表格/图表：尽力抽取全部文字合并为一个文本块
      const xf = xfrmFrom(firstEl(child, NS_P, 'xfrm'))
      const mapped = xf ? (map ? map(xf) : xf) : { x: 40, y: 40, cx: out.width - 80, cy: 200, rot: 0 }
      const ts = q(child, NS_A, 't')
      const text = ts
        .map((t) => t.textContent ?? '')
        .join(' ')
        .trim()
      if (text && opts.extractText) {
        out.texts.push({
          text,
          x: mapped.x,
          y: mapped.y,
          width: mapped.cx,
          height: mapped.cy,
          fontSize: 24,
          fill: '#22201E',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
        })
      }
    }
  }
}

function resolveMediaPath(target: string): string {
  if (!target) return ''
  let t = target.replace(/^\.\//, '')
  // rels 里通常为 ../media/image1.png
  t = t.replace(/^\.\.\//, '')
  if (t.startsWith('ppt/')) return t
  return `ppt/${t}`.replace('ppt/ppt/', 'ppt/')
}

function parseRels(xmlText: string): Map<string, string> {
  const map = new Map<string, string>()
  const doc = parseXml(xmlText)
  if (!doc) return map
  for (const rel of Array.from(doc.getElementsByTagNameNS('*', 'Relationship'))) {
    const id = rel.getAttribute('Id') || ''
    const target = rel.getAttribute('Target') || ''
    if (id) map.set(id, target)
  }
  return map
}

/** 解析 PPTX 为多页幻灯片（文字与图片均带坐标，含背景与装饰形状） */
export function parsePptx(buf: ArrayBuffer): ParsedSlide[] {
  const files = unzipSync(new Uint8Array(buf))
  const get = (p: string): string | null => {
    const u8 = files[p]
    return u8 ? new TextDecoder('utf-8').decode(u8) : null
  }

  // 媒体库
  const media = new Map<string, Uint8Array>()
  for (const [name, u8] of Object.entries(files)) {
    if (name.startsWith('ppt/media/')) media.set(name, u8 as Uint8Array)
  }

  // 主题色（schemeClr → hex）
  const theme: ThemeColors = new Map()
  for (const name of Object.keys(files)) {
    if (/^ppt\/theme\/theme\d+\.xml$/.test(name)) parseThemeColors(get(name) ?? '', theme)
  }

  // 幻灯片尺寸
  let slideW = 1280
  let slideH = 720
  const pres = get('ppt/presentation.xml')
  if (pres) {
    const doc = parseXml(pres)
    const sldSz = doc ? firstEl(doc, NS_P, 'sldSz') : null
    const cx = Number(attr(sldSz, 'cx'))
    const cy = Number(attr(sldSz, 'cy'))
    if (cx > 0 && cy > 0) {
      slideW = emuToPx(cx)
      slideH = emuToPx(cy)
    }
  }

  // 页序：ppt/slides/slideN.xml 按 N 升序
  const slideNames = Object.keys(files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(/slide(\d+)\.xml/.exec(a)?.[1] ?? 0)
      const nb = Number(/slide(\d+)\.xml/.exec(b)?.[1] ?? 0)
      return na - nb
    })

  // 部件缓存（layout/master 被多页共用）
  const docCache = new Map<string, Document | null>()
  const relsCache = new Map<string, Map<string, string>>()
  const docOf = (part: string): Document | null => {
    if (!part) return null
    if (!docCache.has(part)) docCache.set(part, parseXml(get(part) ?? ''))
    return docCache.get(part) ?? null
  }
  const relsOf = (part: string): Map<string, string> => {
    if (!part) return new Map()
    if (!relsCache.has(part)) relsCache.set(part, parseRels(get(relsPathFor(part)) ?? ''))
    return relsCache.get(part)!
  }

  const slides: ParsedSlide[] = []
  for (const name of slideNames) {
    const doc = docOf(name)
    if (!doc) continue

    const slide: ParsedSlide = { width: slideW, height: slideH, texts: [], images: [], shapes: [] }
    const rels = relsOf(name)

    // 版式 / 母版继承链
    const layoutTarget = findRelByKeyword(rels, 'slideLayout')
    const layoutPath = layoutTarget ? resolvePartPath(name, layoutTarget) : ''
    const layoutDoc = docOf(layoutPath)
    const layoutRels = relsOf(layoutPath)
    const masterTarget = findRelByKeyword(layoutRels, 'slideMaster')
    const masterPath = masterTarget ? resolvePartPath(layoutPath, masterTarget) : ''
    const masterDoc = docOf(masterPath)
    const masterRels = relsOf(masterPath)

    // 背景继承：slide p:bg → layout p:bg → master p:bg（首个命中的整槽胜出）
    const bgSlide = parseBgOf(doc, rels, media, theme)
    const bgLayout = parseBgOf(layoutDoc, layoutRels, media, theme)
    const bgMaster = parseBgOf(masterDoc, masterRels, media, theme)
    const hasBg = (b: ReturnType<typeof parseBgOf>) =>
      !!(b.background || b.backgroundImage || b.backgroundGradient)
    const bg = hasBg(bgSlide) ? bgSlide : hasBg(bgLayout) ? bgLayout : bgMaster
    if (bg.background) slide.background = bg.background
    if (bg.backgroundImage) slide.backgroundImage = bg.backgroundImage
    if (bg.backgroundGradient) slide.backgroundGradient = bg.backgroundGradient

    // 装饰渲染层级：master spTree → layout spTree → slide spTree（从低到高）
    const decorOpts: WalkOpts = { theme, extractText: false }
    const slideOpts: WalkOpts = { theme, extractText: true }
    const masterTree = firstEl(masterDoc, NS_P, 'spTree')
    if (masterTree) walkSlideShapes(masterTree, null, masterRels, media, slide, decorOpts)
    const layoutTree = firstEl(layoutDoc, NS_P, 'spTree')
    if (layoutTree) walkSlideShapes(layoutTree, null, layoutRels, media, slide, decorOpts)
    const spTree = firstEl(doc, NS_P, 'spTree')
    if (spTree) walkSlideShapes(spTree, null, rels, media, slide, slideOpts)

    slides.push(slide)
  }

  if (!slides.length) {
    throw new Error('PPTX 中未找到幻灯片内容（ppt/slides/slide*.xml）')
  }
  return slides
}

/* ---------------- 旧版 PPT（OLE 复合文档 + 记录扫描） ---------------- */

const ENDOFCHAIN = 0xfffffffe
const FREESECT = 0xffffffff

function decodeUtf16le(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    s += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8))
  }
  return s
}

function decodePptAnsiText(bytes: Uint8Array): string {
  // TextBytesAtom：单字节字符，0x0B/0x00 视为换行
  let s = ''
  for (const b of bytes) {
    if (b === 0x0b || b === 0x00) s += '\n'
    else if (b >= 0x20) s += String.fromCharCode(b)
  }
  return s
}

function readOleStream(buf: Uint8Array, streamName: string): Uint8Array | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // 头部签名
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null

  const sectorSize = 1 << dv.getUint16(30, true)
  const fatCount = dv.getUint32(44, true)
  const dirStart = dv.getUint32(48, true)
  const miniCutoff = dv.getUint32(56, true)
  const miniFatStart = dv.getUint32(60, true)
  const difatStart = dv.getUint32(68, true)

  const sectorOffset = (sec: number) => 512 + sec * sectorSize

  // DIFAT（头部 109 项 + 扩展）
  const difat: number[] = []
  for (let i = 0; i < 109; i++) {
    const v = dv.getUint32(76 + i * 4, true)
    if (v !== FREESECT) difat.push(v)
  }
  let dsec = difatStart
  let guard = 0
  while (dsec !== ENDOFCHAIN && dsec !== FREESECT && guard++ < 4096) {
    const off = sectorOffset(dsec)
    const per = sectorSize / 4 - 1
    for (let i = 0; i < per; i++) {
      const v = dv.getUint32(off + i * 4, true)
      if (v !== FREESECT) difat.push(v)
    }
    dsec = dv.getUint32(off + per * 4, true)
  }

  // FAT
  const fat = new Uint32Array(fatCount * (sectorSize / 4))
  let fi = 0
  for (const sec of difat.slice(0, fatCount)) {
    const off = sectorOffset(sec)
    for (let i = 0; i < sectorSize / 4; i++) fat[fi++] = dv.getUint32(off + i * 4, true)
  }

  const readChain = (start: number, size: number): Uint8Array | null => {
    const out = new Uint8Array(size)
    let sec = start
    let pos = 0
    let g = 0
    while (sec !== ENDOFCHAIN && sec !== FREESECT && pos < size && g++ < 65536) {
      const off = sectorOffset(sec)
      const n = Math.min(sectorSize, size - pos)
      out.set(buf.subarray(off, off + n), pos)
      pos += n
      sec = fat[sec] ?? ENDOFCHAIN
    }
    return pos >= size ? out : out.subarray(0, pos)
  }

  // 目录项
  const dirData = readChain(dirStart, 65536 * 32)
  if (!dirData) return null
  const entries: { name: string; type: number; start: number; size: number }[] = []
  for (let i = 0; i + 128 <= dirData.length; i += 128) {
    const edv = new DataView(dirData.buffer, dirData.byteOffset + i, 128)
    const nameLen = edv.getUint16(64, true)
    if (nameLen < 2) continue
    const name = decodeUtf16le(dirData.subarray(i, i + nameLen - 2))
    entries.push({
      name,
      type: dirData[i + 66],
      start: edv.getUint32(116, true),
      size: edv.getUint32(120, true),
    })
  }

  const root = entries.find((e) => e.type === 5)
  const target = entries.find((e) => e.type === 2 && e.name === streamName)
  if (!target) return null

  if (target.size >= miniCutoff || !root) {
    return readChain(target.start, target.size)
  }

  // mini 流：minifat 链 + 根目录的 mini stream
  const miniFatData = readChain(miniFatStart, 4096 * 16)
  const miniStream = root.size > 0 ? readChain(root.start, root.size) : null
  if (!miniFatData || !miniStream || miniStream.length === 0) {
    // mini 流不可用时回退 FAT 链（兼容简化 OLE 布局）
    return readChain(target.start, target.size)
  }
  const miniFat = new Uint32Array(
    miniFatData.buffer,
    miniFatData.byteOffset,
    miniFatData.length / 4,
  )
  const miniSectorSize = 64
  const out = new Uint8Array(target.size)
  let sec = target.start
  let pos = 0
  let g = 0
  while (sec !== ENDOFCHAIN && sec !== FREESECT && pos < target.size && g++ < 65536) {
    const off = sec * miniSectorSize
    const n = Math.min(miniSectorSize, target.size - pos)
    out.set(miniStream.subarray(off, off + n), pos)
    pos += n
    sec = miniFat[sec] ?? ENDOFCHAIN
  }
  return out
}

/** 递归扫描 PPT 记录树，收集 TextCharsAtom(4000) / TextBytesAtom(4008) */
function walkPptRecords(buf: Uint8Array, start: number, end: number, out: string[]): void {
  let pos = start
  let guard = 0
  while (pos + 8 <= end && guard++ < 100000) {
    const dv = new DataView(buf.buffer, buf.byteOffset + pos, Math.min(8, end - pos))
    const verInst = dv.getUint16(0, true)
    const recType = dv.getUint16(2, true)
    const recLen = dv.getUint32(4, true)
    const dataStart = pos + 8
    const dataEnd = dataStart + recLen
    if (dataEnd > end) break
    const recVer = verInst & 0x0f
    if (recVer === 0x0f) {
      // 容器记录：递归
      walkPptRecords(buf, dataStart, dataEnd, out)
    } else if (recType === 4000) {
      const text = decodeUtf16le(buf.subarray(dataStart, dataEnd)).replace(/\r/g, '\n').trim()
      if (text) out.push(text)
    } else if (recType === 4008) {
      const text = decodePptAnsiText(buf.subarray(dataStart, dataEnd)).trim()
      if (text) out.push(text)
    }
    pos = dataEnd
  }
}

/** 字节级兜底：直接扫描 TextCharsAtom(4000)/TextBytesAtom(4008) 记录头 */
function scanTextAtoms(u8: Uint8Array, out: string[]): void {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  for (let i = 0; i + 8 <= u8.length; i++) {
    const recType = dv.getUint16(i + 2, true)
    if (recType !== 4000 && recType !== 4008) continue
    const recLen = dv.getUint32(i + 4, true)
    if (recLen < 2 || recLen > 200000 || i + 8 + recLen > u8.length) continue
    const recVer = dv.getUint16(i, true) & 0x0f
    if (recVer === 0x0f) continue // 容器头不直接含文本
    const body = u8.subarray(i + 8, i + 8 + recLen)
    const text = (recType === 4000 ? decodeUtf16le(body) : decodePptAnsiText(body))
      .replace(/\r/g, '\n')
      .trim()
    if (text.replace(/\s/g, '').length >= 2) out.push(text)
    i += 7 + recLen
  }
}

/**
 * 旧版 PPT 尽力提取文字（TextCharsAtom / TextBytesAtom）。
 * 返回单页幻灯片（1280×720），文字按顺序纵向排布 —— 版式需自行调整。
 */
export function parsePptBinary(buf: ArrayBuffer): ParsedSlide[] {
  const u8 = new Uint8Array(buf)
  const stream = readOleStream(u8, 'PowerPoint Document')
  const raw: string[] = []
  if (stream && stream.length > 8) walkPptRecords(stream, 0, stream.length, raw)
  // 兜底：OLE 流读取失败或结果为空时字节级扫描记录（兼容简化/非标准 OLE 布局）
  if (!raw.length) scanTextAtoms(u8, raw)

  // 合并碎片、去短噪
  const texts = raw
    .map((t) => t.replace(/\n{3,}/g, '\n\n').trim())
    .filter((t) => t.replace(/\s/g, '').length >= 2)
  // 去重连续重复
  const dedup: string[] = []
  for (const t of texts) {
    if (dedup[dedup.length - 1] !== t) dedup.push(t)
  }
  if (!dedup.length) {
    throw new Error('未能从旧版 PPT 中提取到文字，请用 PowerPoint / WPS 另存为 .pptx 后导入')
  }

  const width = 1280
  const height = 720
  const slide: ParsedSlide = { width, height, texts: [], images: [], shapes: [] }
  let y = 48
  for (const text of dedup) {
    const lines = text.split('\n').length
    const fontSize = text.length > 60 ? 22 : 30
    const h = Math.max(48, lines * fontSize * 1.6)
    if (y + h > height - 40) break
    slide.texts.push({
      text,
      x: 80,
      y,
      width: width - 160,
      height: h,
      fontSize,
      fill: '#22201E',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    })
    y += h + 18
  }
  return [slide]
}
