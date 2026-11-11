import { useRef, useState } from 'react'
import AiMatchDialog from './AiMatchDialog'
import AnimationLibrary from './AnimationLibrary'
import MusicLibrary from './MusicLibrary'
import clsx from 'clsx'
import { useEditor } from '@/store/editor'
import { toast } from '@/store/app'
import {
  ANIM_LABELS,
  BUILTIN_MUSIC,
  COVER_LABELS,
  FX_LABELS,
  PRESET_LABELS,
  PRESET_ORDER,
  applyPreset,
} from '@/lib/presentation'
import { schemeToPresentationPatch } from '@/lib/ai-match'
import { uploadUserFile } from '@/lib/repo'
import { cloudErrorMessage } from '@/lib/cloud'
import type {
  AnimTrigger,
  AnimType,
  BackgroundFxType,
  CoverStyle,
  PresentMode,
} from '@/types'

const MODE_LABELS: Record<PresentMode, { label: string; desc: string }> = {
  single: { label: '单页沉浸', desc: '整页滚动浏览，分段动画依次呈现' },
  flip: { label: '多屏翻页', desc: '分场景逐屏展示，支持滑动切换' },
  story: { label: '故事式', desc: '多张照片配文字，按时间轴讲述' },
}

const TRIGGER_LABELS: Record<AnimTrigger, string> = {
  scroll: '滚动触发',
  load: '进入即播',
  stagger: '依次出现',
}

const ANIM_OPTIONS: AnimType[] = ['fade', 'slide-up', 'slide-down', 'zoom', 'reveal', 'none']
const COVER_OPTIONS: CoverStyle[] = ['auto', 'envelope-chinese', 'envelope-western', 'gift', 'scroll', 'card']
const FX_OPTIONS: BackgroundFxType[] = ['none', 'petals', 'stars', 'gold', 'clouds', 'ribbons', 'bokeh', 'snow', 'confetti']

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="shrink-0 text-[11px] text-ink-soft">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={clsx(
        'relative h-5 w-9 rounded-full transition-colors',
        on ? 'bg-primary-500' : 'bg-paper-line',
      )}
      aria-pressed={on}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <input
        type="range"
        className="h-1 flex-1 accent-primary-500"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-ink-mute">
        {fmt ? fmt(value) : value.toFixed(2)}
      </span>
    </div>
  )
}

export default function MotionPanel() {
  const doc = useEditor((s) => s.doc)
  const setPresentation = useEditor((s) => s.setPresentation)
  const selectedId = useEditor((s) => s.selectedId)
  const p = doc.presentation
  const [previewKey, setPreviewKey] = useState(0)
  const [musicBusy, setMusicBusy] = useState(false)
  const [showAiMatch, setShowAiMatch] = useState(false)
  const [showAnimLib, setShowAnimLib] = useState(false)
  const [showMusicLib, setShowMusicLib] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const selected = doc.elements.find((e) => e.id === selectedId)
  const anim = selectedId ? p.elementAnims[selectedId] : undefined

  function patchElementAnim(patch: Partial<{ enter: AnimType; exit: AnimType; duration: number; delay: number; trigger: AnimTrigger }>) {
    if (!selectedId) return
    const base = p.elementAnims[selectedId] ?? {
      enter: 'fade',
      exit: 'none',
      duration: 700,
      delay: 0,
      trigger: 'stagger' as AnimTrigger,
    }
    setPresentation({ elementAnims: { ...p.elementAnims, [selectedId]: { ...base, ...patch } } })
  }

  function clearElementAnim() {
    if (!selectedId) return
    const next = { ...p.elementAnims }
    delete next[selectedId]
    setPresentation({ elementAnims: next })
  }

  async function handleMusicFile(file: File | null | undefined) {
    if (!file) return
    if (!/^audio\//.test(file.type)) {
      toast('error', '请选择音频文件（mp3 / wav / m4a 等）')
      return
    }
    setMusicBusy(true)
    try {
      const url = await uploadUserFile(file, 'audio')
      setPresentation({ music: { ...p.music, enabled: true, src: url, name: file.name.replace(/\.[^.]+$/, '') } })
      toast('success', '音乐已上传并启用')
    } catch (e) {
      toast('error', cloudErrorMessage(e))
    } finally {
      setMusicBusy(false)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">动态效果</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
        让电子请帖拥有开场封面、滚动动画、动态背景与背景音乐，分享后宾客即获得沉浸式体验。
      </p>

      {/* ---------- AI 智能搭配 + 素材库入口 ---------- */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-gold-500 to-primary-600 px-2 py-2.5 text-white transition hover:opacity-90"
          onClick={() => setShowAiMatch(true)}
        >
          <span className="text-base leading-none">✨</span>
          <span className="text-[10px] font-semibold">AI 智能搭配</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-[#7C5CBF] to-[#4A6FA5] px-2 py-2.5 text-white transition hover:opacity-90"
          onClick={() => setShowAnimLib(true)}
        >
          <span className="text-base leading-none">🎬</span>
          <span className="text-[10px] font-semibold">动画库</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-[#C75D8F] to-[#8B3A62] px-2 py-2.5 text-white transition hover:opacity-90"
          onClick={() => setShowMusicLib(true)}
        >
          <span className="text-base leading-none">🎵</span>
          <span className="text-[10px] font-semibold">音乐库</span>
        </button>
      </div>

      {/* ---------- 动画预设 ---------- */}
      <div className="mt-4">
        <h4 className="text-xs font-semibold text-ink">一键套用动画方案</h4>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {PRESET_ORDER.map((id) => (
            <button
              key={id}
              onClick={() => {
                setPresentation(applyPreset(p, id))
                toast('success', `已套用「${PRESET_LABELS[id]}」动画方案`)
              }}
              className={clsx(
                'rounded-lg px-2 py-2 text-[11px] ring-1 transition',
                p.preset === id
                  ? 'bg-primary-500 text-white ring-primary-500'
                  : 'bg-white text-ink-soft ring-paper-line/70 hover:bg-gold-50 hover:text-gold-700',
              )}
            >
              {PRESET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- 展示模式 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">展示形式</h4>
        <div className="mt-2 space-y-1.5">
          {(Object.keys(MODE_LABELS) as PresentMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setPresentation({ mode: m })}
              className={clsx(
                'w-full rounded-lg px-3 py-2 text-left ring-1 transition',
                p.mode === m ? 'bg-gold-50 ring-gold-400' : 'bg-white ring-paper-line/70 hover:bg-paper',
              )}
            >
              <div className="text-xs font-medium text-ink">{MODE_LABELS[m].label}</div>
              <div className="mt-0.5 text-[10px] leading-relaxed text-ink-mute">{MODE_LABELS[m].desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- 开场封面 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">开场封面动画</h4>
        <Row label="启用封面">
          <Toggle on={p.cover.enabled} onChange={(v) => setPresentation({ cover: { ...p.cover, enabled: v } })} />
        </Row>
        {p.cover.enabled && (
          <>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {COVER_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPresentation({ cover: { ...p.cover, style: c } })}
                  className={clsx(
                    'rounded-lg px-2 py-1.5 text-[11px] ring-1 transition',
                    p.cover.style === c
                      ? 'bg-primary-500 text-white ring-primary-500'
                      : 'bg-white text-ink-soft ring-paper-line/70 hover:bg-gold-50',
                  )}
                >
                  {COVER_LABELS[c]}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="label">封面提示语</label>
              <input
                className="input !py-1.5 text-xs"
                value={p.cover.hint}
                maxLength={12}
                onChange={(e) => setPresentation({ cover: { ...p.cover, hint: e.target.value } })}
                placeholder="轻触开启"
              />
            </div>
          </>
        )}
      </div>

      {/* ---------- 动态背景 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">动态背景</h4>
        <Row label="启用动效">
          <Toggle on={p.backgroundFx.enabled} onChange={(v) => setPresentation({ backgroundFx: { ...p.backgroundFx, enabled: v } })} />
        </Row>
        {p.backgroundFx.enabled && (
          <>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {FX_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setPresentation({ backgroundFx: { ...p.backgroundFx, type: f } })}
                  className={clsx(
                    'rounded-lg px-1.5 py-1.5 text-[11px] ring-1 transition',
                    p.backgroundFx.type === f
                      ? 'bg-primary-500 text-white ring-primary-500'
                      : 'bg-white text-ink-soft ring-paper-line/70 hover:bg-gold-50',
                  )}
                >
                  {FX_LABELS[f]}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 text-[10px] text-ink-mute">动画速度</div>
                <Slider
                  value={p.backgroundFx.speed}
                  min={0.2}
                  max={2}
                  step={0.05}
                  onChange={(v) => setPresentation({ backgroundFx: { ...p.backgroundFx, speed: v } })}
                  fmt={(v) => `${v.toFixed(2)}x`}
                />
              </div>
              <div>
                <div className="mb-1 text-[10px] text-ink-mute">粒子数量</div>
                <Slider
                  value={p.backgroundFx.intensity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPresentation({ backgroundFx: { ...p.backgroundFx, intensity: v } })}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <div>
                <div className="mb-1 text-[10px] text-ink-mute">不透明度</div>
                <Slider
                  value={p.backgroundFx.opacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setPresentation({ backgroundFx: { ...p.backgroundFx, opacity: v } })}
                  fmt={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ---------- 背景音乐 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">背景音乐</h4>
        <Row label="启用音乐">
          <Toggle on={p.music.enabled} onChange={(v) => setPresentation({ music: { ...p.music, enabled: v } })} />
        </Row>
        <div className="mt-2 space-y-1.5">
          {BUILTIN_MUSIC.map((m) => (
            <button
              key={m.id}
              onClick={() => setPresentation({ music: { ...p.music, enabled: true, src: `builtin:${m.id}`, name: m.name } })}
              className={clsx(
                'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left ring-1 transition',
                p.music.src === `builtin:${m.id}`
                  ? 'bg-gold-50 ring-gold-400'
                  : 'bg-white ring-paper-line/70 hover:bg-paper',
              )}
            >
              <div>
                <div className="text-xs font-medium text-ink">{m.name}</div>
                <div className="text-[10px] text-ink-mute">{m.mood}</div>
              </div>
              {p.music.src === `builtin:${m.id}` && <span className="text-[10px] text-gold-700">使用中</span>}
            </button>
          ))}
          <button
            className="btn-ghost w-full !py-2 text-xs"
            disabled={musicBusy}
            onClick={() => audioInputRef.current?.click()}
          >
            {musicBusy ? '上传中…' : '上传我的音乐'}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              void handleMusicFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {!p.music.src.startsWith('builtin:') && (
            <div className="rounded-lg bg-gold-50 px-2.5 py-2 text-[10px] text-gold-800">
              已上传音乐：{p.music.name}
            </div>
          )}
          <div>
            <div className="mb-1 text-[10px] text-ink-mute">音量</div>
            <Slider
              value={p.music.volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => setPresentation({ music: { ...p.music, volume: v } })}
              fmt={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
          <Row label="循环播放">
            <Toggle on={p.music.loop} onChange={(v) => setPresentation({ music: { ...p.music, loop: v } })} />
          </Row>
          <p className="text-[10px] leading-relaxed text-ink-mute">
            受手机浏览器限制，音乐将在宾客点击开启请帖时播放，不会强制自动播放。
          </p>
        </div>
      </div>

      {/* ---------- 内容分区 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">内容分区</h4>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-mute">控制电子请帖正文中展示哪些模块。</p>
        <div className="mt-2 space-y-0.5">
          {(
            [
              ['countdown', '倒计时'],
              ['venue', '地点信息（含导航）'],
              ['contact', '联系方式'],
              ['rsvp', '宾客回执'],
              ['share', '分享 / 二维码'],
              ['ending', '结束语'],
              ['story', '故事照片墙'],
            ] as [keyof typeof p.sections, string][]
          ).map(([key, label]) => (
            <Row key={key} label={label}>
              <Toggle
                on={p.sections[key]}
                onChange={(v) => setPresentation({ sections: { ...p.sections, [key]: v } })}
              />
            </Row>
          ))}
        </div>
      </div>

      {/* ---------- 元素动画 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">元素动画</h4>
        {!selected ? (
          <p className="mt-2 rounded-lg bg-paper px-3 py-2.5 text-[11px] leading-relaxed text-ink-mute">
            在画布中选中一个元素，即可为它单独设置进入 / 退出动画、时长与延迟。
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            <div className="rounded-lg bg-paper px-2.5 py-2 text-[11px] text-ink-soft">
              当前元素：<span className="font-medium text-ink">{selected.name}</span>
            </div>
            <div>
              <div className="mb-1 text-[10px] text-ink-mute">进入动画</div>
              <div className="flex flex-wrap gap-1">
                {ANIM_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => patchElementAnim({ enter: a })}
                    className={clsx(
                      'rounded-md px-2 py-1 text-[10px] ring-1 transition',
                      (anim?.enter ?? 'fade') === a
                        ? 'bg-primary-500 text-white ring-primary-500'
                        : 'bg-white text-ink-soft ring-paper-line/70',
                    )}
                  >
                    {ANIM_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] text-ink-mute">退出动画</div>
              <div className="flex flex-wrap gap-1">
                {ANIM_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => patchElementAnim({ exit: a })}
                    className={clsx(
                      'rounded-md px-2 py-1 text-[10px] ring-1 transition',
                      (anim?.exit ?? 'none') === a
                        ? 'bg-primary-500 text-white ring-primary-500'
                        : 'bg-white text-ink-soft ring-paper-line/70',
                    )}
                  >
                    {ANIM_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] text-ink-mute">持续时间</div>
              <Slider
                value={anim?.duration ?? 700}
                min={200}
                max={2000}
                step={50}
                onChange={(v) => patchElementAnim({ duration: v })}
                fmt={(v) => `${v}ms`}
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] text-ink-mute">延迟时间</div>
              <Slider
                value={anim?.delay ?? 0}
                min={0}
                max={2000}
                step={50}
                onChange={(v) => patchElementAnim({ delay: v })}
                fmt={(v) => `${v}ms`}
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] text-ink-mute">触发方式</div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(TRIGGER_LABELS) as AnimTrigger[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => patchElementAnim({ trigger: t })}
                    className={clsx(
                      'rounded-md px-2 py-1 text-[10px] ring-1 transition',
                      (anim?.trigger ?? 'stagger') === t
                        ? 'bg-primary-500 text-white ring-primary-500'
                        : 'bg-white text-ink-soft ring-paper-line/70',
                    )}
                  >
                    {TRIGGER_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            {anim && (
              <button className="btn-ghost w-full !py-1.5 text-[11px]" onClick={clearElementAnim}>
                恢复为方案默认动画
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---------- 全局速度 + 预览 ---------- */}
      <div className="mt-5 border-t border-paper-line/70 pt-4">
        <h4 className="text-xs font-semibold text-ink">全局动画速度</h4>
        <div className="mt-2">
          <Slider
            value={p.globalSpeed}
            min={0.5}
            max={1.5}
            step={0.05}
            onChange={(v) => setPresentation({ globalSpeed: v })}
            fmt={(v) => `${v.toFixed(2)}x`}
          />
        </div>
        <button
          className="btn-primary mt-4 w-full"
          onClick={() => {
            setPreviewKey((k) => k + 1)
            window.dispatchEvent(new CustomEvent('invite:preview-motion', { detail: { key: previewKey + 1 } }))
            toast('info', '已刷新预览窗口，可查看最新动态效果')
          }}
        >
          预览动态效果
        </button>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-mute">
          提示：顶部「预览」按钮可打开完整电子请帖效果；发布分享后，宾客看到的即为此动态版本。
        </p>
      </div>

      {/* ---------- 对话框 ---------- */}
      <AiMatchDialog
        open={showAiMatch}
        onClose={() => setShowAiMatch(false)}
        onApply={(scheme, targets) => {
          const patch = schemeToPresentationPatch(scheme)
          const update: Partial<typeof p> = {}
          if (targets.anim) {
            update.cover = { ...p.cover, enabled: true, style: patch.cover.style as typeof p.cover.style }
            update.backgroundFx = { ...p.backgroundFx, enabled: patch.backgroundFx.enabled, type: patch.backgroundFx.type }
          }
          if (targets.music) {
            update.music = { ...p.music, enabled: true, src: patch.music.src, name: patch.music.name }
          }
          setPresentation(update)
          toast('success', 'AI 方案已应用，点「预览」查看效果')
        }}
      />
      <AnimationLibrary
        open={showAnimLib}
        onClose={() => setShowAnimLib(false)}
        onApplyAnim={(tpl, params, target) => {
          if (target === 'cover') {
            const coverStyle = (tpl.configuration as { coverStyle?: string })?.coverStyle
            if (coverStyle) setPresentation({ cover: { ...p.cover, enabled: true, style: coverStyle as typeof p.cover.style } })
            toast('success', `开场动画「${tpl.animation_name}」已应用`)
          } else if (target === 'background') {
            const fx = tpl.preview.fx
            if (fx) setPresentation({ backgroundFx: { ...p.backgroundFx, enabled: true, type: fx } })
            toast('success', `背景动效「${tpl.animation_name}」已应用`)
          } else if (target === 'page') {
            toast('success', `页面动画「${tpl.animation_name}」已应用到转场`)
          } else {
            // 应用到选中元素
            const elId = selectedId ?? doc.elements[0]?.id
            if (!elId) {
              toast('info', '请先选中一个元素再应用动画')
              return
            }
            setPresentation({
              elementAnims: {
                ...p.elementAnims,
                [elId]: {
                  enter: tpl.preview.anim,
                  exit: 'none',
                  duration: params.duration,
                  delay: params.delay,
                  trigger: params.trigger,
                },
              },
            })
            toast('success', `动画「${tpl.animation_name}」已应用到元素`)
          }
          setPreviewKey((k) => k + 1)
        }}
      />
      <MusicLibrary
        open={showMusicLib}
        onClose={() => setShowMusicLib(false)}
        onUseTrack={(track: import('@/types').MusicTrack) => {
          setPresentation({ music: { ...p.music, enabled: true, src: track.audio_url, name: track.music_name } })
          toast('success', `「${track.music_name}」已设为背景音乐`)
          setPreviewKey((k) => k + 1)
        }}
      />
    </div>
  )
}
