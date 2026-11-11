/* ============================================================
 * AI 智能搭配 —— 分析请帖 → 推荐动画+音乐完整方案
 * 支持：一键应用 / 只应用动画 / 只应用音乐 / 换一套 / 保存方案
 * ============================================================ */

import { useCallback, useEffect, useState } from 'react'
import { useEditor } from '@/store/editor'
import { useLibrary } from '@/store/library'
import { toast } from '@/store/app'
import { Modal } from '@/components/ui'
import { matchDynamicTheme, rematchDynamicTheme, type MatchResult } from '@/lib/ai-match'
import { getAnimation, ANIM_CATEGORY_LABELS } from '@/data/animation-library'
import type { DynamicThemeScheme } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  wedding: '婚礼',
  birthday: '生日宴',
  longevity: '寿宴',
  fullmoon: '满月宴',
  graduation: '升学宴',
  housewarming: '乔迁宴',
  business: '商务宴请',
  festival: '节日宴会',
  other: '其他',
}

const RICHNESS_LABELS: Record<string, string> = {
  simple: '简约（适合轻量动画）',
  balanced: '均衡（适度动画）',
  rich: '丰富（动画克制）',
}

const PICK_ROLE_LABELS: Record<string, string> = {
  opening: '开场动画',
  transition: '页面转场',
  textAnim: '文字动画',
  backgroundFx: '背景动效',
  imageAnim: '图片动画',
  ending: '结束动画',
}

export function AiMatchDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  /** 应用方案到 presentation */
  onApply: (scheme: DynamicThemeScheme, targets: { anim: boolean; music: boolean }) => void
}) {
  const doc = useEditor((s) => s.doc)
  const { addScheme } = useLibrary()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [salt, setSalt] = useState(0)
  const [moodHint, setMoodHint] = useState('')
  const [applying, setApplying] = useState(false)

  const runMatch = useCallback(
    async (s: number) => {
      setLoading(true)
      setResult(null)
      try {
        const r = s === 0
          ? await matchDynamicTheme({ doc, moodHint: moodHint || undefined })
          : await rematchDynamicTheme({ doc, moodHint: moodHint || undefined }, s)
        setResult(r)
      } catch {
        toast('error', '智能搭配失败，请重试')
      } finally {
        setLoading(false)
      }
    },
    [doc, moodHint],
  )

  useEffect(() => {
    if (open) {
      setSalt(0)
      runMatch(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function apply(targets: { anim: boolean; music: boolean }) {
    if (!result || applying) return
    setApplying(true)
    onApply(result.scheme, targets)
    setApplying(false)
    onClose()
  }

  function saveCurrentScheme() {
    if (!result) return
    addScheme(result.scheme)
    toast('success', '方案已保存到「我的动态方案」')
  }

  const scheme = result?.scheme

  return (
    <Modal open={open} onClose={onClose} title="AI 智能搭配" width="max-w-2xl">
      {/* 氛围偏好输入 */}
      <div className="flex items-center gap-2">
        <input
          value={moodHint}
          onChange={(e) => setMoodHint(e.target.value)}
          placeholder="可选：描述想要的氛围，如「庄重典雅」「活泼欢快」…"
          className="h-9 flex-1 rounded-lg border border-paper-line bg-white px-3 text-xs outline-none focus:border-gold-400"
        />
        <button
          className="btn-gold btn-sm whitespace-nowrap"
          disabled={loading}
          onClick={() => runMatch(salt)}
        >
          {loading ? '分析中…' : '重新分析'}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-14">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gold-200 border-t-gold-600" />
          <p className="mt-4 text-sm text-ink-soft">AI 正在分析请帖风格与宴会氛围…</p>
          <p className="mt-1 text-[11px] text-ink-mute">读取配色 / 字体 / 布局 / 文案情绪，筛选动画与音乐</p>
        </div>
      )}

      {!loading && result && scheme && (
        <div className="mt-4 space-y-4">
          {/* 分析摘要 */}
          <div className="rounded-xl bg-gradient-to-r from-gold-50 to-primary-50/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] text-white">
                {result.analysis.source === 'ai' ? 'AI 分析' : '规则推荐'}
              </span>
              设计风格分析
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-ink-soft">
              <div>宴会场景：<b className="text-ink">{CATEGORY_LABELS[result.analysis.category] ?? result.analysis.category}</b></div>
              <div>视觉风格：<b className="text-ink">{result.analysis.styleLabel}</b></div>
              <div>整体情绪：<b className="text-ink">{result.analysis.mood}</b></div>
              <div>动画密度：<b className="text-ink">{RICHNESS_LABELS[result.analysis.richness]}</b></div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] text-ink-mute">主色：</span>
              {result.analysis.colors.slice(0, 6).map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full ring-1 ring-paper-line" style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* 推荐动画清单 */}
          <div>
            <h4 className="text-xs font-semibold text-ink">推荐动画方案</h4>
            <div className="mt-1.5 space-y-1.5">
              {result.picks.map((p) => {
                const anim = getAnimation(p.animId)
                return (
                  <div key={p.role} className="flex items-start gap-2 rounded-lg bg-paper/60 px-3 py-2">
                    <span className="mt-0.5 w-16 shrink-0 text-[10px] text-ink-mute">{PICK_ROLE_LABELS[p.role] ?? p.role}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-ink">
                        {p.animName}
                        {anim && <span className="ml-1.5 text-[10px] text-ink-mute">({ANIM_CATEGORY_LABELS[anim.animation_category]})</span>}
                      </div>
                      <div className="mt-0.5 text-[10px] leading-relaxed text-ink-mute">{p.reason}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 推荐音乐 */}
          {result.music && (
            <div>
              <h4 className="text-xs font-semibold text-ink">推荐背景音乐</h4>
              <div className="mt-1.5 flex items-start gap-2.5 rounded-lg bg-paper/60 px-3 py-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 to-primary-500 text-lg text-white">
                  ♪
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-ink">{result.music.music_name}</div>
                  <div className="mt-0.5 text-[10px] text-ink-mute">
                    {result.music.music_style} · {result.music.mood_tags.join('、')} · {Math.floor(result.music.duration / 60)}:{String(Math.floor(result.music.duration % 60)).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-ink-soft">{result.musicReason}</div>
                </div>
              </div>
            </div>
          )}

          {/* 整体氛围说明 */}
          <div className="rounded-lg border border-gold-200/60 bg-gold-50/40 px-3 py-2.5">
            <div className="text-[10px] font-semibold text-gold-800">整体氛围</div>
            <p className="mt-1 text-[11px] leading-relaxed text-gold-800/85">{scheme.mood}</p>
            {scheme.reason && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-gold-700/70">推荐理由：{scheme.reason}</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" disabled={applying} onClick={() => apply({ anim: true, music: true })}>
              应用这套方案
            </button>
            <button className="btn-ghost btn-sm" disabled={applying} onClick={() => apply({ anim: true, music: false })}>
              只用动画
            </button>
            <button className="btn-ghost btn-sm" disabled={applying} onClick={() => apply({ anim: false, music: true })}>
              只用音乐
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost btn-sm flex-1"
              disabled={loading}
              onClick={() => {
                const next = salt + 1
                setSalt(next)
                runMatch(next)
              }}
            >
              换一套推荐
            </button>
            <button className="btn-ghost btn-sm flex-1" onClick={saveCurrentScheme}>
              保存方案
            </button>
            <button className="btn-ghost btn-sm flex-1" onClick={onClose}>
              保留当前设置
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AiMatchDialog
