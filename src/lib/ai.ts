import { cloud, cloudErrorMessage } from './cloud'
import type { DesignDoc, EventCategory, EventInfo, Orientation, StyleTag } from '@/types'
import { FONTS, createDesign, linear, makeShape, makeText, applyEventInfoToDesign, createEventInfo } from './design'

/* ============================================================
 * AI 能力
 *  - 文案生成：5 种风格的宴会邀请文案
 *  - 设计意图解析：自然语言 → 风格 / 配色 / 布局 / 模板推荐
 *  - AI 一键成帖：输出**可编辑图层**的完整设计（非图片）
 *
 * 大模型只负责「决定做什么」（内容、气质、配色、装饰母题），
 * 版式与坐标由本地排版引擎计算 —— 保证产出一定是对齐、可编辑、
 * 不会错位的真实图层结构。
 * ============================================================ */

export type CopyStyle = 'formal' | 'warm' | 'minimal' | 'traditional' | 'playful'

export const COPY_STYLES: { id: CopyStyle; label: string; desc: string }[] = [
  { id: 'formal', label: '正式庄重', desc: '措辞典雅，适合商务与长辈' },
  { id: 'warm', label: '温馨亲切', desc: '像朋友说话，轻松自然' },
  { id: 'minimal', label: '简约高级', desc: '克制留白，现代质感' },
  { id: 'traditional', label: '传统中式', desc: '文言韵味，古风请柬' },
  { id: 'playful', label: '活泼有趣', desc: '俏皮可爱，适合年轻人' },
]

export interface AiCopyResult {
  text: string
  source: 'llm' | 'builtin'
}

export interface AiDesignPlan {
  name: string
  category: EventCategory
  style: StyleTag
  orientation: Orientation
  palette: {
    background: string
    background2: string
    primary: string
    accent: string
    text: string
    muted: string
  }
  titleFont: 'serif' | 'sans' | 'brush' | 'cute' | 'display' | 'hand'
  decorations: ('frame' | 'divider' | 'corners' | 'clouds' | 'blooms' | 'ring' | 'band')[]
  title: string
  subtitle: string
  inviteText: string
  reasoning: string
}

/* ---------------- 模型选取 ---------------- */

let cachedModelId: string | null = null
let modelResolved = false

export async function resolveModel(): Promise<string | null> {
  if (modelResolved) return cachedModelId
  try {
    const models = (await cloud.llm.models.list()) as { id: string; disabled?: boolean; enabled?: boolean }[]
    const usable = models.find((m) => m.disabled !== true && m.enabled !== false) ?? null
    cachedModelId = usable?.id ?? null
    modelResolved = true
    return cachedModelId
  } catch {
    modelResolved = true
    return null
  }
}

export async function chat(system: string, user: string): Promise<string | null> {
  const model = await resolveModel()
  if (!model) return null
  let out = ''
  try {
    for await (const chunk of cloud.llm.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: true,
      temperature: 0.8,
    })) {
      const delta = chunk?.choices?.[0]?.delta
      if (delta?.content) out += delta.content
    }
    return out.trim() || null
  } catch (error) {
    console.warn('[ai] llm call failed:', cloudErrorMessage(error))
    return null
  }
}

/** 从模型输出里稳妥地抠出 JSON 对象 */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

/* ---------------- 1) 邀请文案生成 ---------------- */

const COPY_SYSTEM = `你是资深宴会请柬文案专家。根据用户提供的宴会信息，撰写一段中文邀请文案。
要求：
- 只输出文案正文本身，不要解释、不要引号、不要标题
- 长度 60–120 字，可含换行分段
- 严格贴合用户指定的语气风格
- 不编造用户未提供的具体人名、地址、时间
- 语言得体、有画面感`

function builtinCopy(info: EventInfo, style: CopyStyle): string {
  const host = info.hostName || '主人家'
  const date = info.date || '良辰吉日'
  const venue = info.venue || '宴会厅'
  const typeText: Record<EventCategory, string> = {
    wedding: '喜结连理',
    birthday: '生辰庆典',
    longevity: '寿辰庆典',
    fullmoon: '满月之喜',
    graduation: '升学之喜',
    housewarming: '乔迁之喜',
    business: '商务雅集',
    festival: '节庆欢聚',
    other: '欢聚一堂',
  }
  const theme = typeText[info.eventType] || '欢聚一堂'
  switch (style) {
    case 'formal':
      return `谨定于 ${date}，于 ${venue} 举行${theme}。\n诚邀您拨冗莅临，共襄盛举，同贺美好。\n敬候台光。`
    case 'warm':
      return `${host} 想把这份喜悦第一时间分享给你！\n${date}，我们在 ${venue} 备好了酒菜和好心情。\n来坐坐吧，有你在场才算圆满。`
    case 'minimal':
      return `${theme}\n${date} · ${venue}\n诚邀您的到来。`
    case 'traditional':
      return `谨詹于 ${date}，假座 ${venue}，聊备菲酌。\n恭请阖第光临，不胜荣幸之至。`
    case 'playful':
      return `叮！${host} 的${主题短语(info.eventType)}邀请已送达 🎉\n时间：${date}\n地点：${venue}\n带上好胃口和好心情，就差你啦！`
    default:
      return `诚邀您于 ${date} 光临 ${venue}，共赴${theme}。`
  }
}

function 主题短语(t: EventCategory): string {
  const m: Record<EventCategory, string> = {
    wedding: '婚礼派对',
    birthday: '生日派对',
    longevity: '寿宴',
    fullmoon: '满月酒',
    graduation: '升学宴',
    housewarming: '暖房趴',
    business: '商务宴',
    festival: '节日聚会',
    other: '聚会',
  }
  return m[t] || '聚会'
}

export async function generateInviteCopy(info: EventInfo, style: CopyStyle): Promise<AiCopyResult> {
  const user = `宴会类型：${info.eventType}
宴会名称：${info.eventName || '（未填）'}
主办人：${info.hostName || '（未填）'}
日期：${info.date || '（未填）'}
时间：${info.time || '（未填）'}
地点：${info.venue || '（未填）'}
地址：${info.address || '（未填）'}
语气风格：${COPY_STYLES.find((s) => s.id === style)?.label ?? style}`
  const raw = await chat(COPY_SYSTEM, user)
  if (raw) {
    const cleaned = raw.replace(/^["'「」]|["'「」]$/g, '').trim()
    if (cleaned) return { text: cleaned, source: 'llm' }
  }
  return { text: builtinCopy(info, style), source: 'builtin' }
}

/* ---------------- 2) 设计意图解析 + 一键成帖 ---------------- */

const DESIGN_SYSTEM = `你是顶尖的宴会请帖设计总监。用户会用自然语言描述想要的请帖，你负责把需求翻译成一份「设计计划」。
只输出一个 JSON 对象，不要任何解释文字，字段如下：
{
  "name": "模板名（10 字内）",
  "category": "wedding|birthday|longevity|fullmoon|graduation|housewarming|business|festival|other",
  "style": "chinese|modern|minimal|vintage|guochao|european|romantic|luxury",
  "orientation": "portrait|landscape|square",
  "palette": {
    "background": "主背景色 hex",
    "background2": "渐变第二色 hex（与 background 构成渐变）",
    "primary": "标题主色 hex",
    "accent": "点缀/装饰色 hex（如金色）",
    "text": "正文色 hex",
    "muted": "次要信息色 hex"
  },
  "titleFont": "serif|sans|brush|cute|display|hand",
  "decorations": ["frame","divider","corners","clouds","blooms","ring","band"] 中挑选 2-4 个,
  "title": "主标题文案（8 字内）",
  "subtitle": "副标题/主宾（16 字内）",
  "inviteText": "邀请正文（60-100 字）",
  "reasoning": "一句话说明设计思路"
}
要求：配色必须高级不俗气；中式婚礼以红金为主但避免大红大绿；文字内容贴合用户描述。`

export async function parseDesignIntent(prompt: string): Promise<{ plan: AiDesignPlan; source: 'llm' | 'builtin' }> {
  const raw = await chat(DESIGN_SYSTEM, prompt)
  const parsed = raw ? extractJson<Partial<AiDesignPlan>>(raw) : null
  if (parsed && parsed.palette && parsed.title) {
    const plan = normalizePlan(parsed, prompt)
    return { plan, source: 'llm' }
  }
  return { plan: builtinPlan(prompt), source: 'builtin' }
}

function normalizePlan(p: Partial<AiDesignPlan>, prompt: string): AiDesignPlan {
  const fallback = builtinPlan(prompt)
  return {
    name: p.name || fallback.name,
    category: (p.category as EventCategory) || fallback.category,
    style: (p.style as StyleTag) || fallback.style,
    orientation: (p.orientation as Orientation) || fallback.orientation,
    palette: {
      background: p.palette?.background || fallback.palette.background,
      background2: p.palette?.background2 || fallback.palette.background2,
      primary: p.palette?.primary || fallback.palette.primary,
      accent: p.palette?.accent || fallback.palette.accent,
      text: p.palette?.text || fallback.palette.text,
      muted: p.palette?.muted || fallback.palette.muted,
    },
    titleFont: (p.titleFont as AiDesignPlan['titleFont']) || fallback.titleFont,
    decorations: Array.isArray(p.decorations) && p.decorations.length ? p.decorations.slice(0, 4) : fallback.decorations,
    title: p.title || fallback.title,
    subtitle: p.subtitle || fallback.subtitle,
    inviteText: p.inviteText || fallback.inviteText,
    reasoning: p.reasoning || fallback.reasoning,
  }
}

/** 规则兜底：即使大模型不可用，也能给出一份合理的设计计划 */
export function builtinPlan(prompt: string): AiDesignPlan {
  const p = prompt.toLowerCase()
  const has = (...kw: string[]) => kw.some((k) => prompt.includes(k) || p.includes(k))
  let category: EventCategory = 'other'
  if (has('婚礼', '结婚', '嫁', '娶', 'wedding')) category = 'wedding'
  else if (has('生日', '生日宴', 'birthday')) category = 'birthday'
  else if (has('寿', '寿宴', '大寿', '寿辰')) category = 'longevity'
  else if (has('满月', '百日')) category = 'fullmoon'
  else if (has('升学', '金榜', '毕业', '谢师')) category = 'graduation'
  else if (has('乔迁', '搬家', '暖房', '新居')) category = 'housewarming'
  else if (has('商务', '公司', '企业', '年会', '答谢')) category = 'business'
  else if (has('中秋', '春节', '新年', '节日', '团圆')) category = 'festival'

  let style: StyleTag = 'modern'
  if (has('中式', '国潮', '传统', '喜庆', '红金')) style = has('国潮') ? 'guochao' : 'chinese'
  else if (has('简约', '极简', '简单')) style = 'minimal'
  else if (has('浪漫', '粉', '唯美', '樱花')) style = 'romantic'
  else if (has('欧式', '奢华', '宫廷')) style = 'european'
  else if (has('高级', '质感', '黑金', '低调')) style = 'luxury'
  else if (has('复古', '怀旧')) style = 'vintage'

  const palettes: Record<StyleTag, AiDesignPlan['palette']> = {
    chinese: { background: '#8E2218', background2: '#B23428', primary: '#F0C86A', accent: '#E8C87A', text: '#FFE4C0', muted: '#E0B98B' },
    guochao: { background: '#A32C22', background2: '#7E1B14', primary: '#F0C86A', accent: '#F0C86A', text: '#FFE9BE', muted: '#E3B98F' },
    modern: { background: '#FBFAF8', background2: '#EFEAE3', primary: '#22201E', accent: '#B98D22', text: '#4B4744', muted: '#8A8480' },
    minimal: { background: '#FFFFFF', background2: '#F3F0EC', primary: '#111111', accent: '#8A8A8A', text: '#333333', muted: '#9A9A9A' },
    romantic: { background: '#FDF2F4', background2: '#F3C3CE', primary: '#C2576A', accent: '#E88D9C', text: '#7A5A60', muted: '#B58C93' },
    european: { background: '#FBF6EA', background2: '#EFE2C6', primary: '#5C4322', accent: '#A9822F', text: '#6B5636', muted: '#A48B63' },
    luxury: { background: '#1A1613', background2: '#33291F', primary: '#F0E3C0', accent: '#D4AF37', text: '#C9BC9B', muted: '#9A8C6C' },
    vintage: { background: '#F3E9D8', background2: '#E2CFAE', primary: '#5C4322', accent: '#A9822F', text: '#6B5636', muted: '#A48B63' },
  }

  const titleMap: Record<EventCategory, string> = {
    wedding: '我们结婚啦',
    birthday: '生日快乐',
    longevity: '寿辰之喜',
    fullmoon: '满月之喜',
    graduation: '金榜题名',
    housewarming: '乔迁之喜',
    business: '诚邀莅临',
    festival: '欢度佳节',
    other: '诚邀光临',
  }

  return {
    name: 'AI 智能设计',
    category,
    style,
    orientation: has('横版', '横着', 'landscape') ? 'landscape' : 'portrait',
    palette: palettes[style],
    titleFont: style === 'chinese' || style === 'guochao' ? 'brush' : style === 'romantic' ? 'cute' : style === 'luxury' ? 'serif' : 'display',
    decorations:
      style === 'chinese' || style === 'guochao'
        ? ['frame', 'clouds', 'divider']
        : style === 'luxury'
          ? ['frame', 'ring', 'divider']
          : style === 'romantic'
            ? ['blooms', 'ring', 'divider']
            : ['frame', 'corners', 'divider'],
    title: titleMap[category],
    subtitle: '诚邀您的到来',
    inviteText:
      category === 'wedding'
        ? '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。'
        : '诚挚邀请您拨冗莅临，共享美好时光。\n您的到来，是我们最大的荣幸。',
    reasoning: `依据描述识别为「${category}」场景、${style} 风格，采用相应配色与装饰母题。`,
  }
}

/** 把设计计划渲染成一份真正可编辑的 DesignDoc（图层 + 坐标完整） */
export function buildDesignFromPlan(plan: AiDesignPlan, eventInfo?: Partial<EventInfo>): DesignDoc {
  const W = plan.orientation === 'landscape' ? 1920 : 1080
  const H = plan.orientation === 'landscape' ? 1080 : plan.orientation === 'square' ? 1080 : 1920
  const M = plan.orientation === 'landscape' ? 110 : 72
  const inner = W - M * 2
  const cx = (w: number) => (W - w) / 2
  const P = plan.palette
  const titleFont = FONTS[plan.titleFont] || FONTS.serif
  const bodyFont = plan.style === 'chinese' || plan.style === 'guochao' ? FONTS.serif : FONTS.sans

  const els: Parameters<typeof createDesign>[0]['elements'] = []

  // 装饰
  if (plan.decorations.includes('frame')) {
    els.push(
      makeShape({
        shape: 'rect',
        name: '外框',
        x: 46,
        y: 46,
        width: W - 92,
        height: H - 92,
        fill: 'transparent',
        stroke: P.accent,
        strokeWidth: 3,
        opacity: 0.9,
        locked: true,
      }),
    )
  }
  if (plan.decorations.includes('corners')) {
    const s = 26
    const inset = 92
    for (const [x, y, n] of [
      [inset, inset, '角饰·左上'],
      [W - inset - s, inset, '角饰·右上'],
      [inset, H - inset - s, '角饰·左下'],
      [W - inset - s, H - inset - s, '角饰·右下'],
    ] as [number, number, string][]) {
      els.push(makeShape({ shape: 'diamond', name: n, x, y, width: s, height: s, fill: P.accent, opacity: 0.9 }))
    }
  }
  if (plan.decorations.includes('ring')) {
    const r = Math.min(W, H) * 0.28
    els.push(
      makeShape({
        shape: 'ring',
        name: '光环',
        x: cx(r),
        y: H * 0.14,
        width: r,
        height: r,
        fill: 'transparent',
        stroke: P.accent,
        strokeWidth: 2,
        opacity: 0.5,
      }),
    )
  }
  if (plan.decorations.includes('clouds')) {
    for (const [x, y] of [
      [W * 0.2, H * 0.12],
      [W * 0.68, H * 0.16],
      [W * 0.24, H * 0.88],
    ]) {
      els.push(
        makeShape({ shape: 'ellipse', name: '祥云', x: x - 90, y: y - 30, width: 180, height: 60, fill: 'transparent', stroke: P.accent, strokeWidth: 2, opacity: 0.4 }),
        makeShape({ shape: 'ellipse', name: '祥云', x: x - 55, y: y - 48, width: 100, height: 50, fill: 'transparent', stroke: P.accent, strokeWidth: 2, opacity: 0.32 }),
      )
    }
  }
  if (plan.decorations.includes('blooms')) {
    for (const [x, y, s] of [
      [W * 0.16, H * 0.12, 130],
      [W * 0.84, H * 0.2, 110],
      [W * 0.18, H * 0.88, 120],
    ]) {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        els.push(
          makeShape({
            shape: 'ellipse',
            name: '花瓣',
            x: x + Math.cos(a) * s * 0.34 - s * 0.22,
            y: y + Math.sin(a) * s * 0.34 - s * 0.16,
            width: s * 0.44,
            height: s * 0.32,
            fill: P.accent,
            opacity: 0.85,
          }),
        )
      }
      els.push(makeShape({ shape: 'ellipse', name: '花心', x: x - s * 0.16, y: y - s * 0.16, width: s * 0.32, height: s * 0.32, fill: P.primary, opacity: 0.95 }))
    }
  }
  if (plan.decorations.includes('band')) {
    els.push(makeShape({ shape: 'rect', name: '顶部色带', x: 0, y: 0, width: W, height: 14, fill: P.accent, locked: true }))
    els.push(makeShape({ shape: 'rect', name: '底部色带', x: 0, y: H - 14, width: W, height: 14, fill: P.accent, locked: true }))
  }

  // 文案区
  const baseY = plan.orientation === 'landscape' ? H * 0.18 : H * 0.16
  els.push(
    makeText({
      text: plan.title,
      name: '主标题',
      role: 'title',
      x: M,
      y: baseY,
      width: inner,
      height: 150,
      fontFamily: titleFont,
      fontSize: plan.orientation === 'landscape' ? 88 : 100,
      fontWeight: 'bold',
      fill: P.primary,
      textAlign: 'center',
      lineHeight: 1.3,
    }),
    makeText({
      text: plan.subtitle,
      name: '副标题',
      role: 'host',
      x: M,
      y: baseY + 170,
      width: inner,
      height: 80,
      fontFamily: bodyFont,
      fontSize: plan.orientation === 'landscape' ? 40 : 52,
      fill: P.accent,
      textAlign: 'center',
      charSpacing: 300,
    }),
  )

  const divY = baseY + 300
  if (plan.decorations.includes('divider')) {
    els.push(
      makeShape({ shape: 'rect', name: '分隔线', x: cx(inner - 120) + 60, y: divY, width: inner - 120, height: 2, fill: P.accent, opacity: 0.85 }),
      makeShape({ shape: 'diamond', name: '分隔装饰左', x: cx(inner) + 24, y: divY - 8, width: 18, height: 18, fill: P.accent }),
      makeShape({ shape: 'diamond', name: '分隔装饰右', x: cx(inner) + inner - 42, y: divY - 8, width: 18, height: 18, fill: P.accent }),
    )
  }

  const infoY = divY + 70
  const rows: { role: 'date' | 'time' | 'venue' | 'address' | 'contact' | 'inviteText'; text: string; size: number; color: string; h: number }[] = [
    { role: 'date', text: '2026年10月1日 星期四', size: 42, color: P.primary, h: 64 },
    { role: 'time', text: '晚上 6 点整', size: 32, color: P.text, h: 54 },
    { role: 'venue', text: '锦江大酒店 · 三层牡丹厅', size: 36, color: P.primary, h: 58 },
    { role: 'address', text: '上海市黄浦区南京东路 88 号', size: 26, color: P.muted, h: 48 },
    { role: 'inviteText', text: plan.inviteText, size: 28, color: P.text, h: 170 },
    { role: 'contact', text: '联系电话 138 0000 0000', size: 24, color: P.muted, h: 46 },
  ]
  let y = infoY
  for (const row of rows) {
    els.push(
      makeText({
        text: row.text,
        name: row.role === 'inviteText' ? '邀请文案' : row.role === 'date' ? '宴会日期' : row.role === 'time' ? '宴会时间' : row.role === 'venue' ? '宴会地点' : row.role === 'address' ? '详细地址' : '联系方式',
        role: row.role,
        x: M + (row.role === 'inviteText' ? 40 : 0),
        y,
        width: inner - (row.role === 'inviteText' ? 80 : 0),
        height: row.h,
        fontFamily: bodyFont,
        fontSize: row.size,
        fontWeight: row.role === 'date' || row.role === 'venue' ? 'bold' : 'normal',
        fill: row.color,
        textAlign: 'center',
        lineHeight: 1.85,
      }),
    )
    y += row.h + 18
  }

  const doc = createDesign({
    name: plan.name,
    category: plan.category,
    style: plan.style,
    orientation: plan.orientation,
    background: {
      type: 'gradient',
      gradient: linear(165, [
        { offset: 0, color: P.background },
        { offset: 1, color: P.background2 },
      ]),
      opacity: 1,
    },
    elements: els,
    eventInfo: createEventInfo({ eventType: plan.category }),
  })
  return eventInfo ? applyEventInfoToDesign(doc, { ...doc.eventInfo, ...eventInfo }) : doc
}

export { cloudErrorMessage }
