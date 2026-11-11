import { useEffect, useRef, useState } from 'react'
import { StaticCanvas } from 'fabric'
import type { DesignDoc } from '@/types'
import { renderDesignToCanvas } from '@/lib/fabric-sync'

/**
 * 用 Fabric 精确渲染一份设计（只读）。
 * 与编辑器画布共用同一套渲染逻辑，保证所见即所得。
 * 用于公开电子请帖页与需要像素级一致的预览。
 */
export default function DesignCanvasView({
  doc,
  width,
  className,
}: {
  doc: DesignDoc
  width: number
  className?: string
}) {
  const holderRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let staticCanvas: StaticCanvas | null = null
    setReady(false)

    const run = async () => {
      if (!canvasElRef.current) return
      staticCanvas = new StaticCanvas(canvasElRef.current, {
        width: doc.canvas.width,
        height: doc.canvas.height,
        selection: false,
        interactive: false,
        renderOnAddRemove: false,
        enableRetinaScaling: true,
      })
      await renderDesignToCanvas(staticCanvas as never, doc)
      if (disposed) {
        staticCanvas.dispose()
        return
      }
      staticCanvas.requestRenderAll()
      setReady(true)
    }

    void run()

    return () => {
      disposed = true
      try {
        staticCanvas?.dispose()
      } catch {
        /* ignore */
      }
    }
  }, [doc])

  const scale = width / doc.canvas.width
  const displayH = doc.canvas.height * scale

  return (
    <div
      ref={holderRef}
      className={className}
      style={{
        position: 'relative',
        width,
        height: displayH,
        overflow: 'hidden',
        borderRadius: 14,
        background: '#fff',
      }}
    >
      {!ready && <div className="absolute inset-0 shimmer" style={{ borderRadius: 14 }} />}
      <canvas
        ref={canvasElRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: doc.canvas.width,
          height: doc.canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
