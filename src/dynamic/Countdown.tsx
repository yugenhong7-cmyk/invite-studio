import { useEffect, useState } from 'react'

/**
 * 动态倒计时：距宴会开始 XX 天 XX 小时 XX 分 XX 秒。
 * 开始后 6 小时内显示「宴会进行中」，之后显示「宴会已结束」。
 */
export function Countdown({ date, time, compact = false }: { date: string; time?: string; compact?: boolean }) {
  const target = new Date(`${date}T${time || '00:00'}:00`).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!date || Number.isNaN(target)) return null

  const diff = target - now
  const ended = diff < -6 * 3600 * 1000
  const running = diff <= 0 && !ended

  if (ended) {
    return (
      <div className="di-countdown di-countdown-done">
        <div className="di-countdown-label">宴会已结束</div>
        <div className="di-countdown-sub">感谢每一位到场的亲友</div>
      </div>
    )
  }
  if (running) {
    return (
      <div className="di-countdown di-countdown-live">
        <span className="di-live-dot" />
        <div>
          <div className="di-countdown-label">宴会进行中</div>
          <div className="di-countdown-sub">此刻，欢聚正在发生</div>
        </div>
      </div>
    )
  }

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const units: [number, string][] = [
    [d, '天'],
    [h, '时'],
    [m, '分'],
    [s, '秒'],
  ]

  return (
    <div className="di-countdown">
      <div className="di-countdown-label">距离宴会开始还有</div>
      <div className={`di-countdown-grid ${compact ? 'di-countdown-compact' : ''}`}>
        {units.map(([v, label]) => (
          <div key={label} className="di-countdown-cell">
            <div key={v} className="di-countdown-num">
              {String(v).padStart(2, '0')}
            </div>
            <div className="di-countdown-unit">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Countdown
