import { useState } from 'react'
import type { CoverStyle } from '@/types'

/**
 * 电子请帖开场封面动画。
 * 中式信封 / 西式信封 / 礼盒 / 卷轴 / 商务卡 五种开场，
 * 点击后信封开启、请柬展开，再淡出过渡到正文。
 */
export function CoverAnimation({
  style,
  title,
  hostNames,
  hint = '轻触开启',
  onOpen,
  reducedMotion = false,
}: {
  style: Exclude<CoverStyle, 'auto'>
  title: string
  hostNames?: string
  hint?: string
  onOpen: () => void
  reducedMotion?: boolean
}) {
  const [opening, setOpening] = useState(false)

  function handleOpen() {
    if (opening) return
    if (reducedMotion) {
      /* 减少动态效果：跳过开合动画，点击后立即进入正文 */
      onOpen()
      return
    }
    setOpening(true)
    window.setTimeout(onOpen, 1500)
  }

  return (
    <div
      className={`di-cover di-cover-${style} ${opening ? 'is-opening' : ''}`}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpen()}
      aria-label="开启请帖"
    >
      <div className="di-cover-bg" />
      <div className="di-cover-frame" aria-hidden="true" />

      <div className="di-cover-stage">
        {style === 'envelope-chinese' && (
          <div className="di-envelope">
            <div className="di-envelope-letter">
              <div className="di-letter-inner">
                <div className="di-letter-xi">囍</div>
                <div className="di-letter-title">{title}</div>
                {hostNames && <div className="di-letter-names">{hostNames}</div>}
              </div>
            </div>
            <div className="di-envelope-body">
              <div className="di-envelope-seal">囍</div>
              {hostNames && <div className="di-envelope-names">{hostNames}</div>}
            </div>
            <div className="di-envelope-flap" />
          </div>
        )}

        {style === 'envelope-western' && (
          <div className="di-envelope di-envelope-west">
            <div className="di-envelope-letter">
              <div className="di-letter-inner">
                <div className="di-letter-ornament">♥</div>
                <div className="di-letter-title">{title}</div>
                {hostNames && <div className="di-letter-names">{hostNames}</div>}
              </div>
            </div>
            <div className="di-envelope-body">
              <div className="di-envelope-seal di-seal-heart">♥</div>
              {hostNames && <div className="di-envelope-names">{hostNames}</div>}
            </div>
            <div className="di-envelope-flap" />
          </div>
        )}

        {style === 'gift' && (
          <div className="di-gift">
            <div className="di-gift-lid">
              <div className="di-gift-ribbon-v" />
            </div>
            <div className="di-gift-box">
              <div className="di-gift-ribbon-v" />
              <div className="di-gift-ribbon-h" />
            </div>
            <div className="di-gift-card">
              <div className="di-letter-title">{title}</div>
              {hostNames && <div className="di-letter-names">{hostNames}</div>}
            </div>
          </div>
        )}

        {style === 'scroll' && (
          <div className="di-scroll">
            <div className="di-scroll-roller di-scroll-top" />
            <div className="di-scroll-paper">
              <div className="di-letter-title">{title}</div>
              {hostNames && <div className="di-letter-names">{hostNames}</div>}
            </div>
            <div className="di-scroll-roller di-scroll-bottom" />
          </div>
        )}

        {style === 'card' && (
          <div className="di-card-cover">
            <div className="di-card-gold-line" />
            <div className="di-card-kicker">INVITATION</div>
            <div className="di-letter-title">{title}</div>
            {hostNames && <div className="di-letter-names">{hostNames}</div>}
            <div className="di-card-gold-line" />
          </div>
        )}
      </div>

      <div className="di-cover-hint">
        <span className="di-hint-ring" aria-hidden="true" />
        {hint}
      </div>

      {/* 开启时的粒子迸发 */}
      {opening && (
        <div className="di-burst" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} style={{ ['--bi' as string]: i }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CoverAnimation
