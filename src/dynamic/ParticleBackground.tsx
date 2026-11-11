import { useEffect, useRef } from 'react'
import type { BackgroundFxType } from '@/types'

/**
 * 动态背景粒子层（花瓣 / 星光 / 金粉 / 云雾 / 丝带 / 光斑 / 飘雪 / 彩纸）。
 * - 单 <canvas> 绘制，requestAnimationFrame 驱动
 * - 页面不可见时暂停，尊重 prefers-reduced-motion
 * - 粒子数量随 intensity 缩放并封顶，避免拖垮手机
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  alpha: number
  color: string
  sway: number
  swaySpeed: number
  life: number
}

interface Ribbon {
  y: number
  amplitude: number
  phase: number
  speed: number
  width: number
  color: string
  alpha: number
}

const PALETTES: Record<BackgroundFxType, string[]> = {
  none: [],
  petals: ['#F5A8B8', '#F8C4CE', '#E88CA0', '#FBE3E8', '#D97A8F'],
  sakura: ['#FBC7D4', '#F7A8C0', '#F5D0DE', '#E890AC'],
  stars: ['#FFF6D8', '#FFE9A8', '#FFFFFF', '#F4D98B'],
  starflow: ['#FFFFFF', '#D8E4F8', '#FFE9A8', '#B8CCE8'],
  gold: ['#E8C86A', '#D4AF37', '#F5E3A0', '#C9A227'],
  clouds: ['#FFFFFF', '#F2ECE4', '#E9DFD2'],
  ribbons: ['#E8B4B8', '#D4AF37', '#B79FD6', '#8FD0BE', '#F5D76E'],
  bokeh: ['#F5E6C8', '#E8C86A', '#F0D9A8', '#FFFFFF'],
  snow: ['#FFFFFF', '#F0F4F8', '#E3EDF5'],
  confetti: ['#E85D75', '#F5B041', '#5DADE2', '#58D68D', '#AF7AC5', '#F5D76E'],
  candles: ['#FFD9A0', '#FFB870', '#FF9E50', '#FFE8C0'],
  butterflies: ['#B79FD6', '#F5A8B8', '#8FD0BE', '#F5D76E', '#9DB4DE'],
  balloons: ['#F5A8B8', '#F5D76E', '#8FD0BE', '#9DB4DE', '#B79FD6'],
  streamers: ['#F5B041', '#5DADE2', '#E85D75', '#58D68D', '#AF7AC5'],
  ripples: ['#A8D8F0', '#8FD0BE', '#FFFFFF', '#B8CCE8'],
  fireflies: ['#FFE9A8', '#F5E3A0', '#D4AF37', '#FFFFFF'],
  lightflow: ['#F5E6C8', '#E8C86A', '#FFFFFF', '#F0D9A8'],
}

function particleCount(type: BackgroundFxType, intensity: number): number {
  const base: Record<BackgroundFxType, number> = {
    none: 0,
    petals: 26,
    sakura: 28,
    stars: 46,
    starflow: 40,
    gold: 40,
    clouds: 6,
    ribbons: 5,
    bokeh: 14,
    snow: 34,
    confetti: 36,
    candles: 12,
    butterflies: 10,
    balloons: 12,
    streamers: 6,
    ripples: 10,
    fireflies: 22,
    lightflow: 12,
  }
  return Math.round(base[type] * (0.35 + intensity * 1.15))
}

function makeParticle(w: number, h: number, type: BackgroundFxType, palette: string[]): Particle {
  const speedBase =
    type === 'snow'
      ? 0.5
      : type === 'petals' || type === 'sakura'
        ? 0.9
        : type === 'confetti' || type === 'streamers'
          ? 1.4
          : type === 'gold' || type === 'fireflies'
            ? -0.35
            : type === 'balloons'
              ? -0.8
              : type === 'butterflies'
                ? 0.25
                : -0.12
  return {
    x: Math.random() * w,
    y: type === 'gold' || type === 'stars' || type === 'bokeh' ? Math.random() * h : Math.random() * h - h * 0.1,
    vx: (Math.random() - 0.5) * 0.35,
    vy: speedBase * (0.55 + Math.random() * 0.9),
    size:
      type === 'bokeh'
        ? 40 + Math.random() * 90
        : type === 'clouds'
          ? 120 + Math.random() * 180
          : type === 'stars'
            ? 1.2 + Math.random() * 2.6
            : type === 'gold'
              ? 1.4 + Math.random() * 3.2
              : 5 + Math.random() * 12,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.03,
    alpha: 0.35 + Math.random() * 0.55,
    color: palette[Math.floor(Math.random() * palette.length)] || '#FFFFFF',
    sway: 12 + Math.random() * 30,
    swaySpeed: 0.004 + Math.random() * 0.01,
    life: 0,
  }
}

export function ParticleBackground({
  type,
  speed = 1,
  intensity = 0.5,
  opacity = 0.75,
  disabled = false,
}: {
  type: BackgroundFxType
  speed?: number
  intensity?: number
  opacity?: number
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || disabled || type === 'none') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const palette = PALETTES[type] ?? PALETTES.petals
    let particles: Particle[] = []
    let ribbons: Ribbon[] = []
    let w = 0
    let h = 0
    let t = 0

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(90, particleCount(type, intensity))
      particles = Array.from({ length: n }, () => makeParticle(w, h, type, palette))
      if (type === 'ribbons' || type === 'streamers') {
        ribbons = Array.from({ length: Math.min(6, n) }, (_, i) => ({
          y: (h / (Math.min(6, n) + 1)) * (i + 1),
          amplitude: 26 + Math.random() * 40,
          phase: Math.random() * Math.PI * 2,
          speed: 0.25 + Math.random() * 0.4,
          width: 5 + Math.random() * 9,
          color: palette[i % palette.length] || '#E8B4B8',
          alpha: 0.16 + Math.random() * 0.2,
        }))
      }
    }

    const drawPetal = (p: Particle) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.alpha * opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawConfetti = (p: Particle) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = p.alpha * opacity
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size * 0.4, -p.size * 0.22, p.size * 0.8, p.size * 0.44)
      ctx.restore()
    }

    const drawStar = (p: Particle) => {
      const tw = 0.55 + 0.45 * Math.sin(t * 0.05 + p.life * 2.1)
      ctx.save()
      ctx.globalAlpha = p.alpha * tw * opacity
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = p.size * 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawGold = (p: Particle) => {
      ctx.save()
      ctx.globalAlpha = p.alpha * opacity
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawBokeh = (p: Particle) => {
      ctx.save()
      ctx.globalAlpha = p.alpha * 0.28 * opacity
      const g = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawCloud = (p: Particle) => {
      ctx.save()
      ctx.globalAlpha = p.alpha * 0.14 * opacity
      const g = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.size * 1.4, p.size * 0.75, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawBalloon = (p: Particle) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(Math.sin(t * 0.01 + p.life) * 0.12)
      ctx.globalAlpha = p.alpha * 0.8 * opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(0, 0, p.size * 0.72, p.size, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, p.size)
      ctx.quadraticCurveTo(p.size * 0.3, p.size * 1.6, 0, p.size * 2.2)
      ctx.stroke()
      ctx.restore()
    }

    const drawCandle = (p: Particle) => {
      const flick = 0.6 + 0.4 * Math.sin(t * 0.11 + p.life * 3.7) * Math.sin(t * 0.07 + p.life)
      ctx.save()
      ctx.globalAlpha = p.alpha * flick * opacity
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
      g.addColorStop(0, p.color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawRipple = (p: Particle) => {
      const phase = (t * 0.012 + p.life) % 1
      const r = p.size * (2 + phase * 8)
      ctx.save()
      ctx.globalAlpha = (1 - phase) * 0.35 * opacity
      ctx.strokeStyle = p.color
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, r, r * 0.55, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    const step = () => {
      if (!running) return
      t += 1
      ctx.clearRect(0, 0, w, h)
      const s = speed * 0.9 + 0.1

      if (type === 'ribbons' || type === 'streamers') {
        for (const r of ribbons) {
          ctx.save()
          ctx.globalAlpha = r.alpha * opacity
          ctx.strokeStyle = r.color
          ctx.lineWidth = r.width
          ctx.lineCap = 'round'
          ctx.beginPath()
          const y0 = r.y + Math.sin(t * 0.008 * r.speed * s + r.phase) * r.amplitude
          ctx.moveTo(-40, y0)
          for (let x = 0; x <= w + 40; x += 24) {
            const y = r.y + Math.sin((x * 0.004) + t * 0.01 * r.speed * s + r.phase) * r.amplitude
            ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.restore()
        }
      }

      for (const p of particles) {
        p.life += 0.016
        p.x += p.vx * s + Math.sin(t * p.swaySpeed + p.life) * 0.24
        p.y += p.vy * s
        p.rot += p.vr * s

        if (type === 'stars' || type === 'gold' || type === 'bokeh' || type === 'starflow' || type === 'fireflies' || type === 'lightflow' || type === 'candles' || type === 'balloons') {
          if (p.y < -p.size * 2) {
            p.y = h + p.size
            p.x = Math.random() * w
          }
        } else if (p.y > h + p.size * 2) {
          p.y = -p.size * 2
          p.x = Math.random() * w
        }
        if (p.x < -p.size * 2) p.x = w + p.size
        if (p.x > w + p.size * 2) p.x = -p.size

        switch (type) {
          case 'petals':
          case 'sakura':
            drawPetal(p)
            break
          case 'butterflies':
            drawPetal(p)
            break
          case 'confetti':
          case 'streamers':
            drawConfetti(p)
            break
          case 'balloons':
            drawBalloon(p)
            break
          case 'snow':
            drawPetal(p)
            break
          case 'stars':
            drawStar(p)
            break
          case 'starflow':
            drawStar(p)
            break
          case 'candles':
            drawCandle(p)
            break
          case 'gold':
          case 'fireflies':
            drawGold(p)
            break
          case 'bokeh':
          case 'lightflow':
            drawBokeh(p)
            break
          case 'clouds':
            drawCloud(p)
            break
          case 'ripples':
            drawRipple(p)
            break
          default:
            break
        }
      }

      raf = requestAnimationFrame(step)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(step)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(step)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [type, speed, intensity, opacity, disabled])

  if (disabled || type === 'none') return null

  return <canvas ref={canvasRef} className="di-particles" aria-hidden="true" />
}

export default ParticleBackground
