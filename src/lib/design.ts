import type {
  BackgroundSpec,
  DesignDoc,
  DesignElement,
  ElementRole,
  EventCategory,
  EventInfo,
  Orientation,
  PresentationConfig,
  ShapeElement,
  StyleTag,
  TextElement,
  ImageElement,
  GradientSpec,
  ShadowSpec,
} from '@/types'
import { EMPTY_EVENT_INFO } from '@/types'
import { uid } from './id'
import { presentationFor } from './presentation'

/* ---------------- 画布尺寸 ---------------- */

export const CANVAS_SIZES: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
}

export function sizeFor(orientation: Orientation) {
  return CANVAS_SIZES[orientation]
}

/* ---------------- 字体 ---------------- */

export const FONTS = {
  serif: 'Noto Serif SC',
  sans: 'Noto Sans SC',
  brush: 'Ma Shan Zheng',
  cute: 'ZCOOL XiaoWei',
  display: 'ZCOOL QingKe HuangYou',
  hand: 'Long Cang',
} as const

export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: FONTS.serif, label: '思源宋体 · 典雅' },
  { value: FONTS.sans, label: '思源黑体 · 现代' },
  { value: FONTS.brush, label: '马善政 · 毛笔' },
  { value: FONTS.cute, label: '站酷小薇 · 秀气' },
  { value: FONTS.display, label: '站酷庆科黄油体 · 醒目' },
  { value: FONTS.hand, label: '龙藏 · 手写' },
  { value: 'serif', label: '系统衬线' },
  { value: 'sans-serif', label: '系统无衬线' },
  { value: 'kaiti', label: '楷体' },
]

/* ---------------- 元素工厂 ---------------- */

export const defaultShadow = (): ShadowSpec => ({
  enabled: true,
  color: 'rgba(0,0,0,0.28)',
  blur: 18,
  offsetX: 0,
  offsetY: 8,
})

export function makeText(
  partial: Partial<TextElement> & Pick<TextElement, 'text' | 'x' | 'y'>,
): TextElement {
  return {
    id: uid('txt'),
    type: 'text',
    name: partial.name ?? '文字',
    role: partial.role,
    x: partial.x,
    y: partial.y,
    width: partial.width ?? 900,
    height: partial.height ?? 100,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    text: partial.text,
    fontFamily: partial.fontFamily ?? FONTS.serif,
    fontSize: partial.fontSize ?? 48,
    fontWeight: partial.fontWeight ?? 'normal',
    fontStyle: partial.fontStyle ?? 'normal',
    underline: partial.underline ?? false,
    fill: partial.fill ?? '#22201E',
    textAlign: partial.textAlign ?? 'center',
    lineHeight: partial.lineHeight ?? 1.5,
    charSpacing: partial.charSpacing ?? 0,
    shadow: partial.shadow,
  }
}

export function makeShape(
  partial: Partial<ShapeElement> & Pick<ShapeElement, 'shape' | 'x' | 'y' | 'width' | 'height'>,
): ShapeElement {
  return {
    id: uid('shp'),
    type: 'shape',
    name: partial.name ?? '形状',
    role: partial.role,
    x: partial.x,
    y: partial.y,
    width: partial.width,
    height: partial.height,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    shape: partial.shape,
    fill: partial.fill ?? '#C9A227',
    stroke: partial.stroke ?? '',
    strokeWidth: partial.strokeWidth ?? 0,
    radius: partial.radius ?? 0,
    shadow: partial.shadow,
  }
}

export function makeImage(
  partial: Partial<ImageElement> & Pick<ImageElement, 'src' | 'x' | 'y' | 'width' | 'height'>,
): ImageElement {
  return {
    id: uid('img'),
    type: 'image',
    name: partial.name ?? '图片',
    role: partial.role,
    x: partial.x,
    y: partial.y,
    width: partial.width,
    height: partial.height,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    src: partial.src,
    borderRadius: partial.borderRadius ?? 0,
    stroke: partial.stroke ?? '',
    strokeWidth: partial.strokeWidth ?? 0,
    flipX: partial.flipX ?? false,
    flipY: partial.flipY ?? false,
    shadow: partial.shadow,
  }
}

export const linear = (angle: number, stops: GradientSpec['stops']): GradientSpec => ({
  type: 'linear',
  angle,
  stops,
})

export const radial = (stops: GradientSpec['stops']): GradientSpec => ({
  type: 'radial',
  angle: 0,
  stops,
})

/* ---------------- 文档工厂 ---------------- */

export function createEventInfo(overrides: Partial<EventInfo> = {}): EventInfo {
  return { ...EMPTY_EVENT_INFO, ...overrides }
}

export function createDesign(options: {
  name: string
  category: EventCategory
  style: StyleTag
  orientation: Orientation
  background?: BackgroundSpec
  elements?: DesignElement[]
  eventInfo?: Partial<EventInfo>
  presentation?: PresentationConfig
}): DesignDoc {
  const { width, height } = sizeFor(options.orientation)
  const now = Date.now()
  return {
    id: uid('doc'),
    name: options.name,
    category: options.category,
    style: options.style,
    orientation: options.orientation,
    canvas: {
      width,
      height,
      background: options.background ?? {
        type: 'color',
        color: '#FFFFFF',
        opacity: 1,
      },
    },
    elements: options.elements ?? [],
    eventInfo: createEventInfo({ eventType: options.category, ...options.eventInfo }),
    presentation: options.presentation ?? presentationFor(options.category, options.style),
    createdAt: now,
    updatedAt: now,
  }
}

export function cloneDesign(doc: DesignDoc): DesignDoc {
  return JSON.parse(JSON.stringify(doc)) as DesignDoc
}

export function touch(doc: DesignDoc): DesignDoc {
  return { ...doc, updatedAt: Date.now() }
}

/* ---------------- 宴会信息绑定 ---------------- */

/**
 * 把宴会信息写入绑定了 role 的文字元素。
 * 每个 role 只取第一个匹配元素，保持图层结构不变。
 */
export function applyEventInfoToDesign(doc: DesignDoc, info: EventInfo): DesignDoc {
  const used = new Set<string>()
  const elements = doc.elements.map((el) => {
    if (el.type !== 'text' || !el.role) return el
    const value = roleText(el.role, info)
    if (value === null) return el
    if (used.has(el.role)) return el
    used.add(el.role)
    return { ...el, text: value }
  })
  return {
    ...doc,
    eventInfo: { ...info },
    elements,
    updatedAt: Date.now(),
  }
}

export function roleText(role: ElementRole, info: EventInfo): string | null {
  switch (role) {
    case 'title':
      return info.eventName || null
    case 'subtitle':
      return info.hostName ? `诚邀 · ${info.hostName}` : null
    case 'theme':
      return info.eventName || null
    case 'inviteText':
      return info.inviteText || null
    case 'date':
      return info.date ? formatChineseDate(info.date) : null
    case 'time':
      return info.time || null
    case 'venue':
      return info.venue || null
    case 'address':
      return info.address || null
    case 'host':
      return info.hostName || null
    case 'contact':
      return info.phone ? `联系电话 ${info.phone}` : null
    case 'guestName':
      return info.guestName ? `${info.guestName} 亲启` : null
    case 'note':
      return info.note || null
    default:
      return null
  }
}

export function formatChineseDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso
  const [, y, mo, d] = m
  const week = ['日', '一', '二', '三', '四', '五', '六']
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  const w = week[date.getDay()] ?? ''
  return `${y}年${Number(mo)}月${Number(d)}日 星期${w}`
}

export function formatChineseTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return time
  const h = Number(m[1])
  const periods: [number, string][] = [
    [0, '夜半'],
    [1, '凌晨'],
    [5, '清晨'],
    [7, '上午'],
    [11, '中午'],
    [13, '下午'],
    [17, '傍晚'],
    [19, '晚上'],
  ]
  let label = '晚上'
  for (const [start, name] of periods) if (h >= start) label = name
  return `${label} ${h}点${m[2] === '00' ? '整' : `${Number(m[2])}分`}`
}

/* ---------------- 导出预设 ---------------- */

import type { ExportPreset } from '@/types'

export function exportPresets(doc: DesignDoc): ExportPreset[] {
  const base = doc.canvas
  return [
    {
      id: 'original',
      label: '原始尺寸',
      description: `${base.width} × ${base.height} px`,
      width: base.width,
      height: base.height,
    },
    {
      id: 'wechat',
      label: '微信分享',
      description: '适合聊天卡片与朋友圈',
      width: 1080,
      height: 1440,
    },
    {
      id: 'phone',
      label: '手机竖版',
      description: '全屏浏览最佳比例',
      width: 1080,
      height: 1920,
    },
    {
      id: 'landscape',
      label: '横版邀请函',
      description: '适合大屏与投屏展示',
      width: 1920,
      height: 1080,
    },
    {
      id: 'hd2x',
      label: '高清 2×',
      description: `${base.width * 2} × ${base.height * 2} px · 打印级`,
      width: base.width * 2,
      height: base.height * 2,
    },
  ]
}
