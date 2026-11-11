/* ============================================================
 * AI 智能搭配引擎 —— 分析请帖 → 生成完整「动态主题方案」
 *
 * 优先使用真实 LLM（云服务免密钥模型）；不可用时降级为
 * 规则推荐引擎。source 字段明确标注 'ai' 或 'rule'，
 * 不把固定规则伪装成 AI 分析。
 * ============================================================ */

import type {
  AnimStyleTag,
  AnimType,
  BackgroundFxType,
  DesignDoc,
  DynamicThemeScheme,
  EventCategory,
  MusicTrack,
} from '@/types'
import { ANIMATION_LIBRARY, getAnimation } from '@/data/animation-library'
import { MUSIC_LIBRARY } from '@/data/music-library'
import { uid } from './id'

export interface MatchInput {
  doc: DesignDoc
  /** 用户偏好（可选） */
  preferences?: { style?: string; motion?: string; music?: string }
  /** 额外氛围描述（用户输入） */
  moodHint?: string
}

export interface MatchResult {
  scheme: DynamicThemeScheme
  /** 详细推荐动画清单 */
  picks: {
    role: string
    animId: string
    animName: string
    reason: string
  }[]
  /** 推荐音乐详情 */
  music: MusicTrack | null
  musicReason: string
  /** 分析摘要 */
  analysis: {
    category: EventCategory
    styleLabel: string
    mood: string
    colors: string[]
    richness: 'simple' | 'balanced' | 'rich'
    source: 'ai' | 'rule'
  }
}

/* ---------------- 风格画像映射 ---------------- */

const CATEGORY_STYLE: Record<EventCategory, AnimStyleTag[]> = {
  wedding: ['western-romantic', 'garden'],
  birthday: ['cute', 'festive'],
  longevity: ['chinese', 'neo-chinese'],
  fullmoon: ['cute', 'garden'],
  graduation: ['fresh', 'minimal'],
  housewarming: ['fresh', 'minimal'],
  business: ['business', 'luxury-gold'],
  festival: ['festive', 'guochao'],
  other: ['minimal'],
}

/** 模板 style → 动画风格标签 */
function styleToAnimStyle(style: string): AnimStyleTag[] {
  const map: Record<string, AnimStyleTag[]> = {
    chinese: ['chinese', 'neo-chinese'],
    modern: ['minimal', 'fresh'],
    minimal: ['minimal', 'luxury-gold'],
    vintage: ['vintage', 'chinese'],
    guochao: ['guochao', 'chinese'],
    european: ['western-romantic', 'vintage'],
    romantic: ['western-romantic', 'garden'],
    luxury: ['luxury-gold', 'minimal'],
  }
  return map[style] ?? ['minimal']
}

/** 主色分析：从元素填充中提取主色调 */
function analyzeColors(doc: DesignDoc): string[] {
  const counts = new Map<string, number>()
  for (const el of doc.elements) {
    const fill = el.type === 'text' ? el.fill : el.type === 'shape' ? el.fill : null
    if (typeof fill === 'string' && fill.startsWith('#')) {
      counts.set(fill.toUpperCase(), (counts.get(fill.toUpperCase()) ?? 0) + 1)
    }
    if (el.type === 'image') {
      // 图片元素计入「多彩」
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c)
}

function isRedGold(colors: string[]): boolean {
  return colors.some((c) => /^#(C|8|B|E|F)[0-9A-F]?(2|3|4|1)[0-9A-F]{2,3}$/i.test(c) || c.startsWith('#C2') || c.startsWith('#8B'))
}

/* ---------------- 规则推荐引擎 ---------------- */

function pickByStyle(pool: typeof ANIMATION_LIBRARY, styles: AnimStyleTag[], category: string, fallbackId: string): string {
  const candidates = pool.filter((a) => a.animation_category === category && a.animation_style.some((s) => styles.includes(s)))
  if (candidates.length > 0) {
    // 避免总推荐同一个：按名称简单散列挑一个
    const idx = Math.abs(hashStr(category + styles.join())) % candidates.length
    return candidates[idx].animation_id
  }
  const catAny = pool.filter((a) => a.animation_category === category)
  return catAny.length > 0 ? catAny[0].animation_id : fallbackId
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

function pickMusic(category: EventCategory, styles: AnimStyleTag[], moodHint: string): { track: MusicTrack | null; reason: string } {
  // 场景 → 音乐分类
  const catMap: Partial<Record<EventCategory, string[]>> = {
    wedding: ['wedding', 'chinese'],
    birthday: ['birthday'],
    longevity: ['birthday-elder', 'chinese'],
    fullmoon: ['baby'],
    graduation: ['graduation'],
    housewarming: ['festival'],
    business: ['business'],
    festival: ['festival', 'chinese'],
    other: ['wedding', 'festival'],
  }
  const wanted = catMap[category] ?? ['wedding']
  let pool = MUSIC_LIBRARY.filter((m) => wanted.includes(m.music_category))

  // 中式视觉优先中式音乐
  if (styles.includes('chinese') || styles.includes('guochao') || styles.includes('neo-chinese')) {
    const chinese = pool.filter((m) => m.music_category === 'chinese')
    if (chinese.length > 0) pool = chinese
  }
  if (styles.includes('business')) {
    const biz = pool.filter((m) => m.music_category === 'business')
    if (biz.length > 0) pool = biz
  }

  // 情绪偏好微调
  const hint = moodHint || ''
  if (hint.includes('轻快') || hint.includes('活泼')) {
    const lively = pool.filter((m) => m.mood_tags.includes('轻快') || m.mood_tags.includes('活泼'))
    if (lively.length > 0) pool = lively
  } else if (hint.includes('庄重') || hint.includes('正式')) {
    const solemn = pool.filter((m) => m.mood_tags.includes('庄重') || m.mood_tags.includes('典雅'))
    if (solemn.length > 0) pool = solemn
  } else if (hint.includes('浪漫')) {
    const roman = pool.filter((m) => m.mood_tags.includes('浪漫'))
    if (roman.length > 0) pool = roman
  }

  if (pool.length === 0) {
    return { track: MUSIC_LIBRARY[0] ?? null, reason: '没有完全匹配的曲目，为您选择了风格最接近的通用配乐。' }
  }
  const idx = Math.abs(hashStr(category + styles.join() + hint)) % pool.length
  return {
    track: pool[idx],
    reason: `音乐的${pool[idx].music_style}风格与请帖的${styles.map((s) => s).join('、')}视觉相协调，情绪标签「${pool[idx].mood_tags.join('、')}」契合宴会氛围。`,
  }
}

/** 智能避免动画过多：页面越丰富，动画越克制 */
function assessRichness(doc: DesignDoc): 'simple' | 'balanced' | 'rich' {
  const textCount = doc.elements.filter((e) => e.type === 'text').length
  const imageCount = doc.elements.filter((e) => e.type === 'image').length
  const total = doc.elements.length
  if (total >= 14 || textCount >= 8 || imageCount >= 5) return 'rich'
  if (total >= 8) return 'balanced'
  return 'simple'
}

function ruleMatch(input: MatchInput): MatchResult {
  const { doc, preferences = {}, moodHint = '' } = input
  const styles = [...styleToAnimStyle(doc.style), ...(CATEGORY_STYLE[doc.category] ?? [])]
  const colors = analyzeColors(doc)
  const richness = assessRichness(doc)

  // 红金中式婚庆强化
  const chineseBias = styles.includes('chinese') || styles.includes('guochao') || (doc.category === 'wedding' && isRedGold(colors))
  const effectiveStyles: AnimStyleTag[] = chineseBias ? ['chinese', 'guochao', 'neo-chinese', ...styles] : styles

  // 用户偏好加权
  if (preferences.style === 'traditional') effectiveStyles.unshift('chinese', 'guochao')
  if (preferences.style === 'minimal') effectiveStyles.unshift('minimal')
  if (preferences.style === 'romantic') effectiveStyles.unshift('western-romantic', 'garden')

  const opening = pickByStyle(ANIMATION_LIBRARY, effectiveStyles, 'opening', 'open-envelope-cn')
  const transition = pickByStyle(ANIMATION_LIBRARY, effectiveStyles, 'transition', 'trans-fade')
  const textAnim = pickByStyle(ANIMATION_LIBRARY, effectiveStyles, 'text', 'text-fade-up')
  const imageAnim = pickByStyle(ANIMATION_LIBRARY, effectiveStyles, 'image', 'img-fade-in')
  const ending = pickByStyle(ANIMATION_LIBRARY, effectiveStyles, 'ending', 'end-thanks')

  // 背景动效：避免过多——richness 重时选轻量
  let backgroundFx: BackgroundFxType = 'gold'
  if (chineseBias) backgroundFx = richness === 'rich' ? 'fireflies' : 'gold'
  else if (effectiveStyles.includes('garden')) backgroundFx = richness === 'rich' ? 'bokeh' : 'petals'
  else if (effectiveStyles.includes('western-romantic')) backgroundFx = 'stars'
  else if (effectiveStyles.includes('business') || effectiveStyles.includes('minimal')) backgroundFx = 'lightflow'
  else if (effectiveStyles.includes('cute') || effectiveStyles.includes('festive')) backgroundFx = 'confetti'
  if (preferences.motion === 'simple') backgroundFx = 'bokeh'

  const musicPick = pickMusic(doc.category, effectiveStyles, moodHint)

  // 时间安排：标题 → 姓名 → 文案 → 日期地点 → 结束
  const timeline: DynamicThemeScheme['timeline'] = [
    { role: 'title', anim: chineseBias ? 'glow' : 'fade', delay: 300, duration: 900 },
    { role: 'host', anim: 'slide-up', delay: 700, duration: 800 },
    { role: 'inviteText', anim: 'fade', delay: 1100, duration: 900 },
    { role: 'date', anim: 'zoom-out', delay: 1500, duration: 750 },
    { role: 'venue', anim: 'slide-up', delay: 1800, duration: 800 },
    { role: 'ending', anim: 'fade', delay: 2300, duration: 900 },
  ]

  const reason = [
    `根据「${doc.name}」的${doc.category}类型与${doc.style}风格，`,
    chineseBias ? '红金/中式视觉与传统仪式感，' : '',
    `为您搭配${getAnimation(opening)?.animation_name ?? '信封'}开场、`,
    `${getAnimation(transition)?.animation_name ?? '淡入'}转场、`,
    `${backgroundFx}背景动效。`,
    richness === 'rich' ? '页面元素较丰富，已刻意精简动画层次以保持高级感。' : '',
  ].join('')

  const mood = `整体氛围：${chineseBias ? '传统喜庆、庄重典雅' : effectiveStyles.includes('business') ? '高端克制、商务尊贵' : '温馨浪漫、自然流畅'}`

  const scheme: DynamicThemeScheme = {
    id: uid('scheme'),
    name: `${doc.eventInfo.eventName || doc.name} · 动态方案`,
    description: reason,
    source: 'rule',
    fitCategories: [doc.category],
    fitStyles: effectiveStyles.slice(0, 3),
    opening,
    transition,
    textAnim,
    backgroundFx,
    imageAnim,
    ending,
    musicId: musicPick.track?.audio_url ?? '',
    musicName: musicPick.track?.music_name ?? '',
    timeline,
    reason,
    mood,
    createdAt: Date.now(),
  }

  return {
    scheme,
    picks: [
      { role: '开场', animId: opening, animName: getAnimation(opening)?.animation_name ?? '', reason: '奠定第一印象与主题基调' },
      { role: '转场', animId: transition, animName: getAnimation(transition)?.animation_name ?? '', reason: '衔接各段内容，节奏流畅' },
      { role: '文字', animId: textAnim, animName: getAnimation(textAnim)?.animation_name ?? '', reason: '保证文字清晰可读的轻量动效' },
      { role: '图片', animId: imageAnim, animName: getAnimation(imageAnim)?.animation_name ?? '', reason: '照片展示层次感' },
      { role: '背景', animId: `bg:${backgroundFx}`, animName: backgroundFx, reason: '与主色协调、不抢主体' },
      { role: '结束', animId: ending, animName: getAnimation(ending)?.animation_name ?? '', reason: '优雅收束、引导回执' },
    ],
    music: musicPick.track,
    musicReason: musicPick.reason,
    analysis: {
      category: doc.category,
      styleLabel: doc.style,
      mood,
      colors,
      richness,
      source: 'rule',
    },
  }
}

/* ---------------- LLM 增强推荐（可选） ---------------- */

async function llmMatch(input: MatchInput): Promise<MatchResult | null> {
  try {
    const { chat, extractJson } = await import('./ai')
    const doc = input.doc
    const animIds = ANIMATION_LIBRARY.map((a) => `${a.animation_id}(${a.animation_name}/${a.animation_category})`).join('，')
    const musicIds = MUSIC_LIBRARY.map((m) => `${m.music_id}(${m.music_name}/${m.music_category})`).join('，')

    const sys =
      '你是电子请帖动态设计专家。根据请帖信息从给定素材库中挑选动画与音乐，输出 JSON。只能使用给出的 id，不得虚构。输出格式：{"opening":"id","transition":"id","textAnim":"id","backgroundFx":"petals|gold|stars|snow|confetti|bokeh|clouds|ribbons|candles|butterflies|balloons|streamers|ripples|fireflies|lightflow|sakura|starflow","imageAnim":"id","ending":"id","musicId":"id","reason":"推荐理由","mood":"整体氛围说明"}'
    const user = `宴会类型:${doc.category}；风格:${doc.style}；标题:${doc.eventInfo.eventName}；文案:${doc.eventInfo.inviteText?.slice(0, 80)}` +
      `；主色:${analyzeColors(doc).join(',')}${input.moodHint ? '；氛围偏好:' + input.moodHint : ''}\n\n动画库:${animIds}\n\n音乐库:${musicIds}`

    const raw = await chat(sys, user)
    if (!raw) return null
    const obj = extractJson<Record<string, string>>(raw)
    if (!obj || !obj.opening) return null

    // 校验 id 真实存在
    const validAnim = (id: string) => (getAnimation(id) ? id : '')
    const opening = validAnim(obj.opening) || 'open-envelope-cn'
    const transition = validAnim(obj.transition) || 'trans-fade'
    const textAnim = validAnim(obj.textAnim) || 'text-fade-up'
    const imageAnim = validAnim(obj.imageAnim) || 'img-fade-in'
    const ending = validAnim(obj.ending) || 'end-thanks'
    const bg = (obj.backgroundFx || 'gold') as BackgroundFxType
    const music = MUSIC_LIBRARY.find((m) => m.music_id === obj.musicId || m.audio_url === obj.musicId) ?? null

    const timeline: DynamicThemeScheme['timeline'] = [
      { role: 'title', anim: 'fade', delay: 300, duration: 900 },
      { role: 'host', anim: 'slide-up', delay: 700, duration: 800 },
      { role: 'inviteText', anim: 'fade', delay: 1100, duration: 900 },
      { role: 'date', anim: 'zoom-out', delay: 1500, duration: 750 },
      { role: 'venue', anim: 'slide-up', delay: 1800, duration: 800 },
      { role: 'ending', anim: 'fade', delay: 2300, duration: 900 },
    ]

    const scheme: DynamicThemeScheme = {
      id: uid('scheme'),
      name: `${doc.eventInfo.eventName || doc.name} · AI 动态方案`,
      description: obj.reason || '',
      source: 'ai',
      fitCategories: [doc.category],
      fitStyles: styleToAnimStyle(doc.style),
      opening,
      transition,
      textAnim,
      backgroundFx: bg,
      imageAnim,
      ending,
      musicId: music?.audio_url ?? '',
      musicName: music?.music_name ?? '',
      timeline,
      reason: obj.reason || '',
      mood: obj.mood || '',
      createdAt: Date.now(),
    }

    return {
      scheme,
      picks: [
        { role: '开场', animId: opening, animName: getAnimation(opening)?.animation_name ?? '', reason: 'AI 结合主题选定' },
        { role: '转场', animId: transition, animName: getAnimation(transition)?.animation_name ?? '', reason: 'AI 结合节奏选定' },
        { role: '文字', animId: textAnim, animName: getAnimation(textAnim)?.animation_name ?? '', reason: 'AI 结合可读性选定' },
        { role: '图片', animId: imageAnim, animName: getAnimation(imageAnim)?.animation_name ?? '', reason: 'AI 结合影像呈现选定' },
        { role: '背景', animId: `bg:${bg}`, animName: bg, reason: 'AI 结合主色与丰富度选定' },
        { role: '结束', animId: ending, animName: getAnimation(ending)?.animation_name ?? '', reason: 'AI 结合收束体验选定' },
      ],
      music,
      musicReason: music ? `AI 从授权乐库中选定《${music.music_name}》（${music.music_style}）` : 'AI 未找到完全匹配曲目，建议从乐库手动选择相近风格。',
      analysis: {
        category: doc.category,
        styleLabel: doc.style,
        mood: obj.mood || '',
        colors: analyzeColors(doc),
        richness: assessRichness(doc),
        source: 'ai',
      },
    }
  } catch {
    return null
  }
}

/* ---------------- 对外入口 ---------------- */

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function matchDynamicTheme(input: MatchInput, preferAi = true): Promise<MatchResult> {
  if (preferAi) {
    const ai = await withTimeout(llmMatch(input), 6000)
    if (ai) return ai
  }
  return ruleMatch(input)
}

/** 换一套推荐（扰动种子，避免重复同一方案） */
export async function rematchDynamicTheme(input: MatchInput, salt: number): Promise<MatchResult> {
  const base = await matchDynamicTheme(input, true)
  // 在同类候选中轮换
  const rotate = (id: string, category: string): string => {
    const pool = ANIMATION_LIBRARY.filter((a) => a.animation_category === category)
    if (pool.length === 0) return id
    const i = pool.findIndex((a) => a.animation_id === id)
    return pool[(i + 1 + (salt % (pool.length - 1))) % pool.length].animation_id
  }
  const s = base.scheme
  const scheme: DynamicThemeScheme = {
    ...s,
    id: uid('scheme'),
    opening: rotate(s.opening, 'opening'),
    transition: rotate(s.transition, 'transition'),
    textAnim: rotate(s.textAnim, 'text'),
    imageAnim: rotate(s.imageAnim, 'image'),
    ending: rotate(s.ending, 'ending'),
    reason: s.reason + '（已为您换一套搭配）',
    createdAt: Date.now(),
  }
  return { ...base, scheme }
}

/** 将方案应用到 PresentationConfig（合并进 design.ts 的 applyScheme） */
export function schemeToPresentationPatch(scheme: DynamicThemeScheme): {
  cover: { style: string }
  backgroundFx: { enabled: boolean; type: BackgroundFxType }
  music: { enabled: boolean; src: string; name: string }
  presetName: string
} {
  const openAnim = getAnimation(scheme.opening)
  const coverStyle = (openAnim?.configuration as { coverStyle?: string })?.coverStyle ?? 'card'
  return {
    cover: { style: coverStyle },
    backgroundFx: { enabled: true, type: scheme.backgroundFx },
    music: { enabled: true, src: scheme.musicId, name: scheme.musicName },
    presetName: scheme.name,
  }
}

export type { AnimType }
