import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

/**
 * 云服务公开配置 —— 唯一来源是 workbuddy_cloud_service activate 返回的 publicConfig。
 * 只包含可安全下发到浏览器的值；底层环境 id 与服务商密钥始终留在服务端。
 */
export const publicConfig = {
  resourceId: 'wbcs_m3Bw0wslY5iLq1EAvw2RlI',
  endpoint: 'https://invite-studio-08506.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_cR9Va9NT9DQl2raJgliVy9_DJ8J2rti0mosMOwatW4qQa3Dx4fyz2ph',
} as const

/** 全局唯一云客户端：数据库 / 认证 / 存储 / LLM 共用同一实例 */
export const cloud = createWorkBuddyCloud({
  endpoint: publicConfig.endpoint,
  oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
  publishableKey: publicConfig.publishableKey,
})

/** 解开 { data, error } 信封，出错即抛 */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) {
    const err = res.error as { message?: string; code?: string; kind?: string }
    const message = err?.message || '云端请求失败'
    const e = new Error(message) as Error & { code?: string; kind?: string }
    e.code = err?.code
    e.kind = err?.kind
    throw e
  }
  return res.data
}

/** 人类可读的云错误提示 */
export function cloudErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!error) return fallback
  const e = error as { message?: string; code?: string; kind?: string }
  const code = e?.code || ''
  const kind = e?.kind || ''
  if (kind === 'unauthenticated' || code === 'unauthenticated') return '请先登录后再操作'
  if (code.startsWith('quota_')) return '云端额度暂时不足，请稍后重试'
  if (code.startsWith('auth_')) return '云端凭证或访问域名校验未通过（请在已发布的站点域名下使用云端功能）'
  if (code.startsWith('gateway_') || code.startsWith('model_')) return 'AI 服务暂时不可用，请稍后重试'
  return e?.message || fallback
}
