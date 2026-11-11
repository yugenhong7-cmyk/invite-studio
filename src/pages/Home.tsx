import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import DesignPreview from '@/components/DesignPreview'
import { TEMPLATES, CATEGORY_LABELS, STYLE_LABELS } from '@/data/templates'
import type { EventCategory } from '@/types'

const FEATURES = [
  {
    title: 'AI 智能设计',
    desc: '用一句话描述你想要的请帖，AI 自动解析宴会类型、推荐配色与字体、生成可编辑图层的完整设计。',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" strokeLinejoin="round" />
        <path d="M18.5 15.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: '模板自由导入',
    desc: '支持本地 PNG / JPG / SVG / PDF 上传，也兼容 Canva 导出的设计文件。导入后作为背景，可叠加文字与装饰。',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '专业级编辑器',
    desc: '真实画布与图层系统，文字、图片、形状、背景独立可编辑。支持撤销重做、缩放拖拽、图层顺序与锁定。',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '高清导出与分享',
    desc: '一键导出 PNG / JPG 高清图片，也能生成独立电子请帖链接与二维码，手机打开即有精美的打开动画。',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3h-3zM19 19h2v2h-2zM14 19h3M19 14h2" strokeLinecap="round" />
      </svg>
    ),
  },
]

const STEPS = [
  { n: '01', title: '挑选模板', desc: `从 ${TEMPLATES.length} 套精选模板中选择，或导入你自己的设计。` },
  { n: '02', title: '填写宴会信息', desc: '日期、地点、邀请语自动填入请帖对应位置。' },
  { n: '03', title: '自由编辑', desc: '调整文字、颜色、装饰与排版，实时预览。' },
  { n: '04', title: '导出分享', desc: '导出高清图片，或生成电子请帖链接与二维码。' },
]

export default function Home() {
  const [category, setCategory] = useState<EventCategory | 'all'>('all')
  const featured = useMemo(
    () => (category === 'all' ? TEMPLATES.slice(0, 6) : TEMPLATES.filter((t) => t.category === category).slice(0, 6)),
    [category],
  )

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-primary-100/60 blur-3xl" />
          <div className="absolute -left-32 top-40 h-[380px] w-[380px] rounded-full bg-gold-100/70 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <span className="chip bg-primary-50 text-primary-600 ring-1 ring-primary-100">
                ✦ AI 智能宴会请帖制作平台
              </span>
              <h1 className="mt-5 text-[40px] font-semibold leading-[1.12] tracking-tight text-ink md:text-[58px]">
                让每一场宴会
                <br />
                都有一份<span className="relative text-primary-500">独特的邀请
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 220 12" fill="none">
                    <path d="M2 9C40 3 90 2 120 6c30 4 70 5 98 1" stroke="#E8C87A" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-[16px] leading-[1.9] text-ink-soft">
                不需要设计基础。选模板、填信息、AI 帮你润色排版，
                几分钟做出有高级感的婚礼、生日、寿宴、商务宴请邀请函。
                支持高清导出与电子请帖链接分享。
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/editor" className="btn-primary px-7 py-3 text-[15px]">
                  立即制作请帖
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link to="/templates" className="btn-ghost px-7 py-3 text-[15px]">
                  浏览全部模板
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-mute">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400" /> {TEMPLATES.length} 套精选模板
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-400" /> AI 文案与设计
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400" /> 电子请帖链接 + 二维码
                </span>
              </div>
            </div>

            <div className="relative animate-fade-up [animation-delay:120ms]">
              <div className="relative mx-auto w-[300px]">
                <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-primary-100 via-white to-gold-100 shadow-lift" />
                <div className="relative">
                  <DesignPreview doc={TEMPLATES[0].build()} width={300} />
                </div>
                <div className="absolute -right-10 top-24 hidden rotate-6 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-paper-line sm:block">
                  <DesignPreview doc={TEMPLATES[3].build()} width={128} showBorder={false} />
                </div>
                <div className="absolute -left-12 bottom-16 hidden -rotate-6 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-paper-line sm:block">
                  <DesignPreview doc={TEMPLATES[2].build()} width={118} showBorder={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 分类 */}
      <section className="mx-auto max-w-[1240px] px-5 py-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCategory('all')}
            className={`chip ring-1 ${category === 'all' ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-soft ring-paper-line hover:bg-paper-warm'}`}
          >
            全部场景
          </button>
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`chip ring-1 ${category === c ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white text-ink-soft ring-paper-line hover:bg-paper-warm'}`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((t, i) => (
            <Link
              key={t.id}
              to={`/editor/${t.id}`}
              className="group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="overflow-hidden rounded-2xl transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lift">
                <DesignPreview doc={t.build()} width={1000} className="!w-full" showBorder={false} />
              </div>
              <div className="mt-3">
                <div className="truncate text-sm font-medium text-ink group-hover:text-primary-600">{t.name}</div>
                <div className="mt-0.5 text-xs text-ink-mute">
                  {CATEGORY_LABELS[t.category]} · {STYLE_LABELS[t.style]}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-9 text-center">
          <Link to="/templates" className="btn-ghost">
            查看全部模板 →
          </Link>
        </div>
      </section>

      {/* 功能 */}
      <section className="border-y border-paper-line/70 bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-semibold tracking-[0.22em] text-primary-500">FEATURES</div>
            <h2 className="section-title mt-3">从选择到分享，一个网站全部完成</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-mute">
              我们把设计能力拆解成简单步骤，把专业工具变成人人可用的功能。
            </p>
          </div>
          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:-translate-y-1 hover:shadow-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.85] text-ink-mute">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 流程 */}
      <section className="mx-auto max-w-[1240px] px-5 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold tracking-[0.22em] text-gold-500">HOW IT WORKS</div>
            <h2 className="section-title mt-3">四步做出你的专属请帖</h2>
            <div className="mt-8 space-y-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                    {s.n}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{s.title}</div>
                    <div className="mt-1 text-[13px] leading-relaxed text-ink-mute">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-50 to-gold-50" />
            <div className="relative flex items-center justify-center gap-4 p-8">
              <div className="-rotate-3">
                <DesignPreview doc={TEMPLATES[4].build()} width={190} />
              </div>
              <div className="rotate-3">
                <DesignPreview doc={TEMPLATES[8].build()} width={190} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center text-white md:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
          <h2 className="relative text-3xl font-semibold tracking-tight md:text-4xl">现在就做一张，请帖从这里开始</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
            免费使用全部模板与编辑器功能，导出高清图片，生成可分享的电子请帖链接。
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/editor" className="btn-primary px-8 py-3 text-[15px]">
              开始制作
            </Link>
            <Link to="/templates" className="btn px-8 py-3 text-[15px] bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              先看看模板
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
