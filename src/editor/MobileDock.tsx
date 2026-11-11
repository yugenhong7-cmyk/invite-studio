import { useState } from 'react'
import clsx from 'clsx'
import LeftPanel, { TABS, type TabId } from './LeftPanel'
import RightPanel from './RightPanel'
import { useEditor } from '@/store/editor'

type OpenPanel = TabId | 'props' | null

/** 移动端（Canva 风格）底部工具坞：图标工具栏 + 二级面板底部抽屉 */
export default function MobileDock() {
  const [open, setOpen] = useState<OpenPanel>(null)
  const selectedId = useEditor((s) => s.selectedId)

  function toggle(id: Exclude<OpenPanel, null>) {
    setOpen((cur) => (cur === id ? null : id))
  }

  const openLabel =
    open === 'props'
      ? '属性'
      : open
        ? (TABS.find((t) => t.id === open)?.label ?? '工具')
        : ''

  return (
    <>
      {/* 选中元素：浮动属性快捷入口 */}
      {selectedId && open === null && (
        <button
          type="button"
          onClick={() => setOpen('props')}
          className="fixed bottom-[86px] left-1/2 z-[50] -translate-x-1/2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg active:scale-95"
        >
          编辑属性
        </button>
      )}

      {/* 底部工具坞（始终置顶：抽屉打开时仍可切换工具） */}
      <nav className="relative z-[65] shrink-0 border-t border-paper-line/70 bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex overflow-x-auto overscroll-x-contain px-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => {
            const shortLabel = t.id === 'ai' ? 'AI' : t.id === 'event' ? '信息' : t.label
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={clsx(
                  'flex min-w-[62px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition',
                  open === t.id ? 'text-primary-600' : 'text-ink-mute active:text-ink',
                )}
              >
                {t.icon}
                <span>{shortLabel}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => toggle('props')}
            className={clsx(
              'flex min-w-[62px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition',
              open === 'props' ? 'text-primary-600' : selectedId ? 'text-primary-500' : 'text-ink-mute',
            )}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4" strokeLinecap="round" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="8" cy="12" r="2" />
              <circle cx="14" cy="17" r="2" />
            </svg>
            <span>属性</span>
          </button>
        </div>
      </nav>

      {/* 二级面板：底部抽屉（位于工具坞上方，留出工具坞高度） */}
      {open && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/30" onClick={() => setOpen(null)} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-[60] flex h-[62vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
            <div className="flex shrink-0 items-center justify-between border-b border-paper-line/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1 w-9 rounded-full bg-paper-line" />
                <span className="text-sm font-semibold text-ink">{openLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full px-3 py-1.5 text-xs text-ink-mute active:bg-paper-warm"
              >
                收起
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden pb-[calc(58px+env(safe-area-inset-bottom,0px))]">
              {open === 'props' ? (
                <RightPanel variant="sheet" />
              ) : (
                <LeftPanel variant="sheet" activeTab={open} onTabChange={(t) => setOpen(t)} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
