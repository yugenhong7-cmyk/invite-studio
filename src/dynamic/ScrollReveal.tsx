import type { CSSProperties, ReactNode } from 'react'
import type { AnimType } from '@/types'
import { useInView } from './useInView'

/**
 * 滚动触发的分段动画包装器。
 * 动画作用在内层（外层由调用方负责定位/旋转），互不干扰。
 */
export function ScrollReveal({
  type = 'fade',
  duration = 700,
  delay = 0,
  trigger = 'scroll',
  disabled = false,
  children,
  className = '',
  style,
}: {
  type?: AnimType
  duration?: number
  delay?: number
  trigger?: 'scroll' | 'load' | 'stagger'
  disabled?: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const { ref, inView } = useInView({ trigger })
  const active = !disabled && type !== 'none' && inView

  const cls = ['di-anim', active ? `di-${type}` : 'di-hidden', className].filter(Boolean).join(' ')
  const merged: CSSProperties = {
    animationDuration: `${Math.max(120, duration)}ms`,
    animationDelay: `${Math.max(0, delay)}ms`,
    ...style,
  }

  // 逐字动画：把纯文本子节点拆成单字 span，依次入场
  if (type === 'chars' && typeof children === 'string') {
    const chars = Array.from(children)
    return (
      <div ref={ref} className={`di-anim di-chars${active ? '' : ' di-hidden'} ${className}`.trim()} style={disabled ? style : undefined}>
        {chars.map((ch, i) => (
          <span
            key={i}
            className="di-char"
            style={
              disabled || !active
                ? { opacity: 1 }
                : {
                    animationDelay: `${Math.max(0, delay) + i * 110}ms`,
                    animationDuration: `${Math.max(120, duration * 0.6)}ms`,
                  }
            }
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div ref={ref} className={cls} style={disabled ? style : merged}>
      {children}
    </div>
  )
}

export default ScrollReveal
