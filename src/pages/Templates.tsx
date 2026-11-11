import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DesignPreview from '@/components/DesignPreview'
import { Modal } from '@/components/ui'
import { TEMPLATES, CATEGORY_LABELS, STYLE_LABELS, COLOR_LABELS } from '@/data/templates'
import type { EventCategory, Orientation, StyleTag, TemplateMeta } from '@/types'
import clsx from 'clsx'

type TypeFilter = 'all' | 'static' | 'animated'

const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: '竖版',
  landscape: '横版',
  square: '方形',
}

function FilterGroup<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string
  value: T | 'all'
  options: { value: T; label: string }[]
  onChange: (v: T | 'all') => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-medium text-ink-mute">{title}</span>
      <button
        onClick={() => onChange('all')}
        className={clsx(
          'chip ring-1',
          value === 'all' ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-paper-line hover:bg-paper-warm',
        )}
      >
        不限
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'chip ring-1',
            value === o.value ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white text-ink-soft ring-paper-line hover:bg-paper-warm',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Templates() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<EventCategory | 'all'>('all')
  const [style, setStyle] = useState<StyleTag | 'all'>('all')
  const [color, setColor] = useState<string>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [orientation, setOrientation] = useState<Orientation | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [preview, setPreview] = useState<TemplateMeta | null>(null)

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return TEMPLATES.filter((t) => {
      if (category !== 'all' && t.category !== category) return false
      if (style !== 'all' && t.style !== style) return false
      if (color !== 'all' && t.color !== color) return false
      if (type !== 'all' && t.type !== type) return false
      if (orientation !== 'all' && t.orientation !== orientation) return false
      if (kw) {
        const hay = `${t.name}${t.scene}${CATEGORY_LABELS[t.category]}${STYLE_LABELS[t.style]}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [category, style, color, type, orientation, keyword])

  const reset = () => {
    setCategory('all')
    setStyle('all')
    setColor('all')
    setType('all')
    setOrientation('all')
    setKeyword('')
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">模板中心</h1>
          <p className="mt-2 text-sm text-ink-mute">
            {TEMPLATES.length} 套精心设计的请帖模板，覆盖婚礼、生日、寿宴、满月、升学、乔迁、商务与节日场景。
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
          </svg>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索模板名称或场景"
            className="input pl-10"
          />
        </div>
      </div>

      <div className="mt-7 space-y-3 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-paper-line/70">
        <FilterGroup
          title="类型"
          value={category}
          options={(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          onChange={(v) => setCategory(v as EventCategory | 'all')}
        />
        <FilterGroup
          title="风格"
          value={style}
          options={(Object.keys(STYLE_LABELS) as StyleTag[]).map((s) => ({ value: s, label: STYLE_LABELS[s] }))}
          onChange={(v) => setStyle(v as StyleTag | 'all')}
        />
        <FilterGroup
          title="颜色"
          value={color}
          options={Object.entries(COLOR_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          onChange={(v) => setColor(v as string)}
        />
        <FilterGroup
          title="形式"
          value={type}
          options={[
            { value: 'static' as TypeFilter, label: '静态图片' },
            { value: 'animated' as TypeFilter, label: '动态电子请帖' },
          ]}
          onChange={(v) => setType(v as TypeFilter)}
        />
        <FilterGroup
          title="版式"
          value={orientation}
          options={(Object.keys(ORIENTATION_LABELS) as Orientation[]).map((o) => ({ value: o, label: ORIENTATION_LABELS[o] }))}
          onChange={(v) => setOrientation(v as Orientation | 'all')}
        />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-ink-mute">
        <span>
          共 <b className="text-ink">{list.length}</b> 个模板
        </span>
        <button onClick={reset} className="text-primary-600 hover:underline">
          重置筛选
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-paper-line bg-white/60 px-8 py-16 text-center">
          <div className="text-base font-semibold text-ink">没有符合条件的模板</div>
          <p className="mt-2 text-sm text-ink-mute">试试放宽筛选条件，或换一个关键词。</p>
          <button onClick={reset} className="btn-primary mt-5">
            重置筛选
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((t, i) => (
            <div key={t.id} className="group animate-fade-up" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
              <button onClick={() => setPreview(t)} className="block w-full text-left">
                <div className="relative overflow-hidden rounded-2xl transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lift">
                  <DesignPreview doc={t.build()} width={1000} className="!w-full" showBorder={false} />
                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/55 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="btn-sm rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-medium text-ink">预览</span>
                    <span className="btn-sm rounded-full bg-primary-500 px-3.5 py-1.5 text-xs font-medium text-white">使用模板</span>
                  </div>
                  {t.type === 'animated' && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                      电子请帖
                    </span>
                  )}
                </div>
              </button>
              <div className="mt-3">
                <div className="truncate text-sm font-medium text-ink group-hover:text-primary-600">{t.name}</div>
                <div className="mt-0.5 truncate text-xs text-ink-mute">
                  {CATEGORY_LABELS[t.category]} · {STYLE_LABELS[t.style]} · {ORIENTATION_LABELS[t.orientation]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name ?? ''} width="max-w-3xl">
        {preview && (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="shrink-0">
              <DesignPreview doc={preview.build()} width={260} />
            </div>
            <div className="flex-1">
              <div className="text-sm text-ink-mute">{preview.scene}</div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="w-16 text-ink-mute">适用场景</dt>
                  <dd className="text-ink">{CATEGORY_LABELS[preview.category]}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 text-ink-mute">设计风格</dt>
                  <dd className="text-ink">{STYLE_LABELS[preview.style]}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 text-ink-mute">颜色</dt>
                  <dd className="text-ink">{COLOR_LABELS[preview.color]}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 text-ink-mute">版式</dt>
                  <dd className="text-ink">{ORIENTATION_LABELS[preview.orientation]}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 text-ink-mute">类型</dt>
                  <dd className="text-ink">{preview.type === 'animated' ? '动态电子请帖（带打开动画）' : '静态图片'}</dd>
                </div>
              </dl>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn-primary" onClick={() => navigate(`/editor/${preview.id}`)}>
                  使用此模板
                </button>
                <button className="btn-ghost" onClick={() => setPreview(null)}>
                  继续浏览
                </button>
                <Link to="/my-templates" className="btn-soft">
                  导入我的模板
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
