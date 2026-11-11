import type {
  DesignDoc,
  DesignElement,
  TemplateMeta,
} from '@/types'
import { FONTS, createDesign, linear, makeShape, makeText } from '@/lib/design'
import { dots, goldFrame, infoStack, seal, sticker, thinLine, titleStack } from './templates-batch2'

/* ============================================================
 * 批次三模板库 —— 升学 / 乔迁 / 商务 / 节日 / 家宴 / 聚会 + 版式补齐
 * ============================================================ */

const CW = 1080
const PH = 1920
const CH_SQ = 1080
const LW = 1920

const bg = (b: import('@/types').BackgroundSpec): import('@/types').BackgroundSpec => b

/* ============================================================
 * 13. 鹿鸣宴 · 国潮升学（国潮 / 红 / 竖版 / 电子请帖）
 * ============================================================ */
function graduationGuochaoDeer(): DesignDoc {
  const gold = '#E8C87A'
  const red = '#A32C2C'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 54, 0.9),
    sticker('/stickers/fe-trophy.svg', CW / 2 - 85, 180, 170, 170),
    ...titleStack(420, CW, {
      kicker: '鹿鸣宴 · 蟾宫折桂',
      title: '前程似锦',
      names: '爱女 金榜题名',
      kickerColor: gold,
      titleColor: gold,
      namesColor: '#F5E9CE',
      titleFont: FONTS.brush,
      titleSize: 108,
      namesSize: 48,
    }),
    ...seal(CW / 2, 840, 68, '魁', red),
    ...infoStack(960, CW, { titleColor: gold, bodyColor: '#EAD9B4', mutedColor: '#B49A72', bodyFont: FONTS.serif }),
    sticker('/stickers/fe-scroll.svg', 130, 1500, 110, 110),
    sticker('/stickers/fe-carp-streamer.svg', CW - 250, 1480, 120, 120),
    ...dots(CW / 2 - 96, 1700, 7, 32, 4, gold),
    makeText({ text: '敬备薄宴 · 恭请光临', name: '落款', x: 60, y: 1750, width: CW - 120, height: 52, fontFamily: FONTS.brush, fontSize: 38, fill: gold, textAlign: 'center', charSpacing: 400 }),
  ]
  return createDesign({
    name: '鹿鸣宴 · 国潮升学',
    category: 'graduation',
    style: 'guochao',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(155, [{ offset: 0, color: '#7E1D1D' }, { offset: 0.5, color: '#A32C2C' }, { offset: 1, color: '#6B1517' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '前程似锦',
      eventType: 'graduation',
      hostName: '爱女',
      date: '2026-08-28',
      time: '18:00',
      venue: '状元楼 · 鹿鸣厅',
      address: '长沙市岳麓区麓山路 36 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 14. 极简白 · 升学答谢（极简 / 白 / 竖版）
 * ============================================================ */
function graduationMinimalWhite(): DesignDoc {
  const ink = '#22303C'
  const mid = '#7C8B99'
  const gold = '#B98D22'
  const els: DesignElement[] = [
    makeText({ text: 'GRADUATION BANQUET', name: '英文引言', x: 60, y: 330, width: CW - 120, height: 46, fontFamily: FONTS.sans, fontSize: 22, fill: mid, textAlign: 'center', charSpacing: 1400 }),
    makeText({ text: '谢 师 宴', name: '主标题', role: 'title', x: 60, y: 430, width: CW - 120, height: 180, fontFamily: FONTS.serif, fontSize: 118, fontWeight: 'bold', fill: ink, textAlign: 'center', charSpacing: 900 }),
    thinLine(CW / 2 - 120, 660, 240, gold, 2),
    makeText({ text: '不负韶华 · 未来可期', name: '主宾姓名', role: 'host', x: 60, y: 710, width: CW - 120, height: 70, fontFamily: FONTS.serif, fontSize: 40, fill: mid, textAlign: 'center', charSpacing: 350 }),
    sticker('/stickers/tab-corners.svg', CW / 2 - 150, 830, 300, 300, 0.8),
    ...infoStack(1180, CW, { titleColor: ink, bodyColor: '#4A5763', mutedColor: mid, bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/tab-flower.svg', 140, 1520, 90, 90, 0.9),
    sticker('/stickers/tab-flower.svg', CW - 230, 1520, 90, 90, 0.9),
    makeText({ text: '恭候您的光临', name: '落款', x: 60, y: 1740, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 30, fill: mid, textAlign: 'center', charSpacing: 250 }),
  ]
  return createDesign({
    name: '极简白 · 升学答谢',
    category: 'graduation',
    style: 'minimal',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#FAFAF8', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '谢师宴',
      eventType: 'graduation',
      hostName: '不负韶华 · 未来可期',
      date: '2026-08-20',
      time: '18:00',
      venue: '书香门第 · 讲堂厅',
      address: '武汉市武昌区八一路 28 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 15. 新绿乔居 · 生机之约（现代 / 绿 / 竖版）
 * ============================================================ */
function housewarmingGreenPlant(): DesignDoc {
  const green = '#3E7A52'
  const deep = '#2C5A3B'
  const els: DesignElement[] = [
    makeShape({ shape: 'ellipse', name: '绿意圆', x: CW / 2 - 380, y: 170, width: 760, height: 760, fill: '#E4F0E4', opacity: 0.9 }),
    sticker('/stickers/fe-house.svg', CW / 2 - 110, 330, 220, 220),
    ...titleStack(700, CW, {
      kicker: 'NEW HOME · 新居志庆',
      title: '乔迁之喜',
      names: '诚邀莅临 · 暖居小酌',
      kickerColor: green,
      titleColor: deep,
      namesColor: green,
      titleFont: FONTS.serif,
      titleSize: 96,
      namesSize: 42,
    }),
    sticker('/stickers/tab-leaf.svg', 150, 1030, 110, 110, 0.9),
    sticker('/stickers/tab-leaf.svg', CW - 260, 1030, 110, 110, 0.9),
    ...infoStack(1170, CW, { titleColor: deep, bodyColor: '#4F6A58', mutedColor: '#8FA894', bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/fe-sun.svg', 140, 1520, 110, 110, 0.9),
    sticker('/stickers/fe-blossom.svg', CW - 250, 1510, 110, 110, 0.9),
    makeText({ text: '室有迁莺 · 门迎瑞气', name: '落款', x: 60, y: 1730, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 30, fill: green, textAlign: 'center', charSpacing: 250 }),
  ]
  return createDesign({
    name: '新绿乔居 · 生机之约',
    category: 'housewarming',
    style: 'modern',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(150, [{ offset: 0, color: '#F4FAF3' }, { offset: 1, color: '#E7F2E5' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '乔迁之喜',
      eventType: 'housewarming',
      hostName: '诚邀莅临 · 暖居小酌',
      date: '2026-05-16',
      time: '17:30',
      venue: '和风雅苑 · 3 号楼 1801',
      address: '合肥市蜀山区望江西路 100 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 16. 欧式拱门 · 乔迁庆典（欧式 / 金 / 竖版）
 * ============================================================ */
function housewarmingEuropeanArch(): DesignDoc {
  const gold = '#B98D22'
  const ink = '#4A3B2A'
  const els: DesignElement[] = [
    sticker('/stickers/deco-arch.svg', CW / 2 - 330, 120, 660, 1020, 0.9),
    sticker('/stickers/fe-castle.svg', CW / 2 - 100, 420, 200, 200),
    ...titleStack(680, CW, {
      kicker: 'HOUSEWARMING PARTY',
      title: '新居落成',
      names: '诚邀共享乔迁之喜',
      kickerColor: gold,
      titleColor: ink,
      namesColor: gold,
      titleFont: FONTS.serif,
      titleSize: 92,
      namesSize: 42,
    }),
    thinLine(CW / 2 - 150, 1030, 300, gold, 1.5, 0.8),
    ...infoStack(1100, CW, { titleColor: ink, bodyColor: '#6B5B44', mutedColor: '#A89470', bodyFont: FONTS.serif, compact: true }),
    sticker('/stickers/fe-church.svg', 140, 1520, 110, 110, 0.85),
    sticker('/stickers/fe-bell.svg', CW - 250, 1510, 110, 110, 0.85),
    makeText({ text: '欢迎来做客', name: '落款', x: 60, y: 1730, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 32, fill: gold, textAlign: 'center', charSpacing: 500 }),
  ]
  return createDesign({
    name: '欧式拱门 · 乔迁庆典',
    category: 'housewarming',
    style: 'european',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#F7F2E9', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '新居落成',
      eventType: 'housewarming',
      hostName: '诚邀共享乔迁之喜',
      date: '2026-06-21',
      time: '17:00',
      venue: '香榭丽舍花园 · 别墅 7 号',
      address: '重庆市渝北区龙山路 66 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 17. 朱红请柬 · 商务宴请（中式 / 红 / 竖版）
 * ============================================================ */
function businessChineseRed(): DesignDoc {
  const gold = '#E8C87A'
  const cream = '#F5E9CE'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 56),
    ...seal(CW / 2, 300, 88, '请', '#C9A227'),
    makeText({ text: '诚 邀 函', name: '主标题', role: 'title', x: 60, y: 470, width: CW - 120, height: 150, fontFamily: FONTS.brush, fontSize: 108, fill: gold, textAlign: 'center', charSpacing: 700 }),
    makeText({ text: 'INVITATION', name: '英文引言', x: 60, y: 640, width: CW - 120, height: 42, fontFamily: FONTS.sans, fontSize: 22, fill: '#C4A570', textAlign: 'center', charSpacing: 1600 }),
    thinLine(CW / 2 - 160, 720, 320, gold, 1.5, 0.7),
    makeText({ text: '尊敬的合作伙伴：', name: '主宾姓名', role: 'guestName', x: 130, y: 780, width: CW - 260, height: 60, fontFamily: FONTS.serif, fontSize: 36, fill: cream, textAlign: 'left' }),
    makeText({ text: '谨定于二〇二六年十月一日举行客户答谢晚宴，\n敬备菲酌，恭请光临指导。', name: '邀请文案', role: 'inviteText', x: 130, y: 860, width: CW - 260, height: 170, fontFamily: FONTS.serif, fontSize: 32, fill: '#EAD9B4', textAlign: 'left', lineHeight: 1.9 }),
    ...infoStack(1100, CW, { titleColor: gold, bodyColor: '#D9C6A0', mutedColor: '#A8906A', bodyFont: FONTS.serif, compact: true }),
    sticker('/stickers/fe-red-envelope.svg', 130, 1520, 110, 110),
    sticker('/stickers/fe-clinking-glasses.svg', CW - 250, 1510, 120, 120),
    makeText({ text: '顺颂商祺', name: '落款', x: 60, y: 1740, width: CW - 120, height: 56, fontFamily: FONTS.brush, fontSize: 42, fill: gold, textAlign: 'center', charSpacing: 600 }),
  ]
  return createDesign({
    name: '朱红请柬 · 商务宴请',
    category: 'business',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(150, [{ offset: 0, color: '#6B1212' }, { offset: 0.5, color: '#8A1F1B' }, { offset: 1, color: '#5A0E0E' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '诚邀函',
      eventType: 'business',
      hostName: '华远集团',
      guestName: '尊敬的合作伙伴',
      date: '2026-10-01',
      time: '18:30',
      venue: '国贸大酒店 · 云端宴会厅',
      address: '北京市朝阳区建国门外大街 1 号',
      phone: '138 0000 0000',
      inviteText: '谨定于二〇二六年十月一日举行客户答谢晚宴，\n敬备菲酌，恭请光临指导。',
    },
  })
}

/* ============================================================
 * 18. 祖母绿 · 高端商务（奢华 / 绿 / 竖版 / 电子请帖）
 * ============================================================ */
function businessEmerald(): DesignDoc {
  const gold = '#C9A227'
  const pale = '#E9DDB8'
  const els: DesignElement[] = [
    ...goldFrame(CW, PH, gold, 58, 0.85),
    sticker('/stickers/fe-gem-stone.svg', CW / 2 - 80, 190, 160, 160),
    ...titleStack(420, CW, {
      kicker: 'BUSINESS DINNER · 至臻之邀',
      title: '翡翠之夜',
      names: '年度客户答谢晚宴',
      kickerColor: gold,
      titleColor: gold,
      namesColor: pale,
      titleFont: FONTS.serif,
      titleSize: 96,
      namesSize: 44,
    }),
    ...dots(CW / 2 - 84, 780, 6, 32, 4, gold),
    ...infoStack(870, CW, { titleColor: gold, bodyColor: '#D9CBA0', mutedColor: '#9AA88F', bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/fe-crown.svg', 140, 1500, 110, 110),
    sticker('/stickers/fe-clinking-glasses.svg', CW - 250, 1490, 120, 120),
    makeText({ text: 'EVERGREEN · 共赢未来', name: '落款', x: 60, y: 1730, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 26, fill: gold, textAlign: 'center', charSpacing: 600 }),
  ]
  return createDesign({
    name: '祖母绿 · 高端商务',
    category: 'business',
    style: 'luxury',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(145, [{ offset: 0, color: '#0F2E22' }, { offset: 0.5, color: '#1B4332' }, { offset: 1, color: '#0C241B' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '翡翠之夜',
      eventType: 'business',
      hostName: '年度客户答谢晚宴',
      date: '2026-12-18',
      time: '18:30',
      venue: '四季酒店 · 翡翠厅',
      address: '广州市天河区珠江新城 5 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 19. 元宵灯会 · 花好月圆（节日 / 红 / 竖版 / 电子请帖）
 * ============================================================ */
function festivalLanternNight(): DesignDoc {
  const gold = '#F0C060'
  const warm = '#FFD9A0'
  const els: DesignElement[] = [
    sticker('/stickers/fe-red-paper-lantern.svg', 120, 140, 150, 150),
    sticker('/stickers/fe-red-paper-lantern.svg', CW - 280, 120, 140, 140),
    sticker('/stickers/fe-full-moon.svg', CW / 2 - 120, 170, 240, 240),
    ...titleStack(520, CW, {
      kicker: '正月十五 · 闹元宵',
      title: '花好月圆',
      names: '元宵喜乐会',
      kickerColor: warm,
      titleColor: gold,
      namesColor: warm,
      titleFont: FONTS.brush,
      titleSize: 112,
      namesSize: 50,
    }),
    sticker('/stickers/fe-firecracker.svg', 130, 900, 120, 120),
    sticker('/stickers/fe-fireworks.svg', CW - 260, 880, 130, 130),
    ...infoStack(1080, CW, { titleColor: gold, bodyColor: '#F2DDB0', mutedColor: '#C09A62', bodyFont: FONTS.serif, compact: true }),
    sticker('/stickers/fe-star.svg', 140, 1520, 100, 100, 0.9),
    sticker('/stickers/fe-crescent-moon.svg', CW - 240, 1500, 120, 120, 0.95),
    ...dots(CW / 2 - 96, 1710, 7, 30, 4, gold),
    makeText({ text: '共赏花灯 · 同庆团圆', name: '落款', x: 60, y: 1755, width: CW - 120, height: 52, fontFamily: FONTS.brush, fontSize: 38, fill: gold, textAlign: 'center', charSpacing: 300 }),
  ]
  return createDesign({
    name: '元宵灯会 · 花好月圆',
    category: 'festival',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(160, [{ offset: 0, color: '#5E1214' }, { offset: 0.5, color: '#8A2018' }, { offset: 1, color: '#4A0D0F' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '花好月圆',
      eventType: 'festival',
      hostName: '元宵喜乐会',
      date: '2026-03-03',
      time: '18:30',
      venue: '古城灯会 · 主会场',
      address: '西安市碑林区书院门 12 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 20. 粽情端午 · 龙舟竞渡（节日 / 绿 / 竖版）
 * ============================================================ */
function festivalDragonBoat(): DesignDoc {
  const green = '#2F6B4F'
  const deep = '#1F4A36'
  const gold = '#C9A227'
  const els: DesignElement[] = [
    makeShape({ shape: 'rect', name: '青绿框', x: 70, y: 70, width: CW - 140, height: PH - 140, fill: 'transparent', stroke: green, strokeWidth: 2.5, opacity: 0.7, locked: true }),
    sticker('/stickers/fe-herb.svg', 120, 140, 130, 130),
    sticker('/stickers/fe-leaf.svg', CW - 250, 150, 120, 120),
    ...titleStack(430, CW, {
      kicker: '端午安康 · 龙舟竞渡',
      title: '粽情端午',
      names: '端午家宴 · 敬请光临',
      kickerColor: gold,
      titleColor: deep,
      namesColor: green,
      titleFont: FONTS.brush,
      titleSize: 112,
      namesSize: 44,
    }),
    thinLine(CW / 2 - 160, 870, 320, gold, 2, 0.85),
    sticker('/stickers/fe-moon-cake.svg', CW / 2 - 85, 920, 170, 170),
    ...infoStack(1140, CW, { titleColor: deep, bodyColor: '#456353', mutedColor: '#8AA294', bodyFont: FONTS.serif, compact: true }),
    sticker('/stickers/tab-wave.svg', 140, 1530, 110, 110, 0.9),
    sticker('/stickers/tab-wave.svg', CW - 250, 1530, 110, 110, 0.9),
    makeText({ text: '一年一端午 · 一岁一安康', name: '落款', x: 60, y: 1730, width: CW - 120, height: 52, fontFamily: FONTS.serif, fontSize: 30, fill: green, textAlign: 'center', charSpacing: 250 }),
  ]
  return createDesign({
    name: '粽情端午 · 龙舟竞渡',
    category: 'festival',
    style: 'chinese',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(155, [{ offset: 0, color: '#EDF5EA' }, { offset: 0.5, color: '#DCEBDA' }, { offset: 1, color: '#CDE2CD' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '粽情端午',
      eventType: 'festival',
      hostName: '端午家宴 · 敬请光临',
      date: '2026-06-19',
      time: '12:00',
      venue: '汨罗江畔 · 龙舟馆',
      address: '岳阳市汨罗市屈原路 8 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 21. 秋日家宴 · 温情团聚（复古 / 多彩 / 竖版）
 * ============================================================ */
function familyAutumnVintage(): DesignDoc {
  const rust = '#B4593A'
  const mustard = '#C99A3C'
  const brown = '#6B4A2E'
  const els: DesignElement[] = [
    makeShape({ shape: 'ellipse', name: '暖阳', x: CW / 2 - 340, y: 200, width: 680, height: 680, fill: '#F6E7C8', opacity: 0.8 }),
    sticker('/stickers/fe-maple-leaf.svg', 130, 160, 120, 120),
    sticker('/stickers/fe-maple-leaf.svg', CW - 260, 180, 110, 110, 0.9),
    sticker('/stickers/fe-sunflower.svg', CW / 2 - 90, 300, 180, 180),
    ...titleStack(560, CW, {
      kicker: 'AUTUMN GATHERING',
      title: '秋日家宴',
      names: '一家人 · 一顿饭 · 一段时光',
      kickerColor: mustard,
      titleColor: rust,
      namesColor: brown,
      titleFont: FONTS.serif,
      titleSize: 96,
      namesSize: 38,
    }),
    sticker('/stickers/deco-scallop.svg', 130, 920, CW - 260, 100),
    ...infoStack(1050, CW, { titleColor: brown, bodyColor: '#7A5B3E', mutedColor: '#B08E68', bodyFont: FONTS.serif, compact: true }),
    sticker('/stickers/fe-amphora.svg', 140, 1490, 110, 110),
    sticker('/stickers/fe-sake.svg', CW - 250, 1480, 110, 110),
    makeText({ text: '常回家看看', name: '落款', x: 60, y: 1720, width: CW - 120, height: 52, fontFamily: FONTS.hand, fontSize: 42, fill: rust, textAlign: 'center', charSpacing: 300 }),
  ]
  return createDesign({
    name: '秋日家宴 · 温情团聚',
    category: 'other',
    style: 'vintage',
    orientation: 'portrait',
    background: bg({ type: 'gradient', gradient: linear(160, [{ offset: 0, color: '#FAF3E3' }, { offset: 0.55, color: '#F4E7C8' }, { offset: 1, color: '#EFDDB4' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '秋日家宴',
      eventType: 'other',
      hostName: '一家人 · 一顿饭 · 一段时光',
      date: '2026-10-25',
      time: '17:30',
      venue: '老宅庭院',
      address: '绍兴市越城区仓桥直街 15 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 22. 同学聚会 · 青春不散场（现代 / 蓝 / 竖版）
 * ============================================================ */
function reunionClassmate(): DesignDoc {
  const blue = '#2F5FA8'
  const orange = '#E8813A'
  const els: DesignElement[] = [
    makeShape({ shape: 'rect', name: '胶片带', x: 0, y: 0, width: CW, height: 220, fill: '#22437B', opacity: 0.92 }),
    makeShape({ shape: 'rect', name: '胶片带', x: 0, y: PH - 220, width: CW, height: 220, fill: '#22437B', opacity: 0.92 }),
    makeText({ text: 'CLASS REUNION · 2026', name: '英文引言', x: 60, y: 80, width: CW - 120, height: 60, fontFamily: FONTS.sans, fontSize: 30, fill: '#FFD9A0', textAlign: 'center', charSpacing: 900 }),
    ...titleStack(360, CW, {
      title: '青春不散场',
      names: '毕业十周年同学聚会',
      titleColor: blue,
      namesColor: orange,
      titleFont: FONTS.display,
      titleSize: 108,
      namesSize: 44,
    }),
    sticker('/stickers/fe-graduation-cap.svg', CW / 2 - 90, 700, 180, 180),
    ...infoStack(920, CW, { titleColor: '#22437B', bodyColor: '#4A5F82', mutedColor: '#8FA0BE', bodyFont: FONTS.sans, compact: true }),
    sticker('/stickers/fe-trophy.svg', 140, 1470, 110, 110),
    sticker('/stickers/fe-clinking-glasses.svg', CW - 250, 1460, 120, 120),
    makeText({ text: '好久不见 · 别来无恙', name: '落款', x: 60, y: 1620, width: CW - 120, height: 56, fontFamily: FONTS.display, fontSize: 38, fill: '#FFD9A0', textAlign: 'center', charSpacing: 300 }),
  ]
  return createDesign({
    name: '同学聚会 · 青春不散场',
    category: 'other',
    style: 'modern',
    orientation: 'portrait',
    background: bg({ type: 'color', color: '#F2F5FA', opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '青春不散场',
      eventType: 'other',
      hostName: '毕业十周年同学聚会',
      date: '2026-10-03',
      time: '17:00',
      venue: '母校 · 青春食堂',
      address: '南京市玄武区四牌楼 2 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。\n诚邀您拨冗莅临，共赴盛宴，同贺美好。',
    },
  })
}

/* ============================================================
 * 23. 方形囍印 · 喜结良缘（中式 / 红 / 方形）
 * ============================================================ */
function weddingSquareSeal(): DesignDoc {
  const gold = '#E8C87A'
  const els: DesignElement[] = [
    ...goldFrame(CH_SQ, CH_SQ, gold, 50),
    sticker('/stickers/fe-red-paper-lantern.svg', 95, 95, 110, 110),
    sticker('/stickers/fe-red-envelope.svg', CH_SQ - 205, 95, 110, 110),
    ...seal(CH_SQ / 2, 300, 110, '囍', '#E8C87A'),
    makeText({ text: '喜结良缘', name: '主标题', role: 'title', x: 70, y: 460, width: CH_SQ - 140, height: 110, fontFamily: FONTS.brush, fontSize: 84, fill: gold, textAlign: 'center', charSpacing: 500 }),
    makeText({ text: '傅承安 & 柳如烟', name: '主宾姓名', role: 'host', x: 70, y: 585, width: CH_SQ - 140, height: 70, fontFamily: FONTS.serif, fontSize: 42, fill: '#F5E9CE', textAlign: 'center', charSpacing: 350 }),
    thinLine(CH_SQ / 2 - 120, 685, 240, gold, 1.5, 0.8),
    ...infoStack(730, CH_SQ, { titleColor: gold, bodyColor: '#EAD9B4', mutedColor: '#B49A72', bodyFont: FONTS.serif, compact: true, invite: false }),
    sticker('/stickers/fe-firecracker.svg', 100, 900, 100, 100),
    sticker('/stickers/fe-blossom.svg', CH_SQ - 200, 890, 100, 100),
  ]
  return createDesign({
    name: '方形囍印 · 喜结良缘',
    category: 'wedding',
    style: 'chinese',
    orientation: 'square',
    background: bg({ type: 'gradient', gradient: linear(135, [{ offset: 0, color: '#7E1519' }, { offset: 0.5, color: '#98201F' }, { offset: 1, color: '#6B1214' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '喜结良缘',
      eventType: 'wedding',
      hostName: '傅承安 & 柳如烟',
      date: '2026-10-01',
      time: '18:00',
      venue: '锦江大酒店 · 三层牡丹厅',
      address: '上海市黄浦区南京东路 88 号',
      phone: '138 0000 0000',
      inviteText: '良辰已定，吉日待启。',
    },
  })
}

/* ============================================================
 * 24. 横版峰会 · 商务论坛（商务 / 深蓝 / 横版）
 * ============================================================ */
function businessLandscapeSummit(): DesignDoc {
  const gold = '#C9A227'
  const cyan = '#5AC8E8'
  const els: DesignElement[] = [
    makeShape({ shape: 'rect', name: '顶栏', x: 0, y: 0, width: LW, height: 120, fill: '#0D1B2E', opacity: 0.9 }),
    makeShape({ shape: 'rect', name: '金线', x: 0, y: 120, width: LW, height: 3, fill: gold }),
    sticker('/stickers/fe-trophy.svg', 150, 300, 190, 190),
    makeText({ text: 'BUSINESS SUMMIT 2026', name: '英文引言', x: 430, y: 210, width: 1300, height: 52, fontFamily: FONTS.sans, fontSize: 30, fill: cyan, textAlign: 'left', charSpacing: 800 }),
    makeText({ text: '智启未来 · 高峰论坛', name: '主标题', role: 'title', x: 430, y: 290, width: 1300, height: 130, fontFamily: FONTS.serif, fontSize: 76, fontWeight: 'bold', fill: '#F2EFE9', textAlign: 'left' }),
    makeText({ text: '诚邀您拨冗出席', name: '主宾姓名', role: 'host', x: 430, y: 445, width: 1300, height: 60, fontFamily: FONTS.serif, fontSize: 38, fill: gold, textAlign: 'left', charSpacing: 300 }),
    thinLine(430, 545, 700, gold, 1.5, 0.7),
    makeText({ text: '2026年11月18日 星期三 · 09:30', name: '宴会日期', role: 'date', x: 430, y: 590, width: 1300, height: 52, fontFamily: FONTS.sans, fontSize: 34, fontWeight: 'bold', fill: '#DCE4EE', textAlign: 'left' }),
    makeText({ text: '国际会议中心 · 主论坛厅', name: '宴会地点', role: 'venue', x: 430, y: 655, width: 1300, height: 48, fontFamily: FONTS.sans, fontSize: 32, fill: cyan, textAlign: 'left' }),
    makeText({ text: '上海市浦东新区世纪大道 100 号', name: '详细地址', role: 'address', x: 430, y: 715, width: 1300, height: 42, fontFamily: FONTS.sans, fontSize: 26, fill: '#8FA0B8', textAlign: 'left' }),
    makeText({ text: '联系电话 138 0000 0000', name: '联系方式', role: 'contact', x: 430, y: 780, width: 1300, height: 40, fontFamily: FONTS.sans, fontSize: 24, fill: '#8FA0B8', textAlign: 'left' }),
    sticker('/stickers/fe-gem-stone.svg', 150, 620, 130, 130),
    sticker('/stickers/fe-star.svg', 320, 700, 90, 90, 0.9),
    sticker('/stickers/fe-crown.svg', LW - 300, 220, 140, 140, 0.95),
    makeText({ text: 'SUMMIT · 共话增长', name: '落款', x: 430, y: 860, width: 700, height: 44, fontFamily: FONTS.sans, fontSize: 22, fill: gold, textAlign: 'left', charSpacing: 500 }),
  ]
  return createDesign({
    name: '横版峰会 · 商务论坛',
    category: 'business',
    style: 'modern',
    orientation: 'landscape',
    background: bg({ type: 'gradient', gradient: linear(115, [{ offset: 0, color: '#12263F' }, { offset: 0.5, color: '#1C3A5C' }, { offset: 1, color: '#0E1F34' }]), opacity: 1 }),
    elements: els,
    eventInfo: {
      eventName: '智启未来 · 高峰论坛',
      eventType: 'business',
      hostName: '诚邀您拨冗出席',
      date: '2026-11-18',
      time: '09:30',
      venue: '国际会议中心 · 主论坛厅',
      address: '上海市浦东新区世纪大道 100 号',
      phone: '138 0000 0000',
      inviteText: '共话增长，智启未来。',
    },
  })
}

/* ============================================================
 * 导出
 * ============================================================ */
export const TEMPLATES_BATCH3: TemplateMeta[] = [
  { id: 'graduation-guochao-deer', name: '鹿鸣宴 · 国潮升学', category: 'graduation', style: 'guochao', color: 'red', orientation: 'portrait', type: 'animated', scene: '升学宴 · 国潮喜庆', build: graduationGuochaoDeer },
  { id: 'graduation-minimal-white', name: '极简白 · 升学答谢', category: 'graduation', style: 'minimal', color: 'white', orientation: 'portrait', type: 'static', scene: '谢师宴 · 极简清雅', build: graduationMinimalWhite },
  { id: 'housewarming-green-plant', name: '新绿乔居 · 生机之约', category: 'housewarming', style: 'modern', color: 'green', orientation: 'portrait', type: 'static', scene: '乔迁宴 · 清新自然', build: housewarmingGreenPlant },
  { id: 'housewarming-european-arch', name: '欧式拱门 · 乔迁庆典', category: 'housewarming', style: 'european', color: 'gold', orientation: 'portrait', type: 'static', scene: '乔迁宴 · 欧式典雅', build: housewarmingEuropeanArch },
  { id: 'business-chinese-red', name: '朱红请柬 · 商务宴请', category: 'business', style: 'chinese', color: 'red', orientation: 'portrait', type: 'animated', scene: '商务宴请 · 正式庄重', build: businessChineseRed },
  { id: 'business-emerald', name: '祖母绿 · 高端商务', category: 'business', style: 'luxury', color: 'green', orientation: 'portrait', type: 'animated', scene: '高端商务 · 沉稳奢华', build: businessEmerald },
  { id: 'festival-lantern-night', name: '元宵灯会 · 花好月圆', category: 'festival', style: 'chinese', color: 'red', orientation: 'portrait', type: 'animated', scene: '元宵佳节 · 灯火可亲', build: festivalLanternNight },
  { id: 'festival-dragonboat', name: '粽情端午 · 龙舟竞渡', category: 'festival', style: 'chinese', color: 'green', orientation: 'portrait', type: 'static', scene: '端午佳节 · 清雅青绿', build: festivalDragonBoat },
  { id: 'family-autumn-vintage', name: '秋日家宴 · 温情团聚', category: 'other', style: 'vintage', color: 'multi', orientation: 'portrait', type: 'static', scene: '家庭聚会 · 秋日暖调', build: familyAutumnVintage },
  { id: 'reunion-classmate', name: '同学聚会 · 青春不散场', category: 'other', style: 'modern', color: 'blue', orientation: 'portrait', type: 'animated', scene: '同学聚会 · 青春回忆', build: reunionClassmate },
  { id: 'wedding-square-seal', name: '方形囍印 · 喜结良缘', category: 'wedding', style: 'chinese', color: 'red', orientation: 'square', type: 'static', scene: '方形请帖 · 社交分享', build: weddingSquareSeal },
  { id: 'business-landscape-summit', name: '横版峰会 · 商务论坛', category: 'business', style: 'modern', color: 'blue', orientation: 'landscape', type: 'static', scene: '横版请柬 · 论坛大屏', build: businessLandscapeSummit },
]
