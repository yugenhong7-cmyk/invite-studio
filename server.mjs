/**
 * Invite Studio 生产服务
 *
 * 职责（在 vite preview 静态服务之上，仅新增分享卡片支持）：
 *  1. 静态托管 dist/（与 vite preview 语义一致：带扩展名缺文件→404，其余→index.html）
 *  2. GET /i/{slug} —— 按请帖注入 Open Graph 元数据（og:title/description/image/url）
 *     社交平台爬虫不执行 JS，必须由服务端直出；页面加载后由入口脚本转回 hash 路由，
 *     动态请帖的动画 / 音乐 / 交互完全不受影响。
 *  3. GET /og/cover/{slug}.jpg —— 分享卡片封面图（发布时渲染并存库的请帖封面）
 *
 * 云端数据面只读调用 get_invitation_share_meta（匿名可访问的 SECURITY DEFINER 函数）。
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 4173
const CLOUD_ENDPOINT = (
  process.env.CLOUD_ENDPOINT || 'https://invite-studio-08506.app.workbuddy.host'
).replace(/\/$/, '')
const PUBLISHABLE_KEY =
  process.env.PUBLISHABLE_KEY ||
  'wbpk_cR9Va9NT9DQl2raJgliVy9_DJ8J2rti0mosMOwatW4qQa3Dx4fyz2ph'
/**
 * 对外公开的稳定站点地址。平台反代会把 Host 改写成内部沙箱域名（对外不可用），
 * og:url / og:image 必须用公开域名，社交平台爬虫才能取到。
 */
const DEFAULT_PUBLIC_BASE = (
  process.env.PUBLIC_BASE_URL || 'https://invite-studio-08506.app.workbuddy.host'
).replace(/\/$/, '')
/**
 * 站点访问码（sharecode）。平台门禁校验后会从转发给应用的查询串里吃掉该参数，
 * 但爬虫抓取 og:image 时是独立请求，仍需带码才能过门禁 —— 这里自动补回。
 * 访问码本就随分享链接公开给宾客，不属于机密；如后台更换访问码，用 PUBLIC_SHARE_CODE 更新。
 */
const DEFAULT_SHARE_CODE = process.env.PUBLIC_SHARE_CODE || 'KPH4FCS6UD'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
}

/* ---------------- 分享元数据（内存缓存） ---------------- */

/** slug -> { meta, ts } */
const metaCache = new Map()
/** slug -> Promise<meta>（并发去重） */
const inflight = new Map()
const META_TTL_MS = 60_000

async function fetchShareMeta(slug) {
  const hit = metaCache.get(slug)
  if (hit && Date.now() - hit.ts < META_TTL_MS) return hit.meta
  const pending = inflight.get(slug)
  if (pending) return pending
  const task = (async () => {
    try {
      const res = await fetch(`${CLOUD_ENDPOINT}/.cloud/database/rest/rpc/get_invitation_share_meta`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-wb-webapp-access-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ p_slug: slug }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const row = await res.json()
      const meta = row && typeof row === 'object' && row.slug ? row : null
      metaCache.set(slug, { meta, ts: Date.now() })
      // 缓存上限，防止内存无界增长
      if (metaCache.size > 2000) {
        const oldest = metaCache.keys().next().value
        if (oldest !== undefined) metaCache.delete(oldest)
      }
      return meta
    } catch {
      return null
    } finally {
      inflight.delete(slug)
    }
  })()
  inflight.set(slug, task)
  return task
}

/* ---------------- OG 注入 ---------------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function publicBase(req) {
  if (process.env.PUBLIC_BASE_URL) return DEFAULT_PUBLIC_BASE
  const hostHdr = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
  // 反代改写的内部沙箱域名对外不可用 → 回退稳定公开域名
  if (!hostHdr || /sandbox|cloudstudio|\.e2b\.|\.internal/i.test(hostHdr)) {
    return DEFAULT_PUBLIC_BASE
  }
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http'
  return `${proto}://${hostHdr}`
}

/** 补回被门禁吃掉的 sharecode，保证 og:image / og:url 对爬虫可访问 */
function withShareCode(search) {
  const q = new URLSearchParams(search || '')
  if (!q.get('sharecode') && DEFAULT_SHARE_CODE) q.set('sharecode', DEFAULT_SHARE_CODE)
  const s = q.toString()
  return s ? `?${s}` : ''
}

function buildOgBlock(meta, baseUrl, coverUrl) {
  const title = meta?.title || '电子请帖'
  const desc =
    meta?.description || `诚挚邀请您参加${title}，点击查看精美电子请帖`
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Invite Studio" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(desc)}" />`,
    `<meta property="og:url" content="${escapeHtml(baseUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(desc)}" />`,
  ]
  if (coverUrl) {
    const coverMime = /^data:image\/(png|webp|gif)/i.exec(String(meta?.cover_image || ''))?.[1]
    const imageType = coverMime ? `image/${coverMime.toLowerCase()}` : 'image/jpeg'
    tags.push(`<meta property="og:image" content="${escapeHtml(coverUrl)}" />`)
    tags.push(`<meta name="twitter:image" content="${escapeHtml(coverUrl)}" />`)
    tags.push(`<meta property="og:image:secure_url" content="${escapeHtml(coverUrl)}" />`)
    tags.push(`<meta property="og:image:type" content="${imageType}" />`)
  }
  return tags.join('\n    ')
}

function injectOg(html, { title, ogBlock }) {
  const t = escapeHtml(title)
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
  out = out.replace(
    /<!-- og:begin -->[\s\S]*?<!-- og:end -->/i,
    `<!-- og:begin -->\n    ${ogBlock}\n    <!-- og:end -->`,
  )
  return out
}

/**
 * 注入 app-sharecode 元数据：客户端凭 cookie 进站时地址栏没有 sharecode，
 * 生成分享链接时从这里取码补回（否则宾客/爬虫 403）。
 */
function injectShareCodeMeta(html) {
  if (!DEFAULT_SHARE_CODE || /name="app-sharecode"/i.test(html)) return html
  return html.replace(/<\/head>/i, `    <meta name="app-sharecode" content="${escapeHtml(DEFAULT_SHARE_CODE)}" />\n  </head>`)
}

/* ---------------- HTTP ---------------- */

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'cache-control': 'no-store', ...headers })
  res.end(body)
}

function safeJoin(dist, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const full = path.normalize(path.join(dist, decoded))
  return full.startsWith(dist) ? full : null
}

async function handleInviteOg(req, res, slug, search) {
  const meta = await fetchShareMeta(slug)
  const base = publicBase(req)
  const searchQ = withShareCode(search)
  const pageUrl = `${base}/i/${slug}${searchQ}`
  // 仅在确有封面时才输出 og:image —— 指向 404 的 og:image 会让微信/QQ 整卡不出图
  const coverUrl = meta?.cover_image ? `${base}/og/cover/${slug}.jpg${searchQ}` : ''
  const ogBlock = buildOgBlock(meta, pageUrl, coverUrl)
  const htmlPath = path.join(DIST, 'index.html')
  let html
  try {
    html = await fs.promises.readFile(htmlPath, 'utf8')
  } catch {
    send(res, 500, 'index.html missing')
    return
  }
  const out = injectShareCodeMeta(injectOg(html, { title: meta?.title || '电子请帖 · Invite Studio', ogBlock }))
  send(res, 200, out, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  })
}

async function handleCover(res, slug) {
  const meta = await fetchShareMeta(slug)
  const cover = meta?.cover_image
  if (!cover) {
    send(res, 404, 'cover not found')
    return
  }
  if (/^https?:\/\//i.test(cover)) {
    res.writeHead(302, { location: cover, 'cache-control': 'public, max-age=3600' })
    res.end()
    return
  }
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(cover)
  let buf
  if (m) {
    if (!m[2]) {
      buf = Buffer.from(decodeURIComponent(m[3]), 'utf8')
    } else {
      buf = Buffer.from(m[3], 'base64')
    }
  } else {
    buf = Buffer.from(cover, 'base64')
  }
  if (!buf.length) {
    send(res, 500, 'cover decode failed')
    return
  }
  const type = m?.[1] && m[1] !== 'application/octet-stream' ? m[1] : 'image/jpeg'
  send(res, 200, buf, {
    'content-type': type,
    'cache-control': 'public, max-age=86400',
    'content-length': String(buf.length),
  })
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'method not allowed')
      return
    }

    // 分享卡片封面
    const coverMatch = pathname.match(/^\/og\/cover\/([A-Za-z0-9_-]+)\.jpg$/)
    if (coverMatch) {
      await handleCover(res, coverMatch[1])
      return
    }

    // 请帖分享链接（路径式）→ 注入 OG
    const inviteMatch = pathname.match(/^\/i\/([A-Za-z0-9_-]+)\/?$/)
    if (inviteMatch) {
      await handleInviteOg(req, res, inviteMatch[1], url.search)
      return
    }

    // 静态资源
    const filePath = safeJoin(DIST, pathname)
    if (filePath) {
      let stat = null
      try {
        stat = await fs.promises.stat(filePath)
      } catch {
        stat = null
      }
      if (stat?.isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        if (ext === '.html') {
          // HTML 需注入 app-sharecode 元数据 → 读入内存后发送
          try {
            const html = await fs.promises.readFile(filePath, 'utf8')
            send(res, 200, injectShareCodeMeta(html), {
              'content-type': MIME[ext] || 'text/html; charset=utf-8',
              'cache-control': 'no-store',
            })
          } catch {
            send(res, 404, 'not found')
          }
          return
        }
        const headers = {
          'content-type': MIME[ext] || 'application/octet-stream',
          'content-length': String(stat.size),
        }
        if (pathname.startsWith('/assets/')) {
          headers['cache-control'] = 'public, max-age=31536000, immutable'
        } else {
          headers['cache-control'] = 'public, max-age=3600'
        }
        res.writeHead(200, headers)
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }

    // SPA 回退：无扩展名路径 → index.html（与 vite preview 语义一致）
    const ext = path.extname(pathname)
    if (!ext || ext === '.html') {
      const htmlPath = path.join(DIST, 'index.html')
      try {
        const html = await fs.promises.readFile(htmlPath, 'utf8')
        send(res, 200, injectShareCodeMeta(html), {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        })
        return
      } catch {
        /* fallthrough to 404 */
      }
    }
    send(res, 404, 'not found')
  } catch (e) {
    send(res, 500, `server error: ${e instanceof Error ? e.message : 'unknown'}`)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[invite-studio] serving dist/ on http://0.0.0.0:${PORT}`)
})
