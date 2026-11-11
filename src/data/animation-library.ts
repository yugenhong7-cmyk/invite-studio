/* ============================================================
 * 动画模板库 —— 6 大用途分类 × 12 种风格
 * 每条动画含结构化配置（可调参数/预览/兼容元素/授权信息）
 * 全部为平台内置素材（builtin），授权：平台自有，可商用
 * ============================================================ */

import type { AnimCategory, AnimParams, AnimStyleTag, AnimationTemplate } from '@/types'

export const ANIM_CATEGORY_LABELS: Record<AnimCategory, string> = {
  opening: '开场动画',
  transition: '页面转场',
  text: '文字动画',
  background: '背景动画',
  image: '图片动画',
  ending: '结束动画',
}

export const ANIM_CATEGORY_ORDER: AnimCategory[] = ['opening', 'transition', 'text', 'background', 'image', 'ending']

export const ANIM_STYLE_LABELS: Record<AnimStyleTag, string> = {
  chinese: '中式传统',
  'neo-chinese': '新中式',
  guochao: '国潮喜庆',
  'western-romantic': '西式浪漫',
  garden: '梦幻花园',
  minimal: '极简高级',
  'luxury-gold': '轻奢金色',
  vintage: '复古典雅',
  cute: '温馨可爱',
  business: '商务尊贵',
  fresh: '自然清新',
  festive: '节日庆典',
}

export const ANIM_STYLE_ORDER: AnimStyleTag[] = [
  'chinese',
  'neo-chinese',
  'guochao',
  'western-romantic',
  'garden',
  'minimal',
  'luxury-gold',
  'vintage',
  'cute',
  'business',
  'fresh',
  'festive',
]

const LICENSE = '平台内置 · 可商用'

function p(over: Partial<AnimParams> = {}): AnimParams {
  return {
    duration: 800,
    delay: 0,
    speed: 1,
    direction: 'up',
    intensity: 0.6,
    opacity: 1,
    loops: 1,
    trigger: 'scroll',
    ...over,
  }
}

function anim(
  id: string,
  name: string,
  category: AnimCategory,
  style: AnimStyleTag[],
  scene: string,
  tags: string[],
  params: AnimParams,
  preview: AnimationTemplate['preview'],
  compatible: AnimationTemplate['compatible_elements'] = ['text'],
  configuration: Record<string, unknown> = {},
): AnimationTemplate {
  return {
    animation_id: id,
    animation_name: name,
    animation_category: category,
    animation_style: style,
    scene,
    tags,
    params,
    compatible_elements: compatible,
    preview,
    configuration,
    license_information: LICENSE,
    source_type: 'builtin',
  }
}

/* ============ A. 开场动画（12） ============ */
const OPENING: AnimationTemplate[] = [
  anim('open-envelope-cn', '中式红封展开', 'opening', ['chinese', 'guochao', 'neo-chinese'], '中式婚礼 / 寿宴 / 传统家宴', ['经典', '仪式感'], p({ duration: 1500, trigger: 'load', intensity: 0.8 }), { content: '囍', kind: 'text', anim: 'zoom', cover: 'envelope-chinese' }, ['page'], { coverStyle: 'envelope-chinese' }),
  anim('open-gold-card', '金色请柬浮现', 'opening', ['luxury-gold', 'neo-chinese', 'business'], '高端婚礼 / 商务宴请', ['轻奢', '高级'], p({ duration: 1300, trigger: 'load', intensity: 0.7 }), { content: '邀', kind: 'text', anim: 'glow', cover: 'card' }, ['page'], { coverStyle: 'card' }),
  anim('open-scroll', '喜帖卷轴展开', 'opening', ['chinese', 'vintage', 'neo-chinese'], '中式婚礼 / 传统寿宴', ['典雅', '国风'], p({ duration: 1600, trigger: 'load', direction: 'down' }), { content: '礼', kind: 'text', anim: 'mask', cover: 'scroll' }, ['page'], { coverStyle: 'scroll' }),
  anim('open-gold-light', '金色光效渐显', 'opening', ['luxury-gold', 'minimal', 'business'], '商务 / 高端庆典', ['光影', '克制'], p({ duration: 1100, trigger: 'load' }), { content: '✦', kind: 'text', anim: 'fade', cover: 'card' }, ['page'], { coverStyle: 'card' }),
  anim('open-bloom', '花朵缓缓绽放', 'opening', ['garden', 'western-romantic', 'fresh'], '西式婚礼 / 花园派对', ['浪漫', '自然'], p({ duration: 1400, trigger: 'load', intensity: 0.7 }), { content: '❀', kind: 'text', anim: 'zoom-out', cover: 'bloom' }, ['page'], { coverStyle: 'bloom' }),
  anim('open-butterfly', '蝴蝶飞入画面', 'opening', ['garden', 'cute', 'fresh'], '生日宴 / 满月宴 / 户外婚礼', ['灵动', '清新'], p({ duration: 1500, trigger: 'load', direction: 'left' }), { content: '🦋', kind: 'text', anim: 'float', cover: 'butterfly' }, ['page'], { coverStyle: 'butterfly' }),
  anim('open-ink', '水墨晕染展开', 'opening', ['chinese', 'neo-chinese', 'vintage'], '中式婚礼 / 文化雅集', ['意境', '水墨'], p({ duration: 1700, trigger: 'load', intensity: 0.8 }), { content: '墨', kind: 'text', anim: 'blur', cover: 'ink' }, ['page'], { coverStyle: 'ink' }),
  anim('open-card-flip', '优雅卡片翻转', 'opening', ['western-romantic', 'minimal', 'vintage'], '西式婚礼 / 鸡尾酒会', ['优雅', '现代'], p({ duration: 1200, trigger: 'load', direction: 'in' }), { content: 'Invitation', kind: 'text', anim: 'flip', cover: 'card' }, ['page'], { coverStyle: 'card' }),
  anim('open-camera', '镜头缓慢推进', 'opening', ['minimal', 'business', 'western-romantic'], '商务 / 影像感请帖', ['电影感', '沉浸'], p({ duration: 1800, trigger: 'load', speed: 0.7 }), { content: '·', kind: 'text', anim: 'zoom-out', cover: 'camera' }, ['page'], { coverStyle: 'camera' }),
  anim('open-soft-light', '柔和光影渐显', 'opening', ['minimal', 'fresh', 'garden'], '简约婚礼 / 温馨家宴', ['柔和', '治愈'], p({ duration: 1000, trigger: 'load' }), { content: '光', kind: 'text', anim: 'fade', cover: 'card' }, ['page'], { coverStyle: 'card' }),
  anim('open-starlight', '星空逐渐点亮', 'opening', ['western-romantic', 'garden', 'festive'], '夜晚婚礼 / 星空主题', ['梦幻', '浪漫'], p({ duration: 1600, trigger: 'load', intensity: 0.9 }), { content: '★', kind: 'text', anim: 'glow', cover: 'starlight' }, ['page'], { coverStyle: 'starlight' }),
  anim('open-glass', '玻璃邀请卡浮现', 'opening', ['minimal', 'luxury-gold', 'business'], '现代婚礼 / 高端商务', ['质感', '现代'], p({ duration: 1200, trigger: 'load' }), { content: '◇', kind: 'text', anim: 'blur', cover: 'glass' }, ['page'], { coverStyle: 'glass' }),
]

/* ============ B. 页面转场（12） ============ */
const TRANSITION: AnimationTemplate[] = [
  anim('trans-fade', '淡入淡出', 'transition', ['minimal', 'business', 'western-romantic'], '通用 / 商务', ['百搭', '克制'], p({ duration: 600 }), { content: '——', kind: 'text', anim: 'fade' }, ['page']),
  anim('trans-slide-lr', '左右滑动', 'transition', ['minimal', 'business', 'fresh'], '商务 / 现代风', ['流畅', '利落'], p({ duration: 650, direction: 'left' }), { content: '→', kind: 'text', anim: 'slide-left' }, ['page']),
  anim('trans-slide-ud', '上下滑动', 'transition', ['minimal', 'fresh', 'cute'], '简约 / 生日', ['轻快'], p({ duration: 650, direction: 'up' }), { content: '↕', kind: 'text', anim: 'slide-up' }, ['page']),
  anim('trans-flip', '翻页效果', 'transition', ['vintage', 'chinese', 'western-romantic'], '故事式请帖 / 相册', ['翻阅感'], p({ duration: 800 }), { content: '▤', kind: 'text', anim: 'flip' }, ['page']),
  anim('trans-card-3d', '立体卡片翻转', 'transition', ['luxury-gold', 'business', 'western-romantic'], '高端婚礼 / 商务', ['立体', '高级'], p({ duration: 850 }), { content: '◈', kind: 'text', anim: 'flip' }, ['page']),
  anim('trans-soft-zoom', '柔和缩放', 'transition', ['garden', 'western-romantic', 'cute'], '浪漫婚礼 / 生日', ['柔和'], p({ duration: 700 }), { content: '◎', kind: 'text', anim: 'zoom' }, ['page']),
  anim('trans-mask-open', '遮罩展开', 'transition', ['minimal', 'luxury-gold', 'business'], '现代 / 轻奢', ['设计感'], p({ duration: 750 }), { content: '▣', kind: 'text', anim: 'mask' }, ['page']),
  anim('trans-petal-mask', '花瓣遮罩转场', 'transition', ['garden', 'western-romantic', 'festive'], '花园婚礼 / 春日宴', ['花瓣', '浪漫'], p({ duration: 900, intensity: 0.8 }), { content: '❀', kind: 'text', anim: 'mask' }, ['page']),
  anim('trans-light-sweep', '光线扫过', 'transition', ['luxury-gold', 'business', 'minimal'], '轻奢 / 商务', ['光影', '质感'], p({ duration: 700 }), { content: '╱', kind: 'text', anim: 'glow' }, ['page']),
  anim('trans-ink', '水墨过渡', 'transition', ['chinese', 'neo-chinese', 'vintage'], '中式 / 国风', ['水墨', '意境'], p({ duration: 950 }), { content: '墨', kind: 'text', anim: 'blur' }, ['page']),
  anim('trans-blur-clear', '模糊到清晰', 'transition', ['minimal', 'western-romantic', 'fresh'], '通用 / 影像感', ['聚焦'], p({ duration: 750 }), { content: '◉', kind: 'text', anim: 'blur' }, ['page']),
  anim('trans-cinema', '电影感渐变', 'transition', ['minimal', 'business', 'western-romantic'], '影像故事 / 商务', ['电影感'], p({ duration: 1000, speed: 0.8 }), { content: '▦', kind: 'text', anim: 'fade' }, ['page']),
]

/* ============ C. 文字动画（10） ============ */
const TEXT: AnimationTemplate[] = [
  anim('text-char-by-char', '逐字出现', 'text', ['chinese', 'neo-chinese', 'vintage'], '标题 / 姓名', ['细腻'], p({ duration: 1200, trigger: 'stagger' }), { content: '我们结婚啦', kind: 'text', anim: 'chars' }, ['text']),
  anim('text-line-by-line', '逐行显现', 'text', ['minimal', 'business', 'fresh'], '邀请正文', ['清晰'], p({ duration: 900, trigger: 'stagger' }), { content: '敬备喜筵\n恭请光临', kind: 'text', anim: 'slide-up' }, ['text']),
  anim('text-fade-up', '淡入上浮', 'text', ['western-romantic', 'minimal', 'garden'], '标题 / 姓名', ['优雅', '百搭'], p({ duration: 800 }), { content: 'Forever', kind: 'text', anim: 'slide-up' }, ['text']),
  anim('text-zoom-near', '从远到近', 'text', ['luxury-gold', 'guochao', 'festive'], '主标题', ['冲击力'], p({ duration: 900 }), { content: '囍', kind: 'text', anim: 'zoom' }, ['text']),
  anim('text-typewriter', '打字机效果', 'text', ['vintage', 'minimal', 'business'], '文案 / 日期', ['复古', '叙事'], p({ duration: 1500, trigger: 'load' }), { content: 'Save the Date', kind: 'text', anim: 'typewriter' }, ['text']),
  anim('text-gold-stroke', '金色描边显现', 'text', ['chinese', 'luxury-gold', 'guochao'], '标题 / 囍字', ['华丽'], p({ duration: 1100, intensity: 0.9 }), { content: '囍', kind: 'text', anim: 'glow' }, ['text']),
  anim('text-light-sweep', '光线扫过文字', 'text', ['luxury-gold', 'business', 'minimal'], '标题', ['质感'], p({ duration: 1000 }), { content: 'Invitation', kind: 'text', anim: 'glow' }, ['text']),
  anim('text-chars-float', '字符依次浮现', 'text', ['cute', 'garden', 'fresh'], '生日 / 满月标题', ['活泼'], p({ duration: 1300, trigger: 'stagger' }), { content: '生日快乐', kind: 'text', anim: 'float' }, ['text']),
  anim('text-soft-scale', '优雅缩放', 'text', ['western-romantic', 'minimal', 'vintage'], '姓名 / 主题', ['柔和'], p({ duration: 850 }), { content: '张三 · 李四', kind: 'text', anim: 'zoom-out' }, ['text']),
  anim('text-mask-reveal', '文字遮罩揭示', 'text', ['minimal', 'luxury-gold', 'business'], '标题', ['设计感'], p({ duration: 950 }), { content: '诚邀', kind: 'text', anim: 'mask' }, ['text']),
]

/* ============ D. 背景动画（14） ============ */
function bgAnim(id: string, name: string, style: AnimStyleTag[], scene: string, tags: string[], fx: AnimationTemplate['preview']['fx'], intensity = 0.6): AnimationTemplate {
  return anim(id, name, 'background', style, scene, tags, p({ duration: 0, trigger: 'load', intensity, loops: 0 }), { content: '', kind: 'page', anim: 'none', fx }, ['page'], { fxType: fx })
}

const BACKGROUND: AnimationTemplate[] = [
  bgAnim('bg-petals', '花瓣飘落', ['western-romantic', 'garden', 'festive'], '婚礼 / 春日宴', ['浪漫', '经典'], 'petals'),
  bgAnim('bg-sakura', '樱花飘落', ['garden', 'cute', 'fresh'], '春日 / 日式主题', ['唯美'], 'sakura'),
  bgAnim('bg-gold', '金色粒子漂浮', ['chinese', 'luxury-gold', 'guochao'], '中式婚礼 / 庆典', ['喜庆', '轻奢'], 'gold'),
  bgAnim('bg-stars', '星光闪烁', ['western-romantic', 'garden', 'festive'], '夜晚婚礼 / 星空主题', ['梦幻'], 'stars'),
  bgAnim('bg-candles', '烛光摇曳', ['vintage', 'chinese', 'western-romantic'], '晚宴 / 烛光主题', ['温馨', '氛围'], 'candles'),
  bgAnim('bg-lightflow', '流动光影', ['minimal', 'business', 'luxury-gold'], '商务 / 现代', ['高级', '克制'], 'lightflow'),
  bgAnim('bg-clouds', '祥云缓慢移动', ['chinese', 'neo-chinese', 'guochao'], '中式 / 国风', ['祥瑞'], 'clouds'),
  bgAnim('bg-snow', '雪花飘落', ['festive', 'minimal', 'western-romantic'], '冬日 / 圣诞 / 新年', ['冬日'], 'snow'),
  bgAnim('bg-butterflies', '蝴蝶飞舞', ['garden', 'cute', 'fresh'], '生日 / 户外', ['灵动'], 'butterflies'),
  bgAnim('bg-balloons', '气球缓缓升起', ['cute', 'festive'], '生日 / 派对', ['欢乐'], 'balloons'),
  bgAnim('bg-streamers', '彩带飘动', ['festive', 'cute', 'guochao'], '生日 / 庆典', ['热闹'], 'streamers'),
  bgAnim('bg-bokeh', '梦幻光斑', ['garden', 'western-romantic', 'luxury-gold'], '婚礼 / 晚宴', ['柔美'], 'bokeh'),
  bgAnim('bg-starflow', '星空流动', ['western-romantic', 'minimal'], '夜晚 / 星空', ['深邃'], 'starflow'),
  bgAnim('bg-ripples', '水面波纹', ['fresh', 'minimal', 'garden'], '水边 / 清新主题', ['宁静'], 'ripples'),
]

/* ============ E. 图片动画（9） ============ */
const IMAGE: AnimationTemplate[] = [
  anim('img-fade-in', '图片渐渐显现', 'image', ['minimal', 'fresh', 'business'], '通用照片', ['百搭'], p({ duration: 900 }), { content: '🖼', kind: 'image', anim: 'fade' }, ['image']),
  anim('img-zoom-slow', '图片缓慢放大', 'image', ['western-romantic', 'luxury-gold', 'garden'], '婚纱照 / 主视觉', ['电影感'], p({ duration: 1400, speed: 0.7 }), { content: '🖼', kind: 'image', anim: 'zoom-out' }, ['image']),
  anim('img-parallax', '图片视差移动', 'image', ['minimal', 'business', 'western-romantic'], '长图 / 多图', ['层次'], p({ duration: 1200, intensity: 0.5 }), { content: '🖼', kind: 'image', anim: 'slide-up' }, ['image'], { parallax: true }),
  anim('img-flip', '图片翻转', 'image', ['vintage', 'cute', 'festive'], '相册 / 对比图', ['趣味'], p({ duration: 800 }), { content: '🖼', kind: 'image', anim: 'flip' }, ['image']),
  anim('img-blur-clear', '模糊变清晰', 'image', ['minimal', 'luxury-gold', 'western-romantic'], '主视觉照片', ['聚焦'], p({ duration: 1100 }), { content: '🖼', kind: 'image', anim: 'blur' }, ['image']),
  anim('img-sequence', '多张照片依次展示', 'image', ['garden', 'cute', 'fresh'], '故事相册', ['叙事'], p({ duration: 1000, trigger: 'stagger' }), { content: '🖼', kind: 'image', anim: 'fade' }, ['image'], { sequence: true }),
  anim('img-wall', '照片墙展开', 'image', ['festive', 'cute', 'vintage'], '聚会 / 回忆墙', ['丰富'], p({ duration: 1200, trigger: 'stagger' }), { content: '🖼', kind: 'image', anim: 'zoom' }, ['image'], { grid: true }),
  anim('img-album-flip', '相册翻页效果', 'image', ['vintage', 'western-romantic', 'garden'], '相册式请帖', ['翻阅'], p({ duration: 900 }), { content: '🖼', kind: 'image', anim: 'flip' }, ['image'], { album: true }),
  anim('img-cinema-push', '电影感镜头推进', 'image', ['minimal', 'business', 'luxury-gold'], '高端 / 影像', ['沉浸'], p({ duration: 1600, speed: 0.6 }), { content: '🖼', kind: 'image', anim: 'zoom-out' }, ['image'], { kenBurns: true }),
]

/* ============ F. 结束动画（7） ============ */
const ENDING: AnimationTemplate[] = [
  anim('end-thanks', '感谢文字缓缓出现', 'ending', ['minimal', 'business', 'western-romantic'], '通用结尾', ['得体'], p({ duration: 1100 }), { content: '感谢您的光临', kind: 'text', anim: 'fade' }, ['page']),
  anim('end-petals', '花瓣逐渐飘落', 'ending', ['garden', 'western-romantic', 'festive'], '婚礼 / 庆典结尾', ['浪漫'], p({ duration: 1400, intensity: 0.7 }), { content: '❀', kind: 'text', anim: 'float' }, ['page'], { fxType: 'petals' }),
  anim('end-gold-dissolve', '金色光点消散', 'ending', ['luxury-gold', 'chinese', 'guochao'], '中式 / 轻奢结尾', ['余韵'], p({ duration: 1300 }), { content: '✦', kind: 'text', anim: 'fade' }, ['page'], { fxType: 'gold' }),
  anim('end-star-fade', '星空渐渐暗下', 'ending', ['western-romantic', 'minimal'], '夜晚主题结尾', ['静谧'], p({ duration: 1500 }), { content: '★', kind: 'text', anim: 'fade' }, ['page'], { fxType: 'stars' }),
  anim('end-name-again', '邀请人姓名再次呈现', 'ending', ['chinese', 'vintage', 'neo-chinese'], '正式请帖结尾', ['郑重'], p({ duration: 1000 }), { content: '张三 · 李四 敬邀', kind: 'text', anim: 'slide-up' }, ['page']),
  anim('end-card-close', '优雅卡片缓缓收起', 'ending', ['minimal', 'business', 'luxury-gold'], '商务 / 简约结尾', ['利落'], p({ duration: 1200 }), { content: '◇', kind: 'text', anim: 'zoom' }, ['page']),
  anim('end-fade-out', '结束页面淡出', 'ending', ['minimal', 'fresh', 'cute'], '通用结尾', ['轻柔'], p({ duration: 1000 }), { content: '— 完 —', kind: 'text', anim: 'fade' }, ['page']),
]

export const ANIMATION_LIBRARY: AnimationTemplate[] = [...OPENING, ...TRANSITION, ...TEXT, ...BACKGROUND, ...IMAGE, ...ENDING]

export const ANIMATION_COUNT = ANIMATION_LIBRARY.length

/** 按 id 取动画模板 */
export function getAnimation(id: string): AnimationTemplate | undefined {
  return ANIMATION_LIBRARY.find((a) => a.animation_id === id)
}

/** 按用途筛选 */
export function animationsByCategory(cat: AnimCategory): AnimationTemplate[] {
  return ANIMATION_LIBRARY.filter((a) => a.animation_category === cat)
}

/** 搜索（名称/场景/标签） */
export function searchAnimations(q: string): AnimationTemplate[] {
  const k = q.trim().toLowerCase()
  if (!k) return ANIMATION_LIBRARY
  return ANIMATION_LIBRARY.filter(
    (a) =>
      a.animation_name.toLowerCase().includes(k) ||
      a.scene.toLowerCase().includes(k) ||
      a.tags.some((t) => t.toLowerCase().includes(k)) ||
      a.animation_id.includes(k),
  )
}
