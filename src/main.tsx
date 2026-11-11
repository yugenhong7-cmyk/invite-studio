import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { useApp } from './store/app'

/**
 * 路径式分享链接（/i/{slug}）→ hash 路由（#/i/{slug}）。
 * 分享链接用路径形式让服务端能注入 Open Graph 元数据（社交平台分享卡片）；
 * 进入应用后转回 hash 路由，动态请帖的动画/音乐/交互逻辑保持不变。
 * 返回 true 表示已发起跳转，调用方应跳过渲染。
 */
function normalizeSharePath(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname, search, hash } = window.location
  if (hash) return false
  const m = pathname.match(/^(.*)\/i\/([^/]+)\/?$/)
  if (!m) return false
  const base = m[1].replace(/index\.html$/, '') || ''
  window.location.replace(`${base}/${search}#/i/${m[2]}`)
  return true
}

const redirected = normalizeSharePath()

/** 等待中文字体就绪，保证画布文字与导出图片字形正确 */
async function ensureFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  const families = [
    'Noto Serif SC',
    'Noto Sans SC',
    'Ma Shan Zheng',
    'ZCOOL XiaoWei',
    'ZCOOL QingKe HuangYou',
    'Long Cang',
  ]
  try {
    await Promise.all(
      families.map((f) =>
        Promise.all([
          document.fonts.load(`400 40px "${f}"`),
          document.fonts.load(`700 40px "${f}"`),
        ]),
      ),
    )
    await document.fonts.ready
  } catch {
    /* 字体加载失败时回退到系统字体 */
  }
}

void ensureFonts()
void useApp.getState().init()

if (!redirected) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  )
}
