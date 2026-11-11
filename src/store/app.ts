import { create } from 'zustand'
import type { CloudSession, CloudUser } from '@tencent-ai/workbuddy-cloud-sdk'
import { cloud, cloudErrorMessage } from '@/lib/cloud'
import { uid } from '@/lib/id'
import type { ToastMessage } from '@/types'

/* ---------------- 提示条 ---------------- */

interface ToastState {
  toasts: ToastMessage[]
  push: (type: ToastMessage['type'], text: string) => void
  dismiss: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (type, text) => {
    const id = uid('t')
    set((s) => ({ toasts: [...s.toasts, { id, type, text }].slice(-4) }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, type === 'error' ? 6000 : 3600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(type: ToastMessage['type'], text: string) {
  useToast.getState().push(type, text)
}

/* ---------------- 用户 / 认证 ---------------- */

export type AuthView = 'phone' | 'email' | 'wechat' | 'workbuddy'

interface AppState {
  ready: boolean
  session: CloudSession | null
  user: CloudUser | null
  authError: string
  init: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  session: null,
  user: null,
  authError: '',

  init: async () => {
    if (get().ready) return

    // OAuth 回调必须在任何路由守卫之前处理（code 是一次性的）
    try {
      const url = new URL(location.href)
      const hasCallback = url.searchParams.has('code') || url.searchParams.has('error')
      if (hasCallback) {
        const provider = url.searchParams.get('provider')
        if (provider === 'workbuddy' || provider === 'wechat') {
          const handler =
            provider === 'workbuddy'
              ? (cloud.auth as unknown as { handleWorkBuddyCallback?: () => Promise<{ data: CloudSession | null; error: unknown }> }).handleWorkBuddyCallback
              : (cloud.auth as unknown as { handleWechatWebCallback?: () => Promise<{ data: CloudSession | null; error: unknown }> }).handleWechatWebCallback
          if (typeof handler === 'function') {
            const res = await handler.call(cloud.auth)
            if (res.error) {
              set({ ready: true, authError: cloudErrorMessage(res.error, '授权登录失败') })
            } else if (res.data) {
              for (const key of ['code', 'state', 'provider']) url.searchParams.delete(key)
              history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
              set({ session: res.data, user: res.data.user, ready: true })
            } else {
              set({ ready: true })
            }
          } else {
            set({ ready: true, authError: '当前 SDK 不支持该登录方式' })
          }
        } else {
          set({ ready: true, authError: '授权回调缺少有效的登录方式，请重新登录。' })
        }
      } else {
        const { data } = await cloud.auth.getSession()
        set({ session: data ?? null, user: data?.user ?? null, ready: true })
      }
    } catch (e) {
      set({ ready: true, authError: cloudErrorMessage(e, '会话恢复失败') })
    }

    cloud.auth.onAuthStateChange((_event, session) => {
      set({ session: session ?? null, user: session?.user ?? null })
    })
  },

  signOut: async () => {
    try {
      await cloud.auth.signOut()
    } catch {
      /* 即使请求失败也在本地登出 */
    }
    set({ session: null, user: null })
  },

  refresh: async () => {
    try {
      const { data } = await cloud.auth.getSession()
      set({ session: data ?? null, user: data?.user ?? null })
    } catch (e) {
      set({ authError: cloudErrorMessage(e) })
    }
  },
}))
