/**
 * 分享链接工具
 *
 * 发布站点带 `?sharecode=` 访问门禁：链接缺码时（无 cookie 的宾客 / 微信爬虫）一律 403，
 * 聊天里只剩裸链接、也抓不到 Open Graph 分享卡片。用户自己的浏览器往往凭
 * __wb_rsc cookie 进站，此时地址栏没有 sharecode，直接复制 location.search
 * 就会生成坏链接 —— 因此所有分享链接出口都必须经过 withShareCode 补码。
 */

/** 与服务端 server.mjs 的 PUBLIC_SHARE_CODE 同值（随部署一起更新） */
const FALLBACK_SHARE_CODE = 'KPH4FCS6UD'

function currentShareCode(): string {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="app-sharecode"]')?.getAttribute('content')?.trim()
    if (meta) return meta
  }
  return FALLBACK_SHARE_CODE
}

/** 保证分享 URL 携带站点访问码；已有则原样保留 */
export function withShareCode(url: string): string {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (!u.searchParams.get('sharecode')) u.searchParams.set('sharecode', currentShareCode())
    return u.toString()
  } catch {
    return url
  }
}
