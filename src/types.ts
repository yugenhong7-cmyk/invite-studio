/* ============================================================
 * Invite Studio — 核心数据模型
 * 设计文档 (DesignDoc) 是唯一权威数据源：
 *   - 编辑器里 Fabric.js 画布与它双向同步
 *   - 持久化到云数据库的 projects / design_elements
 *   - 公开请帖页用它渲染
 * 结构化保存图层与坐标，绝不只存最终图片。
 * ============================================================ */

export type ElementType = 'text' | 'image' | 'shape'

export type ElementRole =
  | 'title'
  | 'subtitle'
  | 'theme'
  | 'inviteText'
  | 'date'
  | 'time'
  | 'venue'
  | 'address'
  | 'host'
  | 'contact'
  | 'guestName'
  | 'note'

export type ShapeKind =
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'ring'
  | 'star'
  | 'heart'

export type Orientation = 'portrait' | 'landscape' | 'square'

export type EventCategory =
  | 'wedding'
  | 'birthday'
  | 'longevity'
  | 'fullmoon'
  | 'graduation'
  | 'housewarming'
  | 'business'
  | 'festival'
  | 'other'

export type StyleTag =
  | 'chinese'
  | 'modern'
  | 'minimal'
  | 'vintage'
  | 'guochao'
  | 'european'
  | 'romantic'
  | 'luxury'

export type ColorTag =
  | 'red'
  | 'gold'
  | 'pink'
  | 'blue'
  | 'green'
  | 'white'
  | 'black'
  | 'multi'

export interface ShadowSpec {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface GradientStop {
  offset: number
  color: string
}

export interface GradientSpec {
  type: 'linear' | 'radial'
  /** 线性渐变角度（度），0 = 从左到右 */
  angle: number
  stops: GradientStop[]
}

export interface DesignElementBase {
  id: string
  name: string
  role?: ElementRole
  x: number
  y: number
  width: number
  height: number
  /** 旋转角度（度） */
  rotation: number
  /** 0–1 */
  opacity: number
  visible: boolean
  locked: boolean
}

export interface TextElement extends DesignElementBase {
  type: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  underline: boolean
  fill: string
  textAlign: 'left' | 'center' | 'right'
  /** 倍数行高 */
  lineHeight: number
  /** 字间距（fabric charSpacing，1/1000 em） */
  charSpacing: number
  shadow?: ShadowSpec
}

export interface ImageElement extends DesignElementBase {
  type: 'image'
  src: string
  borderRadius: number
  stroke: string
  strokeWidth: number
  flipX: boolean
  flipY: boolean
  shadow?: ShadowSpec
}

export interface ShapeElement extends DesignElementBase {
  type: 'shape'
  shape: ShapeKind
  fill: string | GradientSpec
  stroke: string
  strokeWidth: number
  /** 仅 rect 生效 */
  radius: number
  shadow?: ShadowSpec
}

export type DesignElement = TextElement | ImageElement | ShapeElement

export interface BackgroundSpec {
  type: 'color' | 'gradient' | 'image'
  color?: string
  gradient?: GradientSpec
  imageSrc?: string
  imageFit?: 'cover' | 'contain' | 'stretch'
  /** 0–1 */
  opacity: number
}

export interface CanvasSpec {
  width: number
  height: number
  background: BackgroundSpec
}

export interface EventInfo {
  eventName: string
  eventType: EventCategory
  hostName: string
  guestName: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  venue: string
  address: string
  phone: string
  inviteText: string
  note: string
}

/* ---------------- 动态电子请帖展示配置 ---------------- */

/** 展示模式：单页沉浸 / 多屏翻页 / 故事式 */
export type PresentMode = 'single' | 'flip' | 'story'

/** 开场封面风格（auto 按宴会类型自动选择） */
export type CoverStyle =
  | 'auto'
  | 'envelope-chinese'
  | 'envelope-western'
  | 'gift'
  | 'scroll'
  | 'card'
  | 'bloom'
  | 'butterfly'
  | 'ink'
  | 'glass'
  | 'starlight'
  | 'camera'

/** 动态背景粒子类型 */
export type BackgroundFxType =
  | 'none'
  | 'petals'
  | 'sakura'
  | 'stars'
  | 'starflow'
  | 'gold'
  | 'clouds'
  | 'ribbons'
  | 'bokeh'
  | 'snow'
  | 'confetti'
  | 'candles'
  | 'butterflies'
  | 'balloons'
  | 'streamers'
  | 'ripples'
  | 'fireflies'
  | 'lightflow'

/** 元素进入/退出动画类型 */
export type AnimType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'zoom-out'
  | 'reveal'
  | 'flip'
  | 'rotate'
  | 'blur'
  | 'typewriter'
  | 'chars'
  | 'glow'
  | 'mask'
  | 'bounce'
  | 'swing'
  | 'float'
  | 'none'

/** 动画触发方式 */
export type AnimTrigger = 'scroll' | 'load' | 'stagger'

/** 预设动画方案 */
export type AnimPresetId =
  | 'romantic'
  | 'chinese'
  | 'guochao'
  | 'garden'
  | 'minimal'
  | 'birthday'
  | 'business'

/** 单个元素的动画设置 */
export interface ElementAnim {
  enter: AnimType
  exit: AnimType
  /** 毫秒 */
  duration: number
  /** 毫秒 */
  delay: number
  trigger: AnimTrigger
}

export interface CoverConfig {
  enabled: boolean
  style: CoverStyle
  /** 封面提示语，如「轻触开启」 */
  hint: string
}

export interface BackgroundFxConfig {
  enabled: boolean
  type: BackgroundFxType
  /** 0.2–2 速度倍率 */
  speed: number
  /** 0–1 粒子密度 */
  intensity: number
  /** 0–1 整体不透明度 */
  opacity: number
}

export interface MusicConfig {
  enabled: boolean
  /** 'builtin:<id>' 内置乐库 或 音频 URL */
  src: string
  name: string
  /** 0–1 */
  volume: number
  loop: boolean
}

export interface StoryPhoto {
  src: string
  caption: string
}

export interface PresentationSections {
  countdown: boolean
  venue: boolean
  contact: boolean
  rsvp: boolean
  share: boolean
  ending: boolean
  story: boolean
}

export interface PresentationConfig {
  mode: PresentMode
  preset: AnimPresetId
  cover: CoverConfig
  backgroundFx: BackgroundFxConfig
  music: MusicConfig
  sections: PresentationSections
  story: StoryPhoto[]
  /** 按元素 id 的个性化动画 */
  elementAnims: Record<string, ElementAnim>
  /** 全局动画速度倍率 0.5–1.5 */
  globalSpeed: number
}

/* ---------------- 动画模板库 / 音乐库 / 动态方案 ---------------- */

/** 动画用途分类 */
export type AnimCategory = 'opening' | 'transition' | 'text' | 'background' | 'image' | 'ending'

/** 动画视觉风格 */
export type AnimStyleTag =
  | 'chinese'
  | 'neo-chinese'
  | 'guochao'
  | 'western-romantic'
  | 'garden'
  | 'minimal'
  | 'luxury-gold'
  | 'vintage'
  | 'cute'
  | 'business'
  | 'fresh'
  | 'festive'

/** 动画强度/方向等可调参数 */
export interface AnimParams {
  /** 毫秒 */
  duration: number
  /** 毫秒 */
  delay: number
  /** 速度倍率 0.5–2 */
  speed: number
  /** 方向 */
  direction: 'up' | 'down' | 'left' | 'right' | 'in' | 'out'
  /** 强度 0–1 */
  intensity: number
  /** 透明度 0–1 */
  opacity: number
  /** 循环次数，0 = 无限 */
  loops: number
  trigger: AnimTrigger
}

/** 动画模板（结构化配置，来源于动画库） */
export interface AnimationTemplate {
  animation_id: string
  animation_name: string
  animation_category: AnimCategory
  animation_style: AnimStyleTag[]
  /** 适用场景描述 */
  scene: string
  /** 推荐标签 */
  tags: string[]
  /** 默认参数 */
  params: AnimParams
  /** 兼容的元素类型 */
  compatible_elements: ('text' | 'image' | 'shape' | 'page')[]
  /** 预览规格（卡片上的实时动画演示） */
  preview: {
    /** 预览内容（文字或图形） */
    content: string
    kind: 'text' | 'shape' | 'image' | 'page'
    /** 应用到预览的动画类型 */
    anim: AnimType
    /** 背景动效预览（category=background 时用） */
    fx?: BackgroundFxType
    /** 封面预览（category=opening 时用） */
    cover?: CoverStyle
  }
  configuration: Record<string, unknown>
  license_information: string
  /** 平台内置素材 */
  source_type: 'builtin' | 'user'
}

/** 音乐分类 */
export type MusicCategory =
  | 'wedding'
  | 'chinese'
  | 'birthday'
  | 'birthday-elder'
  | 'baby'
  | 'graduation'
  | 'business'
  | 'festival'

/** 音乐条目 */
export interface MusicTrack {
  music_id: string
  music_name: string
  music_category: MusicCategory
  music_style: string
  audio_url: string
  cover_url: string
  /** 秒 */
  duration: number
  mood_tags: string[]
  /** 有可靠数据时提供 */
  tempo_metadata?: { bpm?: number; key?: string }
  license_information: string
  source_type: 'builtin' | 'user'
  /** 适用场景描述 */
  scene: string
  /** 用户上传音乐的附加配置 */
  trim?: { start: number; end: number }
  fadeIn?: number
  fadeOut?: number
}

/** 动态主题方案（可保存复用的完整动画+音乐组合） */
export interface DynamicThemeScheme {
  id: string
  name: string
  description: string
  /** 来源：AI 推荐 / 规则推荐 / 用户自定义 */
  source: 'ai' | 'rule' | 'user'
  /** 适配的宴会场景 */
  fitCategories: EventCategory[]
  fitStyles: AnimStyleTag[]
  /** 开场动画 */
  opening: string
  /** 页面转场动画 */
  transition: string
  /** 文字动画 */
  textAnim: string
  /** 背景动画（fx 类型） */
  backgroundFx: BackgroundFxType
  /** 图片动画 */
  imageAnim: string
  /** 结束动画 */
  ending: string
  /** 音乐 id（builtin:xxx 或 user:xxx 或 URL） */
  musicId: string
  musicName: string
  /** 元素级动画时间安排 */
  timeline: { role: string; anim: AnimType; delay: number; duration: number }[]
  /** 推荐理由 */
  reason: string
  /** 整体氛围说明 */
  mood: string
  createdAt: number
  /** 用户收藏（动画/音乐/方案） */
}

/** 收藏条目 */
export interface FavoriteItem {
  id: number
  itemType: 'animation' | 'music' | 'scheme'
  itemId: string
  createdAt: string
}

export interface DesignDoc {
  id: string
  name: string
  category: EventCategory
  style: StyleTag
  orientation: Orientation
  canvas: CanvasSpec
  elements: DesignElement[]
  eventInfo: EventInfo
  /** 动态电子请帖展示配置 */
  presentation: PresentationConfig
  createdAt: number
  updatedAt: number
}

/* ---------------- 模板元数据 ---------------- */

export interface TemplateMeta {
  id: string
  name: string
  category: EventCategory
  style: StyleTag
  color: ColorTag
  orientation: Orientation
  /** static = 静态请帖；animated = 电子请帖（带打开动画） */
  type: 'static' | 'animated'
  scene: string
  build: () => DesignDoc
}

/* ---------------- 导出 ---------------- */

export type ExportFormat = 'png' | 'jpeg'

export interface ExportPreset {
  id: string
  label: string
  description: string
  width: number
  height: number
}

/* ---------------- 电子请帖 / RSVP ---------------- */

export type RsvpStatus = 'attend' | 'decline' | 'maybe'

export interface GuestResponse {
  id: number
  invitationId: number
  guestName: string
  /** 宾客联系电话（必填，11 位手机号） */
  phone: string
  status: RsvpStatus
  partySize: number
  message: string
  createdAt: string
}

export interface InvitationRecord {
  id: number
  projectId: number
  shareSlug: string
  title: string
  /** 分享卡片描述（Open Graph description），可空 */
  shareDesc: string | null
  /** 分享卡片封面图（data URL），可空；空时回退项目缩略图 */
  coverImage: string | null
  isPublic: boolean
  accessPassword: string | null
  expiresAt: string | null
  visitCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectRecord {
  id: number
  name: string
  category: EventCategory
  style: StyleTag
  orientation: Orientation
  canvasWidth: number
  canvasHeight: number
  background: BackgroundSpec
  eventInfo: EventInfo
  presentation: PresentationConfig
  thumbnail: string | null
  status: string
  createdAt: string
  updatedAt: string
  elements: DesignElement[]
  invitation?: InvitationRecord | null
}

/* ---------------- 通用 ---------------- */

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

export const EMPTY_EVENT_INFO: EventInfo = {
  eventName: '',
  eventType: 'other',
  hostName: '',
  guestName: '',
  date: '',
  time: '',
  venue: '',
  address: '',
  phone: '',
  inviteText: '',
  note: '',
}
