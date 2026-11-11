import { useEffect, useRef, useState } from 'react'

/**
 * 进入视口检测（一次性触发）。
 * trigger='load' 时立即视为可见，用于封面之后的首屏元素。
 */
export function useInView(options: { threshold?: number; trigger?: 'scroll' | 'load' | 'stagger'; rootMargin?: string } = {}) {
  const { threshold = 0.12, trigger = 'scroll', rootMargin = '0px 0px -8% 0px' } = options
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(trigger === 'load')

  useEffect(() => {
    if (trigger === 'load') {
      setInView(true)
      return
    }
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        }
      },
      { threshold, rootMargin },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [threshold, trigger, rootMargin])

  return { ref, inView }
}

/** 设备是否偏好减少动态效果 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
