import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'

/* ============================================================
 * 大文档手递手（页面间跳转传递 DesignDoc）
 * 为什么不用 sessionStorage：高清请帖图的 data URL 动辄 5MB+，
 * 写入 sessionStorage 会抛 QuotaExceededError，导致「使用模板」
 * 点了没反应。IndexedDB 容量大且支持结构化克隆，内存 Map 做
 * 同标签页快速路径，两者都失败时退化为内存传递。
 * ============================================================ */

export const OPEN_DOC_KEY = 'invite-studio:open-doc'
export const OPEN_PROJECT_KEY = 'invite-studio:open-project'

const mem = new Map<string, unknown>()

export async function setHandoff(key: string, value: unknown): Promise<void> {
  mem.set(key, value)
  try {
    await idbSet(key, value)
  } catch {
    /* IndexedDB 不可用（隐私模式等）时仅用内存 */
  }
}

export async function takeHandoff<T>(key: string): Promise<T | null> {
  const cached = mem.get(key)
  if (cached !== undefined) {
    mem.delete(key)
    void idbDel(key).catch(() => {})
    return cached as T
  }
  try {
    const stored = await idbGet(key)
    if (stored !== undefined) {
      await idbDel(key).catch(() => {})
      return stored as T
    }
  } catch {
    /* 忽略 */
  }
  return null
}
