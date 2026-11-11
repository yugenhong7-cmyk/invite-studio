/* ============================================================
 * 动画库中心 —— 分类/风格筛选 + 实时动画预览卡片 + 参数自定义
 * 预览为真实 CSS/Canvas 动画播放（非静态缩略图）
 * ============================================================ */

import { useMemo, useState } from 'react'
import type { AnimCategory, AnimParams, AnimStyleTag, AnimationTemplate } from '@/types'
import {
  ANIMATION_LIBRARY,
  ANIM_CATEGORY_LABELS,
  ANIM_CATEGORY_ORDER,
  ANIM_STYLE_LABELS,
  ANIM_STYLE_ORDER,
  searchAnimations,
} from '@/data/animation-library'
import { useLibrary } from '@/store/library'
import { Modal } from '@/components/ui'

/* ---------------- 实时预览卡片 ---------------- */

function AnimationPreview({ tpl, playKey, playing }: { tpl: AnimationTemplate; playKey: number; playing: boolean }) {
  const { content, kind, anim, fx, cover } = tpl.preview
  const animCls = playing ? `di-anim di-${anim}` : 'di-hidden'

  if (tpl.animation_category === 'background' && fx) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-ink to-[#3a2f28]">
        <div key={playKey} className="absolute inset-0">
          <MiniParticles type={fx} />
        </div>
        <div className="absolute bottom-1.5 left-2 text-[9px] text-white/70">{ANIM_CATEGORY_LABELS.background}</div>
      </div>
    )
  }

  if (tpl.animation_category === 'opening' && cover) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary-700 to-primary-900">
        <div key={playKey} className={`${animCls} flex h-16 w-12 flex-col items-center justify-center rounded border border-gold-300/60 bg-gold-50/10`}>
          <div className="text-gold-300 text-lg leading-none">{content}</div>
        </div>
        <div className="absolute bottom-1.5 left-2 text-[9px] text-white/70">封面 · {content}</div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-paper to-[#f3ece2]">
      <div
        key={playKey}
        className={`${animCls} max-w-[86%] px-2 text-center`}
        style={{
          color: kind === 'image' ? '#C2443C' : '#5C4033',
          fontSize: kind === 'text' ? 15 : 13,
          fontWeight: 600,
          animationDuration: `${Math.min(1400, tpl.params.duration)}ms`,
        }}
      >
        {kind === 'image' ? (
          <div className="mx-auto flex h-12 w-16 items-center justify-center rounded border-2 border-primary-300 bg-primary-50 text-xl">🖼</div>
        ) : (
          content || '✦'
        )}
      </div>
    </div>
  )
}

/** 卡片内的迷你粒子背景（独立小画布，避免全屏） */
const MINI_PALLETES: Record<string, string[]> = {
  petals: ['#F5A8B8', '#F8C4CE', '#E88CA0'],
  sakura: ['#FBC7D4', '#F7A8C0', '#F5D0DE'],
  gold: ['#E8C86A', '#D4AF37', '#F5E3A0'],
  stars: ['#FFF6D8', '#FFE9A8', '#FFFFFF'],
  snow: ['#FFFFFF', '#F0F4F8', '#E3EDF5'],
  confetti: ['#E85D75', '#F5B041', '#5DADE2'],
  default: ['#F5D76E', '#F5A8B8', '#FFFFFF'],
}

function MiniParticles({ type: fxType }: { type: string }) {
  const colors = MINI_PALLETES[fxType] ?? MINI_PALLETES.default
  const dots = Array.from({ length: 14 }, (_, i) => i)
  return (
    <div className="absolute inset-0 overflow-hidden">
      {dots.map((i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            width: 4 + (i % 3) * 3,
            height: 4 + (i % 3) * 3,
            background: colors[i % colors.length],
            opacity: 0.75,
            animation: `di-float-y ${2.2 + (i % 4) * 0.6}s ease-in-out ${(i % 5) * 0.35}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ---------------- 动画卡片 ---------------- */

function AnimationCard({
  tpl,
  fav,
  onFav,
  onApply,
  onCustomize,
  selected,
}: {
  tpl: AnimationTemplate
  fav: boolean
  onFav: () => void
  onApply: () => void
  onCustomize: () => void
  selected: boolean
}) {
  const [playKey, setPlayKey] = useState(0)
  const [playing, setPlaying] = useState(true)

  return (
    <div
      className={`group rounded-xl bg-white p-2.5 ring-1 transition ${
        selected ? 'ring-2 ring-gold-400' : 'ring-paper-line/70 hover:ring-gold-300'
      }`}
      onMouseEnter={() => {
        setPlayKey((k) => k + 1)
        setPlaying(true)
      }}
    >
      <div
        className="relative h-28 w-full cursor-pointer overflow-hidden rounded-lg"
        onClick={() => {
          setPlayKey((k) => k + 1)
          setPlaying(true)
          onCustomize()
        }}
      >
        <AnimationPreview tpl={tpl} playKey={playKey} playing={playing} />
        <button
          className={`absolute right-1.5 top-1.5 rounded-full bg-white/85 p-1 text-xs transition ${
            fav ? 'text-primary-500' : 'text-ink-mute hover:text-primary-400'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onFav()
          }}
          title={fav ? '取消收藏' : '收藏'}
        >
          {fav ? '♥' : '♡'}
        </button>
        <button
          className="absolute bottom-1.5 right-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-ink-mute opacity-0 transition group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            setPlayKey((k) => k + 1)
            setPlaying(true)
          }}
        >
          重播
        </button>
      </div>

      <div className="mt-2 px-0.5">
        <div className="flex items-start justify-between gap-1">
          <div className="text-xs font-semibold text-ink leading-snug">{tpl.animation_name}</div>
          <div className="shrink-0 rounded bg-gold-50 px-1 py-0.5 text-[9px] text-gold-700">
            {ANIM_CATEGORY_LABELS[tpl.animation_category]}
          </div>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[10px] text-ink-mute">{tpl.scene}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {tpl.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded bg-paper px-1 py-0.5 text-[9px] text-ink-mute">
              {t}
            </span>
          ))}
          {tpl.animation_style.slice(0, 2).map((st) => (
            <span key={st} className="rounded bg-primary-50 px-1 py-0.5 text-[9px] text-primary-600">
              {ANIM_STYLE_LABELS[st]}
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          <button className="btn-gold btn-sm flex-1 !py-1 !text-[11px]" onClick={onApply}>
            应用
          </button>
          <button
            className="flex-1 rounded-lg bg-paper py-1 text-[11px] text-ink-mute transition hover:bg-gold-50 hover:text-gold-700"
            onClick={onCustomize}
          >
            自定义
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 参数自定义面板 ---------------- */

function ParamsEditor({ params, onChange }: { params: AnimParams; onChange: (p: AnimParams) => void }) {
  const row = 'flex items-center justify-between gap-2 py-1'
  const label = 'w-16 shrink-0 text-[11px] text-ink-mute'
  const input = 'h-7 w-full rounded-md border border-paper-line bg-white px-1.5 text-[11px]'
  return (
    <div className="rounded-lg bg-paper/60 p-2.5">
      <div className="text-[11px] font-semibold text-ink">动画参数</div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3">
        <div className={row}>
          <span className={label}>时长(ms)</span>
          <input type="number" min={100} max={5000} step={50} className={input} value={params.duration} onChange={(e) => onChange({ ...params, duration: +e.target.value || 800 })} />
        </div>
        <div className={row}>
          <span className={label}>延迟(ms)</span>
          <input type="number" min={0} max={5000} step={50} className={input} value={params.delay} onChange={(e) => onChange({ ...params, delay: +e.target.value || 0 })} />
        </div>
        <div className={row}>
          <span className={label}>速度</span>
          <input type="number" min={0.5} max={2} step={0.1} className={input} value={params.speed} onChange={(e) => onChange({ ...params, speed: +e.target.value || 1 })} />
        </div>
        <div className={row}>
          <span className={label}>方向</span>
          <select className={input} value={params.direction} onChange={(e) => onChange({ ...params, direction: e.target.value as AnimParams['direction'] })}>
            <option value="up">向上</option>
            <option value="down">向下</option>
            <option value="left">向左</option>
            <option value="right">向右</option>
            <option value="in">由外向内</option>
            <option value="out">由内向外</option>
          </select>
        </div>
        <div className={row}>
          <span className={label}>强度</span>
          <input type="range" min={0} max={1} step={0.05} className="w-full" value={params.intensity} onChange={(e) => onChange({ ...params, intensity: +e.target.value })} />
        </div>
        <div className={row}>
          <span className={label}>透明度</span>
          <input type="range" min={0} max={1} step={0.05} className="w-full" value={params.opacity} onChange={(e) => onChange({ ...params, opacity: +e.target.value })} />
        </div>
        <div className={row}>
          <span className={label}>循环次数</span>
          <input type="number" min={0} max={20} className={input} value={params.loops} onChange={(e) => onChange({ ...params, loops: +e.target.value || 0 })} title="0 = 无限循环" />
        </div>
        <div className={row}>
          <span className={label}>触发方式</span>
          <select className={input} value={params.trigger} onChange={(e) => onChange({ ...params, trigger: e.target.value as AnimParams['trigger'] })}>
            <option value="scroll">滚动触发</option>
            <option value="load">进入即播</option>
            <option value="stagger">依次出现</option>
          </select>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 主组件 ---------------- */

export function AnimationLibrary({
  open,
  onClose,
  onApplyAnim,
}: {
  open: boolean
  onClose: () => void
  /** 应用动画：由编辑器决定作用于选中元素/整页/封面/背景 */
  onApplyAnim: (tpl: AnimationTemplate, params: AnimParams, target: 'element' | 'page' | 'cover' | 'background') => void
}) {
  const [category, setCategory] = useState<AnimCategory | 'all' | 'fav'>('all')
  const [style, setStyle] = useState<AnimStyleTag | ''>('')
  const [q, setQ] = useState('')
  const [customizing, setCustomizing] = useState<AnimationTemplate | null>(null)
  const [params, setParams] = useState<AnimParams | null>(null)
  const [target, setTarget] = useState<'element' | 'page' | 'cover' | 'background'>('element')
  const [playKey, setPlayKey] = useState(0)

  const { favAnimations, toggleFavAnimation } = useLibrary()

  const list = useMemo(() => {
    let arr = q ? searchAnimations(q) : ANIMATION_LIBRARY
    if (category === 'fav') arr = arr.filter((a) => favAnimations.includes(a.animation_id))
    else if (category !== 'all') arr = arr.filter((a) => a.animation_category === category)
    if (style) arr = arr.filter((a) => a.animation_style.includes(style))
    return arr
  }, [category, style, q, favAnimations])

  function openCustomize(tpl: AnimationTemplate) {
    setCustomizing(tpl)
    setParams({ ...tpl.params })
    setPlayKey((k) => k + 1)
    setTarget(tpl.animation_category === 'opening' ? 'cover' : tpl.animation_category === 'background' ? 'background' : 'element')
  }

  function apply() {
    if (!customizing || !params) return
    onApplyAnim(customizing, params, target)
    setCustomizing(null)
  }

  const customizingId = customizing?.animation_id

  return (
    <Modal open={open} onClose={onClose} title="动画素材中心" width="max-w-5xl">
      <div className="flex gap-4">
        {/* 左：筛选器 */}
        <div className="w-36 shrink-0">
          <div className="text-[11px] font-semibold text-ink-mute">用途分类</div>
          <div className="mt-1.5 space-y-1">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
              全部动画
            </FilterChip>
            <FilterChip active={category === 'fav'} onClick={() => setCategory('fav')}>
              ♥ 我的收藏
            </FilterChip>
            {ANIM_CATEGORY_ORDER.map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {ANIM_CATEGORY_LABELS[c]}
              </FilterChip>
            ))}
          </div>
          <div className="mt-3 text-[11px] font-semibold text-ink-mute">风格</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ANIM_STYLE_ORDER.map((st) => (
              <button
                key={st}
                className={`rounded-full px-2 py-0.5 text-[10px] transition ${
                  style === st ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'
                }`}
                onClick={() => setStyle(style === st ? '' : st)}
              >
                {ANIM_STYLE_LABELS[st]}
              </button>
            ))}
          </div>
        </div>

        {/* 右：搜索 + 卡片 / 自定义 */}
        <div className="min-w-0 flex-1">
          {customizing ? (
            <div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-ink-mute hover:text-ink" onClick={() => setCustomizing(null)}>
                  ← 返回列表
                </button>
                <div className="text-sm font-semibold text-ink">{customizing.animation_name}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className="h-44 cursor-pointer overflow-hidden rounded-xl ring-1 ring-paper-line"
                  onClick={() => setPlayKey((k) => k + 1)}
                >
                  <AnimationPreview tpl={{ ...customizing, params: params ?? customizing.params }} playKey={playKey} playing />
                </div>
                <div>
                  <ParamsEditor params={params ?? customizing.params} onChange={setParams} />
                  <div className="mt-2">
                    <div className="text-[11px] font-semibold text-ink">应用到</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(
                        [
                          ['element', '选中元素'],
                          ['page', '整页文字'],
                          ['cover', '开场封面'],
                          ['background', '背景动效'],
                        ] as const
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                            target === v ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'
                          }`}
                          onClick={() => setTarget(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg bg-paper/60 p-2 text-[10px] leading-relaxed text-ink-mute">
                    {customizing.scene}｜兼容：{customizing.compatible_elements.join(' / ')}
                    <br />
                    授权：{customizing.license_information}
                  </div>
                  <button className="btn-gold mt-3 w-full" onClick={apply}>
                    应用此动画
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索动画名称、场景、标签…"
                className="h-9 w-full rounded-lg border border-paper-line bg-white px-3 text-xs outline-none focus:border-gold-400"
              />
              <div className="mt-1.5 text-[10px] text-ink-mute">
                共 {list.length} 个动画 · 悬停卡片即可播放真实动画预览
              </div>
              <div className="mt-2 grid max-h-[460px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 lg:grid-cols-3">
                {list.map((tpl) => (
                  <AnimationCard
                    key={tpl.animation_id}
                    tpl={tpl}
                    fav={favAnimations.includes(tpl.animation_id)}
                    onFav={() => toggleFavAnimation(tpl.animation_id)}
                    onApply={() => {
                      onApplyAnim(
                        tpl,
                        tpl.params,
                        tpl.animation_category === 'opening'
                          ? 'cover'
                          : tpl.animation_category === 'background'
                            ? 'background'
                            : 'element',
                      )
                    }}
                    onCustomize={() => openCustomize(tpl)}
                    selected={customizingId === tpl.animation_id}
                  />
                ))}
                {list.length === 0 && (
                  <div className="col-span-full py-10 text-center text-xs text-ink-mute">没有匹配的动画，试试其他关键词</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] transition ${
        active ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default AnimationLibrary
