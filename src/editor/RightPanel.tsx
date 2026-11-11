import { useState } from 'react'
import clsx from 'clsx'
import type { FabricObject } from 'fabric'
import { useEditor } from '@/store/editor'
import { toast } from '@/store/app'
import { FONT_OPTIONS } from '@/lib/design'
import { findObjectByElementId, elementFromFabric } from '@/lib/fabric-sync'
import type { DesignElement, GradientSpec, ImageElement, ShapeElement, TextElement } from '@/types'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[52px] shrink-0 text-[11px] text-ink-mute">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 shrink-0 cursor-pointer rounded-lg ring-1 ring-paper-line"
      />
      <input className="input !py-1.5 text-xs" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export default function RightPanel({ variant = 'sidebar' }: { variant?: 'sidebar' | 'sheet' } = {}) {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedId)
  const updateElement = useEditor((s) => s.updateElement)
  const removeElement = useEditor((s) => s.removeElement)
  const reorderElement = useEditor((s) => s.reorderElement)
  const renameElement = useEditor((s) => s.renameElement)
  const toggleLock = useEditor((s) => s.toggleLock)
  const toggleVisible = useEditor((s) => s.toggleVisible)
  const select = useEditor((s) => s.select)
  const commit = useEditor((s) => s.commit)
  const [tab, setTab] = useState<'props' | 'layers'>('props')
  const [editingName, setEditingName] = useState<string | null>(null)

  const selected = doc.elements.find((e) => e.id === selectedId) ?? null
  const layers = [...doc.elements].reverse()

  /* ---------- 组合 / 取消组合 ---------- */
  function groupSelection() {
    const canvas = useEditor.getState().fabricCanvas as FabricObject extends never ? never : import('fabric').Canvas | null
    if (!canvas) return
    const active = canvas.getActiveObject() as { type?: string; getObjects?: () => FabricObject[]; toGroup?: () => FabricObject; toActiveSelection?: () => FabricObject } | null
    if (active && active.type === 'ActiveSelection' && active.toGroup) {
      const group = active.toGroup()
      const els = (active.getObjects?.() ?? [])
        .map((o) => elementFromFabric(o))
        .filter(Boolean) as DesignElement[]
      const gid = `grp_${Date.now()}`
      const minX = Math.min(...els.map((e) => e.x))
      const minY = Math.min(...els.map((e) => e.y))
      const maxX = Math.max(...els.map((e) => e.x + e.width))
      const maxY = Math.max(...els.map((e) => e.y + e.height))
      void group
      commit((d) => {
        const rest = d.elements.filter((e) => !els.some((x) => x.id === e.id))
        return {
          ...d,
          elements: [
            ...rest,
            {
              id: gid,
              type: 'shape',
              name: '组合',
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              shape: 'rect',
              fill: 'transparent',
              stroke: '',
              strokeWidth: 0,
              radius: 0,
            } as ShapeElement,
          ],
        }
      })
      toast('success', '已组合（组合为一个可整体移动的图层）')
    } else if (active && active.toActiveSelection) {
      active.toActiveSelection()
      toast('success', '已取消组合')
    } else {
      toast('info', '请按住 Shift 选中多个元素后再组合')
    }
    canvas.requestRenderAll()
  }

  /* ---------- 属性面板 ---------- */
  function renderProps() {
    if (!selected) {
      return (
        <div className="px-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-soft text-ink-mute">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 4l7 16 2-7 7-2L4 4z" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="mt-3 text-xs leading-relaxed text-ink-mute">
            选中画布中的元素后，
            <br />
            在这里调整字体、颜色、位置与样式。
          </div>
        </div>
      )
    }

    const patch = (p: Partial<DesignElement>) => updateElement(selected.id, p)

    return (
      <div className="space-y-4 px-4 py-4">
        <div>
          <label className="label">图层名称</label>
          <input className="input !py-1.5 text-xs" value={selected.name} onChange={(e) => renameElement(selected.id, e.target.value)} />
        </div>

        {selected.type === 'text' && (
          <>
            <div>
              <label className="label">文字内容</label>
              <textarea
                className="input min-h-[80px] text-xs"
                value={(selected as TextElement).text}
                onChange={(e) => patch({ text: e.target.value } as Partial<TextElement>)}
              />
            </div>
            <Row label="字体">
              <select
                className="input !py-1.5 text-xs"
                value={(selected as TextElement).fontFamily}
                onChange={(e) => patch({ fontFamily: e.target.value } as Partial<TextElement>)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="字号">
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={(selected as TextElement).fontSize}
                min={8}
                max={400}
                onChange={(e) => patch({ fontSize: Number(e.target.value) || 12 } as Partial<TextElement>)}
              />
            </Row>
            <Row label="颜色">
              <ColorInput value={(selected as TextElement).fill} onChange={(v) => patch({ fill: v } as Partial<TextElement>)} />
            </Row>
            <Row label="样式">
              <div className="flex gap-1.5">
                <button
                  onClick={() => patch({ fontWeight: (selected as TextElement).fontWeight === 'bold' ? 'normal' : 'bold' } as Partial<TextElement>)}
                  className={clsx('h-8 w-8 rounded-lg text-sm ring-1', (selected as TextElement).fontWeight === 'bold' ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white ring-paper-line')}
                >
                  B
                </button>
                <button
                  onClick={() => patch({ fontStyle: (selected as TextElement).fontStyle === 'italic' ? 'normal' : 'italic' } as Partial<TextElement>)}
                  className={clsx('h-8 w-8 rounded-lg text-sm italic ring-1', (selected as TextElement).fontStyle === 'italic' ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white ring-paper-line')}
                >
                  I
                </button>
                <button
                  onClick={() => patch({ underline: !(selected as TextElement).underline } as Partial<TextElement>)}
                  className={clsx('h-8 w-8 rounded-lg text-sm underline ring-1', (selected as TextElement).underline ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white ring-paper-line')}
                >
                  U
                </button>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => patch({ textAlign: a } as Partial<TextElement>)}
                    className={clsx('h-8 w-8 rounded-lg text-xs ring-1', (selected as TextElement).textAlign === a ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white ring-paper-line')}
                  >
                    {a === 'left' ? '左' : a === 'center' ? '中' : '右'}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="行高">
              <input
                type="range"
                min={0.8}
                max={3}
                step={0.05}
                value={(selected as TextElement).lineHeight}
                onChange={(e) => patch({ lineHeight: Number(e.target.value) } as Partial<TextElement>)}
                className="w-full"
              />
            </Row>
            <Row label="字距">
              <input
                type="range"
                min={-200}
                max={2000}
                step={20}
                value={(selected as TextElement).charSpacing}
                onChange={(e) => patch({ charSpacing: Number(e.target.value) } as Partial<TextElement>)}
                className="w-full"
              />
            </Row>
          </>
        )}

        {selected.type === 'shape' && (
          <>
            <Row label="填充">
              <ColorInput
                value={typeof (selected as ShapeElement).fill === 'string' ? ((selected as ShapeElement).fill as string) : '#C9A227'}
                onChange={(v) => patch({ fill: v } as Partial<ShapeElement>)}
              />
            </Row>
            <Row label="边框">
              <ColorInput value={(selected as ShapeElement).stroke || '#000000'} onChange={(v) => patch({ stroke: v } as Partial<ShapeElement>)} />
            </Row>
            <Row label="边宽">
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={(selected as ShapeElement).strokeWidth}
                onChange={(e) => patch({ strokeWidth: Number(e.target.value) } as Partial<ShapeElement>)}
                className="w-full"
              />
            </Row>
            {(selected as ShapeElement).shape === 'rect' && (
              <Row label="圆角">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={2}
                  value={(selected as ShapeElement).radius}
                  onChange={(e) => patch({ radius: Number(e.target.value) } as Partial<ShapeElement>)}
                  className="w-full"
                />
              </Row>
            )}
            <button
              className="btn-ghost w-full !py-1.5 text-xs"
              onClick={() => {
                const g: GradientSpec = {
                  type: 'linear',
                  angle: 135,
                  stops: [
                    { offset: 0, color: '#E8C87A' },
                    { offset: 1, color: '#B98D22' },
                  ],
                }
                patch({ fill: g } as Partial<ShapeElement>)
                toast('success', '已应用金色渐变填充')
              }}
            >
              应用金色渐变
            </button>
          </>
        )}

        {selected.type === 'image' && (
          <>
            <Row label="圆角">
              <input
                type="range"
                min={0}
                max={400}
                step={2}
                value={(selected as ImageElement).borderRadius}
                onChange={(e) => patch({ borderRadius: Number(e.target.value) } as Partial<ImageElement>)}
                className="w-full"
              />
            </Row>
            <Row label="边框">
              <ColorInput value={(selected as ImageElement).stroke || '#FFFFFF'} onChange={(v) => patch({ stroke: v } as Partial<ImageElement>)} />
            </Row>
            <Row label="边宽">
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={(selected as ImageElement).strokeWidth}
                onChange={(e) => patch({ strokeWidth: Number(e.target.value) } as Partial<ImageElement>)}
                className="w-full"
              />
            </Row>
            <Row label="翻转">
              <div className="flex gap-1.5">
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => patch({ flipX: !(selected as ImageElement).flipX } as Partial<ImageElement>)}
                >
                  水平
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => patch({ flipY: !(selected as ImageElement).flipY } as Partial<ImageElement>)}
                >
                  垂直
                </button>
              </div>
            </Row>
          </>
        )}

        {/* 通用 */}
        <div className="space-y-3 border-t border-paper-line/70 pt-4">
          <Row label="旋转">
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selected.rotation}
              onChange={(e) => patch({ rotation: Number(e.target.value) })}
              className="w-full"
            />
          </Row>
          <Row label="透明">
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={selected.opacity}
              onChange={(e) => patch({ opacity: Number(e.target.value) })}
              className="w-full"
            />
          </Row>
          <Row label="位置">
            <div className="flex gap-1.5">
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={Math.round(selected.x)}
                onChange={(e) => patch({ x: Number(e.target.value) || 0 })}
              />
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={Math.round(selected.y)}
                onChange={(e) => patch({ y: Number(e.target.value) || 0 })}
              />
            </div>
          </Row>
          <Row label="尺寸">
            <div className="flex gap-1.5">
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={Math.round(selected.width)}
                onChange={(e) => patch({ width: Math.max(1, Number(e.target.value) || 1) })}
              />
              <input
                type="number"
                className="input !py-1.5 text-xs"
                value={Math.round(selected.height)}
                onChange={(e) => patch({ height: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </Row>
          <Row label="阴影">
            <button
              className="btn-ghost w-full !py-1.5 text-xs"
              onClick={() => {
                const has = !!selected.shadow?.enabled
                patch({
                  shadow: has
                    ? { ...(selected.shadow!), enabled: false }
                    : { enabled: true, color: 'rgba(0,0,0,0.3)', blur: 16, offsetX: 0, offsetY: 8 },
                } as Partial<DesignElement>)
              }}
            >
              {selected.shadow?.enabled ? '关闭阴影' : '开启阴影'}
            </button>
          </Row>
        </div>

        <div className="flex gap-2 border-t border-paper-line/70 pt-4">
          <button className="btn-ghost btn-sm flex-1" onClick={() => toggleLock(selected.id)}>
            {selected.locked ? '解锁' : '锁定'}
          </button>
          <button className="btn-ghost btn-sm flex-1" onClick={() => removeElement(selected.id)}>
            删除
          </button>
        </div>
      </div>
    )
  }

  return (
    <aside
      className={
        variant === 'sheet'
          ? 'flex h-full w-full flex-col bg-white'
          : 'flex h-full w-[280px] shrink-0 flex-col border-l border-paper-line/70 bg-white'
      }
    >
      <div className="flex border-b border-paper-line/70">
        {(
          [
            ['props', '属性'],
            ['layers', `图层 ${doc.elements.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex-1 py-3 text-xs font-medium transition',
              tab === id ? 'border-b-2 border-primary-500 text-primary-600' : 'text-ink-mute hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'props' ? (
          renderProps()
        ) : (
          <div className="p-3">
            <div className="mb-2 flex gap-1.5">
              <button className="btn-ghost btn-sm flex-1" onClick={groupSelection}>
                组合 / 取消组合
              </button>
              <button
                className="btn-ghost btn-sm flex-1"
                onClick={() => {
                  const canvas = useEditor.getState().fabricCanvas as import('fabric').Canvas | null
                  if (canvas && selectedId) {
                    const obj = findObjectByElementId(canvas, selectedId)
                    if (obj) {
                      const active = canvas.getActiveObject() as { toActiveSelection?: () => FabricObject; getObjects?: () => FabricObject[] } | null
                      void active
                      canvas.discardActiveObject()
                      canvas.requestRenderAll()
                    }
                  }
                  toast('info', '按住 Shift 点击多个元素可批量选择')
                }}
              >
                多选提示
              </button>
            </div>
            <div className="space-y-1">
              {layers.map((el, idx) => {
                const realIndex = doc.elements.length - 1 - idx
                return (
                  <div
                    key={el.id}
                    onClick={() => select(el.id)}
                    className={clsx(
                      'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition',
                      el.id === selectedId ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-paper-warm',
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleVisible(el.id)
                      }}
                      className="text-ink-mute hover:text-ink"
                      title={el.visible ? '隐藏' : '显示'}
                    >
                      {el.visible ? '👁' : '🚫'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLock(el.id)
                      }}
                      className="text-ink-mute hover:text-ink"
                      title={el.locked ? '解锁' : '锁定'}
                    >
                      {el.locked ? '🔒' : '🔓'}
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingName === el.id ? (
                        <input
                          autoFocus
                          className="input !py-1 text-xs"
                          defaultValue={el.name}
                          onBlur={(e) => {
                            renameElement(el.id, e.target.value)
                            setEditingName(null)
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        />
                      ) : (
                        <div className="truncate text-xs text-ink" onDoubleClick={() => setEditingName(el.id)}>
                          {el.name}
                          <span className="ml-1 text-[10px] text-ink-mute">
                            {el.type === 'text' ? 'T' : el.type === 'image' ? '图' : '形'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          reorderElement(el.id, 'up')
                        }}
                        className="text-[9px] leading-none text-ink-mute hover:text-primary-600"
                        title="上移一层"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          reorderElement(el.id, 'down')
                        }}
                        className="text-[9px] leading-none text-ink-mute hover:text-primary-600"
                        title="下移一层"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeElement(el.id)
                      }}
                      className="text-ink-mute opacity-0 transition hover:text-primary-600 group-hover:opacity-100"
                      title="删除"
                    >
                      ✕
                    </button>
                    <span className="w-4 text-right text-[10px] text-ink-mute">{realIndex + 1}</span>
                  </div>
                )
              })}
            </div>
            {layers.length === 0 && (
              <div className="py-10 text-center text-xs leading-relaxed text-ink-mute">
                还没有图层。
                <br />
                从左侧添加文字、图片或素材。
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
