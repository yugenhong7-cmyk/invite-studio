import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DesignPreview from '@/components/DesignPreview'
import { EmptyState, Modal, Spinner } from '@/components/ui'
import { useApp, toast } from '@/store/app'
import { cloudErrorMessage } from '@/lib/cloud'
import {
  listProjects,
  deleteProject,
  duplicateProject,
  renameProject,
  listInvitations,
  deleteInvitation,
  listGuestResponses,
  getProject,
} from '@/lib/repo'
import type { DesignDoc, InvitationRecord, ProjectRecord, GuestResponse } from '@/types'
import { CATEGORY_LABELS } from '@/data/templates'
import { setHandoff, OPEN_PROJECT_KEY } from '@/lib/handoff'
import { unlockBackgroundImage } from '@/lib/import'

export default function MyWorks() {
  const navigate = useNavigate()
  const session = useApp((s) => s.session)
  const ready = useApp((s) => s.ready)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [invitations, setInvitations] = useState<InvitationRecord[]>([])
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState<ProjectRecord | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [rsvpFor, setRsvpFor] = useState<InvitationRecord | null>(null)
  const [rsvps, setRsvps] = useState<GuestResponse[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [p, inv] = await Promise.all([listProjects(), listInvitations()])
      setProjects(p)
      setInvitations(inv)
    } catch (e) {
      setError(cloudErrorMessage(e, '加载作品失败'))
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  if (ready && !session) {
    return (
      <div className="mx-auto max-w-[1240px] px-5 py-16">
        <EmptyState
          title="登录后查看你的作品"
          desc="保存的请帖、电子请帖链接和宾客回执都会安全地保存在你的账号里。"
          action={
            <Link to="/login" className="btn-primary">
              去登录 / 注册
            </Link>
          }
        />
      </div>
    )
  }

  async function handleDelete(p: ProjectRecord) {
    if (!window.confirm(`确定删除作品「${p.name}」吗？此操作不可恢复。`)) return
    setBusyId(p.id)
    try {
      await deleteProject(p.id)
      toast('success', '作品已删除')
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '删除失败'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicate(p: ProjectRecord) {
    setBusyId(p.id)
    try {
      await duplicateProject(p.id)
      toast('success', '已复制为新作品')
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '复制失败'))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRename() {
    if (!renaming) return
    try {
      await renameProject(renaming.id, renameValue.trim() || renaming.name)
      toast('success', '已重命名')
      setRenaming(null)
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '重命名失败'))
    }
  }

  async function handleRevoke(inv: InvitationRecord) {
    if (!window.confirm('确定取消发布该电子请帖吗？分享链接将立即失效。')) return
    try {
      await deleteInvitation(inv.id)
      toast('success', '已取消发布')
      await load()
    } catch (e) {
      toast('error', cloudErrorMessage(e, '取消发布失败'))
    }
  }

  async function openRsvp(inv: InvitationRecord) {
    setRsvpFor(inv)
    setRsvps(null)
    try {
      const list = await listGuestResponses(inv.id)
      setRsvps(list)
    } catch (e) {
      setRsvps([])
      toast('error', cloudErrorMessage(e, '读取宾客回执失败'))
    }
  }

  async function openInEditor(p: ProjectRecord) {
    setBusyId(p.id)
    try {
      const full = await getProject(p.id)
      if (!full) {
        toast('error', '作品不存在')
        return
      }
      const doc: DesignDoc = {
        id: `doc_${full.id}`,
        name: full.name,
        category: full.category,
        style: full.style,
        orientation: full.orientation,
        canvas: { width: full.canvasWidth, height: full.canvasHeight, background: full.background },
        elements: full.elements,
        eventInfo: full.eventInfo,
        presentation: full.presentation,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      // 旧文档迁移：锁死的背景图 → 可编辑图片图层
      const migrated = await unlockBackgroundImage(doc)
      await setHandoff(OPEN_PROJECT_KEY, { projectId: full.id, doc: migrated })
      navigate('/editor')
    } catch (e) {
      toast('error', cloudErrorMessage(e, '打开作品失败'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">我的作品</h1>
          <p className="mt-2 text-sm text-ink-mute">管理你制作的所有请帖，随时重新编辑、导出或分享。</p>
        </div>
        <Link to="/editor" className="btn-primary">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          创建新作品
        </Link>
      </div>

      {error && <div className="mt-6 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-600">{error}</div>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="还没有作品"
            desc="从模板中心挑一个喜欢的模板开始，几分钟就能做出精美的请帖。"
            action={
              <div className="flex gap-3">
                <Link to="/templates" className="btn-primary">
                  浏览模板
                </Link>
                <Link to="/editor" className="btn-ghost">
                  空白新建
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {projects.map((p) => {
            const inv = invitations.find((i) => i.projectId === p.id) ?? null
            return (
              <div key={p.id} className="group">
                <button onClick={() => void openInEditor(p)} className="block w-full text-left">
                  <div className="relative overflow-hidden rounded-2xl bg-paper-soft transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
                    <DesignPreview
                      doc={{
                        id: `pv_${p.id}`,
                        name: p.name,
                        category: p.category,
                        style: p.style,
                        orientation: p.orientation,
                        canvas: { width: p.canvasWidth, height: p.canvasHeight, background: p.background },
                        elements: p.elements,
                        eventInfo: p.eventInfo,
                        presentation: p.presentation,
                        createdAt: 0,
                        updatedAt: 0,
                      }}
                      width={1000}
                      className="!w-full"
                      showBorder={false}
                    />
                    {inv && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-primary-500/90 px-2.5 py-1 text-[10px] text-white">
                        已发布 · {inv.visitCount} 次浏览
                      </span>
                    )}
                  </div>
                </button>
                <div className="mt-3">
                  <div className="truncate text-sm font-medium text-ink">{p.name}</div>
                  <div className="mt-0.5 text-xs text-ink-mute">
                    {CATEGORY_LABELS[p.category]} · {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button className="btn-ghost btn-sm" onClick={() => void openInEditor(p)} disabled={busyId === p.id}>
                      编辑
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setRenaming(p)
                        setRenameValue(p.name)
                      }}
                    >
                      重命名
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => void handleDuplicate(p)} disabled={busyId === p.id}>
                      复制
                    </button>
                    {inv && (
                      <>
                        <Link to={`/i/${inv.shareSlug}`} className="btn-soft btn-sm">
                          查看请帖
                        </Link>
                        <button className="btn-ghost btn-sm" onClick={() => void openRsvp(inv)}>
                          回执
                        </button>
                        <button className="btn-ghost btn-sm !text-primary-600" onClick={() => void handleRevoke(inv)}>
                          取消发布
                        </button>
                      </>
                    )}
                    <button className="btn-ghost btn-sm !text-primary-600" onClick={() => void handleDelete(p)} disabled={busyId === p.id}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="重命名作品" width="max-w-sm">
        <input
          className="input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleRename()}
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setRenaming(null)}>
            取消
          </button>
          <button className="btn-primary" onClick={() => void handleRename()}>
            保存
          </button>
        </div>
      </Modal>

      <Modal open={!!rsvpFor} onClose={() => setRsvpFor(null)} title={`宾客回执 · ${rsvpFor?.title ?? ''}`} width="max-w-xl">
        {rsvps === null ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : rsvps.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-mute">还没有宾客提交回执。</div>
        ) : (
          <div className="space-y-3">
            {rsvps.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl bg-paper-warm px-4 py-3">
                <div
                  className={`mt-0.5 rounded-full px-2.5 py-1 text-[11px] ${
                    r.status === 'attend'
                      ? 'bg-emerald-100 text-emerald-700'
                      : r.status === 'decline'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gold-100 text-gold-700'
                  }`}
                >
                  {r.status === 'attend' ? '确认参加' : r.status === 'decline' ? '无法参加' : '待定'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">
                    {r.guestName}
                    {r.status !== 'decline' && <span className="ml-2 text-xs text-ink-mute">{r.partySize} 人</span>}
                  </div>
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="mt-0.5 block text-xs text-primary-600">
                      {r.phone}
                    </a>
                  )}
                  {r.message && <div className="mt-1 text-xs leading-relaxed text-ink-mute">{r.message}</div>}
                  <div className="mt-1 text-[11px] text-ink-mute">{new Date(r.createdAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
