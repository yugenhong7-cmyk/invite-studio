# -*- coding: utf-8 -*-
"""
导入修复回归测试：
1. 链接导入：直连 / CORS 中转回退 / og:image 提取 / 魔数嗅探 / 全失败友好报错
2. 图片导入可编辑：designFromAsset 产出可编辑图层、unlockBackgroundImage 迁移旧背景
3. 大图（5.5MB）经 IndexedDB 手递手打开编辑器，图片图层可选中编辑（不再 QuotaExceededError）
"""
import base64
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("HOST", "http://127.0.0.1:5173")
OUT = os.path.join(os.path.dirname(__file__), "shots")
FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "big-invite.png")
os.makedirs(OUT, exist_ok=True)

results = []


def check(name, ok, extra=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + ((" | " + extra) if extra else ""))


def main():
    # 1x1 PNG（小图，用于中转/嗅探测试）
    tiny_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    with open(FIXTURE, "rb") as f:
        big_png = f.read()
    big_data_url = "data:image/png;base64," + base64.b64encode(big_png).decode()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 960}, locale="zh-CN")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))

        # ---- 网络模拟：直连全部 abort（模拟跨域被拦），中转可控返回 ----
        proxy_calls = {"allorigins": 0, "corsproxy": 0}
        blocked = {"enabled": True}

        def route_blocked(route):
            if blocked["enabled"]:
                route.abort()
            else:
                route.continue_()

        def route_allorigins(route):
            proxy_calls["allorigins"] += 1
            url = route.request.url
            if "og-page" in url:
                route.fulfill(
                    status=200,
                    headers={"access-control-allow-origin": "*", "content-type": "text/html; charset=utf-8"},
                    body=(
                        '<html><head><meta property="og:image" content="/preview.png">'
                        "<title>t</title></head><body>x</body></html>"
                    ),
                )
            elif "octet" in url:
                route.fulfill(
                    status=200,
                    headers={"access-control-allow-origin": "*", "content-type": "application/octet-stream"},
                    body=tiny_png,
                )
            elif "preview.png" in url:
                route.fulfill(
                    status=200,
                    headers={"access-control-allow-origin": "*", "content-type": "image/png"},
                    body=tiny_png,
                )
            else:
                route.fulfill(
                    status=200,
                    headers={"access-control-allow-origin": "*", "content-type": "image/png"},
                    body=tiny_png,
                )

        def route_corsproxy(route):
            proxy_calls["corsproxy"] += 1
            route.fulfill(
                status=200,
                headers={"access-control-allow-origin": "*", "content-type": "image/png"},
                body=tiny_png,
            )

        page.route("https://blocked.example/**", route_blocked)
        page.route("https://site.example/**", route_blocked)
        page.route("https://api.allorigins.win/**", route_allorigins)
        page.route("https://corsproxy.io/**", route_corsproxy)

        page.goto(BASE + "/#/", wait_until="networkidle", timeout=45000)

        # ============ 1. importFromUrl 行为测试（页面内动态调用模块） ============
        def run_import(url):
            return page.evaluate(
                """async (url) => {
                    const m = await import('/src/lib/import.ts')
                    try {
                        const asset = await m.importFromUrl(url)
                        return { ok: true, format: asset.format, name: asset.name, w: asset.width, h: asset.height,
                                 dataHead: asset.dataUrl.slice(0, 22) }
                    } catch (e) {
                        return { ok: false, message: String(e && e.message || e) }
                    }
                }""",
                url,
            )

        # 1a. 同源直连成功（dev 服务器上的 SVG 贴纸）
        r = run_import(BASE + "/stickers/deco-arch.svg")
        check("同源直连导入 SVG 成功", r.get("ok") and r.get("format") == "svg", str(r)[:160])

        # 1b. 直连被拦 → allorigins 中转回退成功
        proxy_calls["allorigins"] = 0
        r = run_import("https://blocked.example/template.png")
        check(
            "CORS 被拦后中转回退导入成功",
            r.get("ok") and r.get("format") == "png" and proxy_calls["allorigins"] >= 1,
            f"result={str(r)[:120]} allorigins={proxy_calls['allorigins']}",
        )

        # 1c. 魔数嗅探：无扩展名 + octet-stream 也能识别 PNG
        r = run_import("https://blocked.example/octet")
        check("魔数嗅探识别 PNG（无扩展名/octet-stream）", r.get("ok") and r.get("format") == "png", str(r)[:160])

        # 1d. 网页链接提取 og:image
        r = run_import("https://site.example/og-page")
        check(
            "网页链接 og:image 提取导入成功",
            r.get("ok") and r.get("format") == "png" and "preview" in (r.get("name") or ""),
            str(r)[:160],
        )

        # 1e. 全部失败 → 友好错误（不是 Failed to fetch）
        blocked["enabled"] = True
        page.route("https://api.allorigins.win/**", lambda route: route.abort())
        page.route("https://corsproxy.io/**", lambda route: route.abort())
        r = run_import("https://blocked.example/all-fail.png")
        msg = r.get("message", "")
        check(
            "抓取失败报错友好（含下载引导，非 Failed to fetch）",
            (not r.get("ok")) and ("无法获取该链接" in msg) and ("Failed to fetch" not in msg),
            msg[:160],
        )
        # 恢复中转
        page.route("https://api.allorigins.win/**", route_allorigins)
        page.route("https://corsproxy.io/**", route_corsproxy)

        # ============ 2. 图片可编辑结构测试 ============
        r = page.evaluate(
            """async (dataUrl) => {
                const m = await import('/src/lib/import.ts')
                const img = await new Promise((res, rej) => {
                    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl
                })
                const asset = { dataUrl, width: img.naturalWidth, height: img.naturalHeight, format: 'png', name: 't' }
                const doc = m.designFromAsset(asset)
                const oldDoc = {
                    ...doc,
                    canvas: { ...doc.canvas, background: { type: 'image', imageSrc: dataUrl, imageFit: 'cover', opacity: 1 } },
                    elements: [],
                }
                const migrated = await m.unlockBackgroundImage(oldDoc)
                return {
                    bgType: doc.canvas.background.type,
                    firstEl: doc.elements[0] ? doc.elements[0].type : null,
                    firstLocked: doc.elements[0] ? doc.elements[0].locked : null,
                    migratedBg: migrated.canvas.background.type,
                    migratedFirst: migrated.elements[0] ? migrated.elements[0].type : null,
                    migratedCount: migrated.elements.length,
                }
            }""",
            big_data_url,
        )
        check("导入图产出可编辑图片图层（非锁死背景）", r.get("bgType") == "color" and r.get("firstEl") == "image" and r.get("firstLocked") is False, str(r))
        check("旧背景图迁移为可编辑图层", r.get("migratedBg") == "color" and r.get("migratedFirst") == "image" and r.get("migratedCount") >= 1, str(r))

        # ============ 3. 大图手递手 → 编辑器可编辑（原 QuotaExceededError 场景） ============
        handoff_err = page.evaluate(
            """async (dataUrl) => {
                const imp = await import('/src/lib/import.ts')
                const ho = await import('/src/lib/handoff.ts')
                const img = await new Promise((res, rej) => {
                    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl
                })
                const asset = { dataUrl, width: img.naturalWidth, height: img.naturalHeight, format: 'png', name: '大图测试' }
                const doc = imp.designFromAsset(asset)
                try {
                    await ho.setHandoff(ho.OPEN_DOC_KEY, doc)
                    return { ok: true, sizeMb: Math.round(dataUrl.length / 1048576 * 100) / 100 }
                } catch (e) {
                    return { ok: false, message: String(e && e.message || e) }
                }
            }""",
            big_data_url,
        )
        check("大图经 IndexedDB 手递手写入成功（无 QuotaExceededError）", handoff_err.get("ok"), str(handoff_err))

        page.goto(BASE + "/#/editor", wait_until="networkidle", timeout=60000)
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(2500)
        body = page.inner_text("body")
        check("编辑器打开大图模板成功", "正在准备编辑器" not in body, body[:80].replace("\n", " "))

        # 点击画布中心 → 应选中图片图层 → 右侧出现图片属性（圆角/翻转）
        canvas_el = page.locator("canvas").first
        box = canvas_el.bounding_box()
        if box:
            page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            page.wait_for_timeout(800)
        body = page.inner_text("body")
        check("图片图层可选中（右侧面板出现图片属性）", ("圆角" in body and "翻转" in body), "圆角=%s 翻转=%s" % ("圆角" in body, "翻转" in body))
        page.screenshot(path=os.path.join(OUT, "import-fix-editor-selected.png"))

        # ============ 4. 旧 sessionStorage 小图兼容路径 ============
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=30000)
        small_doc = page.evaluate(
            """async () => {
                const imp = await import('/src/lib/import.ts')
                const m = await import('/src/lib/design.ts')
                return m.createDesign({ name: '兼容测试', category: 'other', style: 'modern', orientation: 'portrait' })
            }"""
        )
        page.evaluate(
            "(doc) => sessionStorage.setItem('invite-studio:open-doc', JSON.stringify(doc))",
            small_doc,
        )
        page.goto(BASE + "/#/editor", wait_until="networkidle", timeout=45000)
        page.wait_for_selector("canvas", timeout=15000)
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        check("旧 sessionStorage 传参兼容可用", "正在准备编辑器" not in body, body[:60].replace("\n", " "))

        check("全程无页面 JS 错误", len(errors) == 0, "; ".join(errors[:3]))
        browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\n== {passed}/{len(results)} 通过 ==")
    if passed != len(results):
        for name, ok in results:
            if not ok:
                print("FAILED:", name)
        sys.exit(1)


if __name__ == "__main__":
    main()
