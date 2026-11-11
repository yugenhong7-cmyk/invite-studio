import type {
  BackgroundSpec,
  DesignDoc,
  DesignElement,
  TemplateMeta,
} from '@/types'
import { FONTS, createDesign, linear, makeImage, makeShape, makeText } from '@/lib/design'

/* ============================================================
 * 批次二模板库 —— 与主模板库同架构：真实矢量图层 + 网页素材贴纸
 * 板式覆盖：横版 / 方形补齐；风格覆盖：极简 / 复古 / 轻奢
 * ============================================================ */

const CW = 1080
const PH = 1920
const CH_SQ = 1080
const LW = 1920
const LH = 1080

const bg = (b: BackgroundSpec): BackgroundSpec => b

/** 金色双线框 */
export function goldFrame(w: number, h: number, color: string, inset = 52, opacity = 0.95): DesignElement[] {
  return [
    makeShape({ shape: 'rect', name: '外框', x: inset, y: inset, width: w - inset * 2, height: h - inset * 2, fill: 'transparent', stroke: color, strokeWidth: 3, opacity, locked: true }),
    makeShape({ shape: 'rect', name: '内框', x: inset + 24, y: inset + 24, width: w - (inset + 24) * 2, height: h - (inset + 24) * 2, fill: 'transparent', stroke: color, strokeWidth: 1, opacity: opacity * 0.7, locked: true }),
  ]
}

/** 印章（圆环 + 单字） */
export function seal(x: number, y: number, r: number, char: string, color: string): DesignElement[] {
  return [
    makeShape({ shape: 'ring', name: '印章', x: x - r, y: y - r, width: r * 2, height: r * 2, fill: 'transparent', stroke: color, strokeWidth: 4 }),
    makeText({ text: char, name: '印字', x: x - r, y: y - r * 0.72, width: r * 2, height: r * 1.5, fontFamily: FONTS.brush, fontSize: r * 1.05, fill: color, textAlign: 'center' }),
  ]
}

/** 点串装饰 */
export function dots(x: number, y: number, n: number, gap: number, r: number, color: string, opacity = 0.85): DesignElement[] {
  const els: DesignElement[] = []
  for (let i = 0; i < n; i++) {
    els.push(makeShape({ shape: 'ellipse', name: '装饰点', x: x + i * gap, y, width: r * 2, height: r * 2, fill: color, opacity }))
  }
  return els
}

/** 细分隔线（纯线） */
export function thinLine(x: number, y: number, w: number, color: string, sw = 2, opacity = 0.8): DesignElement {
  return makeShape({ shape: 'rect', name: '分隔线', x, y, width: w, height: sw, fill: color, opacity })
}

/** 贴纸（网页素材） */
export function sticker(src: string, x: number, y: number, w: number, h: number, opacity = 1): DesignElement {
  return makeImage({ src, name: '素材', x, y, width: w, height: h, opacity })
}

/** 标题组（kicker / 主标题 / 姓名，全部 role 绑定） */
export function titleStack(
  y: number,
  W: number,
  o: { kicker?: string; title: string; names?: string; kickerColor?: string; titleColor: string; namesColor: string; titleFont?: string; titleSize?: number; namesSize?: number },
): DesignElement[] {
  const els: DesignElement[] = []
  let cy = y
  if (o.kicker) {
    els.push(makeText({ text: o.kicker, name: '引言', x: 60, y: cy, width: W - 120, height: 50, fontFamily: FONTS.serif, fontSize: 26, fill: o.kickerColor ?? o.titleColor, textAlign: 'center', charSpacing: 1000 }))
    cy += 64
  }
  els.push(makeText({ text: o.title, name: '主标题', role: 'title', x: 60, y: cy, width: W - 120, height: o.titleSize ? o.titleSize * 1.6 : 150, fontFamily: o.titleFont ?? FONTS.serif, fontSize: o.titleSize ?? 88, fontWeight: 'bold', fill: o.titleColor, textAlign: 'center', lineHeight: 1.25 }))
  cy += (o.titleSize ?? 88) * 1.55
  if (o.names) {
    els.push(makeText({ text: o.names, name: '主宾姓名', role: 'host', x: 60, y: cy, width: W - 120, height: 90, fontFamily: FONTS.serif, fontSize: o.namesSize ?? 52, fill: o.namesColor, textAlign: 'center', charSpacing: 350 }))
  }
  return els
}

/** 信息组（日期/时间/地点/地址/文案/电话，全部 role 绑定） */
export function infoStack(
  y: number,
  W: number,
  o: { titleColor: string; bodyColor: string; mutedColor: string; bodyFont?: string; invite?: boolean; compact?: boolean },
): DesignElement[] {
  const font = o.bodyFont ?? FONTS.sans
  const els: DesignElement[] = []
  let cy = y
  const gap = o.compact ? 58 : 76
  els.push(makeText({ text: '2026年10月1日 星期四', name: '宴会日期', role: 'date', x: 70, y: cy, width: W - 140, height: 60, fontFamily: font, fontSize: 40, fontWeight: 'bold', fill: o.titleColor, textAlign: 'center' }))
  cy += gap
  els.push(makeText({ text: '晚上 6 点整', name: '宴会时间', role: 'time', x: 70, y: cy, width: W - 140, height: 48, fontFamily: font, fontSize: 32, fill: o.bodyColor, textAlign: 'center' }))
  cy += gap - 6
  els.push(makeText({ text: '锦江大酒店 · 三层牡丹厅', name: '宴会地点', role: 'venue', x: 70, y: cy, width: W - 140, height: 56, fontFamily: font, fontSize: 36, fontWeight: 'bold', fill: o.titleColor, textAlign: 'center' }))
  cy += gap - 12
  els.push(makeText({ text: '上海市黄浦区南京东路 88 号', name: '详细地址', role: 'address', x: 70, y: cy, width: W - 140, height: 44, fontFamily: font, fontSize: 26, fill: o.mutedColor, textAlign: 'center' }))
  cy += gap + 6
  if (o.invite !== false) {
    els.push(makeText({ text: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。', name: '邀请文案', role: 'inviteText', x: 100, y: cy, width: W - 200, height: 150, fontFamily: font, fontSize: 28, fill: o.bodyColor, textAlign: 'center', lineHeight: 1.85 }))
    cy += 168
  }
  els.push(makeText({ text: '联系电话 138 0000 0000', name: '联系方式', role: 'contact', x: 70, y: cy, width: W - 140, height: 42, fontFamily: font, fontSize: 24, fill: o.mutedColor, textAlign: 'center' }))
  return els
}

/* ============================================================
 * 1. 蓝金星空 · 城堡之约（欧式 / 蓝 / 竖版 / 电子请帖）
 * ============================================================ */
function weddingBlueRoyal(): DesignDoc {
  const gold = '#D8B25A'
  const pale = '#E8D9A8'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 56, 0.9),
    sticker('/stickers/fe-crown.svg', CW / 2 - 80, 150, 160, 160),
    ...titleStack(360, CW, {
      kicker: 'SAVE THE DATE · 谨定佳期',
      title: '星空下的誓言',
      names: '陆之衍 ✕ 江晚吟',
      kickerColor: pale,
      titleColor: gold,
      namesColor: '#F2EFE9',
      titleFont: FONTS.serif,
      titleSize: 96,
      namesSize: 52,
    }),
    ...dots(CW / 2 - 90, 760, 7, 30, 4, gold),
    ...infoStack(840, CW, { titleColor: gold, bodyColor: '#D6D2C8', mutedColor: '#8E96AB', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-glowing-star.svg', 120, 220, 72, 72, 0.9),
    sticker('/stickers/fe-star.svg', CW - 200, 240, 60, 60, 0.85),
    sticker('/stickers/fe-crescent-moon.svg', CW - 260, 1560, 120, 120, 0.95),
    sticker('/stickers/fe-shooting-star.svg', 130, 1560, 130, 130, 0.9),
    thinLine(CW / 2 - 60, 1740, 120, gold, 2),
    makeText({ text: 'WITH LOVE · 与你共赴星河', name: '落款', x: 60, y: 1770, width: CW - 120, height: 46, fontFamily: FONTS.serif, fontSize: 24, fill: pale, textAlign: 'center', charSpacing: 600 }),
  ]
  return createDesign({
    name: '蓝金星空 · 城堡之约',
    category: 'wedding',
    style: 'european',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(90, [{ offset: 0, color: '#0B1B36' }, { offset: 0.55, color: '#14294F' }, { offset: 1, color: '#0B1B36' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '星空下的誓言',
      eventType: 'wedding',
      hostName: '陆之衍 & 江晚吟',
      date: '2026-11-11',
      time: '18:30',
      venue: '云顶城堡酒店 · 星空宴会厅',
      address: '杭州市西湖区玉皇山路 66 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 2. 复古奶油 · 蕾丝之约（复古 / 白 / 竖版）
 * ============================================================ */
function weddingVintageCream(): DesignDoc {
  const wine = '#8C3A4B'
  const gold = '#B98D22'
  const els: DesignElement[] = [
    sticker('/stickers/deco-scallop.svg', 60, 60, CW - 120, 140),
    makeImage({ src: '/stickers/deco-scallop.svg', name: '花边·下', x: 60, y: PH - 200, width: CW - 120, height: 140, rotation: 180 }),
    ...goldFrame(CW, PH, gold, 96, 0.5),
    sticker('/stickers/fe-rose.svg', CW / 2 - 70, 300, 140, 140),
    ...titleStack(470, CW, {
      kicker: 'OUR WEDDING DAY',
      title: '执子之手',
      names: '沈亦白 & 苏念安',
      kickerColor: gold,
      titleColor: wine,
      namesColor: '#7A5A34',
      titleFont: FONTS.brush,
      titleSize: 104,
      namesSize: 48,
    }),
    thinLine(CW / 2 - 150, 850, 300, wine, 1.5, 0.6),
    ...infoStack(910, CW, { titleColor: wine, bodyColor: '#6B5B52', mutedColor: '#A8968A', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-cherry-blossom.svg', 120, 1450, 110, 110, 0.9),
    sticker('/stickers/fe-bouquet.svg', CW - 240, 1430, 130, 130, 0.92),
    sticker('/stickers/deco-laurel.svg', CW / 2 - 110, 1560, 220, 220, 0.9),
  ]
  return createDesign({
    name: '复古奶油 · 蕾丝之约',
    category: 'wedding',
    style: 'vintage',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#F7F0E4', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '执子之手',
      eventType: 'wedding',
      hostName: '沈亦白 & 苏念安',
      date: '2026-10-18',
      time: '17:30',
      venue: '和平饭店 · 翡翠厅',
      address: '上海市黄浦区南京东路 20 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 3. 极简黑白 · 一纸婚书（极简 / 黑 / 竖版）
 * ============================================================ */
function weddingMinimalMono(): DesignDoc {
  const ink = '#1E1B18'
  const mid = '#8A8480'
  const els: DesignElement[] = [
    makeText({ text: 'WEDDING', name: '英文引言', x: 60, y: 330, width: CW - 120, height: 60, fontFamily: FONTS.sans, fontSize: 26, fill: mid, textAlign: 'center', charSpacing: 2400 }),
    thinLine(CW / 2 - 2, 430, 4, ink, 90, 0.12),
    makeText({ text: '我们要\n结婚了', name: '主标题', role: 'title', x: 60, y: 470, width: CW - 120, height: 380, fontFamily: FONTS.serif, fontSize: 132, fontWeight: 'bold', fill: ink, textAlign: 'center', lineHeight: 1.22 }),
    makeText({ text: '林深时见鹿 · 海蓝时见鲸', name: '主宾姓名', role: 'host', x: 60, y: 900, width: CW - 120, height: 70, fontFamily: FONTS.serif, fontSize: 38, fill: ink, textAlign: 'center', charSpacing: 300 }),
    thinLine(140, 1010, CW - 280, ink, 1, 0.35),
    ...infoStack(1080, CW, { titleColor: ink, bodyColor: '#4B4744', mutedColor: mid, bodyFont: FONTS.sans, compact: true }),
    makeText({ text: '— 期待与你共度这重要的一天 —', name: '落款', x: 60, y: 1740, width: CW - 120, height: 50, fontFamily: FONTS.serif, fontSize: 26, fill: mid, textAlign: 'center', charSpacing: 200 }),
  ]
  return createDesign({
    name: '极简黑白 · 一纸婚书',
    category: 'wedding',
    style: 'minimal',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#FCFBF9', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '我们要结婚了',
      eventType: 'wedding',
      hostName: '顾言深 & 温以宁',
      date: '2026-12-06',
      time: '12:00',
      venue: '柏悦酒店 · 云端厅',
      address: '深圳市福田区中心四路 1 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 4. 青花瓷 · 国潮雅韵（国潮 / 蓝 / 竖版 / 电子请帖）
 * ============================================================ */
function weddingGuochaoCyan(): DesignDoc {
  const blue = '#2E6FA8'
  const deep = '#1D4E7C'
  const els: DesignElement[] = [
    sticker('/stickers/deco-lattice.svg', CW / 2 - 380, 130, 760, 760),
    sticker('/stickers/fe-lotus.svg', CW / 2 - 70, 250, 140, 140),
    ...titleStack(440, CW, {
      kicker: '青花为聘 · 良辰为约',
      title: '青庐之礼',
      names: '裴云舟 & 叶清和',
      kickerColor: blue,
      titleColor: deep,
      namesColor: blue,
      titleFont: FONTS.brush,
      titleSize: 110,
      namesSize: 50,
    }),
    thinLine(CW / 2 - 160, 880, 320, blue, 1.5, 0.7),
    ...infoStack(950, CW, { titleColor: deep, bodyColor: '#3D5A75', mutedColor: '#8FA8BF', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-blossom.svg', 110, 1520, 100, 100, 0.9),
    sticker('/stickers/fe-butterfly.svg', CW - 220, 1500, 110, 110, 0.9),
    ...seal(CW / 2, 1720, 62, '囍', blue),
  ]
  return createDesign({
    name: '青花瓷 · 国潮雅韵',
    category: 'wedding',
    style: 'guochao',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#F4F7FA', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '青庐之礼',
      eventType: 'wedding',
      hostName: '裴云舟 & 叶清和',
      date: '2026-09-26',
      time: '11:58',
      venue: '金陵饭店 · 青花厅',
      address: '南京市鼓楼区汉中路 2 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 5. 香槟金 · 横版喜宴（中式 / 金 / 横版）
 * ============================================================ */
function weddingLandscapeGold(): DesignDoc {
  const gold = '#D8B25A'
  const cream = '#F5ECD8'
  const els: DesignElement[] = [
    ...goldFrame(LW, LH, gold, 48),
    sticker('/stickers/deco-corner.svg', 80, 80, 190, 190),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·右上', x: LW - 270, y: 80, width: 190, height: 190, rotation: 90 }),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·右下', x: LW - 270, y: LH - 270, width: 190, height: 190, rotation: 180 }),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·左下', x: 80, y: LH - 270, width: 190, height: 190, rotation: 270 }),
    makeText({ text: '囍', name: '大囍字', x: 130, y: 340, width: 300, height: 320, fontFamily: FONTS.brush, fontSize: 260, fill: gold, textAlign: 'center' }),
    makeText({ text: 'WEDDING BANQUET', name: '英文引言', x: 520, y: 210, width: 900, height: 44, fontFamily: FONTS.sans, fontSize: 22, fill: gold, textAlign: 'center', charSpacing: 1200 }),
    makeText({ text: '我们结婚啦', name: '主标题', role: 'title', x: 520, y: 280, width: 900, height: 140, fontFamily: FONTS.brush, fontSize: 96, fill: cream, textAlign: 'center' }),
    makeText({ text: '傅承安 & 柳如烟', name: '主宾姓名', role: 'host', x: 520, y: 430, width: 900, height: 80, fontFamily: FONTS.serif, fontSize: 46, fill: gold, textAlign: 'center', charSpacing: 400 }),
    thinLine(720, 545, 500, gold, 1.5, 0.8),
    makeText({ text: '2026年10月1日 星期四 · 晚上 6 点整', name: '宴会日期', role: 'date', x: 520, y: 590, width: 900, height: 56, fontFamily: FONTS.serif, fontSize: 36, fontWeight: 'bold', fill: cream, textAlign: 'center' }),
    makeText({ text: '锦江大酒店 · 三层牡丹厅', name: '宴会地点', role: 'venue', x: 520, y: 660, width: 900, height: 52, fontFamily: FONTS.serif, fontSize: 34, fill: gold, textAlign: 'center' }),
    makeText({ text: '良辰已定，吉日待启。诚邀您拨冗莅临。', name: '邀请文案', role: 'inviteText', x: 560, y: 740, width: 820, height: 52, fontFamily: FONTS.serif, fontSize: 26, fill: '#CDBE9A', textAlign: 'center' }),
    makeText({ text: '联系电话 138 0000 0000', name: '联系方式', role: 'contact', x: 560, y: 810, width: 820, height: 40, fontFamily: FONTS.sans, fontSize: 22, fill: '#A89470', textAlign: 'center' }),
    sticker('/stickers/fe-red-paper-lantern.svg', 175, 720, 120, 120),
    sticker('/stickers/fe-firecracker.svg', 330, 740, 110, 110),
  ]
  return createDesign({
    name: '香槟金 · 横版喜宴',
    category: 'wedding',
    style: 'chinese',
    orientation: 'landscape',
    background: bg({ type: 'gradient', gradient: linear(120, [{ offset: 0, color: '#6B1218' }, { offset: 0.5, color: '#8A1A22' }, { offset: 1, color: '#5E0F15' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '我们结婚啦',
      eventType: 'wedding',
      hostName: '傅承安 & 柳如烟',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。诚邀您拨冗莅临。',
    },
  })
}

/* ============================================================
 * 6. 马卡龙 · 甜梦生日（浪漫 / 粉 / 竖版 / 电子请帖）
 * ============================================================ */
function birthdayPastelMacaron(): DesignDoc {
  const rose = '#E58BA0'
  const lilac = '#B79FD6'
  const els: DesignElement[] = [
    makeShape({ shape: 'ellipse', name: '柔光', x: CW / 2 - 430, y: 200, width: 860, height: 1400, fill: 'rgba(255,255,255,0.55)', opacity: 0.8 }),
    sticker('/stickers/fe-balloon.svg', 120, 180, 150, 150),
    sticker('/stickers/fe-balloon.svg', CW - 280, 150, 140, 140),
    sticker('/stickers/fe-birthday-cake.svg', CW / 2 - 110, 320, 220, 220),
    ...titleStack(600, CW, {
      kicker: 'HAPPY BIRTHDAY',
      title: '生日快乐',
      names: '亲爱的 小鱼儿',
      kickerColor: lilac,
      titleColor: rose,
      namesColor: '#9B6B84',
      titleFont: FONTS.cute,
      titleSize: 104,
      namesSize: 46,
    }),
    sticker('/stickers/deco-scallop.svg', 120, 940, CW - 240, 110),
    ...infoStack(1080, CW, { titleColor: '#B05672', bodyColor: '#8A6B78', mutedColor: '#C2A0AE', bodyFont: FONTS.cute, invite: true }),
    sticker('/stickers/fe-confetti-ball.svg', 130, 1520, 110, 110),
    sticker('/stickers/fe-party-popper.svg', CW - 250, 1500, 120, 120),
    sticker('/stickers/fe-sparkles.svg', CW / 2 - 55, 1620, 110, 110, 0.9),
  ]
  return createDesign({
    name: '马卡龙 · 甜梦生日',
    category: 'birthday',
    style: 'romantic',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(160, [{ offset: 0, color: '#FDE7EE' }, { offset: 0.5, color: '#F3E4F7' }, { offset: 1, color: '#E2F4EF' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '生日快乐',
      eventType: 'birthday',
      hostName: '小鱼儿',
      guestName: '亲爱的朋友',
      date: '2026-08-16',
      time: '18:00',
      venue: '漫咖啡 · 花园店',
      address: '成都市锦江区春熙路 12 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 7. 星际派对 · 童趣生日（现代 / 蓝 / 竖版 / 电子请帖）
 * ============================================================ */
function birthdayKidsRocket(): DesignDoc {
  const yellow = '#FFC94D'
  const els: DesignElement[] = [
    sticker('/stickers/fe-star.svg', 110, 170, 90, 90),
    sticker('/stickers/fe-glowing-star.svg', CW - 220, 200, 100, 100),
    sticker('/stickers/fe-crescent-moon.svg', CW / 2 - 80, 140, 160, 160),
    sticker('/stickers/fe-cloud.svg', 150, 420, 150, 150, 0.9),
    sticker('/stickers/fe-cloud.svg', CW - 320, 460, 140, 140, 0.85),
    ...titleStack(470, CW, {
      kicker: 'READY FOR ADVENTURE',
      title: '出发！生日星球',
      names: '舰长 · 小宇 6 岁啦',
      kickerColor: yellow,
      titleColor: '#FFFFFF',
      namesColor: yellow,
      titleFont: FONTS.display,
      titleSize: 88,
      namesSize: 44,
    }),
    sticker('/stickers/fe-birthday-cake.svg', CW / 2 - 100, 880, 200, 200),
    ...infoStack(1120, CW, { titleColor: yellow, bodyColor: '#D8E2F2', mutedColor: '#8FA3C4', bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/fe-balloon.svg', 130, 1520, 110, 110),
    sticker('/stickers/fe-fireworks.svg', CW - 250, 1500, 120, 120),
    sticker('/stickers/fe-sparkles.svg', CW / 2 - 55, 1570, 110, 110),
  ]
  return createDesign({
    name: '星际派对 · 童趣生日',
    category: 'birthday',
    style: 'modern',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(170, [{ offset: 0, color: '#172A54' }, { offset: 0.6, color: '#27437B' }, { offset: 1, color: '#142446' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '出发！生日星球',
      eventType: 'birthday',
      hostName: '小宇',
      guestName: '各位小探险家',
      date: '2026-07-20',
      time: '15:00',
      venue: '星际乐园 · 生日城堡',
      address: '广州市天河区珠江新城 5 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 8. 方形气球 · 缤纷生日（现代 / 多彩 / 方形）
 * ============================================================ */
function birthdaySquareBalloon(): DesignDoc {
  const els: DesignElement[] = [
    makeShape({ shape: 'ellipse', name: '彩斑', x: 70, y: 90, width: 190, height: 190, fill: '#FFD9E2', opacity: 0.9 }),
    makeShape({ shape: 'ellipse', name: '彩斑', x: CW - 260, y: 130, width: 160, height: 160, fill: '#D8ECFF', opacity: 0.9 }),
    makeShape({ shape: 'ellipse', name: '彩斑', x: 120, y: CH_SQ - 280, width: 150, height: 150, fill: '#FFF1C9', opacity: 0.9 }),
    sticker('/stickers/fe-balloon.svg', 100, 120, 150, 150),
    sticker('/stickers/fe-balloon.svg', CW - 260, 90, 140, 140),
    sticker('/stickers/fe-party-popper.svg', CW / 2 - 80, 180, 160, 160),
    ...titleStack(400, CW, {
      title: '生日快乐',
      names: '我的 28 岁',
      titleColor: '#E5537B',
      namesColor: '#5B6BC0',
      titleFont: FONTS.display,
      titleSize: 110,
      namesSize: 48,
    }),
    sticker('/stickers/deco-scallop.svg', 110, 700, CW - 220, 100),
    ...infoStack(820, CW, { titleColor: '#5B6BC0', bodyColor: '#7A6B8A', mutedColor: '#B0A3BF', bodyFont: FONTS.sans, compact: true, invite: false }),
    sticker('/stickers/fe-confetti-ball.svg', 120, 830, 100, 100),
    sticker('/stickers/fe-birthday-cake.svg', CW - 230, 820, 110, 110),
    sticker('/stickers/fe-sparkles.svg', CW / 2 - 50, 850, 100, 100),
  ]
  return createDesign({
    name: '方形气球 · 缤纷生日',
    category: 'birthday',
    style: 'modern',
    orientation: 'square',
    background: bg({ type: 'gradient', gradient: linear(135, [{ offset: 0, color: '#FDF6F0' }, { offset: 1, color: '#F3EDFB' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '生日快乐',
      eventType: 'birthday',
      hostName: '寿星本人',
      date: '2026-05-30',
      time: '19:00',
      venue: '星光派对房',
      address: '北京市朝阳区工体北路 8 号',
      phone: '138 0000 0000',
      inviteText: '期待你的到来！',
    },
  })
}

/* ============================================================
 * 9. 寿桃仙鹤 · 福寿绵长（中式 / 红 / 竖版 / 电子请帖）
 * ============================================================ */
function longevityPeachCrane(): DesignDoc {
  const gold = '#E8C87A'
  const deep = '#B98D22'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 54),
    sticker('/stickers/fe-peach.svg', CW / 2 - 95, 170, 190, 190),
    ...titleStack(420, CW, {
      kicker: '福如东海 · 寿比南山',
      title: '七秩大寿',
      names: '父亲大人 七十寿辰',
      kickerColor: gold,
      titleColor: gold,
      namesColor: '#F5E9CE',
      titleFont: FONTS.brush,
      titleSize: 116,
      namesSize: 48,
    }),
    ...seal(CW / 2, 850, 70, '寿', deep),
    ...infoStack(970, CW, { titleColor: gold, bodyColor: '#EAD9B4', mutedColor: '#B49A72', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-dove.svg', 130, 1500, 120, 120, 0.95),
    sticker('/stickers/fe-carp-streamer.svg', CW - 250, 1480, 120, 120, 0.95),
    ...dots(CW / 2 - 100, 1700, 8, 28, 4, gold),
    makeText({ text: '恭请阖第光临', name: '落款', x: 60, y: 1750, width: CW - 120, height: 56, fontFamily: FONTS.brush, fontSize: 40, fill: gold, textAlign: 'center', charSpacing: 500 }),
  ]
  return createDesign({
    name: '寿桃仙鹤 · 福寿绵长',
    category: 'longevity',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(160, [{ offset: 0, color: '#7E1519' }, { offset: 0.5, color: '#98201F' }, { offset: 1, color: '#6E1013' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '七秩大寿',
      eventType: 'longevity',
      hostName: '父亲大人',
      date: '2026-03-22',
      time: '11:30',
      venue: '福满楼 · 寿星厅',
      address: '济南市历下区泉城路 18 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 10. 松鹤延年 · 水墨祝寿（复古 / 绿 / 竖版）
 * ============================================================ */
function longevityPineInk(): DesignDoc {
  const ink = '#2F3A32'
  const sage = '#5C7A5A'
  const gold = '#B99A4E'
  const els: DesignElement[] = [
    makeShape({ shape: 'rect', name: '纸框', x: 84, y: 84, width: CW - 168, height: PH - 168, fill: 'transparent', stroke: ink, strokeWidth: 1.5, opacity: 0.5 }),
    sticker('/stickers/fe-maple-leaf.svg', 120, 130, 110, 110, 0.85),
    sticker('/stickers/fe-herb.svg', CW - 230, 140, 110, 110, 0.85),
    makeText({ text: '松 鹤 延 年', name: '主标题', role: 'title', x: 60, y: 380, width: CW - 120, height: 170, fontFamily: FONTS.brush, fontSize: 112, fill: ink, textAlign: 'center', charSpacing: 600 }),
    makeText({ text: '恭贺 · 母亲大人六十华诞', name: '主宾姓名', role: 'host', x: 60, y: 590, width: CW - 120, height: 70, fontFamily: FONTS.serif, fontSize: 40, fill: sage, textAlign: 'center', charSpacing: 250 }),
    thinLine(CW / 2 - 140, 700, 280, gold, 1.5, 0.8),
    sticker('/stickers/deco-laurel.svg', CW / 2 - 160, 740, 320, 320, 0.95),
    ...infoStack(1120, CW, { titleColor: ink, bodyColor: '#4A554C', mutedColor: '#8A948B', bodyFont: FONTS.serif, compact: true }),
    makeText({ text: '岁岁常欢愉 · 年年皆胜意', name: '落款', x: 60, y: 1730, width: CW - 120, height: 56, fontFamily: FONTS.hand, fontSize: 40, fill: sage, textAlign: 'center', charSpacing: 300 }),
  ]
  return createDesign({
    name: '松鹤延年 · 水墨祝寿',
    category: 'longevity',
    style: 'vintage',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#F2F0E8', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '松鹤延年',
      eventType: 'longevity',
      hostName: '母亲大人',
      date: '2026-04-12',
      time: '11:00',
      venue: '松鹤楼 · 延年厅',
      address: '苏州市姑苏区太监弄 21 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 11. 弄璋之喜 · 蓝调满月（现代 / 蓝 / 竖版）
 * ============================================================ */
function fullmoonBlueBoy(): DesignDoc {
  const blue = '#4A79B8'
  const deep = '#2F5488'
  const els: DesignElement[] = [
    makeShape({ shape: 'ellipse', name: '柔光', x: CW / 2 - 380, y: 220, width: 760, height: 1100, fill: 'rgba(255,255,255,0.6)', opacity: 0.85 }),
    sticker('/stickers/fe-baby.svg', CW / 2 - 105, 230, 210, 210),
    ...titleStack(510, CW, {
      kicker: 'WELCOME LITTLE ONE',
      title: '弄璋之喜',
      names: '小元宝 满月啦',
      kickerColor: blue,
      titleColor: deep,
      namesColor: blue,
      titleFont: FONTS.cute,
      titleSize: 100,
      namesSize: 48,
    }),
    sticker('/stickers/deco-scallop.svg', 130, 860, CW - 260, 100),
    ...infoStack(990, CW, { titleColor: deep, bodyColor: '#5A6E8C', mutedColor: '#94A5BE', bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/fe-teddy-bear.svg', 130, 1470, 120, 120),
    sticker('/stickers/fe-rainbow.svg', CW - 260, 1460, 130, 130),
    sticker('/stickers/fe-star.svg', CW / 2 - 55, 1560, 110, 110, 0.9),
    makeText({ text: '期待与你分享这份喜悦', name: '落款', x: 60, y: 1740, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 30, fill: '#8FA3BF', textAlign: 'center' }),
  ]
  return createDesign({
    name: '弄璋之喜 · 蓝调满月',
    category: 'fullmoon',
    style: 'modern',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(150, [{ offset: 0, color: '#EAF2FC' }, { offset: 0.55, color: '#D8E7F8' }, { offset: 1, color: '#C9DDF4' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '弄璋之喜',
      eventType: 'fullmoon',
      hostName: '小元宝',
      guestName: '亲朋好友',
      date: '2026-06-08',
      time: '12:00',
      venue: '蓝湾大酒店 · 蓝厅',
      address: '青岛市市南区香港中路 9 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 12. 金喜满月 · 轻奢之礼（奢华 / 金 / 竖版 / 电子请帖）
 * ============================================================ */
function fullmoonGoldBaby(): DesignDoc {
  const gold = '#C9A227'
  const cream = '#F3E8CF'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 58),
    sticker('/stickers/deco-corner.svg', 92, 92, 170, 170),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·右上', x: CW - 262, y: 92, width: 170, height: 170, rotation: 90 }),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·右下', x: CW - 262, y: PH - 262, width: 170, height: 170, rotation: 180 }),
    makeImage({ src: '/stickers/deco-corner.svg', name: '角花·左下', x: 92, y: PH - 262, width: 170, height: 170, rotation: 270 }),
    sticker('/stickers/fe-crown.svg', CW / 2 - 75, 200, 150, 150),
    ...titleStack(410, CW, {
      kicker: 'A GOLDEN WELCOME',
      title: '满月之喜',
      names: '小千金 · 满月志庆',
      kickerColor: gold,
      titleColor: gold,
      namesColor: cream,
      titleFont: FONTS.serif,
      titleSize: 100,
      namesSize: 46,
    }),
    ...seal(CW / 2, 850, 66, '喜', gold),
    ...infoStack(960, CW, { titleColor: gold, bodyColor: '#D9C9A2', mutedColor: '#A08A5A', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-gem-stone.svg', 140, 1520, 100, 100),
    sticker('/stickers/fe-sparkles.svg', CW - 240, 1500, 110, 110),
    sticker('/stickers/fe-blossom.svg', CW / 2 - 55, 1620, 110, 110, 0.9),
    makeText({ text: '恭候光临', name: '落款', x: 60, y: 1750, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 32, fill: gold, textAlign: 'center', charSpacing: 800 }),
  ]
  return createDesign({
    name: '金喜满月 · 轻奢之礼',
    category: 'fullmoon',
    style: 'luxury',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(145, [{ offset: 0, color: '#241B10' }, { offset: 0.5, color: '#3A2C16' }, { offset: 1, color: '#20170C' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '满月之喜',
      eventType: 'fullmoon',
      hostName: '小千金',
      guestName: '尊贵的您',
      date: '2026-09-02',
      time: '12:00',
      venue: '金茂君悦 · 宴会厅',
      address: '上海市浦东新区世纪大道 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 导出
 * ============================================================ */
export const TEMPLATES_BATCH2: TemplateMeta[] = [
  { id: 'wedding-blue-royal', name: '蓝金星空 · 城堡之约', category: 'wedding', style: 'european', color: 'blue', orientation: 'portrait', type: 'animated', scene: '欧式星空婚礼 · 静谧高级', build: weddingBlueRoyal },
  { id: 'wedding-vintage-cream', name: '复古奶油 · 蕾丝之约', category: 'wedding', style: 'vintage', color: 'white', orientation: 'portrait', type: 'static', scene: '复古婚礼 · 温柔奶油系', build: weddingVintageCream },
  { id: 'wedding-minimal-mono', name: '极简黑白 · 一纸婚书', category: 'wedding', style: 'minimal', color: 'black', orientation: 'portrait', type: 'static', scene: '极简婚礼 · 大字排版', build: weddingMinimalMono },
  { id: 'wedding-guochao-cyan', name: '青花瓷 · 国潮雅韵', category: 'wedding', style: 'guochao', color: 'blue', orientation: 'portrait', type: 'animated', scene: '国潮婚礼 · 青花意蕴', build: weddingGuochaoCyan },
  { id: 'wedding-landscape-gold', name: '香槟金 · 横版喜宴', category: 'wedding', style: 'chinese', color: 'gold', orientation: 'landscape', type: 'static', scene: '横版请柬 · 宴会现场屏', build: weddingLandscapeGold },
  { id: 'birthday-pastel-macaron', name: '马卡龙 · 甜梦生日', category: 'birthday', style: 'romantic', color: 'pink', orientation: 'portrait', type: 'animated', scene: '甜美生日 · 少女心', build: birthdayPastelMacaron },
  { id: 'birthday-kids-rocket', name: '星际派对 · 童趣生日', category: 'birthday', style: 'modern', color: 'blue', orientation: 'portrait', type: 'animated', scene: '儿童生日 · 星际冒险', build: birthdayKidsRocket },
  { id: 'birthday-square-balloon', name: '方形气球 · 缤纷生日', category: 'birthday', style: 'modern', color: 'multi', orientation: 'square', type: 'static', scene: '方形请帖 · 社交分享', build: birthdaySquareBalloon },
  { id: 'longevity-peach-crane', name: '寿桃仙鹤 · 福寿绵长', category: 'longevity', style: 'chinese', color: 'red', orientation: 'portrait', type: 'animated', scene: '传统寿宴 · 红金喜庆', build: longevityPeachCrane },
  { id: 'longevity-pine-ink', name: '松鹤延年 · 水墨祝寿', category: 'longevity', style: 'vintage', color: 'green', orientation: 'portrait', type: 'static', scene: '雅致寿宴 · 水墨清韵', build: longevityPineInk },
  { id: 'fullmoon-blue-boy', name: '弄璋之喜 · 蓝调满月', category: 'fullmoon', style: 'modern', color: 'blue', orientation: 'portrait', type: 'static', scene: '满月宴 · 清新蓝调', build: fullmoonBlueBoy },
  { id: 'fullmoon-gold-baby', name: '金喜满月 · 轻奢之礼', category: 'fullmoon', style: 'luxury', color: 'gold', orientation: 'portrait', type: 'animated', scene: '满月宴 · 轻奢金调', build: fullmoonGoldBaby },
]
