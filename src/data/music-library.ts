/* ============================================================
 * 背景音乐库 —— 8 大宴会场景分类
 * 内置音乐全部为本地合成无缝循环（scripts/gen_music.py），
 * 授权：平台自有，可商用，无第三方版权风险。
 * ============================================================ */

import type { MusicCategory, MusicTrack } from '@/types'

export const MUSIC_CATEGORY_LABELS: Record<MusicCategory, string> = {
  wedding: '婚礼音乐',
  chinese: '中式传统',
  birthday: '生日宴',
  'birthday-elder': '寿宴',
  baby: '满月宴',
  graduation: '升学宴',
  business: '商务宴请',
  festival: '节日与其他',
}

export const MUSIC_CATEGORY_ORDER: MusicCategory[] = [
  'wedding',
  'chinese',
  'birthday',
  'birthday-elder',
  'baby',
  'graduation',
  'business',
  'festival',
]

export const MOOD_TAGS = ['浪漫', '温馨', '喜庆', '庄重', '轻快', '典雅', '梦幻', '治愈', '高级', '活泼'] as const

const LICENSE = '平台内置合成 · 可商用 · 无版权风险'

/** 封面：CSS 渐变（无需图片资源，视觉统一） */
function cover(from: string, to: string): string {
  return `gradient:${from}:${to}`
}

function t(
  id: string,
  name: string,
  category: MusicCategory,
  style: string,
  scene: string,
  moods: string[],
  seconds: number,
  coverSpec: string,
  bpm?: number,
): MusicTrack {
  return {
    music_id: id,
    music_name: name,
    music_category: category,
    music_style: style,
    audio_url: `builtin:${id}`,
    cover_url: coverSpec,
    duration: seconds,
    mood_tags: moods,
    tempo_metadata: bpm ? { bpm } : undefined,
    license_information: LICENSE,
    source_type: 'builtin',
    scene,
  }
}

/* ---------- 婚礼（8） ---------- */
const WEDDING: MusicTrack[] = [
  t('romantic', '花间月', 'wedding', '浪漫钢琴', '西式婚礼 · 求婚 · 纪念日', ['浪漫', '温馨'], 24, cover('#F7C6C7', '#E8A0A8'), 66),
  t('w-piano', '晨光誓言', 'wedding', '浪漫钢琴', '婚礼仪式 · 誓言环节', ['浪漫', '典雅'], 12, cover('#F5D0A9', '#E8B48A'), 72),
  t('w-strings', '温柔弦乐', 'wedding', '温柔弦乐', '婚礼 · 迎宾 · 晚宴', ['温馨', '典雅'], 12, cover('#D4A5C9', '#B888B0'), 60),
  t('w-violin', '轻柔小提琴', 'wedding', '小提琴独奏', '婚礼 · 户外仪式', ['浪漫', '治愈'], 12, cover('#C9D7F0', '#9DB4DE'), 68),
  t('w-guitar', '温馨吉他', 'wedding', '原声吉他', '小型婚礼 · 户外派对', ['温馨', '轻快'], 12, cover('#F0E0C0', '#DCC09A'), 80),
  t('w-classical', '优雅古典', 'wedding', '古典室内乐', '教堂婚礼 · 正式仪式', ['典雅', '庄重'], 12, cover('#E0D8C8', '#C0B49C'), 58),
  t('dream', '梦幻花园', 'wedding', '梦幻氛围', '花园婚礼 · 梦幻主题', ['梦幻', '浪漫'], 24, cover('#E8D4F0', '#C8A8E0'), 56),
  t('w-ceremony', '庄重仪式', 'wedding', '仪式进行曲', '婚礼主仪式 · 敬酒', ['庄重', '典雅'], 12, cover('#C8B8A0', '#A89478'), 52),
]

/* ---------- 中式传统（8） ---------- */
const CHINESE: MusicTrack[] = [
  t('chinese', '中式雅韵', 'chinese', '古风纯音乐', '中式婚礼 · 寿宴 · 传统家宴', ['典雅', '庄重'], 24, cover('#C2443C', '#8B2E28'), 62),
  t('c-guzheng', '高山流水', 'chinese', '古筝', '中式婚礼 · 茶艺雅集', ['典雅', '治愈'], 12, cover('#D4A24C', '#B8862E'), 66),
  t('c-pipa', '琵琶语', 'chinese', '琵琶', '国风宴请 · 文化雅集', ['典雅', '传统'], 12, cover('#E8C8A0', '#C8A070'), 76),
  t('c-dizi', '笛声悠扬', 'chinese', '笛子', '春日宴 · 户外中式', ['清新', '传统'], 12, cover('#A8D0C0', '#78B0A0'), 70),
  t('c-erhu', '二泉映月意', 'chinese', '二胡', '中式晚宴 · 怀旧主题', ['典雅', '深情'], 12, cover('#B89070', '#987050'), 54),
  t('c-festive', '喜庆锣鼓韵', 'chinese', '传统喜庆', '中式婚礼 · 迎亲 · 庆典', ['喜庆', '热闹'], 12, cover('#E84C3C', '#C23428'), 96),
  t('c-neo', '新中式风', 'chinese', '新中式氛围', '新中式婚礼 · 现代国风', ['高级', '典雅'], 12, cover('#3C5A78', '#28405C'), 64),
  t('e-trad', '国风雅集', 'chinese', '古风纯音乐', '寿宴 · 传统家宴', ['传统', '温馨'], 12, cover('#C8A878', '#A88858'), 60),
]

/* ---------- 生日宴（5） ---------- */
const BIRTHDAY: MusicTrack[] = [
  t('b-piano', '生日温馨', 'birthday', '温馨钢琴', '生日派对 · 家庭聚会', ['温馨', '轻快'], 12, cover('#F8C8D8', '#E8A0B8'), 88),
  t('b-joy', '欢乐时光', 'birthday', '欢乐轻音乐', '生日 · 朋友聚会', ['活泼', '轻快'], 12, cover('#F8D878', '#E8B848'), 96),
  t('b-lively', '活力节奏', 'birthday', '活泼节奏', '年轻人派对 · 聚会', ['活泼', '热闹'], 12, cover('#78D0E8', '#48A8C8'), 108),
  t('b-guitar', '轻快吉他', 'birthday', '轻快吉他', '户外生日 · 野餐', ['轻快', '清新'], 12, cover('#A8E0A0', '#78C070'), 92),
  t('b-strings', '温暖弦乐', 'birthday', '温暖弦乐', '温馨生日 · 家宴', ['温馨', '治愈'], 12, cover('#F0C8A8', '#D8A080'), 74),
]

/* ---------- 寿宴（4） ---------- */
const ELDER: MusicTrack[] = [
  t('e-warm', '温暖典雅', 'birthday-elder', '温暖典雅', '寿宴 · 家庭庆典', ['温馨', '庄重'], 12, cover('#E8C8A0', '#C8A078'), 58),
  t('e-classic', '福寿安康', 'birthday-elder', '优雅古典', '寿宴 · 正式庆典', ['典雅', '庄重'], 12, cover('#D8B888', '#B89468'), 54),
  t('e-bless', '温馨祝福', 'birthday-elder', '温馨氛围', '寿宴 · 家宴', ['温馨', '治愈'], 12, cover('#E8D0B0', '#C8A888'), 62),
]

/* ---------- 满月宴（4） ---------- */
const BABY: MusicTrack[] = [
  t('y-lullaby', '摇篮曲', 'baby', '温柔摇篮曲', '满月宴 · 百日宴', ['温馨', '治愈'], 12, cover('#C8E0F8', '#A0C0E8'), 52),
  t('y-piano', '小小星星', 'baby', '轻柔钢琴', '满月宴 · 家庭聚会', ['温馨', '梦幻'], 12, cover('#E0D8F8', '#B8B0E0'), 64),
  t('y-heal', '温暖治愈', 'baby', '梦幻音乐', '满月宴 · 亲子主题', ['治愈', '梦幻'], 12, cover('#D8F0E8', '#A8D8C8'), 58),
  t('y-heal2', '甜梦', 'baby', '温馨治愈', '满月宴 · 晚间', ['温馨', '治愈'], 12, cover('#F0E0F0', '#D0B8D8'), 56),
]

/* ---------- 升学宴（5） ---------- */
const GRAD: MusicTrack[] = [
  t('g-youth', '青春励志', 'graduation', '青春励志', '升学宴 · 谢师宴', ['活泼', '轻快'], 12, cover('#88C8E8', '#58A0C8'), 100),
  t('b-piano2', '温暖钢琴', 'graduation', '温暖钢琴', '升学宴 · 家宴', ['温馨', '治愈'], 12, cover('#F0C8B0', '#D8A088'), 72),
  t('g-hope', '希望与梦想', 'graduation', '明亮弦乐', '升学宴 · 毕业典礼', ['梦幻', '轻快'], 12, cover('#A8D8F0', '#78B0D8'), 84),
  t('g-bright', '明亮轻快', 'graduation', '明亮轻快', '升学宴 · 朋友庆祝', ['轻快', '活泼'], 12, cover('#F8E088', '#E8C058'), 104),
  t('g-solemn', '庄重典雅', 'graduation', '庄重典雅', '谢师宴 · 正式场合', ['庄重', '典雅'], 12, cover('#B8C0D0', '#9098B0'), 60),
]

/* ---------- 商务宴请（5） ---------- */
const BUSINESS: MusicTrack[] = [
  t('z-premium', '高级商务', 'business', '高级商务氛围', '商务晚宴 · 答谢会', ['高级', '庄重'], 12, cover('#2C3E50', '#1A2530'), 56),
  t('lazy', '轻奢爵士', 'business', '轻奢爵士', '商务酒会 · 鸡尾酒会', ['高级', '典雅'], 24, cover('#4A3C5C', '#2E2440'), 70),
  t('z-jazz', '夜色爵士', 'business', '轻奢爵士', '高端晚宴 · 私人聚会', ['高级', '浪漫'], 12, cover('#5C4A3C', '#3E2E24'), 68),
  t('z-electronic', '现代电子氛围', 'business', '现代电子', '发布会 · 现代商务', ['高级', '现代'], 12, cover('#2C4A5C', '#1A3040'), 88),
  t('z-strings', '大气弦乐', 'business', '大气弦乐', '颁奖礼 · 年会 · 庆典', ['庄重', '大气'], 12, cover('#3C4A5C', '#243040'), 60),
]

/* ---------- 节日与其他（5） ---------- */
const FESTIVAL: MusicTrack[] = [
  t('f-newyear', '新年喜庆', 'festival', '新年喜庆', '新年宴 · 春节聚会', ['喜庆', '热闹'], 12, cover('#E84C3C', '#C23428'), 100),
  t('f-christmas', '圣诞氛围', 'festival', '圣诞氛围', '圣诞派对 · 冬日聚会', ['温馨', '梦幻'], 12, cover('#C03C3C', '#2C5C3C'), 82),
  t('f-celebrate', '节日庆典', 'festival', '节日庆典', '节日聚会 · 庆典', ['喜庆', '活泼'], 12, cover('#F0A03C', '#D0802C'), 94),
  t('f-family', '家庭聚会', 'festival', '家庭温馨', '家庭聚会 · 团圆饭', ['温馨', '治愈'], 12, cover('#E8C8A0', '#C8A078'), 66),
  t('f-house', '乔迁祝福', 'festival', '乔迁祝福', '乔迁宴 · 暖房派对', ['温馨', '轻快'], 12, cover('#A8D0B8', '#78B088'), 72),
]

export const MUSIC_LIBRARY: MusicTrack[] = [...WEDDING, ...CHINESE, ...BIRTHDAY, ...ELDER, ...BABY, ...GRAD, ...BUSINESS, ...FESTIVAL]

export const MUSIC_COUNT = MUSIC_LIBRARY.length

/** 解析封面样式（gradient:from:to） */
export function coverStyle(spec: string): { background: string } {
  if (spec.startsWith('gradient:')) {
    const [, from, to] = spec.split(':')
    return { background: `linear-gradient(135deg, ${from}, ${to})` }
  }
  return { background: `url(${spec}) center/cover` }
}

export function getMusic(id: string): MusicTrack | undefined {
  return MUSIC_LIBRARY.find((m) => m.music_id === id)
}

/** 解析音频地址：builtin:xxx → /audio/builtin-xxx.wav */
export function musicSrc(trackOrSrc: string): string {
  if (trackOrSrc.startsWith('builtin:')) {
    const id = trackOrSrc.slice('builtin:'.length)
    // 新曲目录里 music_id 与文件名的映射
    return `/audio/builtin-${id}.wav`
  }
  return trackOrSrc
}

export function searchMusic(q: string, all: MusicTrack[] = MUSIC_LIBRARY): MusicTrack[] {
  const k = q.trim().toLowerCase()
  if (!k) return all
  return all.filter(
    (m) =>
      m.music_name.toLowerCase().includes(k) ||
      m.music_style.toLowerCase().includes(k) ||
      m.scene.toLowerCase().includes(k) ||
      m.mood_tags.some((tag) => tag.includes(k)) ||
      m.music_id.includes(k),
  )
}
