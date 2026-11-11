"""分享卡片（Open Graph）专项回归。

验证：
 1. 服务端为 /i/{slug} 输出 og:title / og:description / og:image / og:url（社交爬虫可抓取）
 2. og:image 走 /og/cover/{slug}.jpg，返回真实图片字节，且保留 sharecode
 3. 未知 slug 回退站点默认元数据
 4. 静态资源 / SPA 回退不受影响
 5. 路径式分享链接打开后转回 hash 路由，动态请帖页正常渲染（动画/音乐入口不变）
"""

import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:4199"
SLUG = "ogtest2026"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))
    print(("PASS" if ok else "FAIL"), "-", name, ("| " + str(detail)[:160]) if detail else "")


def fetch(path, timeout=15):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def wait_server(proc, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            status, _, _ = fetch("/", timeout=3)
            if status == 200:
                return True
        except Exception:
            pass
        if proc.poll() is not None:
            return False
        time.sleep(0.6)
    return False


def main():
    dist = os.path.join(ROOT, "dist", "index.html")
    if not os.path.exists(dist):
        print("dist/index.html 不存在，请先 npm run build")
        sys.exit(2)

    env = dict(os.environ)
    env["PORT"] = "4199"
    proc = subprocess.Popen(
        ["node", "server.mjs"],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        if not wait_server(proc):
            out = b""
            try:
                out = proc.communicate(timeout=3)[0] or b""
            except Exception:
                pass
            print("服务启动失败:", out.decode("utf-8", "ignore")[:500])
            sys.exit(2)

        # ---------- 1. OG 元数据服务端直出 ----------
        status, headers, body = fetch(f"/i/{SLUG}?sharecode=TESTCODE")
        html = body.decode("utf-8", "ignore")
        check("OG 页 200", status == 200, f"status={status}")
        check("og:title 输出请帖标题", 'property="og:title"' in html and "测试分享卡片" in html)
        check("og:description 输出描述文案", 'property="og:description"' in html and "点击查看精美电子请帖" in html)
        check(
            "og:image 指向封面端点并保留 sharecode",
            'property="og:image"' in html and f"/og/cover/{SLUG}.jpg?sharecode=TESTCODE" in html,
        )
        check("og:url 为分享链接", 'property="og:url"' in html and f"/i/{SLUG}" in html)
        check("twitter:card 大图卡片", 'name="twitter:card"' in html and "summary_large_image" in html)
        check("title 替换为请帖标题", "<title>测试分享卡片" in html.replace("｜", "｜"))
        check("无原始英文报错残留", "Failed to fetch" not in html)

        # sharecode 被平台门禁吃掉时，服务端应自动补回（爬虫独立请求封面仍可过门禁）
        status, _, body = fetch(f"/i/{SLUG}")
        html_nc = body.decode("utf-8", "ignore")
        check(
            "缺省 sharecode 自动补回（og:image 可过门禁）",
            status == 200 and "og:image" in html_nc and "sharecode=" in html_nc,
        )

        # ---------- 2. 封面图端点 ----------
        status, headers, body = fetch(f"/og/cover/{SLUG}.jpg?sharecode=TESTCODE")
        ctype = (headers.get("content-type") or headers.get("Content-Type") or "").lower()
        check("封面端点 200", status == 200, f"status={status}")
        check("封面 content-type 为图片", ctype.startswith("image/"), ctype)
        check(
            "封面字节为合法图片头",
            body[:8] == b"\x89PNG\r\n\x1a\n" or body[:3] == b"\xff\xd8\xff",
            body[:8].hex(),
        )

        # ---------- 3. 未知 slug 回退默认元数据 ----------
        status, _, body = fetch("/i/__no_such_slug__?sharecode=TESTCODE")
        html = body.decode("utf-8", "ignore")
        check("未知 slug 仍 200（SPA 回退）", status == 200, f"status={status}")
        check("未知 slug 回退站点默认 OG", "Invite Studio" in html and "og:begin" in html and "测试分享卡片" not in html)
        check("未知 slug 不带 og:image", 'property="og:image"' not in html)

        # ---------- 4. 静态服务不受影响 ----------
        status, _, body = fetch("/")
        html = body.decode("utf-8", "ignore")
        check("首页 200 且保留默认 OG 块", status == 200 and "og:begin" in html and "Invite Studio · AI" in html)
        check(
            "HTML 注入 app-sharecode 元数据（客户端补码用）",
            'name="app-sharecode"' in html and "KPH4FCS6UD" in html,
        )
        status, _, _ = fetch("/assets/definitely-missing-xyz.js")
        check("缺失静态资源 404", status == 404, f"status={status}")
        status, _, body = fetch("/some/spa/path")
        check("无扩展名路径 SPA 回退", status == 200 and b"og:begin" in body)

        # ---------- 5. 路径式链接 → hash 路由，动态请帖正常 ----------
        from playwright.sync_api import sync_playwright

        errors = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 390, "height": 844})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"{BASE}/i/{SLUG}?sharecode=TESTCODE", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(2500)
            url = page.url
            check("打开分享链接转回 hash 路由", f"#/i/{SLUG}" in url, url)
            body_text = page.inner_text("body")
            check(
                "动态请帖页正常渲染（RSVP/分享入口在）",
                any(k in body_text for k in ("回执", "出席", "分享", "邀请")),
                body_text[:120].replace("\n", " "),
            )
            check("页面无 JS 报错", len(errors) == 0, "; ".join(errors)[:200])
            page.screenshot(path=os.path.join(ROOT, "tests", "shots", "og-share-open.png"))
            browser.close()

        # ---------- 6. 爬虫视角：仅看 HTML 源码即含卡片元数据 ----------
        req = urllib.request.Request(
            BASE + f"/i/{SLUG}?sharecode=TESTCODE",
            headers={"User-Agent": "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode("utf-8", "ignore")
        check(
            "微信/QQ 类爬虫 UA 抓到卡片元数据（无需执行 JS）",
            "og:image" in raw and "og:title" in raw and "og:description" in raw,
        )
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()

    failed = [c for c in checks if not c[1]]
    print(f"\n== {len(checks) - len(failed)}/{len(checks)} 通过 ==")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
