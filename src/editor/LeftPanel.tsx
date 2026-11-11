import { useRef, useState } from 'react'
import clsx from 'clsx'
import { useEditor } from '@/store/editor'
import { toast } from '@/store/app'
import { TEMPLATES, CATEGORY_LABELS, STYLE_LABELS } from '@/data/templates'
import DesignPreview from '@/components/DesignPreview'
import {
  FONTS,
  makeImage,
  makeShape,
  makeText,
  linear,
  createEventInfo,
} from '@/lib/design'
import { importFile, validateFile, elementsFromSlide, type ImportedAsset } from '@/lib/import'
import MotionPanel from './MotionPanel'
import { generateInviteCopy, parseDesignIntent, buildDesignFromPlan, COPY_STYLES, type CopyStyle } from '@/lib/ai'
import { cloudErrorMessage } from '@/lib/cloud'
import type { DesignElement, ElementRole, EventInfo, GradientSpec } from '@/types'

export type TabId = 'template' | 'text' | 'image' | 'sticker' | 'background' | 'upload' | 'ai' | 'motion' | 'event'

export const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'template',
    label: '模板',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: '文字',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 6h14M12 6v13M9 19h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: '图片',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'sticker',
    label: '素材',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3l2.2 5.6L20 10.8l-5.8 2.2L12 18.6l-2.2-5.6L4 10.8l5.8-2.2L12 3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'background',
    label: '背景',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'upload',
    label: '上传',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 16V5m0 0L8 9m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI 设计',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" strokeLinejoin="round" />
        <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'motion',
    label: '动态',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5l6 3.5-6 3.5v-7z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'event',
    label: '宴会信息',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
]

const TEXT_PRESETS: { label: string; role?: ElementRole; text: string; size: number; bold: boolean }[] = [
  { label: '主标题', role: 'title', text: '诚 邀 莅 临', size: 92, bold: true },
  { label: '副标题', role: 'subtitle', text: '敬备薄酌 · 恭候光临', size: 40, bold: false },
  { label: '宴会主题', role: 'theme', text: '婚礼喜宴', size: 64, bold: true },
  { label: '邀请语', role: 'inviteText', text: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴。', size: 30, bold: false },
  { label: '时间', role: 'date', text: '2026年10月1日 星期四', size: 42, bold: true },
  { label: '地点', role: 'venue', text: '锦江大酒店 · 三层牡丹厅', size: 38, bold: true },
  { label: '主办人', role: 'host', text: '主家敬邀', size: 48, bold: false },
  { label: '联系方式', role: 'contact', text: '联系电话 138 0000 0000', size: 26, bold: false },
  { label: '自定义文字', text: '双击编辑文字内容', size: 40, bold: false },
]

const STICKERS: { label: string; build: () => DesignElement }[] = [
  {
    label: '金色边框',
    build: () =>
      makeShape({
        shape: 'rect',
        name: '金色边框',
        x: 60,
        y: 60,
        width: 960,
        height: 1800,
        fill: 'transparent',
        stroke: '#E8C87A',
        strokeWidth: 3,
      }),
  },
  {
    label: '分割线',
    build: () => makeShape({ shape: 'rect', name: '分割线', x: 240, y: 960, width: 600, height: 3, fill: '#C9A227' }),
  },
  {
    label: '菱形装饰',
    build: () => makeShape({ shape: 'diamond', name: '菱形', x: 500, y: 900, width: 80, height: 80, fill: '#C9A227' }),
  },
  {
    label: '圆环',
    build: () => makeShape({ shape: 'ring', name: '圆环', x: 390, y: 700, width: 300, height: 300, fill: 'transparent', stroke: '#C9A227', strokeWidth: 3 }),
  },
  {
    label: '爱心',
    build: () => makeShape({ shape: 'heart', name: '爱心', x: 465, y: 840, width: 150, height: 150, fill: '#E88D9C' }),
  },
  {
    label: '星形',
    build: () => makeShape({ shape: 'star', name: '星形', x: 465, y: 840, width: 150, height: 150, fill: '#D4AF37' }),
  },
  {
    label: '圆形',
    build: () => makeShape({ shape: 'ellipse', name: '圆形', x: 440, y: 820, width: 200, height: 200, fill: '#C2443C', opacity: 0.9 }),
  },
  {
    label: '矩形色块',
    build: () => makeShape({ shape: 'rect', name: '色块', x: 240, y: 860, width: 600, height: 200, fill: '#22201E', radius: 24 }),
  },
  {
    label: '三角形',
    build: () => makeShape({ shape: 'triangle', name: '三角形', x: 440, y: 820, width: 200, height: 180, fill: '#2A9D8F' }),
  },
  {
    label: '祥云',
    build: () => makeShape({ shape: 'ellipse', name: '祥云', x: 400, y: 880, width: 280, height: 95, fill: 'transparent', stroke: '#E8C87A', strokeWidth: 3 }),
  },
  {
    label: '喜字（红）',
    build: () =>
      makeText({ text: '囍', name: '双喜', x: 390, y: 780, width: 300, height: 300, fontFamily: FONTS.brush, fontSize: 240, fill: '#E8C87A', textAlign: 'center' }),
  },
  {
    label: '喜字（金）',
    build: () =>
      makeText({ text: '喜', name: '喜字', x: 420, y: 800, width: 240, height: 260, fontFamily: FONTS.brush, fontSize: 200, fill: '#C9A227', textAlign: 'center' }),
  },
]

/* ---------------- 网络素材（CC0 / MIT 许可，随应用静态分发） ---------------- */

interface WebSticker {
  label: string
  src: string
  w?: number
  h?: number
}

const WEB_STICKER_GROUPS: { title: string; note: string; items: WebSticker[] }[] = [
  {
    title: '节日庆典',
    note: '彩色贴纸 · 来自 Fluent Emoji（MIT）',
    items: [
      { label: '生日蛋糕', src: '/stickers/fe-birthday-cake.svg' },
      { label: '气球', src: '/stickers/fe-balloon.svg' },
      { label: '彩带球', src: '/stickers/fe-confetti-ball.svg' },
      { label: '礼花筒', src: '/stickers/fe-party-popper.svg' },
      { label: '香槟', src: '/stickers/fe-bottle-with-popping-cork.svg' },
      { label: '干杯', src: '/stickers/fe-clinking-glasses.svg' },
      { label: '戒指', src: '/stickers/fe-ring.svg' },
      { label: '礼物', src: '/stickers/fe-wrapped-gift.svg' },
      { label: '皇冠', src: '/stickers/fe-crown.svg' },
      { label: '奖杯', src: '/stickers/fe-trophy.svg' },
      { label: '红包', src: '/stickers/fe-red-envelope.svg' },
      { label: '红灯笼', src: '/stickers/fe-red-paper-lantern.svg' },
      { label: '鞭炮', src: '/stickers/fe-firecracker.svg' },
      { label: '烟花', src: '/stickers/fe-fireworks.svg' },
      { label: '蜡烛', src: '/stickers/fe-candle.svg' },
      { label: '铃铛', src: '/stickers/fe-bell.svg' },
    ],
  },
  {
    title: '花草自然',
    note: '花卉与自然元素',
    items: [
      { label: '玫瑰', src: '/stickers/fe-rose.svg' },
      { label: '樱花', src: '/stickers/fe-cherry-blossom.svg' },
      { label: '花束', src: '/stickers/fe-bouquet.svg' },
      { label: '莲花', src: '/stickers/fe-lotus.svg' },
      { label: '向日葵', src: '/stickers/fe-sunflower.svg' },
      { label: '枫叶', src: '/stickers/fe-maple-leaf.svg' },
      { label: '小花', src: '/stickers/fe-blossom.svg' },
      { label: '郁金香', src: '/stickers/fe-tulip.svg' },
      { label: '芙蓉', src: '/stickers/fe-hibiscus.svg' },
      { label: '香草', src: '/stickers/fe-herb.svg' },
      { label: '蝴蝶', src: '/stickers/fe-butterfly.svg' },
      { label: '白鸽', src: '/stickers/fe-dove.svg' },
      { label: '云朵', src: '/stickers/fe-cloud.svg' },
      { label: '太阳', src: '/stickers/fe-sun.svg' },
      { label: '彩虹', src: '/stickers/fe-rainbow.svg' },
      { label: '满月', src: '/stickers/fe-full-moon.svg' },
    ],
  },
  {
    title: '童趣与寓意',
    note: '满月 / 生日 / 节日主题',
    items: [
      { label: '宝宝', src: '/stickers/fe-baby.svg' },
      { label: '小熊', src: '/stickers/fe-teddy-bear.svg' },
      { label: '星星', src: '/stickers/fe-star.svg' },
      { label: '闪星', src: '/stickers/fe-glowing-star.svg' },
      { label: '流星', src: '/stickers/fe-shooting-star.svg' },
      { label: '弯月', src: '/stickers/fe-crescent-moon.svg' },
      { label: '雪花', src: '/stickers/fe-snowflake.svg' },
      { label: '雪人', src: '/stickers/fe-snowman.svg' },
      { label: '圣诞树', src: '/stickers/fe-christmas-tree.svg' },
      { label: '南瓜灯', src: '/stickers/fe-jack-o-lantern.svg' },
      { label: '风铃', src: '/stickers/fe-wind-chime.svg' },
      { label: '城堡', src: '/stickers/fe-castle.svg' },
      { label: '新居', src: '/stickers/fe-house.svg' },
      { label: '鲤鱼旗', src: '/stickers/fe-carp-streamer.svg' },
      { label: '祥龙', src: '/stickers/fe-dragon.svg' },
      { label: '寿桃', src: '/stickers/fe-peach.svg' },
    ],
  },
  {
    title: '金色线条图标',
    note: '线性图标 · 来自 Tabler Icons（MIT）',
    items: [
      { label: '皇冠线', src: '/stickers/tab-crown.svg' },
      { label: '花朵线', src: '/stickers/tab-flower.svg' },
      { label: '爱心线', src: '/stickers/tab-heart.svg' },
      { label: '星星线', src: '/stickers/tab-star.svg' },
      { label: '香槟线', src: '/stickers/tab-champagne.svg' },
      { label: '钻石线', src: '/stickers/tab-diamond.svg' },
      { label: '礼物线', src: '/stickers/tab-gift.svg' },
      { label: '蛋糕线', src: '/stickers/tab-cake.svg' },
      { label: '画框线', src: '/stickers/tab-frame.svg' },
      { label: '分隔线', src: '/stickers/tab-separator.svg', w: 320, h: 40 },
      { label: '波浪线', src: '/stickers/tab-wave.svg', w: 320, h: 80 },
      { label: '角框线', src: '/stickers/tab-corners.svg' },
      { label: '闪光线', src: '/stickers/tab-sparkles.svg' },
      { label: '羽毛线', src: '/stickers/tab-feather.svg' },
      { label: '叶片线', src: '/stickers/tab-leaf.svg' },
      { label: '火焰线', src: '/stickers/tab-flame.svg' },
    ],
  },
  {
    title: '边框装饰',
    note: '角花 / 拱门 / 花边 · 平台自制',
    items: [
      { label: '金色角花', src: '/stickers/deco-corner.svg', w: 170, h: 170 },
      { label: '华丽分隔', src: '/stickers/deco-divider.svg', w: 620, h: 62 },
      { label: '回纹方框', src: '/stickers/deco-lattice.svg', w: 300, h: 300 },
      { label: '欧式拱门', src: '/stickers/deco-arch.svg', w: 320, h: 496 },
      { label: '月桂环', src: '/stickers/deco-laurel.svg', w: 240, h: 240 },
      { label: '扇贝花边', src: '/stickers/deco-scallop.svg', w: 720, h: 108 },
    ],
  },
]

function buildWebSticker(s: WebSticker): DesignElement {
  const w = s.w ?? 200
  const h = s.h ?? 200
  return makeImage({
    src: s.src,
    name: s.label,
    x: Math.round((1080 - w) / 2),
    y: Math.round((1920 - h) / 2),
    width: w,
    height: h,
  })
}

const GRADIENT_PRESETS: { label: string; gradient: GradientSpec }[] = [
  { label: '胭脂红', gradient: linear(165, [{ offset: 0, color: '#A32C22' }, { offset: 1, color: '#6B150F' }]) },
  { label: '香槟金', gradient: linear(165, [{ offset: 0, color: '#FBF6EA' }, { offset: 1, color: '#EFE2C6' }]) },
  { label: '暮色粉', gradient: linear(180, [{ offset: 0, color: '#FDF2F4' }, { offset: 1, color: '#F3C3CE' }]) },
  { label: '深海蓝', gradient: linear(165, [{ offset: 0, color: '#22456E' }, { offset: 1, color: '#152A46' }]) },
  { label: '黑金', gradient: linear(160, [{ offset: 0, color: '#2B241C' }, { offset: 1, color: '#0D0B0A' }]) },
  { label: '青竹绿', gradient: linear(180, [{ offset: 0, color: '#F7FAF5' }, { offset: 1, color: '#E7F0E4' }]) },
]

const TEXTURE_COLORS = ['#FFFFFF', '#FBF8F3', '#F3EDE3', '#E8DCC8', '#22201E', '#8C2B27', '#1F3A5F', '#2F4A38']

export interface LeftPanelProps {
  /** sidebar：桌面左侧栏（图标栏+内容面板）；sheet：移动端底部抽屉（仅内容，全宽） */
  variant?: 'sidebar' | 'sheet'
  /** 受控模式：当前工具页 */
  activeTab?: TabId
  onTabChange?: (t: TabId) => void
}

export default function LeftPanel({ variant = 'sidebar', activeTab, onTabChange }: LeftPanelProps = {}) {
  const [innerTab, setInnerTab] = useState<TabId>('template')
  const tab = activeTab ?? innerTab
  const setTab = (t: TabId) => {
    setInnerTab(t)
    onTabChange?.(t)
  }
  const doc = useEditor((s) => s.doc)
  const addElement = useEditor((s) => s.addElement)
  const setBackground = useEditor((s) => s.setBackground)
  const loadDesign = useEditor((s) => s.loadDesign)
  const setEventInfo = useEditor((s) => s.setEventInfo)
  const projectId = useEditor((s) => s.projectId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [aiPrompt, setAiPrompt] = useState('帮我制作一张中式红金色婚礼请帖，整体高级、喜庆，但不要太俗气，采用竖版设计。')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [copyStyle, setCopyStyle] = useState<CopyStyle>('warm')
  const [copyBusy, setCopyBusy] = useState(false)
  const [copyText, setCopyText] = useState('')

  /* ---------- 模板 ---------- */
  function useTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    loadDesign(t.build(), { projectId, name: t.name })
    toast('success', `已应用模板「${t.name}」`)
  }

  /* ---------- 文字 ---------- */
  function addText(preset: (typeof TEXT_PRESETS)[number]) {
    const { width, height } = doc.canvas
    addElement(
      makeText({
        text: preset.text,
        name: preset.label,
        role: preset.role,
        x: Math.round((width - Math.min(width - 120, 900)) / 2),
        y: Math.round(height * 0.32),
        width: Math.min(width - 120, 900),
        height: preset.size * 1.6,
        fontFamily: FONTS.serif,
        fontSize: preset.size,
        fontWeight: preset.bold ? 'bold' : 'normal',
        fill: doc.canvas.background.type === 'color' && isLight(doc.canvas.background.color) ? '#22201E' : '#FFFFFF',
        textAlign: 'center',
      }),
    )
  }

  /* ---------- 图片 ---------- */
  async function handleImageFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast('error', '请选择图片文件')
        continue
      }
      const reader = new FileReader()
      reader.onload = () => {
        const src = String(reader.result)
        const img = new Image()
        img.onload = () => {
          const maxW = Math.min(doc.canvas.width * 0.6, img.naturalWidth)
          const scale = maxW / img.naturalWidth
          addElement({
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: 'image',
            name: file.name,
            x: Math.round((doc.canvas.width - maxW) / 2),
            y: Math.round(doc.canvas.height * 0.36),
            width: Math.round(maxW),
            height: Math.round(img.naturalHeight * scale),
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            src,
            borderRadius: 0,
            stroke: '',
            strokeWidth: 0,
            flipX: false,
            flipY: false,
          })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    }
  }

  /* ---------- 上传模板 ---------- */
  async function handleTemplateFile(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      const v = validateFile(file)
      if (v) {
        toast('error', v)
        continue
      }
      try {
        const asset: ImportedAsset = await importFile(file)
        if (asset.slides?.length) {
          // PPT/PPTX/SVG：文字与图片作为可编辑元素注入当前设计
          const slide = asset.slides[0]
          const els = elementsFromSlide(slide, doc.canvas.width, doc.canvas.height)
          els.forEach((el) => addElement(el))
          // 幻灯片自带背景图/渐变时同步到画布背景（纯色不覆盖当前背景）
          if (slide.backgroundImage) {
            setBackground({ type: 'image', imageSrc: slide.backgroundImage, imageFit: 'cover', opacity: 1 })
          } else if (slide.backgroundGradient) {
            setBackground({ type: 'gradient', gradient: slide.backgroundGradient, opacity: 1 })
          }
          toast('success', `已导入 ${els.length} 个可编辑元素（文字可直接修改）`)
        } else {
          const fit = 'cover' as const
          setBackground({ type: 'image', imageSrc: asset.dataUrl, imageFit: fit, opacity: 1 })
          toast('success', '模板已作为背景导入，可叠加可编辑图层')
        }
      } catch (e) {
        toast('error', cloudErrorMessage(e, '导入失败'))
      }
    }
  }

  /* ---------- AI ---------- */
  async function runAiDesign() {
    if (!aiPrompt.trim()) {
      toast('error', '请先描述你想要的请帖')
      return
    }
    setAiBusy(true)
    setAiNote('')
    try {
      const { plan, source } = await parseDesignIntent(aiPrompt.trim())
      const next = buildDesignFromPlan(plan, doc.eventInfo)
      loadDesign(next, { projectId, name: plan.name })
      setAiNote(`设计思路：${plan.reasoning}${source === 'builtin' ? '（当前使用内置设计引擎，接入大模型后会更贴合描述）' : ''}`)
      toast('success', 'AI 已生成可编辑的请帖设计')
    } catch (e) {
      toast('error', cloudErrorMessage(e, 'AI 设计失败'))
    } finally {
      setAiBusy(false)
    }
  }

  async function runAiCopy() {
    setCopyBusy(true)
    try {
      const info: EventInfo = { ...createEventInfo(), ...doc.eventInfo }
      const res = await generateInviteCopy(info, copyStyle)
      setCopyText(res.text)
      toast('success', res.source === 'llm' ? 'AI 文案已生成' : '已生成内置文案（可继续编辑）')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '文案生成失败'))
    } finally {
      setCopyBusy(false)
    }
  }

  function applyCopyToDesign() {
    if (!copyText.trim()) return
    const els = [...doc.elements]
    const idx = els.findIndex((e) => e.type === 'text' && e.role === 'inviteText')
    if (idx >= 0) {
      const el = els[idx]
      els[idx] = { ...el, text: copyText } as DesignElement
      useEditor.getState().commit((d) => ({ ...d, elements: els }))
    } else {
      addElement(
        makeText({
          text: copyText,
          name: '邀请文案',
          role: 'inviteText',
          x: 90,
          y: Math.round(doc.canvas.height * 0.55),
          width: doc.canvas.width - 180,
          height: 200,
          fontFamily: FONTS.serif,
          fontSize: 30,
          fill: '#FFFFFF',
          textAlign: 'center',
          lineHeight: 1.85,
        }),
      )
    }
    toast('success', '文案已应用到请帖')
  }

  /* ---------- 宴会信息 ---------- */
  const [eventDraft, setEventDraft] = useState<EventInfo>(doc.eventInfo)
  function applyEvent() {
    setEventInfo(eventDraft)
    toast('success', '宴会信息已同步到请帖')
  }

  const isSheet = variant === 'sheet'
  return (
    <div className={`flex h-full min-h-0 ${isSheet ? 'w-full' : ''}`}>
      {/* 图标栏（移动端抽屉模式下由底部工具坞承担） */}
      {!isSheet && (
        <nav className="flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-paper-line/70 bg-white py-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex w-[58px] flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] transition',
                tab === t.id ? 'bg-primary-50 text-primary-600' : 'text-ink-mute hover:bg-paper-warm hover:text-ink',
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* 内容面板 */}
      <div
        className={
          isSheet
            ? 'w-full overflow-y-auto bg-paper-warm/60 p-4 pb-8'
            : 'w-[268px] shrink-0 overflow-y-auto border-r border-paper-line/70 bg-paper-warm/60 p-4'
        }
      >
        {tab === 'template' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">精选模板</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">点击套用模板。当前设计会被替换。</p>
            <div className="mt-4 space-y-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => useTemplate(t.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white p-2 text-left ring-1 ring-paper-line/70 transition hover:shadow-soft"
                >
                  <div className="w-[46px] shrink-0 overflow-hidden rounded-lg">
                    <DesignPreview doc={t.build()} width={46} showBorder={false} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-ink">{t.name}</div>
                    <div className="mt-0.5 truncate text-[10px] text-ink-mute">
                      {CATEGORY_LABELS[t.category]} · {STYLE_LABELS[t.style]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'text' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">添加文字</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">添加后可拖动到任意位置，右侧属性栏可调整样式。</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {TEXT_PRESETS.map((p) => (
                <button key={p.label} onClick={() => addText(p)} className="rounded-xl bg-white px-3 py-2.5 text-xs text-ink ring-1 ring-paper-line/70 transition hover:bg-primary-50 hover:text-primary-600">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'image' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">添加图片</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">上传本地图片，作为独立图层插入画布。</p>
            <button className="btn-primary mt-4 w-full" onClick={() => fileRef.current?.click()}>
              选择图片
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleImageFiles(e.target.files)} />
            <div className="mt-4 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-ink-mute ring-1 ring-paper-line/70">
              提示：图片插入后可缩放、旋转、裁剪圆角、加边框与阴影，全部在右侧属性栏完成。
            </div>
          </div>
        )}

        {tab === 'sticker' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">装饰素材</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">点击添加到画布；形状可改色，图片素材可缩放旋转。</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {STICKERS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => addElement(s.build())}
                  className="rounded-xl bg-white px-3 py-2.5 text-xs text-ink ring-1 ring-paper-line/70 transition hover:bg-gold-50 hover:text-gold-700"
                >
                  {s.label}
                </button>
              ))}
            </div>
            {WEB_STICKER_GROUPS.map((group) => (
              <div key={group.title} className="mt-6">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xs font-semibold text-ink">{group.title}</h4>
                  <span className="text-[10px] text-ink-mute">{group.note}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {group.items.map((s) => (
                    <button
                      key={s.src}
                      onClick={() => addElement(buildWebSticker(s))}
                      title={s.label}
                      className="flex flex-col items-center gap-1 rounded-xl bg-white px-1.5 py-2 ring-1 ring-paper-line/70 transition hover:bg-gold-50"
                    >
                      <img src={s.src} alt={s.label} className="h-10 w-10 object-contain" loading="lazy" />
                      <span className="w-full truncate text-center text-[10px] text-ink-mute">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'background' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">背景设置</h3>
            <div className="mt-4">
              <div className="label">纯色背景</div>
              <div className="flex flex-wrap gap-2">
                {TEXTURE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBackground({ type: 'color', color: c, opacity: 1 })}
                    className="h-9 w-9 rounded-lg ring-1 ring-paper-line transition hover:scale-110"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
                <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white text-xs text-ink-mute ring-1 ring-paper-line">
                  +
                  <input
                    type="color"
                    className="absolute h-0 w-0 opacity-0"
                    onChange={(e) => setBackground({ type: 'color', color: e.target.value, opacity: 1 })}
                  />
                </label>
              </div>
            </div>
            <div className="mt-5">
              <div className="label">渐变背景</div>
              <div className="grid grid-cols-3 gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.label}
                    onClick={() => setBackground({ type: 'gradient', gradient: g.gradient, opacity: 1 })}
                    className="h-14 rounded-lg ring-1 ring-paper-line transition hover:scale-105"
                    style={{
                      backgroundImage: `linear-gradient(${(g.gradient.angle ?? 0) + 90}deg, ${g.gradient.stops
                        .map((s) => `${s.color} ${(s.offset * 100).toFixed(0)}%`)
                        .join(', ')})`,
                    }}
                    title={g.label}
                  />
                ))}
              </div>
            </div>
            <div className="mt-5">
              <div className="label">图片 / 纹理背景</div>
              <button
                className="btn-ghost w-full"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = () => {
                    const f = input.files?.[0]
                    if (!f) return
                    const reader = new FileReader()
                    reader.onload = () =>
                      setBackground({ type: 'image', imageSrc: String(reader.result), imageFit: 'cover', opacity: 1 })
                    reader.readAsDataURL(f)
                  }
                  input.click()
                }}
              >
                上传背景图
              </button>
            </div>
            <div className="mt-5">
              <div className="label">背景透明度</div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.02}
                value={doc.canvas.background.opacity ?? 1}
                onChange={(e) => setBackground({ ...doc.canvas.background, opacity: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">导入我的模板</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              支持 PNG / JPG / GIF / SVG / PDF / PPT / PPTX。图片作背景导入；PPT 与 SVG 中的文字会提取为可编辑文字。
            </p>
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.png,.jpg,.jpeg,.webp,.gif,.svg,.pdf,.ppt,.pptx'
                input.onchange = () => void handleTemplateFile(input.files)
                input.click()
              }}
            >
              选择文件导入
            </button>
            <div className="mt-4 space-y-2 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-ink-mute ring-1 ring-paper-line/70">
              <div>· 图片/GIF：作为背景，可叠加文字与装饰</div>
              <div>· PDF：首页渲染为高清背景</div>
              <div>· PPT/PPTX：文字可编辑、图片为独立图层</div>
              <div>· SVG：文字提取为可编辑文字，图形作为图层</div>
              <div>· Canva：请在 Canva 中导出 PNG/PDF 后上传</div>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">AI 智能设计</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              用一句话描述你想要的请帖，AI 会理解宴会类型、推荐配色字体，并生成<strong className="text-ink">可编辑图层</strong>的完整设计。
            </p>
            <textarea
              className="input mt-3 min-h-[110px] text-xs"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="例如：帮我制作一张中式红金色婚礼请帖，整体高级、喜庆，但不要太俗气，采用竖版设计。"
            />
            <button className="btn-primary mt-3 w-full" onClick={() => void runAiDesign()} disabled={aiBusy}>
              {aiBusy ? 'AI 设计中…' : '生成设计'}
            </button>
            {aiNote && <div className="mt-3 rounded-xl bg-gold-50 px-3 py-2.5 text-[11px] leading-relaxed text-gold-800">{aiNote}</div>}

            <div className="mt-6 border-t border-paper-line/70 pt-5">
              <h4 className="text-xs font-semibold text-ink">AI 邀请文案</h4>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {COPY_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCopyStyle(s.id)}
                    className={clsx(
                      'chip px-2.5 py-1 ring-1',
                      copyStyle === s.id ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white text-ink-soft ring-paper-line',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button className="btn-ghost mt-3 w-full" onClick={() => void runAiCopy()} disabled={copyBusy}>
                {copyBusy ? '生成中…' : '生成邀请文案'}
              </button>
              {copyText && (
                <>
                  <textarea
                    className="input mt-3 min-h-[110px] text-xs"
                    value={copyText}
                    onChange={(e) => setCopyText(e.target.value)}
                  />
                  <button className="btn-soft mt-2 w-full" onClick={applyCopyToDesign}>
                    应用到请帖
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'motion' && <MotionPanel />}

        {tab === 'event' && (
          <div>
            <h3 className="text-sm font-semibold text-ink">宴会信息</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
              填写后自动同步到请帖中绑定的日期、地点、邀请语等位置。
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  ['eventName', '宴会名称'],
                  ['hostName', '主办人 / 新人姓名'],
                  ['guestName', '被邀请人称呼'],
                  ['date', '日期（YYYY-MM-DD）'],
                  ['time', '时间（HH:mm）'],
                  ['venue', '酒店 / 场地'],
                  ['address', '详细地址'],
                  ['phone', '联系电话'],
                ] as [keyof EventInfo, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    className="input !py-2 text-xs"
                    value={(eventDraft[key] as string) ?? ''}
                    onChange={(e) => setEventDraft({ ...eventDraft, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="label">邀请文案</label>
                <textarea
                  className="input min-h-[100px] text-xs"
                  value={eventDraft.inviteText}
                  onChange={(e) => setEventDraft({ ...eventDraft, inviteText: e.target.value })}
                />
              </div>
              <div>
                <label className="label">备注</label>
                <input
                  className="input !py-2 text-xs"
                  value={eventDraft.note}
                  onChange={(e) => setEventDraft({ ...eventDraft, note: e.target.value })}
                />
              </div>
              <button className="btn-primary w-full" onClick={applyEvent}>
                同步到请帖
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function isLight(hex?: string) {
  if (!hex || !hex.startsWith('#')) return true
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 165
}
