/* ============================================================
 * 背景音乐库中心 —— 分类/搜索/筛选/试听/收藏/上传/我的音乐
 * 卡片内即可试听（无需先应用），含进度条与音量
 * ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MusicCategory, MusicTrack } from '@/types'
import {
  MUSIC_CATEGORY_LABELS,
  MUSIC_CATEGORY_ORDER,
  MUSIC_LIBRARY,
  coverStyle,
  musicSrc,
  searchMusic,
} from '@/data/music-library'
import { useLibrary } from '@/store/library'
import { Modal } from '@/components/ui'
import { uid } from '@/lib/id'

/* ---------------- 格式化 ---------------- */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtBytes(n: number): string {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`
}

/* ---------------- 试听播放器（卡片内） ---------------- */

function TrackPlayer({ track, playing, onToggle, onStop }: { track: MusicTrack; playing: boolean; onToggle: () => void; onStop: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [dur, setDur] = useState(track.duration)
  const [vol, setVol] = useState(0.8)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.volume = vol
      a.loop = true
      a.play().catch(() => {})
    } else {
      a.pause()
    }
  }, [playing, vol])

  useEffect(() => () => onStop(), [onStop])

  return (
    <div className="flex items-center gap-1.5">
      <audio
        ref={audioRef}
        src={musicSrc(track.audio_url)}
        preload="none"
        onTimeUpdate={() => {
          const a = audioRef.current
          if (a && a.duration) setProgress(a.currentTime / a.duration)
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current
          if (a && a.duration && isFinite(a.duration)) setDur(a.duration)
        }}
      />
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-500 text-sm text-white transition hover:bg-gold-600"
        onClick={onToggle}
        title={playing ? '暂停试听' : '试听'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-paper-line">
          <div className="h-full rounded-full bg-gold-400 transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] text-ink-mute">
          <span>{fmtTime(dur * progress)}</span>
          <span>{fmtTime(dur)}</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={vol}
        onChange={(e) => setVol(+e.target.value)}
        className="w-12"
        title="音量"
      />
    </div>
  )
}

/* ---------------- 音乐卡片 ---------------- */

function MusicCard({
  track,
  fav,
  onFav,
  onUse,
  onDelete,
}: {
  track: MusicTrack
  fav: boolean
  onFav: () => void
  onUse: () => void
  onDelete?: () => void
}) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="rounded-xl bg-white p-2.5 ring-1 ring-paper-line/70 transition hover:ring-gold-300">
      <div className="flex gap-2.5">
        <div className="h-14 w-14 shrink-0 rounded-lg" style={coverStyle(track.cover_url)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <div className="truncate text-xs font-semibold text-ink">{track.music_name}</div>
            <button
              className={`shrink-0 text-sm ${fav ? 'text-primary-500' : 'text-ink-mute hover:text-primary-400'}`}
              onClick={onFav}
              title={fav ? '取消收藏' : '收藏'}
            >
              {fav ? '♥' : '♡'}
            </button>
          </div>
          <div className="truncate text-[10px] text-ink-mute">
            {track.music_style} · {fmtTime(track.duration)}
          </div>
          <div className="mt-0.5 line-clamp-1 text-[9px] text-ink-mute">{track.scene}</div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {track.mood_tags.map((m) => (
          <span key={m} className="rounded bg-paper px-1.5 py-0.5 text-[9px] text-ink-mute">
            {m}
          </span>
        ))}
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] text-emerald-700">可商用</span>
        {track.source_type === 'user' && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-700">我的上传</span>}
      </div>

      <div className="mt-2">
        <TrackPlayer track={track} playing={playing} onToggle={() => setPlaying((p) => !p)} onStop={() => setPlaying(false)} />
      </div>

      <div className="mt-2 flex gap-1.5">
        <button className="btn-gold btn-sm flex-1 !py-1 !text-[11px]" onClick={onUse}>
          用作背景音乐
        </button>
        {onDelete && (
          <button
            className="rounded-lg bg-paper px-2.5 py-1 text-[11px] text-ink-mute transition hover:bg-red-50 hover:text-red-500"
            onClick={onDelete}
          >
            删除
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------------- 上传面板 ---------------- */

const ACCEPT = '.mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*'
const MAX_SIZE = 20 * 1024 * 1024

function UploadPanel({ onUploaded }: { onUploaded: (track: MusicTrack) => void }) {
  const [name, setName] = useState('')
  const [mood, setMood] = useState('温馨')
  const [file, setFile] = useState<File | null>(null)
  const [dur, setDur] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [fadeIn, setFadeIn] = useState(1)
  const [fadeOut, setFadeOut] = useState(1)
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function pick(f: File | null) {
    setErr('')
    if (!f) return
    const okExt = /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)
    if (!okExt && !f.type.startsWith('audio/')) {
      setErr('仅支持 MP3 / WAV / M4A / AAC / OGG / FLAC 音频格式')
      return
    }
    if (f.size > MAX_SIZE) {
      setErr(`文件过大（${fmtBytes(f.size)}），请控制在 20MB 以内`)
      return
    }
    setFile(f)
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    const a = new Audio(url)
    a.onloadedmetadata = () => {
      const d = isFinite(a.duration) ? a.duration : 0
      setDur(d)
      setTrimEnd(d)
      if (d > 600) setErr('音频超过 10 分钟，建议截取精华片段后再上传')
    }
  }

  async function submit() {
    if (!file || !agree) return
    if (dur > 600 && trimEnd - trimStart > 600) {
      setErr('请设置起止位置，将试听片段控制在 10 分钟内')
      return
    }
    const track: MusicTrack = {
      music_id: uid('um'),
      music_name: name || file.name,
      music_category: 'wedding',
      music_style: '自定义',
      audio_url: previewUrl,
      cover_url: 'gradient:#C9A227:#8B7328',
      duration: trimEnd > 0 ? trimEnd - trimStart : dur,
      mood_tags: [mood],
      license_information: '用户上传 · 已确认拥有合法使用权',
      source_type: 'user',
      scene: '我的音乐 · 自用',
      trim: trimEnd > 0 ? { start: trimStart, end: trimEnd } : undefined,
      fadeIn,
      fadeOut,
    }
    onUploaded(track)
    setFile(null)
    setName('')
    setAgree(false)
    setPreviewUrl('')
    setDur(0)
  }

  return (
    <div className="rounded-xl border border-dashed border-gold-300 bg-gold-50/40 p-3">
      <div className="text-xs font-semibold text-ink">上传我的音乐</div>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-mute">
        支持 MP3 / WAV / M4A 等常见格式，最大 20MB。上传后进入「我的音乐库」，制作其他请帖时可重复使用。
      </p>

      <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-paper-line bg-white py-2.5 text-[11px] text-ink-mute transition hover:border-gold-400 hover:text-gold-700">
        {file ? `已选择：${file.name}（${fmtBytes(file.size)}）` : '点击选择音频文件'}
        <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </label>

      {previewUrl && (
        <audio ref={audioRef} src={previewUrl} controls className="mt-2 h-8 w-full" />
      )}

      {dur > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <label className="flex items-center gap-1">
            <span className="text-ink-mute">开始(秒)</span>
            <input type="number" min={0} max={dur} step={0.5} className="h-6 w-full rounded border border-paper-line px-1" value={trimStart} onChange={(e) => setTrimStart(Math.max(0, +e.target.value))} />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-ink-mute">结束(秒)</span>
            <input type="number" min={0} max={dur} step={0.5} className="h-6 w-full rounded border border-paper-line px-1" value={trimEnd} onChange={(e) => setTrimEnd(Math.min(dur, +e.target.value))} />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-ink-mute">淡入(秒)</span>
            <input type="number" min={0} max={10} step={0.5} className="h-6 w-full rounded border border-paper-line px-1" value={fadeIn} onChange={(e) => setFadeIn(Math.max(0, +e.target.value))} />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-ink-mute">淡出(秒)</span>
            <input type="number" min={0} max={10} step={0.5} className="h-6 w-full rounded border border-paper-line px-1" value={fadeOut} onChange={(e) => setFadeOut(Math.max(0, +e.target.value))} />
          </label>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input className="h-7 rounded border border-paper-line bg-white px-2 text-[11px]" placeholder="音乐名称" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="h-7 rounded border border-paper-line bg-white px-2 text-[11px]" value={mood} onChange={(e) => setMood(e.target.value)}>
          {['浪漫', '温馨', '喜庆', '庄重', '轻快', '典雅', '梦幻'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <label className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-mute">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
        <span>我确认拥有该音乐的著作权或合法使用授权，允许在本平台用于电子请帖背景音乐。</span>
      </label>

      {err && <div className="mt-1.5 text-[10px] text-red-500">{err}</div>}

      <button className="btn-gold btn-sm mt-2 w-full" disabled={!file || !agree} onClick={submit}>
        加入我的音乐库
      </button>
    </div>
  )
}

/* ---------------- 主组件 ---------------- */

export function MusicLibrary({
  open,
  onClose,
  onUseTrack,
}: {
  open: boolean
  onClose: () => void
  onUseTrack: (track: MusicTrack) => void
}) {
  const [tab, setTab] = useState<'library' | 'mine' | 'fav' | 'upload'>('library')
  const [category, setCategory] = useState<MusicCategory | ''>('')
  const [q, setQ] = useState('')
  const [maxDur, setMaxDur] = useState(0)
  const { favMusic, toggleFavMusic, userMusic, addUserMusic, removeUserMusic } = useLibrary()

  const all = useMemo(() => [...MUSIC_LIBRARY, ...userMusic], [userMusic])

  const list = useMemo(() => {
    let arr = searchMusic(q, all)
    if (tab === 'mine') arr = userMusic.filter((m) => !q || m.music_name.includes(q))
    else if (tab === 'fav') arr = arr.filter((m) => favMusic.includes(m.music_id))
    if (category && tab === 'library') arr = arr.filter((m) => m.music_category === category)
    if (maxDur > 0) arr = arr.filter((m) => m.duration <= maxDur)
    return arr
  }, [all, userMusic, tab, q, category, maxDur, favMusic])

  return (
    <Modal open={open} onClose={onClose} title="背景音乐库" width="max-w-5xl">
      {/* 顶部：Tab + 搜索 + 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['library', '音乐库'],
            ['mine', '我的音乐'],
            ['fav', '我的收藏'],
            ['upload', '上传音乐'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              tab === v ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'
            }`}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索音乐名称、风格、场景、情绪…"
          className="h-8 min-w-[180px] flex-1 rounded-lg border border-paper-line bg-white px-3 text-xs outline-none focus:border-gold-400"
        />
      </div>

      {tab === 'upload' ? (
        <div className="mt-3 max-h-[460px] overflow-y-auto">
          <UploadPanel onUploaded={(t) => addUserMusic(t)} />
          {userMusic.length > 0 && (
            <div className="mt-3 text-[11px] text-ink-mute">已上传 {userMusic.length} 首（在「我的音乐」中管理）</div>
          )}
        </div>
      ) : (
        <>
          {/* 分类筛选 */}
          {tab === 'library' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <button
                className={`rounded-full px-2.5 py-1 text-[10px] transition ${!category ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'}`}
                onClick={() => setCategory('')}
              >
                全部场景
              </button>
              {MUSIC_CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  className={`rounded-full px-2.5 py-1 text-[10px] transition ${
                    category === c ? 'bg-gold-500 text-white' : 'bg-paper text-ink-mute hover:bg-gold-50'
                  }`}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {MUSIC_CATEGORY_LABELS[c]}
                </button>
              ))}
              <select
                className="ml-auto h-7 rounded-lg border border-paper-line bg-white px-2 text-[10px] text-ink-mute"
                value={maxDur}
                onChange={(e) => setMaxDur(+e.target.value)}
              >
                <option value={0}>不限时长</option>
                <option value={15}>15 秒内</option>
                <option value={30}>30 秒内</option>
                <option value={60}>1 分钟内</option>
              </select>
            </div>
          )}

          <div className="mt-2 text-[10px] text-ink-mute">共 {list.length} 首 · 点击 ▶ 即可在线试听（无需先应用）</div>

          <div className="mt-2 grid max-h-[420px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 md:grid-cols-2">
            {list.map((m) => (
              <MusicCard
                key={m.music_id}
                track={m}
                fav={favMusic.includes(m.music_id)}
                onFav={() => toggleFavMusic(m.music_id)}
                onUse={() => onUseTrack(m)}
                onDelete={m.source_type === 'user' ? () => removeUserMusic(m.music_id) : undefined}
              />
            ))}
            {list.length === 0 && (
              <div className="col-span-full py-10 text-center text-xs text-ink-mute">
                {tab === 'mine' ? '还没有上传音乐，切换到「上传音乐」添加' : '没有匹配的音乐'}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export default MusicLibrary
