import type {
  BackgroundSpec,
  DesignDoc,
  DesignElement,
  EventCategory,
  StyleTag,
  TemplateMeta,
} from '@/types'
import {
  FONTS,
  createDesign,
  linear,
  makeShape,
  makeText,
} from '@/lib/design'
import { TEMPLATES_BATCH2 } from './templates-batch2'
import { TEMPLATES_BATCH3 } from './templates-batch3'

/* ============================================================
 * 共享装饰构件 —— 所有模板都用真实矢量图层拼装，可逐层编辑
 * ============================================================ */

const CW = 1080 // 画布宽
const M = 72 // 安全边距
const INNER = CW - M * 2 // 内容宽 936

/** 金色细边框（外框 + 内框） */
function goldFrame(color: string, opacity = 1): DesignElement[] {
  return [
    makeShape({
      shape: 'rect',
      name: '外框',
      x: 52,
      y: 52,
      width: CW - 104,
      height: 1920 - 104,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 3,
      opacity,
      locked: true,
    }),
    makeShape({
      shape: 'rect',
      name: '内框',
      x: 78,
      y: 78,
      width: CW - 156,
      height: 1920 - 156,
      fill: 'transparent',
      stroke: color,
      strokeWidth: 1,
      opacity: opacity * 0.75,
      locked: true,
    }),
  ]
}

/** 菱形分隔线 */
function divider(y: number, color: string, width = INNER, opacity = 1): DesignElement[] {
  const x = (CW - width) / 2
  return [
    makeShape({
      shape: 'rect',
      name: '分隔线',
      x: x + 60,
      y,
      width: width - 120,
      height: 2,
      fill: color,
      opacity: opacity * 0.85,
    }),
    makeShape({
      shape: 'diamond',
      name: '分隔装饰左',
      x: x + 24,
      y: y - 8,
      width: 18,
      height: 18,
      fill: color,
      opacity,
    }),
    makeShape({
      shape: 'diamond',
      name: '分隔装饰右',
      x: x + width - 42,
      y: y - 8,
      width: 18,
      height: 18,
      fill: color,
      opacity,
    }),
  ]
}

/** 四角花纹（四个小菱形） */
function corners(color: string, inset = 96): DesignElement[] {
  const s = 26
  const mk = (x: number, y: number, name: string): DesignElement =>
    makeShape({ shape: 'diamond', name, x, y, width: s, height: s, fill: color, opacity: 0.9 })
  return [
    mk(inset, inset, '角饰·左上'),
    mk(CW - inset - s, inset, '角饰·右上'),
    mk(inset, 1920 - inset - s, '角饰·左下'),
    mk(CW - inset - s, 1920 - inset - s, '角饰·右下'),
  ]
}

/** 中式祥云弧（用椭圆环近似，可编辑） */
function cloudArc(cx: number, cy: number, color: string, scale = 1, opacity = 0.5): DesignElement[] {
  const w = 180 * scale
  const h = 60 * scale
  return [
    makeShape({ shape: 'ellipse', name: '祥云', x: cx - w / 2, y: cy - h / 2, width: w, height: h, fill: 'transparent', stroke: color, strokeWidth: 2, opacity }),
    makeShape({ shape: 'ellipse', name: '祥云', x: cx - w / 2 + 34 * scale, y: cy - h / 2 - 16 * scale, width: w * 0.55, height: h * 0.8, fill: 'transparent', stroke: color, strokeWidth: 2, opacity }),
  ]
}

/** 花卉装饰（用圆 + 菱形近似花瓣） */
function bloom(x: number, y: number, petal: string, core: string, size = 90, opacity = 0.9): DesignElement[] {
  const els: DesignElement[] = []
  const r = size / 2
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    els.push(
      makeShape({
        shape: 'ellipse',
        name: '花瓣',
        x: x + Math.cos(a) * r * 0.62 - size * 0.22,
        y: y + Math.sin(a) * r * 0.62 - size * 0.16,
        width: size * 0.44,
        height: size * 0.32,
        fill: petal,
        opacity: opacity * 0.9,
      }),
    )
  }
  els.push(
    makeShape({ shape: 'ellipse', name: '花心', x: x - size * 0.16, y: y - size * 0.16, width: size * 0.32, height: size * 0.32, fill: core, opacity }),
  )
  return els
}

/** 标准标题区 */
function titleBlock(
  y: number,
  opts: {
    kicker?: string
    title: string
    names?: string
    kickerColor: string
    titleColor: string
    namesColor: string
    titleFont: string
    namesFont?: string
    titleSize?: number
    namesSize?: number
  },
): DesignElement[] {
  const els: DesignElement[] = []
  if (opts.kicker) {
    els.push(
      makeText({
        text: opts.kicker,
        name: '引言',
        x: M,
        y,
        width: INNER,
        height: 60,
        fontFamily: FONTS.serif,
        fontSize: 34,
        fill: opts.kickerColor,
        textAlign: 'center',
        charSpacing: 800,
      }),
    )
    y += 72
  }
  els.push(
    makeText({
      text: opts.title,
      name: '主标题',
      role: 'title',
      x: M,
      y,
      width: INNER,
      height: 140,
      fontFamily: opts.titleFont,
      fontSize: opts.titleSize ?? 92,
      fill: opts.titleColor,
      textAlign: 'center',
      fontWeight: 'bold',
      lineHeight: 1.25,
    }),
  )
  y += (opts.titleSize ?? 92) * 1.5
  if (opts.names) {
    els.push(
      makeText({
        text: opts.names,
        name: '主宾姓名',
        role: 'host',
        x: M,
        y,
        width: INNER,
        height: 90,
        fontFamily: opts.namesFont ?? FONTS.serif,
        fontSize: opts.namesSize ?? 58,
        fill: opts.namesColor,
        textAlign: 'center',
        charSpacing: 400,
      }),
    )
  }
  return els
}

/** 标准信息区（时间 / 地点 / 文案） */
function infoBlock(
  y: number,
  opts: {
    dateColor: string
    bodyColor: string
    mutedColor: string
    bodyFont: string
    showInvite?: boolean
  },
): DesignElement[] {
  const els: DesignElement[] = []
  els.push(
    makeText({
      text: '2026年10月1日 星期四',
      name: '宴会日期',
      role: 'date',
      x: M,
      y,
      width: INNER,
      height: 66,
      fontFamily: opts.bodyFont,
      fontSize: 44,
      fontWeight: 'bold',
      fill: opts.dateColor,
      textAlign: 'center',
    }),
  )
  y += 76
  els.push(
    makeText({
      text: '晚上 6 点整',
      name: '宴会时间',
      role: 'time',
      x: M,
      y,
      width: INNER,
      height: 56,
      fontFamily: opts.bodyFont,
      fontSize: 36,
      fill: opts.bodyColor,
      textAlign: 'center',
    }),
  )
  y += 82
  els.push(
    makeText({
      text: '锦江大酒店 · 三层牡丹厅',
      name: '宴会地点',
      role: 'venue',
      x: M,
      y,
      width: INNER,
      height: 60,
      fontFamily: opts.bodyFont,
      fontSize: 38,
      fontWeight: 'bold',
      fill: opts.dateColor,
      textAlign: 'center',
    }),
  )
  y += 66
  els.push(
    makeText({
      text: '上海市黄浦区南京东路 88 号',
      name: '详细地址',
      role: 'address',
      x: M,
      y,
      width: INNER,
      height: 52,
      fontFamily: opts.bodyFont,
      fontSize: 28,
      fill: opts.mutedColor,
      textAlign: 'center',
    }),
  )
  y += 88
  if (opts.showInvite !== false) {
    els.push(
      makeText({
        text: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
        name: '邀请文案',
        role: 'inviteText',
        x: M + 40,
        y,
        width: INNER - 80,
        height: 170,
        fontFamily: opts.bodyFont,
        fontSize: 30,
        fill: opts.bodyColor,
        textAlign: 'center',
        lineHeight: 1.85,
      }),
    )
    y += 190
  }
  els.push(
    makeText({
      text: '联系电话 138 0000 0000',
      name: '联系方式',
      role: 'contact',
      x: M,
      y,
      width: INNER,
      height: 48,
      fontFamily: opts.bodyFont,
      fontSize: 26,
      fill: opts.mutedColor,
      textAlign: 'center',
    }),
  )
  return els
}

const bg = (background: BackgroundSpec): BackgroundSpec => background

/* ============================================================
 * 模板构建器
 * ============================================================ */

function weddingChinese(): DesignDoc {
  const gold = '#E8C87A'
  const deepGold = '#C9A227'
  const cream = '#FBEFD6'
  const els: DesignElement[] = [
    ...goldFrame(gold, 0.95),
    ...corners(deepGold, 108),
    ...cloudArc(CW / 2, 300, gold, 1.2, 0.35),
    makeText({
      text: '囍',
      name: '双喜',
      x: M,
      y: 170,
      width: INNER,
      height: 300,
      fontFamily: FONTS.brush,
      fontSize: 240,
      fill: gold,
      textAlign: 'center',
    }),
    ...titleBlock(520, {
      kicker: '谨定于良辰吉日',
      title: '我 们 结 婚 啦',
      names: '陈亦舟 ✕ 林知夏',
      kickerColor: cream,
      titleColor: gold,
      namesColor: cream,
      titleFont: FONTS.brush,
      namesFont: FONTS.serif,
      titleSize: 96,
      namesSize: 54,
    }),
    ...divider(900, gold, INNER, 0.9),
    ...infoBlock(960, {
      dateColor: gold,
      bodyColor: cream,
      mutedColor: '#E7C9A0',
      bodyFont: FONTS.serif,
    }),
    ...divider(1640, gold, INNER, 0.7),
    makeText({
      text: '敬备喜筵 · 恭候驾临',
      name: '落款',
      x: M,
      y: 1690,
      width: INNER,
      height: 60,
      fontFamily: FONTS.brush,
      fontSize: 42,
      fill: gold,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '囍 · 中式红金婚礼',
    category: 'wedding',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(160, [
        { offset: 0, color: '#7E1B14' },
        { offset: 0.5, color: '#A32C22' },
        { offset: 1, color: '#6B150F' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '我们结婚啦',
      eventType: 'wedding',
      hostName: '陈亦舟 ✕ 林知夏',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function weddingModern(): DesignDoc {
  const ink = '#2B2622'
  const gold = '#B98D22'
  const light = '#8A8480'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '细边框',
      x: 70,
      y: 70,
      width: CW - 140,
      height: 1920 - 140,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 1.5,
      opacity: 0.8,
      locked: true,
    }),
    makeText({
      text: 'WEDDING INVITATION',
      name: '英文引言',
      x: M,
      y: 300,
      width: INNER,
      height: 44,
      fontFamily: FONTS.sans,
      fontSize: 24,
      fill: gold,
      textAlign: 'center',
      charSpacing: 1200,
    }),
    ...titleBlock(380, {
      title: '我们要结婚了',
      names: '沈亦白 & 苏念安',
      kickerColor: light,
      titleColor: ink,
      namesColor: gold,
      titleFont: FONTS.serif,
      namesFont: FONTS.serif,
      titleSize: 82,
      namesSize: 50,
    }),
    ...divider(760, gold, 620, 0.9),
    ...infoBlock(830, {
      dateColor: ink,
      bodyColor: '#4B4744',
      mutedColor: light,
      bodyFont: FONTS.sans,
      showInvite: true,
    }),
    makeShape({
      shape: 'rect',
      name: '底饰线',
      x: CW / 2 - 40,
      y: 1700,
      width: 80,
      height: 2,
      fill: gold,
    }),
    makeText({
      text: '期待与你共度这重要的一天',
      name: '落款',
      x: M,
      y: 1730,
      width: INNER,
      height: 52,
      fontFamily: FONTS.serif,
      fontSize: 30,
      fill: light,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '现代简约 · 白金之约',
    category: 'wedding',
    style: 'modern',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#FBFAF8', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '我们要结婚了',
      eventType: 'wedding',
      hostName: '沈亦白 & 苏念安',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function weddingRomantic(): DesignDoc {
  const rose = '#C2576A'
  const deep = '#8C3A4B'
  const els: DesignElement[] = [
    ...bloom(170, 240, '#F2B8C2', '#F6D9A0', 150, 0.95),
    ...bloom(CW - 190, 300, '#EFB0BE', '#F3D08F', 130, 0.9),
    ...bloom(150, 1720, '#F0AABB', '#F6D9A0', 140, 0.9),
    ...bloom(CW - 170, 1680, '#F4C2CC', '#EFC98F', 120, 0.85),
    makeShape({
      shape: 'ellipse',
      name: '柔光圆',
      x: CW / 2 - 420,
      y: 240,
      width: 840,
      height: 1360,
      fill: 'rgba(255,255,255,0.5)',
      opacity: 0.7,
    }),
    ...titleBlock(430, {
      kicker: 'LOVE IS IN THE AIR',
      title: '我们要结婚啦',
      names: '江屿 ✕ 温言',
      kickerColor: deep,
      titleColor: rose,
      namesColor: deep,
      titleFont: FONTS.cute,
      namesFont: FONTS.serif,
      titleSize: 88,
      namesSize: 52,
    }),
    ...divider(880, rose, 560, 0.85),
    ...infoBlock(950, {
      dateColor: deep,
      bodyColor: '#7A5A60',
      mutedColor: '#B58C93',
      bodyFont: FONTS.serif,
    }),
    makeText({
      text: '愿得一心人，白首不相离',
      name: '落款',
      x: M,
      y: 1700,
      width: INNER,
      height: 56,
      fontFamily: FONTS.hand,
      fontSize: 40,
      fill: rose,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '浪漫粉樱 · 樱花之恋',
    category: 'wedding',
    style: 'romantic',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(180, [
        { offset: 0, color: '#FDF2F4' },
        { offset: 0.55, color: '#F8DCE2' },
        { offset: 1, color: '#F3C3CE' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '我们要结婚啦',
      eventType: 'wedding',
      hostName: '江屿 ✕ 温言',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function weddingGuochao(): DesignDoc {
  const gold = '#F0C86A'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '色带顶',
      x: 0,
      y: 0,
      width: CW,
      height: 14,
      fill: gold,
      locked: true,
    }),
    makeShape({
      shape: 'rect',
      name: '色带底',
      x: 0,
      y: 1906,
      width: CW,
      height: 14,
      fill: gold,
      locked: true,
    }),
    ...cloudArc(CW / 2, 250, gold, 1.6, 0.55),
    ...cloudArc(CW / 2, 1700, gold, 1.4, 0.4),
    makeText({
      text: '喜',
      name: '囍字',
      x: CW / 2 - 190,
      y: 250,
      width: 380,
      height: 380,
      fontFamily: FONTS.brush,
      fontSize: 300,
      fill: 'transparent',
      textAlign: 'center',
    }),
    makeShape({
      shape: 'ring',
      name: '囍字底环',
      x: CW / 2 - 200,
      y: 270,
      width: 400,
      height: 400,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 6,
      opacity: 0.9,
    }),
    makeText({
      text: '囍',
      name: '双喜',
      x: CW / 2 - 190,
      y: 320,
      width: 380,
      height: 320,
      fontFamily: FONTS.brush,
      fontSize: 230,
      fill: gold,
      textAlign: 'center',
    }),
    ...titleBlock(760, {
      kicker: '国潮新中式 · 谨订于',
      title: '凤冠霞帔 · 与君同礼',
      names: '顾长安 ✕ 沈青梧',
      kickerColor: gold,
      titleColor: gold,
      namesColor: '#FFE9BE',
      titleFont: FONTS.display,
      namesFont: FONTS.serif,
      titleSize: 72,
      namesSize: 50,
    }),
    ...divider(1130, gold, 700, 0.9),
    ...infoBlock(1200, {
      dateColor: gold,
      bodyColor: '#FFE4C0',
      mutedColor: '#E3B98F',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
  ]
  return createDesign({
    name: '国潮朱红 · 凤冠霞帔',
    category: 'wedding',
    style: 'guochao',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(150, [
        { offset: 0, color: '#8E2218' },
        { offset: 0.5, color: '#B23428' },
        { offset: 1, color: '#70170F' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '凤冠霞帔 · 与君同礼',
      eventType: 'wedding',
      hostName: '顾长安 ✕ 沈青梧',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function weddingEuropean(): DesignDoc {
  const gold = '#A9822F'
  const deep = '#5C4322'
  const els: DesignElement[] = [
    ...goldFrame(gold, 0.8),
    makeShape({
      shape: 'rect',
      name: '顶饰条',
      x: CW / 2 - 130,
      y: 190,
      width: 260,
      height: 3,
      fill: gold,
    }),
    makeText({
      text: 'The Wedding of',
      name: '英文引言',
      x: M,
      y: 230,
      width: INNER,
      height: 50,
      fontFamily: FONTS.serif,
      fontSize: 32,
      fill: gold,
      textAlign: 'center',
      charSpacing: 700,
      fontStyle: 'italic',
    }),
    ...titleBlock(330, {
      title: '香槟之约',
      names: 'William · Sophia',
      kickerColor: gold,
      titleColor: deep,
      namesColor: gold,
      titleFont: FONTS.serif,
      namesFont: FONTS.serif,
      titleSize: 96,
      namesSize: 48,
    }),
    ...divider(780, gold, 620, 0.85),
    ...infoBlock(850, {
      dateColor: deep,
      bodyColor: '#6B5636',
      mutedColor: '#A48B63',
      bodyFont: FONTS.serif,
    }),
    ...bloom(CW / 2, 1680, '#E4CE9E', '#C9A227', 110, 0.8),
    makeText({
      text: 'Together with our families',
      name: '落款',
      x: M,
      y: 1760,
      width: INNER,
      height: 48,
      fontFamily: FONTS.serif,
      fontSize: 26,
      fill: gold,
      textAlign: 'center',
      fontStyle: 'italic',
    }),
  ]
  return createDesign({
    name: '欧式香槟金 · 城堡之约',
    category: 'wedding',
    style: 'european',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(170, [
        { offset: 0, color: '#FBF6EA' },
        { offset: 1, color: '#EFE2C6' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '香槟之约',
      eventType: 'wedding',
      hostName: 'William · Sophia',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function weddingInk(): DesignDoc {
  const ink = '#2F2C29'
  const mist = '#8E8781'
  const seal = '#B23A2E'
  const els: DesignElement[] = [
    makeShape({
      shape: 'ellipse',
      name: '远山一',
      x: -180,
      y: 1280,
      width: 900,
      height: 520,
      fill: '#E7E2DA',
      opacity: 0.85,
    }),
    makeShape({
      shape: 'ellipse',
      name: '远山二',
      x: 380,
      y: 1420,
      width: 900,
      height: 460,
      fill: '#D9D2C8',
      opacity: 0.75,
    }),
    makeShape({
      shape: 'ellipse',
      name: '远山三',
      x: -120,
      y: 1560,
      width: 760,
      height: 380,
      fill: '#CBC2B6',
      opacity: 0.65,
    }),
    makeShape({
      shape: 'rect',
      name: '竖线',
      x: CW / 2 - 1,
      y: 180,
      width: 2,
      height: 150,
      fill: ink,
      opacity: 0.35,
    }),
    ...titleBlock(380, {
      kicker: '一纸请柬 · 敬呈台启',
      title: '山水一程 · 三生有幸',
      names: '陆听澜 ✕ 白清和',
      kickerColor: mist,
      titleColor: ink,
      namesColor: seal,
      titleFont: FONTS.serif,
      namesFont: FONTS.hand,
      titleSize: 74,
      namesSize: 54,
    }),
    ...divider(830, ink, 520, 0.6),
    ...infoBlock(900, {
      dateColor: ink,
      bodyColor: '#4A443E',
      mutedColor: mist,
      bodyFont: FONTS.serif,
    }),
    makeShape({
      shape: 'rect',
      name: '印章',
      x: CW - 250,
      y: 1660,
      width: 110,
      height: 110,
      fill: seal,
      opacity: 0.92,
    }),
    makeText({
      text: '囍',
      name: '印文',
      x: CW - 250,
      y: 1682,
      width: 110,
      height: 80,
      fontFamily: FONTS.brush,
      fontSize: 62,
      fill: '#FBEFD6',
      textAlign: 'center',
    }),
    makeText({
      text: '恭候台光',
      name: '落款',
      x: M,
      y: 1700,
      width: INNER - 200,
      height: 56,
      fontFamily: FONTS.hand,
      fontSize: 40,
      fill: ink,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '水墨雅集 · 山水一程',
    category: 'wedding',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(180, [
        { offset: 0, color: '#FAF8F4' },
        { offset: 1, color: '#EDE7DE' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '山水一程 · 三生有幸',
      eventType: 'wedding',
      hostName: '陆听澜 ✕ 白清和',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

function birthdayColorful(): DesignDoc {
  const confetti = ['#F4A261', '#E76F51', '#2A9D8F', '#E9C46A', '#8AB17D', '#E88D9C']
  const els: DesignElement[] = []
  const pts: [number, number][] = [
    [120, 220], [900, 180], [220, 520], [880, 560], [140, 900],
    [960, 940], [180, 1300], [920, 1340], [260, 1680], [860, 1720],
    [520, 160], [420, 1780], [700, 200], [340, 300], [780, 1780],
  ]
  pts.forEach(([x, y], i) => {
    const c = confetti[i % confetti.length]
    els.push(
      makeShape({
        shape: i % 3 === 0 ? 'diamond' : i % 3 === 1 ? 'ellipse' : 'rect',
        name: '彩纸屑',
        x,
        y,
        width: 34 + (i % 4) * 10,
        height: 34 + (i % 3) * 12,
        fill: c,
        opacity: 0.85,
        rotation: (i * 37) % 90,
      }),
    )
  })
  els.push(
    makeShape({
      shape: 'ellipse',
      name: '主视觉圆',
      x: CW / 2 - 380,
      y: 380,
      width: 760,
      height: 760,
      fill: 'rgba(255,255,255,0.72)',
      opacity: 1,
    }),
    ...titleBlock(520, {
      kicker: 'HAPPY BIRTHDAY',
      title: '生日快乐',
      names: '致最闪亮的你',
      kickerColor: '#E76F51',
      titleColor: '#E76F51',
      namesColor: '#2A9D8F',
      titleFont: FONTS.display,
      namesFont: FONTS.cute,
      titleSize: 110,
      namesSize: 44,
    }),
    ...infoBlock(1180, {
      dateColor: '#264653',
      bodyColor: '#3D3A38',
      mutedColor: '#8A8480',
      bodyFont: FONTS.sans,
      showInvite: true,
    }),
  )
  return createDesign({
    name: '缤纷生日 · 派对时刻',
    category: 'birthday',
    style: 'modern',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(160, [
        { offset: 0, color: '#FFF7EC' },
        { offset: 1, color: '#FFE3CC' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '生日快乐',
      eventType: 'birthday',
      hostName: '致最闪亮的你',
      date: '2026-11-08',
      time: '18:30',
      venue: '云顶餐厅 · 顶层花园厅',
      address: '上海市静安区南京西路 1266 号',
      phone: '138 0000 0000',
      inviteText: '又长大一岁啦！\n带上好心情，来我的生日派对一起热闹热闹吧。',
    },
  })
}

function birthdayElegant(): DesignDoc {
  const gold = '#D4AF37'
  const cream = '#F3E9CF'
  const els: DesignElement[] = [
    ...goldFrame(gold, 0.7),
    makeShape({
      shape: 'ring',
      name: '金色光环',
      x: CW / 2 - 250,
      y: 300,
      width: 500,
      height: 500,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 2,
      opacity: 0.8,
    }),
    makeText({
      text: '★',
      name: '星标',
      x: CW / 2 - 60,
      y: 480,
      width: 120,
      height: 120,
      fontFamily: FONTS.serif,
      fontSize: 90,
      fill: gold,
      textAlign: 'center',
    }),
    ...titleBlock(850, {
      kicker: 'A NIGHT TO REMEMBER',
      title: '生辰雅集',
      names: '诚邀您共度良宵',
      kickerColor: gold,
      titleColor: cream,
      namesColor: gold,
      titleFont: FONTS.serif,
      namesFont: FONTS.serif,
      titleSize: 96,
      namesSize: 40,
    }),
    ...divider(1230, gold, 560, 0.8),
    ...infoBlock(1300, {
      dateColor: gold,
      bodyColor: cream,
      mutedColor: '#C0A97A',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
  ]
  return createDesign({
    name: '黑金奢华 · 生辰雅集',
    category: 'birthday',
    style: 'luxury',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(165, [
        { offset: 0, color: '#221D18' },
        { offset: 0.5, color: '#3A2F24' },
        { offset: 1, color: '#171310' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '生辰雅集',
      eventType: 'birthday',
      hostName: '诚邀您共度良宵',
      date: '2026-11-08',
      time: '18:30',
      venue: '云顶餐厅 · 顶层花园厅',
      address: '上海市静安区南京西路 1266 号',
      phone: '138 0000 0000',
      inviteText: '又长大一岁啦！\n带上好心情，来我的生日派对一起热闹热闹吧。',
    },
  })
}

function longevity(): DesignDoc {
  const gold = '#EBCB77'
  const els: DesignElement[] = [
    ...goldFrame(gold, 0.9),
    ...corners(gold, 110),
    makeText({
      text: '寿',
      name: '寿字',
      x: CW / 2 - 220,
      y: 200,
      width: 440,
      height: 420,
      fontFamily: FONTS.brush,
      fontSize: 330,
      fill: gold,
      textAlign: 'center',
    }),
    makeShape({
      shape: 'ring',
      name: '寿字环',
      x: CW / 2 - 250,
      y: 190,
      width: 500,
      height: 500,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 4,
      opacity: 0.85,
    }),
    ...titleBlock(760, {
      kicker: '福如东海 · 寿比南山',
      title: '七十大寿庆典',
      names: '寿星 · 周伯康',
      kickerColor: gold,
      titleColor: gold,
      namesColor: '#FFE6B8',
      titleFont: FONTS.brush,
      namesFont: FONTS.serif,
      titleSize: 88,
      namesSize: 52,
    }),
    ...divider(1160, gold, 700, 0.9),
    ...infoBlock(1230, {
      dateColor: gold,
      bodyColor: '#FFE4C0',
      mutedColor: '#E0B98B',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
    makeText({
      text: '共祝寿辰 · 同享天伦',
      name: '落款',
      x: M,
      y: 1760,
      width: INNER,
      height: 56,
      fontFamily: FONTS.brush,
      fontSize: 44,
      fill: gold,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '寿比南山 · 七十大寿',
    category: 'longevity',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(155, [
        { offset: 0, color: '#8E2218' },
        { offset: 0.6, color: '#B23428' },
        { offset: 1, color: '#6B150F' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '七十大寿庆典',
      eventType: 'longevity',
      hostName: '寿星 · 周伯康',
      date: '2026-12-06',
      time: '11:30',
      venue: '福寿园大酒店 · 二层福寿厅',
      address: '杭州市西湖区龙井路 1 号',
      phone: '138 0000 0000',
      inviteText: '谨定于寿辰之日，聊备薄酌。\n诚邀亲朋好友光临，共祝寿星福寿绵长。',
    },
  })
}

function fullmoon(): DesignDoc {
  const pink = '#E08498'
  const cream = '#FFD9A0'
  const els: DesignElement[] = [
    ...bloom(160, 260, '#F6C2CC', cream, 130, 0.9),
    ...bloom(CW - 180, 320, '#F3B4C1', '#F6D9A0', 110, 0.85),
    ...bloom(170, 1660, '#F2B8C4', cream, 120, 0.85),
    makeShape({
      shape: 'ellipse',
      name: '柔光',
      x: CW / 2 - 320,
      y: 340,
      width: 640,
      height: 640,
      fill: 'rgba(255,255,255,0.62)',
    }),
    makeText({
      text: '❋',
      name: '装饰',
      x: CW / 2 - 60,
      y: 540,
      width: 120,
      height: 120,
      fontFamily: FONTS.serif,
      fontSize: 86,
      fill: pink,
      textAlign: 'center',
    }),
    ...titleBlock(960, {
      kicker: '满月之喜 · 弄瓦之庆',
      title: '小女满月宴',
      names: '欢迎来见证我们的小幸福',
      kickerColor: pink,
      titleColor: '#B85C72',
      namesColor: pink,
      titleFont: FONTS.cute,
      namesFont: FONTS.cute,
      titleSize: 86,
      namesSize: 36,
    }),
    ...infoBlock(1330, {
      dateColor: '#B85C72',
      bodyColor: '#7A5A60',
      mutedColor: '#B58C93',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
  ]
  return createDesign({
    name: '满月之喜 · 弄瓦之庆',
    category: 'fullmoon',
    style: 'romantic',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(180, [
        { offset: 0, color: '#FEF4F6' },
        { offset: 1, color: '#F7D6DE' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '小女满月宴',
      eventType: 'fullmoon',
      hostName: '欢迎来见证我们的小幸福',
      date: '2026-11-22',
      time: '12:00',
      venue: '童梦园餐厅 · 二层',
      address: '成都市锦江区红星路三段 1 号',
      phone: '138 0000 0000',
      inviteText: '小天使降临满月，喜不自胜。\n诚邀您来喝满月酒，沾沾喜气。',
    },
  })
}

function graduation(): DesignDoc {
  const gold = '#D4AF37'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '顶栏',
      x: 0,
      y: 0,
      width: CW,
      height: 12,
      fill: gold,
      locked: true,
    }),
    makeShape({
      shape: 'rect',
      name: '斜带',
      x: -200,
      y: 260,
      width: 1600,
      height: 6,
      fill: gold,
      opacity: 0.55,
      rotation: -12,
    }),
    makeShape({
      shape: 'rect',
      name: '斜带二',
      x: -200,
      y: 330,
      width: 1600,
      height: 3,
      fill: gold,
      opacity: 0.35,
      rotation: -12,
    }),
    makeText({
      text: 'CLASS OF 2026',
      name: '英文引言',
      x: M,
      y: 200,
      width: INNER,
      height: 48,
      fontFamily: FONTS.sans,
      fontSize: 28,
      fill: gold,
      textAlign: 'center',
      charSpacing: 1100,
    }),
    ...titleBlock(430, {
      kicker: '金榜题名 · 前程似锦',
      title: '升学答谢宴',
      names: '主家 · 林书宁',
      kickerColor: gold,
      titleColor: '#FFFFFF',
      namesColor: '#D9E4F0',
      titleFont: FONTS.display,
      namesFont: FONTS.serif,
      titleSize: 96,
      namesSize: 48,
    }),
    ...divider(880, gold, 640, 0.85),
    ...infoBlock(950, {
      dateColor: '#FFFFFF',
      bodyColor: '#D9E4F0',
      mutedColor: '#9CB3C9',
      bodyFont: FONTS.sans,
      showInvite: true,
    }),
    makeText({
      text: '十年寒窗今朝圆 · 一杯薄酒谢师恩',
      name: '落款',
      x: M,
      y: 1720,
      width: INNER,
      height: 52,
      fontFamily: FONTS.serif,
      fontSize: 32,
      fill: gold,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '前程似锦 · 升学答谢宴',
    category: 'graduation',
    style: 'modern',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(165, [
        { offset: 0, color: '#22456E' },
        { offset: 0.55, color: '#1F3A5F' },
        { offset: 1, color: '#152A46' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '升学答谢宴',
      eventType: 'graduation',
      hostName: '主家 · 林书宁',
      date: '2026-08-18',
      time: '12:00',
      venue: '书香门第酒店 · 三层',
      address: '南京市鼓楼区中山路 100 号',
      phone: '138 0000 0000',
      inviteText: '十年寒窗今朝圆，一杯薄酒谢师恩。\n诚邀您共赴升学宴，同贺前程似锦。',
    },
  })
}

function housewarming(): DesignDoc {
  const orange = '#E07A3F'
  const warm = '#F6D9B8'
  const brown = '#6B4A2F'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '屋顶',
      x: CW / 2 - 260,
      y: 300,
      width: 520,
      height: 320,
      fill: orange,
      rotation: 45,
      opacity: 0.92,
    }),
    makeShape({
      shape: 'rect',
      name: '房身',
      x: CW / 2 - 220,
      y: 520,
      width: 440,
      height: 300,
      fill: warm,
    }),
    makeShape({
      shape: 'rect',
      name: '门',
      x: CW / 2 - 55,
      y: 660,
      width: 110,
      height: 160,
      fill: brown,
    }),
    ...titleBlock(920, {
      kicker: 'NEW HOME · NEW LIFE',
      title: '乔迁之喜',
      names: '诚邀您来暖房',
      kickerColor: orange,
      titleColor: brown,
      namesColor: orange,
      titleFont: FONTS.display,
      namesFont: FONTS.cute,
      titleSize: 104,
      namesSize: 42,
    }),
    ...infoBlock(1300, {
      dateColor: brown,
      bodyColor: '#5E4630',
      mutedColor: '#A8876A',
      bodyFont: FONTS.sans,
      showInvite: true,
    }),
  ]
  return createDesign({
    name: '乔迁之喜 · 暖房派对',
    category: 'housewarming',
    style: 'modern',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(175, [
        { offset: 0, color: '#FFF6EA' },
        { offset: 1, color: '#FADCC0' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '乔迁之喜',
      eventType: 'housewarming',
      hostName: '诚邀您来暖房',
      date: '2026-12-20',
      time: '17:30',
      venue: '新居 · 阳光雅苑 3 栋 1801',
      address: '武汉市洪山区珞喻路 128 号',
      phone: '138 0000 0000',
      inviteText: '新居落成，喜不自胜。\n诚邀您来暖房聚会，一起热闹热闹。',
    },
  })
}

function businessNavy(): DesignDoc {
  const gold = '#C9A227'
  const H = 1080
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '侧栏',
      x: 0,
      y: 0,
      width: 620,
      height: H,
      fill: '#152A46',
    }),
    makeShape({
      shape: 'rect',
      name: '金线',
      x: 618,
      y: 0,
      width: 3,
      height: H,
      fill: gold,
    }),
    makeText({
      text: 'BUSINESS\nBANQUET',
      name: '英文标题',
      x: 80,
      y: 320,
      width: 460,
      height: 220,
      fontFamily: FONTS.sans,
      fontSize: 72,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      textAlign: 'left',
      lineHeight: 1.25,
      charSpacing: 400,
    }),
    makeShape({
      shape: 'rect',
      name: '短线',
      x: 80,
      y: 580,
      width: 120,
      height: 4,
      fill: gold,
    }),
    makeText({
      text: '年度客户答谢宴',
      name: '中文副题',
      x: 80,
      y: 630,
      width: 460,
      height: 70,
      fontFamily: FONTS.serif,
      fontSize: 42,
      fill: gold,
      textAlign: 'left',
    }),
    makeText({
      text: '2026 商务盛典',
      name: '主标题',
      role: 'title',
      x: 720,
      y: 240,
      width: 1080,
      height: 110,
      fontFamily: FONTS.serif,
      fontSize: 76,
      fontWeight: 'bold',
      fill: '#1B2A3D',
      textAlign: 'left',
    }),
    makeText({
      text: '诚 挚 邀 请 您 莅 临 指 导',
      name: '邀请语',
      role: 'inviteText',
      x: 720,
      y: 380,
      width: 1080,
      height: 60,
      fontFamily: FONTS.serif,
      fontSize: 36,
      fill: '#42546B',
      textAlign: 'left',
      charSpacing: 300,
    }),
    ...[
      { label: '日期', role: 'date' as const, value: '2026年10月1日 星期四', y: 520 },
      { label: '时间', role: 'time' as const, value: '晚上 6 点整', y: 610 },
      { label: '地点', role: 'venue' as const, value: '锦江大酒店 · 三层牡丹厅', y: 700 },
      { label: '地址', role: 'address' as const, value: '上海市黄浦区南京东路 88 号', y: 790 },
      { label: '联系', role: 'contact' as const, value: '联系电话 138 0000 0000', y: 880 },
    ].map((row) =>
      makeText({
        text: row.value,
        name: row.label,
        role: row.role,
        x: 720,
        y: row.y,
        width: 1080,
        height: 60,
        fontFamily: FONTS.sans,
        fontSize: row.label === '地址' || row.label === '联系' ? 28 : 38,
        fontWeight: row.label === '日期' || row.label === '地点' ? 'bold' : 'normal',
        fill: row.label === '地址' || row.label === '联系' ? '#7A8699' : '#243347',
        textAlign: 'left',
      }),
    ),
  ]
  return createDesign({
    name: '商务答谢宴 · 深蓝金',
    category: 'business',
    style: 'luxury',
    orientation: 'landscape',
    background: bg({
      type: 'gradient',
      gradient: linear(120, [
        { offset: 0, color: '#F2F5F9' },
        { offset: 1, color: '#DCE4EE' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '2026 商务盛典',
      eventType: 'business',
      hostName: '年度客户答谢宴',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '诚挚邀请您莅临指导',
    },
  })
}

function businessMinimal(): DesignDoc {
  const W = 1920
  const H = 1080
  const ink = '#111111'
  const gray = '#8A8A8A'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '细框',
      x: 120,
      y: 120,
      width: W - 240,
      height: H - 240,
      fill: 'transparent',
      stroke: ink,
      strokeWidth: 1,
      opacity: 0.35,
      locked: true,
    }),
    makeText({
      text: 'INVITATION',
      name: '英文',
      x: 220,
      y: 260,
      width: 800,
      height: 50,
      fontFamily: FONTS.sans,
      fontSize: 26,
      fill: gray,
      textAlign: 'left',
      charSpacing: 1400,
    }),
    makeText({
      text: '2026 年度盛典',
      name: '主标题',
      role: 'title',
      x: 220,
      y: 330,
      width: 1100,
      height: 110,
      fontFamily: FONTS.serif,
      fontSize: 82,
      fontWeight: 'bold',
      fill: ink,
      textAlign: 'left',
    }),
    makeShape({
      shape: 'rect',
      name: '分隔线',
      x: 220,
      y: 480,
      width: 200,
      height: 2,
      fill: ink,
    }),
    makeText({
      text: '谨定于 2026 年 10 月 1 日举办年度盛典\n诚邀各位嘉宾莅临，共襄盛举。',
      name: '邀请文案',
      role: 'inviteText',
      x: 220,
      y: 540,
      width: 1000,
      height: 170,
      fontFamily: FONTS.sans,
      fontSize: 32,
      fill: '#444444',
      textAlign: 'left',
      lineHeight: 1.9,
    }),
    makeText({
      text: '2026年10月1日 星期四 · 晚上 6 点整',
      name: '宴会日期',
      role: 'date',
      x: 220,
      y: 750,
      width: 1000,
      height: 52,
      fontFamily: FONTS.sans,
      fontSize: 30,
      fill: ink,
      textAlign: 'left',
    }),
    makeText({
      text: '锦江大酒店 · 三层牡丹厅',
      name: '宴会地点',
      role: 'venue',
      x: 220,
      y: 810,
      width: 1000,
      height: 52,
      fontFamily: FONTS.sans,
      fontSize: 30,
      fill: gray,
      textAlign: 'left',
    }),
    makeShape({
      shape: 'rect',
      name: '右侧块',
      x: W - 560,
      y: 120,
      width: 440,
      height: H - 240,
      fill: ink,
      opacity: 0.94,
    }),
    makeText({
      text: 'STUDIO\nANNUAL\nGALA',
      name: '右块文字',
      x: W - 520,
      y: 400,
      width: 360,
      height: 320,
      fontFamily: FONTS.sans,
      fontSize: 58,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      textAlign: 'left',
      lineHeight: 1.35,
      charSpacing: 300,
    }),
    makeText({
      text: '联系电话 138 0000 0000',
      name: '联系方式',
      role: 'contact',
      x: W - 520,
      y: 800,
      width: 360,
      height: 44,
      fontFamily: FONTS.sans,
      fontSize: 22,
      fill: '#B0B0B0',
      textAlign: 'left',
    }),
  ]
  return createDesign({
    name: '极简商务 · 黑白格调',
    category: 'business',
    style: 'minimal',
    orientation: 'landscape',
    background: bg({ type: 'color', color: '#FFFFFF', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '2026 年度盛典',
      eventType: 'business',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '谨定于 2026 年 10 月 1 日举办年度盛典\n诚邀各位嘉宾莅临，共襄盛举。',
    },
  })
}

function festivalSpring(): DesignDoc {
  const gold = '#F0C86A'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '顶梁',
      x: 0,
      y: 0,
      width: CW,
      height: 18,
      fill: gold,
      locked: true,
    }),
    makeShape({
      shape: 'rect',
      name: '底梁',
      x: 0,
      y: 1902,
      width: CW,
      height: 18,
      fill: gold,
      locked: true,
    }),
    ...cloudArc(CW / 2, 260, gold, 1.8, 0.5),
    ...cloudArc(CW / 2, 1680, gold, 1.5, 0.4),
    makeText({
      text: '春',
      name: '春字',
      x: CW / 2 - 170,
      y: 220,
      width: 340,
      height: 340,
      fontFamily: FONTS.brush,
      fontSize: 260,
      fill: gold,
      textAlign: 'center',
    }),
    ...titleBlock(620, {
      kicker: '新春佳节 · 阖家团圆',
      title: '新春团圆宴',
      names: '主家敬邀',
      kickerColor: gold,
      titleColor: gold,
      namesColor: '#FFE9BE',
      titleFont: FONTS.brush,
      namesFont: FONTS.serif,
      titleSize: 100,
      namesSize: 50,
    }),
    ...divider(1020, gold, 720, 0.9),
    ...infoBlock(1090, {
      dateColor: gold,
      bodyColor: '#FFE4C0',
      mutedColor: '#E3B98F',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
    makeText({
      text: '爆竹声中一岁除 · 春风送暖入屠苏',
      name: '落款',
      x: M,
      y: 1780,
      width: INNER,
      height: 52,
      fontFamily: FONTS.hand,
      fontSize: 38,
      fill: gold,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '新春团圆宴 · 国潮年味',
    category: 'festival',
    style: 'guochao',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(155, [
        { offset: 0, color: '#9E2B1E' },
        { offset: 0.5, color: '#C0392B' },
        { offset: 1, color: '#7A1A12' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '新春团圆宴',
      eventType: 'festival',
      hostName: '主家敬邀',
      date: '2027-02-05',
      time: '18:00',
      venue: '福满楼 · 二层宴会厅',
      address: '北京市东城区王府井大街 138 号',
      phone: '138 0000 0000',
      inviteText: '爆竹声中一岁除，春风送暖入屠苏。\n诚邀您共赴团圆宴，同贺新春。',
    },
  })
}

function familyGreen(): DesignDoc {
  const green = '#4E7A5B'
  const deep = '#2F4A38'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '底色块',
      x: 0,
      y: 1280,
      width: CW,
      height: 640,
      fill: '#E4EEE2',
    }),
    ...bloom(180, 1480, '#B7D0B4', '#E8D9A8', 140, 0.85),
    ...bloom(CW - 200, 1560, '#A6C4A4', '#DFCE9A', 120, 0.8),
    makeText({
      text: '✿',
      name: '装饰',
      x: CW / 2 - 50,
      y: 300,
      width: 100,
      height: 100,
      fontFamily: FONTS.serif,
      fontSize: 72,
      fill: green,
      textAlign: 'center',
    }),
    ...titleBlock(430, {
      kicker: 'FAMILY GATHERING',
      title: '家庭聚会',
      names: '一家人，一顿饭，一整晚的欢笑',
      kickerColor: green,
      titleColor: deep,
      namesColor: green,
      titleFont: FONTS.serif,
      namesFont: FONTS.cute,
      titleSize: 92,
      namesSize: 34,
    }),
    ...divider(830, green, 560, 0.8),
    ...infoBlock(900, {
      dateColor: deep,
      bodyColor: '#41523F',
      mutedColor: '#7E8F7C',
      bodyFont: FONTS.sans,
      showInvite: true,
    }),
    makeText({
      text: '有你到场，才算团圆',
      name: '落款',
      x: M,
      y: 1760,
      width: INNER,
      height: 56,
      fontFamily: FONTS.hand,
      fontSize: 42,
      fill: deep,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '家庭聚会 · 温暖如初',
    category: 'other',
    style: 'minimal',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(180, [
        { offset: 0, color: '#F7FAF5' },
        { offset: 1, color: '#E7F0E4' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '家庭聚会',
      eventType: 'other',
      hostName: '一家人，一顿饭，一整晚的欢笑',
      date: '2026-11-15',
      time: '18:00',
      venue: '老宅庭院',
      address: '苏州市姑苏区平江路 12 号',
      phone: '138 0000 0000',
      inviteText: '好久不见，甚是想念。\n这个周末回家吃饭，等你。',
    },
  })
}

function luxuryBlackGold(): DesignDoc {
  const gold = '#D4AF37'
  const light = '#F0E3C0'
  const els: DesignElement[] = [
    makeShape({
      shape: 'rect',
      name: '外框',
      x: 60,
      y: 60,
      width: CW - 120,
      height: 1920 - 120,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 2,
      opacity: 0.85,
      locked: true,
    }),
    makeShape({
      shape: 'ring',
      name: '光环',
      x: CW / 2 - 300,
      y: 280,
      width: 600,
      height: 600,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 1.5,
      opacity: 0.5,
    }),
    makeShape({
      shape: 'ring',
      name: '内环',
      x: CW / 2 - 230,
      y: 350,
      width: 460,
      height: 460,
      fill: 'transparent',
      stroke: gold,
      strokeWidth: 1,
      opacity: 0.35,
    }),
    makeText({
      text: 'INVITATION',
      name: '英文',
      x: M,
      y: 520,
      width: INNER,
      height: 48,
      fontFamily: FONTS.sans,
      fontSize: 26,
      fill: gold,
      textAlign: 'center',
      charSpacing: 1600,
    }),
    ...titleBlock(610, {
      title: '黑 金 之 夜',
      names: '诚邀莅临',
      kickerColor: gold,
      titleColor: light,
      namesColor: gold,
      titleFont: FONTS.serif,
      namesFont: FONTS.serif,
      titleSize: 92,
      namesSize: 42,
    }),
    ...divider(1000, gold, 560, 0.8),
    ...infoBlock(1070, {
      dateColor: light,
      bodyColor: '#C9BC9B',
      mutedColor: '#9A8C6C',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
  ]
  return createDesign({
    name: '黑金之夜 · 高级感',
    category: 'other',
    style: 'luxury',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(160, [
        { offset: 0, color: '#141110' },
        { offset: 0.5, color: '#2B241C' },
        { offset: 1, color: '#0D0B0A' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '黑金之夜',
      eventType: 'other',
      hostName: '诚邀莅临',
      date: '2026-12-31',
      time: '20:00',
      venue: '云端会所 · 顶层',
      address: '深圳市福田区中心四路 1 号',
      phone: '138 0000 0000',
      inviteText: '岁末年初，举杯同庆。\n诚邀您共赴这场高级感盛宴。',
    },
  })
}

function midAutumn(): DesignDoc {
  const moon = '#F0D9A0'
  const gold = '#E8C87A'
  const els: DesignElement[] = [
    makeShape({
      shape: 'ellipse',
      name: '明月',
      x: CW / 2 - 230,
      y: 240,
      width: 460,
      height: 460,
      fill: moon,
      opacity: 0.95,
    }),
    makeShape({
      shape: 'ellipse',
      name: '月晕',
      x: CW / 2 - 280,
      y: 190,
      width: 560,
      height: 560,
      fill: 'transparent',
      stroke: moon,
      strokeWidth: 2,
      opacity: 0.4,
    }),
    makeShape({
      shape: 'ellipse',
      name: '远山一',
      x: -200,
      y: 700,
      width: 900,
      height: 320,
      fill: '#20456B',
      opacity: 0.9,
    }),
    makeShape({
      shape: 'ellipse',
      name: '远山二',
      x: 380,
      y: 760,
      width: 900,
      height: 300,
      fill: '#2A547F',
      opacity: 0.8,
    }),
    ...titleBlock(1120, {
      kicker: '月满中秋 · 人月两圆',
      title: '中秋赏月宴',
      names: '主家敬邀',
      kickerColor: gold,
      titleColor: '#F4E7C8',
      namesColor: gold,
      titleFont: FONTS.serif,
      namesFont: FONTS.hand,
      titleSize: 78,
      namesSize: 46,
    }),
    ...infoBlock(1440, {
      dateColor: gold,
      bodyColor: '#D5DEE9',
      mutedColor: '#9FB2C6',
      bodyFont: FONTS.serif,
      showInvite: true,
    }),
    makeText({
      text: '但愿人长久 · 千里共婵娟',
      name: '落款',
      x: M,
      y: 1800,
      width: INNER,
      height: 50,
      fontFamily: FONTS.hand,
      fontSize: 38,
      fill: gold,
      textAlign: 'center',
    }),
  ]
  return createDesign({
    name: '中秋赏月宴 · 人月两圆',
    category: 'festival',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({
      type: 'gradient',
      gradient: linear(180, [
        { offset: 0, color: '#16324F' },
        { offset: 0.55, color: '#22496E' },
        { offset: 1, color: '#122942' },
      ]),
      opacity: 1,
    }),
    elements: els,
    eventInfo: {
      eventName: '中秋赏月宴',
      eventType: 'festival',
      hostName: '主家敬邀',
      date: '2026-09-25',
      time: '18:30',
      venue: '望月楼 · 顶层露台',
      address: '苏州市工业园区月廊街 8 号',
      phone: '138 0000 0000',
      inviteText: '月到中秋分外明，人到中秋情更浓。\n诚邀您共赏明月，同品月饼。',
    },
  })
}

/* ============================================================
 * 模板目录
 * ============================================================ */

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'wedding-chinese-classic',
    name: '囍 · 中式红金婚礼',
    category: 'wedding',
    style: 'chinese',
    color: 'red',
    orientation: 'portrait',
    type: 'animated',
    scene: '传统中式婚礼 · 敬请台光',
    build: weddingChinese,
  },
  {
    id: 'wedding-modern-white',
    name: '现代简约 · 白金之约',
    category: 'wedding',
    style: 'modern',
    color: 'white',
    orientation: 'portrait',
    type: 'static',
    scene: '现代简约婚礼 · 都市质感',
    build: weddingModern,
  },
  {
    id: 'wedding-romantic-pink',
    name: '浪漫粉樱 · 樱花之恋',
    category: 'wedding',
    style: 'romantic',
    color: 'pink',
    orientation: 'portrait',
    type: 'animated',
    scene: '浪漫唯美婚礼 · 少女心',
    build: weddingRomantic,
  },
  {
    id: 'wedding-guochao',
    name: '国潮朱红 · 凤冠霞帔',
    category: 'wedding',
    style: 'guochao',
    color: 'red',
    orientation: 'portrait',
    type: 'animated',
    scene: '国潮新中式 · 喜庆热闹',
    build: weddingGuochao,
  },
  {
    id: 'wedding-european',
    name: '欧式香槟金 · 城堡之约',
    category: 'wedding',
    style: 'european',
    color: 'gold',
    orientation: 'portrait',
    type: 'static',
    scene: '欧式奢华婚礼 · 高级质感',
    build: weddingEuropean,
  },
  {
    id: 'wedding-ink',
    name: '水墨雅集 · 山水一程',
    category: 'wedding',
    style: 'chinese',
    color: 'white',
    orientation: 'portrait',
    type: 'static',
    scene: '淡雅水墨 · 文人风骨',
    build: weddingInk,
  },
  {
    id: 'birthday-colorful',
    name: '缤纷生日 · 派对时刻',
    category: 'birthday',
    style: 'modern',
    color: 'multi',
    orientation: 'portrait',
    type: 'animated',
    scene: '生日派对 · 活泼欢乐',
    build: birthdayColorful,
  },
  {
    id: 'birthday-elegant',
    name: '黑金奢华 · 生辰雅集',
    category: 'birthday',
    style: 'luxury',
    color: 'black',
    orientation: 'portrait',
    type: 'static',
    scene: '高端生日宴 · 沉稳大气',
    build: birthdayElegant,
  },
  {
    id: 'longevity-classic',
    name: '寿比南山 · 七十大寿',
    category: 'longevity',
    style: 'chinese',
    color: 'red',
    orientation: 'portrait',
    type: 'animated',
    scene: '寿宴庆典 · 福寿绵长',
    build: longevity,
  },
  {
    id: 'fullmoon-pink',
    name: '满月之喜 · 弄瓦之庆',
    category: 'fullmoon',
    style: 'romantic',
    color: 'pink',
    orientation: 'portrait',
    type: 'static',
    scene: '满月宴 · 温馨可爱',
    build: fullmoon,
  },
  {
    id: 'graduation-blue',
    name: '前程似锦 · 升学答谢宴',
    category: 'graduation',
    style: 'modern',
    color: 'blue',
    orientation: 'portrait',
    type: 'static',
    scene: '升学宴 · 沉稳励志',
    build: graduation,
  },
  {
    id: 'housewarming-warm',
    name: '乔迁之喜 · 暖房派对',
    category: 'housewarming',
    style: 'modern',
    color: 'gold',
    orientation: 'portrait',
    type: 'animated',
    scene: '乔迁宴 · 温暖明亮',
    build: housewarming,
  },
  {
    id: 'business-navy',
    name: '商务答谢宴 · 深蓝金',
    category: 'business',
    style: 'luxury',
    color: 'blue',
    orientation: 'landscape',
    type: 'static',
    scene: '商务宴请 · 横版大气',
    build: businessNavy,
  },
  {
    id: 'business-minimal',
    name: '极简商务 · 黑白格调',
    category: 'business',
    style: 'minimal',
    color: 'white',
    orientation: 'landscape',
    type: 'static',
    scene: '商务邀请 · 极简设计感',
    build: businessMinimal,
  },
  {
    id: 'festival-spring',
    name: '新春团圆宴 · 国潮年味',
    category: 'festival',
    style: 'guochao',
    color: 'red',
    orientation: 'portrait',
    type: 'animated',
    scene: '春节团圆 · 喜庆年味',
    build: festivalSpring,
  },
  {
    id: 'family-green',
    name: '家庭聚会 · 温暖如初',
    category: 'other',
    style: 'minimal',
    color: 'green',
    orientation: 'portrait',
    type: 'static',
    scene: '家庭聚会 · 清新自然',
    build: familyGreen,
  },
  {
    id: 'luxury-black-gold',
    name: '黑金之夜 · 高级感',
    category: 'other',
    style: 'luxury',
    color: 'black',
    orientation: 'portrait',
    type: 'animated',
    scene: '高级感通用 · 年会盛典',
    build: luxuryBlackGold,
  },
  {
    id: 'festival-midautumn',
    name: '中秋赏月宴 · 人月两圆',
    category: 'festival',
    style: 'chinese',
    color: 'blue',
    orientation: 'portrait',
    type: 'animated',
    scene: '中秋佳节 · 意境悠远',
    build: midAutumn,
  },
  ...TEMPLATES_BATCH2,
  ...TEMPLATES_BATCH3,
]

export function getTemplate(id: string): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function buildTemplate(id: string): DesignDoc | null {
  const meta = getTemplate(id)
  return meta ? meta.build() : null
}

/* 供筛选器使用 */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  wedding: '婚礼请帖',
  birthday: '生日宴请帖',
  longevity: '寿宴请帖',
  fullmoon: '满月宴请帖',
  graduation: '升学宴请帖',
  housewarming: '乔迁宴请帖',
  business: '商务宴请',
  festival: '节日宴会',
  other: '其他宴会',
}

export const STYLE_LABELS: Record<StyleTag, string> = {
  chinese: '中式',
  modern: '现代',
  minimal: '简约',
  vintage: '复古',
  guochao: '国潮',
  european: '欧式',
  romantic: '浪漫',
  luxury: '高级感',
}

export const COLOR_LABELS: Record<string, string> = {
  red: '红色',
  gold: '金色',
  pink: '粉色',
  blue: '蓝色',
  green: '绿色',
  white: '白色',
  black: '黑色',
  multi: '多彩',
}
