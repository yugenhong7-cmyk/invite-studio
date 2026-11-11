/* ============================================================
 * 动态电子请帖 —— 展示配置与预设动画方案
 * 预设：浪漫婚礼 / 中式典雅 / 国潮喜庆 / 梦幻花园 /
 *       简约高级 / 温馨生日 / 商务尊贵
 * ============================================================ */

import { MUSIC_LIBRARY, musicSrc } from '@/data/music-library'
import type {
  AnimPresetId,
  AnimType,
  BackgroundFxType,
  CoverStyle,
  DesignElement,
  EventCategory,
  PresentationConfig,
  StyleTag,
} from '@/types'

export const ANIM_LABELS: Record<AnimType, string> = {
  fade: '淡入',
  'slide-up': '上滑',
  'slide-down': '下滑',
  'slide-left': '左滑',
  'slide-right': '右滑',
  zoom: '放大',
  'zoom-out': '由远及近',
  reveal: '揭示',
  flip: '翻转',
  rotate: '旋转',
  blur: '模糊聚焦',
  typewriter: '打字机',
  chars: '逐字出现',
  glow: '光效显现',
  mask: '遮罩揭示',
  bounce: '弹跳',
  swing: '摆动',
  float: '漂浮',
  none: '无',
}

export const FX_LABELS: Record<BackgroundFxType, string> = {
  none: '无',
  petals: '花瓣',
  sakura: '樱花',
  stars: '星光',
  starflow: '星河流转',
  gold: '金粉',
  clouds: '云雾',
  ribbons: '丝带',
  bokeh: '光斑',
  snow: '飘雪',
  confetti: '彩纸',
  candles: '烛光',
  butterflies: '蝴蝶',
  balloons: '气球',
  streamers: '彩带',
  ripples: '涟漪',
  fireflies: '萤火',
  lightflow: '流光',
}

export const COVER_LABELS: Record<CoverStyle, string> = {
  auto: '智能匹配',
  'envelope-chinese': '中式信封',
  'envelope-western': '西式信封',
  gift: '礼盒',
  scroll: '卷轴',
  card: '商务卡',
  bloom: '花朵绽放',
  butterfly: '蝴蝶飞入',
  ink: '水墨晕染',
  glass: '玻璃卡片',
  starlight: '星空点亮',
  camera: '镜头推进',
}

export const PRESET_LABELS: Record<AnimPresetId, string> = {
  romantic: '浪漫婚礼',
  chinese: '中式典雅',
  guochao: '国潮喜庆',
  garden: '梦幻花园',
  minimal: '简约高级',
  birthday: '温馨生日',
  business: '商务尊贵',
}

export const PRESET_ORDER: AnimPresetId[] = ['romantic', 'chinese', 'guochao', 'garden', 'minimal', 'birthday', 'business']

/* ---------------- 默认展示配置 ---------------- */

export function defaultPresentation(): PresentationConfig {
  return {
    mode: 'single',
    preset: 'romantic',
    cover: {
      enabled: true,
      style: 'auto',
      hint: '轻触开启',
    },
    backgroundFx: {
      enabled: true,
      type: 'petals',
      speed: 1,
      intensity: 0.55,
      opacity: 0.75,
    },
    music: {
      enabled: true,
      src: 'builtin:romantic',
      name: '花间月',
      volume: 0.6,
      loop: true,
    },
    sections: {
      countdown: true,
      venue: true,
      contact: true,
      rsvp: true,
      share: true,
      ending: true,
      story: false,
    },
    story: [],
    elementAnims: {},
    globalSpeed: 1,
  }
}

/* ---------------- 预设方案 ---------------- */

interface PresetPatch {
  cover?: Partial<PresentationConfig['cover']>
  backgroundFx?: Partial<PresentationConfig['backgroundFx']>
  music?: Partial<PresentationConfig['music']>
  defaultEnter?: AnimType
  globalSpeed?: number
}

const PRESETS: Record<AnimPresetId, PresetPatch> = {
  romantic: {
    cover: { style: 'envelope-western', hint: '轻触开启' },
    backgroundFx: { type: 'petals', speed: 0.85, intensity: 0.55, opacity: 0.72 },
    music: { src: 'builtin:romantic', name: '花间月' },
    defaultEnter: 'fade',
    globalSpeed: 1,
  },
  chinese: {
    cover: { style: 'envelope-chinese', hint: '轻启请柬' },
    backgroundFx: { type: 'gold', speed: 0.7, intensity: 0.5, opacity: 0.8 },
    music: { src: 'builtin:chinese', name: '中式雅韵' },
    defaultEnter: 'reveal',
    globalSpeed: 1.05,
  },
  guochao: {
    cover: { style: 'envelope-chinese', hint: '点击开启' },
    backgroundFx: { type: 'ribbons', speed: 1, intensity: 0.5, opacity: 0.75 },
    music: { src: 'builtin:chinese', name: '中式雅韵' },
    defaultEnter: 'zoom',
    globalSpeed: 0.95,
  },
  garden: {
    cover: { style: 'envelope-western', hint: '轻触开启' },
    backgroundFx: { type: 'bokeh', speed: 0.6, intensity: 0.6, opacity: 0.65 },
    music: { src: 'builtin:dream', name: '梦幻花园' },
    defaultEnter: 'slide-up',
    globalSpeed: 1.1,
  },
  minimal: {
    cover: { style: 'card', hint: '开启邀请' },
    backgroundFx: { type: 'bokeh', speed: 0.45, intensity: 0.3, opacity: 0.4 },
    music: { enabled: false, src: 'builtin:lazy', name: '轻爵士' },
    defaultEnter: 'fade',
    globalSpeed: 1,
  },
  birthday: {
    cover: { style: 'gift', hint: '拆开礼物' },
    backgroundFx: { type: 'confetti', speed: 1.1, intensity: 0.65, opacity: 0.8 },
    music: { src: 'builtin:dream', name: '梦幻花园' },
    defaultEnter: 'zoom',
    globalSpeed: 0.9,
  },
  business: {
    cover: { style: 'card', hint: '开启邀请' },
    backgroundFx: { type: 'stars', speed: 0.5, intensity: 0.35, opacity: 0.5 },
    music: { src: 'builtin:lazy', name: '轻爵士' },
    defaultEnter: 'slide-up',
    globalSpeed: 1,
  },
}

/** 一键应用整套预设（保留 mode / sections / story / 自定义元素动画） */
export function applyPreset(current: PresentationConfig, preset: AnimPresetId): PresentationConfig {
  const patch = PRESETS[preset]
  /* 预设指定了乐曲则默认开启音乐（除非预设显式关闭，如「简约高级」） */
  const musicEnabled = patch.music?.enabled ?? (patch.music?.src ? true : current.music.enabled)
  return {
    ...current,
    preset,
    cover: { ...current.cover, ...patch.cover },
    backgroundFx: { ...current.backgroundFx, enabled: true, ...patch.backgroundFx },
    music: { ...current.music, ...patch.music, enabled: musicEnabled },
    globalSpeed: patch.globalSpeed ?? current.globalSpeed,
    elementAnims: Object.fromEntries(
      Object.entries(current.elementAnims).map(([id, a]) => [id, { ...a, enter: patch.defaultEnter ?? a.enter }]),
    ),
  }
}

/** 按宴会类型 / 风格选择默认预设 */
export function defaultPresetFor(category: EventCategory, style: StyleTag): AnimPresetId {
  if (category === 'business') return 'business'
  if (category === 'birthday' || category === 'fullmoon') return 'birthday'
  if (category === 'longevity') return 'chinese'
  if (category === 'wedding') return style === 'chinese' || style === 'guochao' ? 'chinese' : 'romantic'
  if (style === 'chinese' || style === 'guochao' || style === 'vintage') return 'guochao'
  if (style === 'minimal' || style === 'modern') return 'minimal'
  return 'romantic'
}

/** 新建设计时的动态配置（预设感知） */
export function presentationFor(category: EventCategory, style: StyleTag): PresentationConfig {
  const preset = defaultPresetFor(category, style)
  return applyPreset(defaultPresentation(), preset)
}

/** 智能匹配封面风格 */
export function resolveCoverStyle(config: PresentationConfig, category: EventCategory, style: StyleTag): Exclude<CoverStyle, 'auto'> {
  if (config.cover.style !== 'auto') return config.cover.style
  if (category === 'business') return 'card'
  if (category === 'birthday' || category === 'fullmoon') return 'gift'
  if (category === 'longevity' || category === 'graduation') return 'scroll'
  if (category === 'wedding') return style === 'chinese' || style === 'guochao' ? 'envelope-chinese' : 'envelope-western'
  if (style === 'chinese' || style === 'guochao') return 'envelope-chinese'
  return 'envelope-western'
}

/** 单个元素的动画（自定义优先，否则按预设默认 + 位置 stagger） */
export function animForElement(
  el: DesignElement,
  index: number,
  config: PresentationConfig,
): { enter: AnimType; duration: number; delay: number; trigger: 'scroll' | 'load' | 'stagger' } {
  const custom = config.elementAnims[el.id]
  const presetDefault = PRESETS[config.preset]?.defaultEnter ?? 'fade'
  if (custom) {
    return {
      enter: custom.enter,
      duration: custom.duration,
      delay: custom.delay,
      trigger: custom.trigger,
    }
  }
  // 按图层顺序自然错开：装饰先出、文字随后
  const roleWeight = el.type === 'text' ? 1 : 0
  return {
    enter: presetDefault,
    duration: 700,
    delay: (index % 8) * 120 + roleWeight * 80,
    trigger: 'stagger',
  }
}

/** 内置音乐库（本地合成 WAV，无版权风险）—— 完整目录见 @/data/music-library */
export const BUILTIN_MUSIC: { id: string; name: string; mood: string; src: string }[] = MUSIC_LIBRARY.map((m) => ({
  id: m.music_id,
  name: m.music_name,
  mood: m.mood_tags.join(' · '),
  src: musicSrc(m.audio_url),
}))

export function resolveMusicSrc(src: string): string {
  return musicSrc(src)
}
