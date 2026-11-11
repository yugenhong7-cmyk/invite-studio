/**
 * DesignLayers 挂载辅助：把设计渲染为带动画的 DOM 图层到指定容器。
 * 供回归脚本/预览沙箱在运行时挂载使用（业务代码不引用，不进产物包）。
 */
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DesignLayers } from '@/dynamic/DesignLayers'
import type { DesignDoc, PresentationConfig } from '@/types'

export interface MountedDesignLayers {
  unmount: () => void
}

export async function mountDesignLayers(
  container: HTMLElement,
  doc: DesignDoc,
  presentation: PresentationConfig,
  width: number,
  animate = false,
): Promise<MountedDesignLayers> {
  const root: Root = createRoot(container)
  root.render(React.createElement(DesignLayers, { doc, presentation, animate, width }))
  // 等一拍让布局/测量完成
  await new Promise((r) => setTimeout(r, 250))
  return {
    unmount: () => {
      root.unmount()
    },
  }
}
