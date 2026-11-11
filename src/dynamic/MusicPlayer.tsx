import { useEffect, useRef, useState } from 'react'
import { resolveMusicSrc } from '@/lib/presentation'
import { signedFileUrl } from '@/lib/repo'

/** 判断是否为云端存储路径（非 http/内置/相对静态资源），需要签名后才能播放 */
function isStoragePath(src: string): boolean {
  return !!src && !/^(https?:|builtin:|\/|data:|blob:)/.test(src)
}

/**
 * 背景音乐播放器。
 * - 尊重手机浏览器自动播放限制：封面点击（用户手势）后才尝试播放
 * - 明确的播放/暂停入口 + 音量控制 + 循环播放 + 播放状态展示
 */
export function MusicPlayer({
  src,
  name,
  volume = 0.6,
  loop = true,
  autoStart = false,
  disabled = false,
}: {
  src: string
  name: string
  volume?: number
  loop?: boolean
  /** 变为 true 时（用户点击封面后）尝试播放 */
  autoStart?: boolean
  disabled?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [vol, setVol] = useState(volume)
  const [url, setUrl] = useState(() => (isStoragePath(src) ? '' : resolveMusicSrc(src)))
  const startedRef = useRef(false)

  /* 云端存储路径 → 签名可播放 URL（签名会过期，故在加载时解析） */
  useEffect(() => {
    if (!src || !isStoragePath(src)) {
      setUrl(src ? resolveMusicSrc(src) : '')
      return
    }
    let alive = true
    setUrl('')
    signedFileUrl(src, 86400)
      .then((signed) => {
        if (alive) setUrl(signed)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = vol
  }, [vol])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !autoStart || startedRef.current || disabled || failed) return
    startedRef.current = true
    audio.loop = loop
    audio.volume = vol
    const p = audio.play()
    if (p && typeof p.then === 'function') {
      p.then(() => setPlaying(true)).catch(() => {
        /* 自动播放被拦截 → 等用户点按钮 */
        setPlaying(false)
      })
    }
  }, [autoStart, loop, vol, disabled, failed])

  if (disabled || !src) return null

  async function toggle() {
    const audio = audioRef.current
    if (!audio || !url) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      try {
        audio.loop = loop
        audio.volume = vol
        await audio.play()
        setPlaying(true)
        setFailed(false)
      } catch {
        setFailed(true)
      }
    }
  }

  return (
    <div className="di-music">
      <audio
        ref={audioRef}
        src={url}
        loop={loop}
        preload="none"
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className={`di-music-btn ${playing ? 'is-playing' : ''}`}
        onClick={() => void toggle()}
        aria-label={playing ? '暂停音乐' : '播放音乐'}
        title={failed ? '音乐加载失败' : name}
      >
        {playing ? (
          <span className="di-eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M9 18.5a2.5 2.5 0 11-2.5-2.5c.55 0 1.06.18 1.47.49V6.8l9-2v8.2a2.5 2.5 0 11-1.5-2.3V7.2l-6 1.33v9.97z" />
          </svg>
        )}
      </button>
      {playing && (
        <button type="button" className="di-music-vol" onClick={() => setShowVolume((v) => !v)} aria-label="音量">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 9v6h4l5 4V5L8 9H4z" strokeLinejoin="round" />
            <path d="M16.5 8.5a5 5 0 010 7" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {showVolume && (
        <div className="di-music-slider">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(vol * 100)}
            onChange={(e) => setVol(Number(e.target.value) / 100)}
            aria-label="音量大小"
          />
        </div>
      )}
    </div>
  )
}

export default MusicPlayer
