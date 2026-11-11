/* ============================================================
 * 动画/音乐/动态方案 —— 用户资产状态（收藏/自定义素材/方案）
 * localStorage 持久化 + 可同步云端
 * ============================================================ */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DynamicThemeScheme, MusicTrack } from '@/types'

interface LibraryState {
  /** 收藏的动画 id */
  favAnimations: string[]
  /** 收藏的音乐 id */
  favMusic: string[]
  /** 收藏的方案 id */
  favSchemes: string[]
  /** 用户上传的音乐（元数据；audio_url 为 blob:/http:/builtin:） */
  userMusic: MusicTrack[]
  /** 用户保存的动态方案 */
  schemes: DynamicThemeScheme[]
  /** 用户偏好（AI 推荐参考） */
  preferences: {
    style: 'traditional' | 'minimal' | 'romantic' | ''
    motion: 'rich' | 'simple' | ''
    music: 'soft' | 'lively' | ''
  }
  toggleFavAnimation: (id: string) => void
  toggleFavMusic: (id: string) => void
  toggleFavScheme: (id: string) => void
  addUserMusic: (track: MusicTrack) => void
  removeUserMusic: (id: string) => void
  addScheme: (scheme: DynamicThemeScheme) => void
  removeScheme: (id: string) => void
  setPreferences: (p: Partial<LibraryState['preferences']>) => void
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      favAnimations: [],
      favMusic: [],
      favSchemes: [],
      userMusic: [],
      schemes: [],
      preferences: { style: '', motion: '', music: '' },
      toggleFavAnimation: (id) => set((s) => ({ favAnimations: toggle(s.favAnimations, id) })),
      toggleFavMusic: (id) => set((s) => ({ favMusic: toggle(s.favMusic, id) })),
      toggleFavScheme: (id) => set((s) => ({ favSchemes: toggle(s.favSchemes, id) })),
      addUserMusic: (track) => set((s) => ({ userMusic: [track, ...s.userMusic.filter((m) => m.music_id !== track.music_id)] })),
      removeUserMusic: (id) => set((s) => ({ userMusic: s.userMusic.filter((m) => m.music_id !== id), favMusic: s.favMusic.filter((m) => m !== id) })),
      addScheme: (scheme) => set((s) => ({ schemes: [scheme, ...s.schemes.filter((x) => x.id !== scheme.id)] })),
      removeScheme: (id) => set((s) => ({ schemes: s.schemes.filter((x) => x.id !== id), favSchemes: s.favSchemes.filter((x) => x !== id) })),
      setPreferences: (p) => set((s) => ({ preferences: { ...s.preferences, ...p } })),
    }),
    { name: 'invite-library-v1' },
  ),
)
