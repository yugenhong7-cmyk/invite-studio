import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { BackgroundSpec, DesignDoc, GradientSpec, ShapeElement, TextElement, ImageElement } from '@/types'

/* ============================================================
 * DesignDoc 的轻量 DOM 渲染器
 * 用于模板卡片 / 作品缩略图 / 列表预览（性能好、可大量并列）
 * 与 Fabric 画布共用同一份结构化数据，视觉高度一致。
 * 编辑器与公开请帖页使用 Fabric 精确渲染。
 * ============================================================ */

function gradientCss(spec: GradientSpec): string {
  const stops = spec.stops.map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`).join(', ')
  if (spec.type === 'radial') return `radial-gradient(circle at 50% 50%, ${stops})`
  const angle = ((spec.angle ?? 0) + 90) % 360
  return `linear-gradient(${angle}deg, ${stops})`
}

function backgroundStyle(bg: BackgroundSpec): CSSProperties {
  const base: CSSProperties = { opacity: bg.opacity ?? 1 }
  if (bg.type === 'image' && bg.imageSrc) {
    return {
      ...base,
      backgroundImage: `url(${bg.imageSrc})`,
      backgroundSize: bg.imageFit === 'contain' ? 'contain' : bg.imageFit === 'stretch' ? '100% 100%' : 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }
  if (bg.type === 'gradient' && bg.gradient) {
    return { ...base, backgroundImage: gradientCss(bg.gradient) }
  }
  return { ...base, background: bg.color || '#FFFFFF' }
}

function starPoints(w: number, h: number, spikes = 5) {
  const cx = w / 2
  const cy = h / 2
  const outer = Math.min(w, h) / 2
  const inner = Math.min(w, h) / 4.2
  const pts: string[] = []
  const step = Math.PI / spikes
  let rot = -Math.PI / 2
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    pts.push(`${(cx + Math.cos(rot) * r).toFixed(2)},${(cy + Math.sin(rot) * r).toFixed(2)}`)
    rot += step
  }
  return pts.join(' ')
}

function heartPath(w: number, h: number) {
  const s = Math.min(w, h) / 100
  return [
    `M ${50 * s} ${88 * s}`,
    `C ${20 * s} ${64 * s}, ${2 * s} ${44 * s}, ${2 * s} ${28 * s}`,
    `C ${2 * s} ${8 * s}, ${32 * s} ${-2 * s}, ${50 * s} ${18 * s}`,
    `C ${68 * s} ${-2 * s}, ${98 * s} ${8 * s}, ${98 * s} ${28 * s}`,
    `C ${98 * s} ${44 * s}, ${80 * s} ${64 * s}, ${50 * s} ${88 * s}`,
    'Z',
  ].join(' ')
}

function svgGradientDef(id: string, fill: string | GradientSpec, w: number, h: number) {
  if (typeof fill === 'string') return { def: null, paint: fill }
  const spec = fill
  const stops = spec.stops.map((s) => <stop key={s.offset} offset={`${s.offset * 100}%`} stopColor={s.color} />)
  if (spec.type === 'radial') {
    return {
      def: (
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops}
        </radialGradient>
      ),
      paint: `url(#${id})`,
    }
  }
  const rad = ((spec.angle || 0) * Math.PI) / 180
  const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))
  const dx = (Math.cos(rad) * len) / 2
  const dy = (Math.sin(rad) * len) / 2
  return {
    def: (
      <linearGradient id={id} x1={`${(w / 2 - dx).toFixed(2)}`} y1={`${(h / 2 - dy).toFixed(2)}`} x2={`${(w / 2 + dx).toFixed(2)}`} y2={`${(h / 2 + dy).toFixed(2)}`} gradientUnits="userSpaceOnUse">
        {stops}
      </linearGradient>
    ),
    paint: `url(#${id})`,
  }
}

const ShapeView = memo(function ShapeView({ el }: { el: ShapeElement }) {
  const { def, paint } = svgGradientDef(`g_${el.id}`, el.fill, el.width, el.height)
  const stroke = el.stroke || 'none'
  const sw = el.strokeWidth || 0
  const common = { fill: paint, stroke, strokeWidth: sw }
  let node: React.ReactNode
  switch (el.shape) {
    case 'ellipse':
      node = <ellipse cx={el.width / 2} cy={el.height / 2} rx={Math.max(0, el.width / 2 - sw / 2)} ry={Math.max(0, el.height / 2 - sw / 2)} {...common} />
      break
    case 'triangle':
      node = <polygon points={`${el.width / 2},0 ${el.width},${el.height} 0,${el.height}`} {...common} />
      break
    case 'diamond':
      node = <rect x={sw / 2} y={sw / 2} width={Math.max(0, el.width - sw)} height={Math.max(0, el.height - sw)} rx={el.radius || 0} {...common} />
      break
    case 'line':
      node = <line x1={0} y1={0} x2={el.width} y2={el.height} stroke={stroke !== 'none' ? stroke : paint} strokeWidth={Math.max(1, sw || 2)} strokeLinecap="round" />
      break
    case 'ring':
      node = <ellipse cx={el.width / 2} cy={el.height / 2} rx={Math.max(0, el.width / 2 - sw / 2)} ry={Math.max(0, el.height / 2 - sw / 2)} fill="none" stroke={stroke !== 'none' ? stroke : paint} strokeWidth={Math.max(1, sw || 2)} />
      break
    case 'star':
      node = <polygon points={starPoints(el.width, el.height)} {...common} />
      break
    case 'heart':
      node = <path d={heartPath(el.width, el.height)} {...common} />
      break
    case 'rect':
    default:
      node = <rect x={sw / 2} y={sw / 2} width={Math.max(0, el.width - sw)} height={Math.max(0, el.height - sw)} rx={el.radius || 0} {...common} />
  }
  const rotate = el.shape === 'diamond' ? el.rotation + 45 : el.rotation
  return (
    <div
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`} style={{ overflow: 'visible', display: 'block' }}>
        {def}
        {node}
      </svg>
    </div>
  )
})

const TextView = memo(function TextView({ el }: { el: TextElement }) {
  const style: CSSProperties = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    opacity: el.opacity,
    transform: `rotate(${el.rotation}deg)`,
    transformOrigin: 'center center',
    fontFamily: `"${el.fontFamily}", "Noto Serif SC", "Songti SC", serif`,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    textDecoration: el.underline ? 'underline' : 'none',
    color: el.fill,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: `${(el.charSpacing || 0) / 1000}em`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textShadow: el.shadow?.enabled
      ? `${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color}`
      : undefined,
  }
  return <div style={style}>{el.text}</div>
})

const ImageView = memo(function ImageView({ el }: { el: ImageElement }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        transform: `rotate(${el.rotation}deg) scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
        transformOrigin: 'center center',
        borderRadius: el.borderRadius,
        overflow: 'hidden',
        border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined,
        boxShadow: el.shadow?.enabled
          ? `${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color}`
          : undefined,
      }}
    >
      <img src={el.src} alt={el.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} draggable={false} />
    </div>
  )
})

export function DesignPreview({
  doc,
  width,
  className,
  showBorder = true,
}: {
  doc: DesignDoc
  width: number
  className?: string
  showBorder?: boolean
}) {
  const { width: cw, height: ch } = doc.canvas
  const rootRef = useRef<HTMLDivElement>(null)
  // 容器可能被 CSS（如 !w-full）覆盖为与 width prop 不同的实际宽度，
  // 必须按实际渲染宽度计算缩放，否则会放大裁切（仅显示左上角）。
  const [measuredW, setMeasuredW] = useState<number>(width)
  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return
    const update = () => {
      const w = node.clientWidth
      if (w > 0) setMeasuredW(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [width])
  const scale = measuredW / cw
  const elements = useMemo(() => doc.elements.filter((e) => e.visible !== false), [doc.elements])

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: 'relative',
        width,
        height: ch * scale,
        overflow: 'hidden',
        borderRadius: 12,
        boxShadow: showBorder ? '0 8px 28px rgba(40,30,25,0.12)' : undefined,
        background: '#fff',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: cw, height: ch, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div style={{ position: 'absolute', inset: 0, ...backgroundStyle(doc.canvas.background) }} />
        {elements.map((el) => {
          if (!el.visible) return null
          if (el.type === 'text') return <TextView key={el.id} el={el} />
          if (el.type === 'image') return <ImageView key={el.id} el={el} />
          return <ShapeView key={el.id} el={el} />
        })}
      </div>
    </div>
  )
}

export default DesignPreview
