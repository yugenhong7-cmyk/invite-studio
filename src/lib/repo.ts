import { cloud, unwrap, cloudErrorMessage } from './cloud'
import type {
  DesignDoc,
  DesignElement,
  BackgroundSpec,
  EventInfo,
  EventCategory,
  Orientation,
  PresentationConfig,
  StyleTag,
  InvitationRecord,
  GuestResponse,
  RsvpStatus,
  ProjectRecord,
} from '@/types'
import { slugId } from './id'
import { presentationFor } from './presentation'

/* ============================================================
 * 数据访问层
 * - projects / design_elements 是结构化存储（图层 + 坐标独立成行）
 * - invitations 通过 SECURITY DEFINER 函数对外公开
 * - 未登录时编辑器本地草稿只做崩溃恢复，正式保存走云端
 * ============================================================ */

type Db = never
const db = cloud.database as unknown as {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

interface ProjectRow {
  id: number
  owner_id: string
  owner_name: string | null
  name: string
  category: string
  style: string
  orientation: string
  canvas_width: number
  canvas_height: number
  background: BackgroundSpec | null
  event_info: EventInfo | null
  presentation: Record<string, unknown> | null
  thumbnail: string | null
  status: string
  created_at: string
  updated_at: string
}

interface ElementRow {
  id: number
  project_id: number
  z_index: number
  element_type: string
  name: string | null
  role: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  props: Record<string, unknown> | null
}

/* ---------------- 映射 ---------------- */

export function elementToRow(el: DesignElement, projectId: number | null, zIndex: number) {
  const base = {
    project_id: projectId,
    z_index: zIndex,
    element_type: el.type,
    name: el.name,
    role: el.role ?? null,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    opacity: el.opacity,
    visible: el.visible,
    locked: el.locked,
  }
  let props: Record<string, unknown> = {}
  if (el.type === 'text') {
    props = {
      uid: el.id,
      text: el.text,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      underline: el.underline,
      fill: el.fill,
      textAlign: el.textAlign,
      lineHeight: el.lineHeight,
      charSpacing: el.charSpacing,
      shadow: el.shadow ?? null,
    }
  } else if (el.type === 'image') {
    props = {
      uid: el.id,
      src: el.src,
      borderRadius: el.borderRadius,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      flipX: el.flipX,
      flipY: el.flipY,
      shadow: el.shadow ?? null,
    }
  } else {
    props = {
      uid: el.id,
      shape: el.shape,
      fill: el.fill,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      radius: el.radius,
      shadow: el.shadow ?? null,
    }
  }
  return { ...base, props }
}

export function rowToElement(row: ElementRow): DesignElement {
  const props = (row.props ?? {}) as Record<string, unknown>
  const base = {
    id: (props.uid as string) || `el_${row.id}`,
    name: row.name || '图层',
    role: (row.role as DesignElement['role']) ?? undefined,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation,
    opacity: row.opacity,
    visible: row.visible,
    locked: row.locked,
  }
  if (row.element_type === 'text') {
    return {
      ...base,
      type: 'text',
      text: (props.text as string) ?? '',
      fontFamily: (props.fontFamily as string) ?? 'Noto Serif SC',
      fontSize: (props.fontSize as number) ?? 40,
      fontWeight: (props.fontWeight as 'normal' | 'bold') ?? 'normal',
      fontStyle: (props.fontStyle as 'normal' | 'italic') ?? 'normal',
      underline: !!props.underline,
      fill: (props.fill as string) ?? '#22201E',
      textAlign: (props.textAlign as 'left' | 'center' | 'right') ?? 'center',
      lineHeight: (props.lineHeight as number) ?? 1.4,
      charSpacing: (props.charSpacing as number) ?? 0,
      shadow: (props.shadow as DesignElement['shadow']) ?? undefined,
    }
  }
  if (row.element_type === 'image') {
    return {
      ...base,
      type: 'image',
      src: (props.src as string) ?? '',
      borderRadius: (props.borderRadius as number) ?? 0,
      stroke: (props.stroke as string) ?? '',
      strokeWidth: (props.strokeWidth as number) ?? 0,
      flipX: !!props.flipX,
      flipY: !!props.flipY,
      shadow: (props.shadow as DesignElement['shadow']) ?? undefined,
    }
  }
  return {
    ...base,
    type: 'shape',
    shape: (props.shape as never) ?? 'rect',
    fill: (props.fill as never) ?? '#C9A227',
    stroke: (props.stroke as string) ?? '',
    strokeWidth: (props.strokeWidth as number) ?? 0,
    radius: (props.radius as number) ?? 0,
    shadow: (props.shadow as DesignElement['shadow']) ?? undefined,
  }
}

export function rowToProject(row: ProjectRow, elements: DesignElement[]): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category as EventCategory,
    style: row.style as StyleTag,
    orientation: row.orientation as Orientation,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    background: (row.background ?? { type: 'color', color: '#FFFFFF', opacity: 1 }) as BackgroundSpec,
    eventInfo: (row.event_info ?? {}) as EventInfo,
    presentation: normalizePresentation(row.presentation, row.category as EventCategory, row.style as StyleTag),
    thumbnail: row.thumbnail,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    elements,
    invitation: null,
  }
}

/** 把数据库里的 presentation JSONB 兜底成完整配置 */
export function normalizePresentation(
  raw: Record<string, unknown> | PresentationConfig | null | undefined,
  category: EventCategory,
  style: StyleTag,
): PresentationConfig {
  const base = presentationFor(category, style)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PresentationConfig>
  return {
    ...base,
    ...r,
    cover: { ...base.cover, ...(r.cover ?? {}) },
    backgroundFx: { ...base.backgroundFx, ...(r.backgroundFx ?? {}) },
    music: { ...base.music, ...(r.music ?? {}) },
    sections: { ...base.sections, ...(r.sections ?? {}) },
    story: Array.isArray(r.story) ? r.story : base.story,
    elementAnims: r.elementAnims && typeof r.elementAnims === 'object' ? r.elementAnims : {},
  }
}

/* ---------------- 认证门 ---------------- */

export async function requireUserId(): Promise<{ userId: string; userName: string | null }> {
  const session = unwrap(await cloud.auth.getSession())
  if (!session) {
    const e = new Error('请先登录后再保存作品') as Error & { code?: string }
    e.code = 'unauthenticated'
    throw e
  }
  return { userId: session.user.id, userName: session.user.name ?? null }
}

/* ---------------- 项目 CRUD ---------------- */

export async function listProjects(): Promise<ProjectRecord[]> {
  await requireUserId()
  const { data, error } = await db
    .from('projects')
    .select('id, name, category, style, orientation, canvas_width, canvas_height, background, event_info, presentation, thumbnail, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw new Error((error as { message?: string }).message || '读取作品列表失败')
  const rows = (data ?? []) as ProjectRow[]
  return rows.map((r) => rowToProject(r, []))
}

export async function getProject(projectId: number): Promise<ProjectRecord | null> {
  await requireUserId()
  const { data, error } = await db.from('projects').select('*').eq('id', projectId).maybeSingle()
  if (error) throw new Error((error as { message?: string }).message || '读取作品失败')
  if (!data) return null
  const elRes = await db
    .from('design_elements')
    .select('*')
    .eq('project_id', projectId)
    .order('z_index', { ascending: true })
  const els = ((elRes.data ?? []) as ElementRow[]).map(rowToElement)
  return rowToProject(data as ProjectRow, els)
}

export interface SaveResult {
  projectId: number
}

/** 保存作品（新建或覆盖），并同步 design_elements 结构化图层 */
export async function saveProject(
  doc: DesignDoc,
  options: { projectId?: number | null; thumbnail?: string | null } = {},
): Promise<SaveResult> {
  const { userId, userName } = await requireUserId()
  const payload = {
    name: doc.name,
    category: doc.category,
    style: doc.style,
    orientation: doc.orientation,
    canvas_width: doc.canvas.width,
    canvas_height: doc.canvas.height,
    background: doc.canvas.background,
    event_info: doc.eventInfo,
    presentation: doc.presentation ?? presentationFor(doc.category, doc.style),
    thumbnail: options.thumbnail ?? null,
    status: 'draft',
    owner_name: userName,
    updated_at: new Date().toISOString(),
  }

  let projectId = options.projectId ?? null
  if (projectId) {
    const { data, error } = await db.from('projects').update(payload).eq('id', projectId).select()
    const affected = Array.isArray(data) ? data : []
    if (error) throw new Error((error as { message?: string }).message || '保存失败')
    if (affected.length === 0) {
      const e = new Error('作品不存在或无权限修改') as Error & { code?: string }
      e.code = 'forbidden'
      throw e
    }
  } else {
    const { data, error } = await db.from('projects').insert(payload).select()
    if (error) throw new Error((error as { message?: string }).message || '创建作品失败')
    const created = Array.isArray(data) ? (data[0] as ProjectRow) : null
    if (!created) throw new Error('创建作品失败')
    projectId = created.id
  }

  // 结构化图层：先清空再批量写入，保证 z_index 与图层顺序一致
  const del = await db.from('design_elements').delete().eq('project_id', projectId)
  if (del.error) throw new Error((del.error as { message?: string }).message || '保存图层失败')

  if (doc.elements.length > 0) {
    const rows = doc.elements.map((el, i) => elementToRow(el, projectId, i))
    const ins = await db.from('design_elements').insert(rows)
    if (ins.error) throw new Error((ins.error as { message?: string }).message || '保存图层失败')
  }

  // 已发布的电子请帖同步最新设计
  await syncPublishedInvitation(projectId)

  void userId
  return { projectId: projectId as number }
}

export async function deleteProject(projectId: number): Promise<void> {
  await requireUserId()
  const { data, error } = await db.from('projects').delete().eq('id', projectId).select()
  if (error) throw new Error((error as { message?: string }).message || '删除失败')
  if (!Array.isArray(data) || data.length === 0) {
    const e = new Error('作品不存在或无权限删除') as Error & { code?: string }
    e.code = 'forbidden'
    throw e
  }
}

export async function renameProject(projectId: number, name: string): Promise<void> {
  await requireUserId()
  const { data, error } = await db
    .from('projects')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
  if (error) throw new Error((error as { message?: string }).message || '重命名失败')
  if (!Array.isArray(data) || data.length === 0) throw new Error('作品不存在或无权限修改')
}

export async function duplicateProject(projectId: number): Promise<number> {
  const src = await getProject(projectId)
  if (!src) throw new Error('作品不存在')
  const doc: DesignDoc = {
    id: `doc_${Date.now()}`,
    name: `${src.name} - 副本`,
    category: src.category,
    style: src.style,
    orientation: src.orientation,
    canvas: {
      width: src.canvasWidth,
      height: src.canvasHeight,
      background: src.background,
    },
    elements: src.elements,
    eventInfo: src.eventInfo,
    presentation: src.presentation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const saved = await saveProject(doc, { thumbnail: src.thumbnail })
  return saved.projectId
}

/* ---------------- 用户自定义模板 ---------------- */

export interface UserTemplateRecord {
  id: number
  name: string
  importType: string
  sourceFormat: string
  fileUrl: string | null
  designJson: DesignDoc | null
  createdAt: string
}

export async function listUserTemplates(): Promise<UserTemplateRecord[]> {
  await requireUserId()
  const { data, error } = await db
    .from('user_templates')
    .select('id, name, import_type, source_format, file_url, design_json, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error((error as { message?: string }).message || '读取模板失败')
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    name: r.name as string,
    importType: r.import_type as string,
    sourceFormat: r.source_format as string,
    fileUrl: (r.file_url as string) ?? null,
    designJson: (r.design_json as DesignDoc) ?? null,
    createdAt: r.created_at as string,
  }))
}

export async function saveUserTemplate(input: {
  name: string
  importType: string
  sourceFormat: string
  fileUrl: string | null
  designJson: DesignDoc | null
}): Promise<number> {
  const { userName } = await requireUserId()
  const { data, error } = await db
    .from('user_templates')
    .insert({
      name: input.name,
      import_type: input.importType,
      source_format: input.sourceFormat,
      file_url: input.fileUrl,
      design_json: input.designJson,
      owner_name: userName,
    })
    .select()
  if (error) throw new Error((error as { message?: string }).message || '保存模板失败')
  const row = Array.isArray(data) ? (data[0] as { id: number }) : null
  if (!row) throw new Error('保存模板失败')
  return row.id
}

export async function deleteUserTemplate(id: number): Promise<void> {
  await requireUserId()
  const { data, error } = await db.from('user_templates').delete().eq('id', id).select()
  if (error) throw new Error((error as { message?: string }).message || '删除模板失败')
  if (!Array.isArray(data) || data.length === 0) throw new Error('模板不存在或无权限删除')
}

/* ---------------- 电子请帖 ---------------- */

export interface PublishOptions {
  projectId: number
  title: string
  isPublic: boolean
  accessPassword?: string | null
  expiresAt?: string | null
  /** 分享卡片描述（Open Graph description）；省略则不改动 */
  description?: string | null
  /** 分享卡片封面图（data URL）；省略则不改动 */
  coverImage?: string | null
}

export async function publishInvitation(options: PublishOptions): Promise<InvitationRecord> {
  await requireUserId()
  const { userName } = await requireUserId()
  // 同一项目只保留一条邀请记录，重复点击 = 更新设置
  const { data: existing, error: exErr } = await db
    .from('invitations')
    .select('*')
    .eq('project_id', options.projectId)
    .maybeSingle()
  if (exErr) throw new Error((exErr as { message?: string }).message || '读取邀请记录失败')

  const payload: Record<string, unknown> = {
    title: options.title,
    is_public: options.isPublic,
    access_password: options.accessPassword || null,
    expires_at: options.expiresAt || null,
    owner_name: userName,
    updated_at: new Date().toISOString(),
  }
  // 仅在显式传入时写入分享元数据，避免旧调用方清空已存内容
  if (options.description !== undefined) payload.share_desc = options.description || null
  if (options.coverImage !== undefined) payload.cover_image = options.coverImage || null

  let row: Record<string, unknown> | null = null
  if (existing) {
    const { data, error } = await db
      .from('invitations')
      .update(payload)
      .eq('id', (existing as { id: number }).id)
      .select()
    if (error) throw new Error((error as { message?: string }).message || '更新邀请失败')
    row = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null
  } else {
    const { data, error } = await db
      .from('invitations')
      .insert({ ...payload, project_id: options.projectId, share_slug: slugId(8) })
      .select()
    if (error) throw new Error((error as { message?: string }).message || '生成邀请链接失败')
    row = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null
  }
  if (!row) throw new Error('生成邀请链接失败')
  return invitationFromRow(row)
}

function invitationFromRow(row: Record<string, unknown>): InvitationRecord {
  return {
    id: row.id as number,
    projectId: row.project_id as number,
    shareSlug: row.share_slug as string,
    title: row.title as string,
    shareDesc: (row.share_desc as string) ?? null,
    coverImage: (row.cover_image as string) ?? null,
    isPublic: row.is_public as boolean,
    accessPassword: (row.access_password as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    visitCount: (row.visit_count as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function listInvitations(): Promise<InvitationRecord[]> {
  await requireUserId()
  const { data, error } = await db.from('invitations').select('*').order('created_at', { ascending: false })
  if (error) throw new Error((error as { message?: string }).message || '读取邀请列表失败')
  return ((data ?? []) as Record<string, unknown>[]).map(invitationFromRow)
}

export async function getProjectInvitation(projectId: number): Promise<InvitationRecord | null> {
  await requireUserId()
  const { data, error } = await db
    .from('invitations')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw new Error((error as { message?: string }).message || '读取邀请失败')
  return data ? invitationFromRow(data as Record<string, unknown>) : null
}

/** 作品更新后，把最新设计同步到已发布的电子请帖（无需额外操作） */
async function syncPublishedInvitation(projectId: number): Promise<void> {
  try {
    await db
      .from('invitations')
      .update({ updated_at: new Date().toISOString() })
      .eq('project_id', projectId)
  } catch {
    /* 同步失败不影响保存本身 */
  }
}

export async function deleteInvitation(invitationId: number): Promise<void> {
  await requireUserId()
  const { data, error } = await db.from('invitations').delete().eq('id', invitationId).select()
  if (error) throw new Error((error as { message?: string }).message || '取消发布失败')
  if (!Array.isArray(data) || data.length === 0) throw new Error('邀请不存在或无权限删除')
}

/* ---------------- 公开读取（匿名可访问） ---------------- */

export interface PublicInvitation {
  id: number
  slug: string
  title: string
  isPublic: boolean
  expiresAt: string | null
  visitCount: number
  createdAt: string
  project: {
    id: number
    name: string
    category: EventCategory
    style: StyleTag
    orientation: Orientation
    canvasWidth: number
    canvasHeight: number
    background: BackgroundSpec
    eventInfo: EventInfo
    presentation: PresentationConfig
    thumbnail: string | null
  }
  elements: DesignElement[]
}

export async function fetchPublicInvitation(slug: string, code?: string): Promise<PublicInvitation | null> {
  const { data, error } = await db.rpc('get_invitation_public', {
    p_slug: slug,
    p_code: code ?? null,
  })
  if (error) {
    const e = error as { code?: string; message?: string }
    if (e.code === '42883' || e.code === '42P01') {
      // 函数尚未就绪
      throw new Error('电子请帖服务尚未就绪')
    }
    throw new Error(e.message || '读取请帖失败')
  }
  if (!data) return null
  // 兼容函数返回裸对象或单元素数组两种信封
  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>
  if (!raw || !raw.project) return null
  const p = raw.project as Record<string, unknown>
  return {
    id: raw.id as number,
    slug: raw.slug as string,
    title: raw.title as string,
    isPublic: raw.is_public as boolean,
    expiresAt: (raw.expires_at as string) ?? null,
    visitCount: (raw.visit_count as number) ?? 0,
    createdAt: raw.created_at as string,
    project: {
      id: p.id as number,
      name: p.name as string,
      category: p.category as EventCategory,
      style: p.style as StyleTag,
      orientation: p.orientation as Orientation,
      canvasWidth: p.canvas_width as number,
      canvasHeight: p.canvas_height as number,
      background: p.background as BackgroundSpec,
      eventInfo: p.event_info as EventInfo,
      presentation: normalizePresentation(
        (p.presentation as Record<string, unknown>) ?? null,
        p.category as EventCategory,
        p.style as StyleTag,
      ),
      thumbnail: (p.thumbnail as string) ?? null,
    },
    elements: ((raw.elements ?? []) as Record<string, unknown>[]).map((e) =>
      rowToElement({
        id: e.id as number,
        project_id: p.id as number,
        z_index: e.z_index as number,
        element_type: e.element_type as string,
        name: e.name as string | null,
        role: e.role as string | null,
        x: e.x as number,
        y: e.y as number,
        width: e.width as number,
        height: e.height as number,
        rotation: e.rotation as number,
        opacity: e.opacity as number,
        visible: e.visible as boolean,
        locked: e.locked as boolean,
        props: (e.props as Record<string, unknown>) ?? null,
      }),
    ),
  }
}

/** 记录一次访问（匿名可调用） */
export async function recordInvitationVisit(slug: string): Promise<void> {
  try {
    await db.rpc('record_invitation_visit', {
      p_slug: slug,
      p_ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : null,
    })
  } catch {
    /* 统计失败不影响浏览 */
  }
}

/* ---------------- RSVP ---------------- */

export async function submitGuestResponse(input: {
  slug: string
  guestName: string
  phone: string
  status: RsvpStatus
  partySize: number
  message: string
}): Promise<void> {
  // 先取邀请 id（公开函数），再写入反馈
  const inv = await fetchPublicInvitation(input.slug)
  if (!inv) throw new Error('请帖不存在或已过期')
  const phone = input.phone.trim()
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error('请填写正确的 11 位手机号')
  const { error } = await db.from('guest_responses').insert({
    invitation_id: inv.id,
    guest_name: input.guestName,
    phone,
    status: input.status,
    party_size: input.partySize,
    message: input.message || null,
  })
  if (error) throw new Error((error as { message?: string }).message || '提交回执失败')
}

export async function listGuestResponses(invitationId: number): Promise<GuestResponse[]> {
  await requireUserId()
  const { data, error } = await db
    .from('guest_responses')
    .select('id, invitation_id, guest_name, phone, status, party_size, message, created_at')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: false })
  if (error) throw new Error((error as { message?: string }).message || '读取宾客回执失败')
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    invitationId: r.invitation_id as number,
    guestName: r.guest_name as string,
    phone: (r.phone as string) ?? '',
    status: r.status as RsvpStatus,
    partySize: (r.party_size as number) ?? 1,
    message: (r.message as string) ?? '',
    createdAt: r.created_at as string,
  }))
}

export async function deleteGuestResponse(id: number): Promise<void> {
  await requireUserId()
  const { error } = await db.from('guest_responses').delete().eq('id', id)
  if (error) throw new Error((error as { message?: string }).message || '删除回执失败')
}

/* ---------------- 文件上传（模板 / 素材） ---------------- */

export async function uploadUserFile(file: File, folder: string): Promise<string> {
  const { userId } = await requireUserId()
  const safe = file.name.replace(/[^\w.\-]/g, '_').slice(-60)
  const path = cloud.storage.userPath(userId, `${folder}/${Date.now()}_${safe}`)
  const res = await cloud.storage.upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  })
  if (res.error) throw new Error((res.error as { message?: string }).message || '上传失败')
  return path
}

export async function signedFileUrl(path: string, ttl = 3600): Promise<string> {
  const res = await cloud.storage.createSignedUrl(path, ttl)
  if (res.error) throw new Error((res.error as { message?: string }).message || '获取文件链接失败')
  return res.data.signedUrl
}

export { cloudErrorMessage }
export type { Db }
