/** 稳定的本地 ID 生成器（元素 / 项目 / 会话） */
let counter = 0

export function uid(prefix = 'el'): string {
  counter = (counter + 1) % 1_000_000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(3, '0')}${rand}`
}

/** 生成分享用的短 slug（8 位，URL 安全） */
export function slugId(len = 8): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(len)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length]
    return out
  }
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
