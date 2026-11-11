# -*- coding: utf-8 -*-
"""分享链路专项回归（画布产出一致性 + 分享链接/封面）：
1. withShareCode：缺码补全、带码保留（凭 cookie 进站时复制的链接不再缺码 → 不再 403/裸链接）
2. DesignLayers 与画布渲染对齐：图片 objectFit=fill（与 fabric 拉伸一致）、形状阴影、描边几何
3. exportDesignToDataUrl 离屏导出可用（封面渲染链路）
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")

PASSED = 0
FAILED = []


def check(name, ok, detail=""):
    global PASSED
    if ok:
        PASSED += 1
        print(f"PASS {name}" + (f" | {detail}" if detail else ""))
    else:
        FAILED.append(name)
        print(f"FAIL {name} | {detail}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=45000)

        # ============ 1. withShareCode ============
        r = page.evaluate(
            """async () => {
                const { withShareCode } = await import('/src/lib/share.ts')
                return {
                    missing: withShareCode('https://x.example/i/abc'),
                    kept: withShareCode('https://x.example/i/abc?sharecode=KEEPME&other=1'),
                    noOrigin: withShareCode('/i/abc'),
                }
            }"""
        )
        check(
            "缺码链接自动补 sharecode",
            "sharecode=KPH4FCS6UD" in r["missing"] and r["missing"].endswith("sharecode=KPH4FCS6UD"),
            r["missing"],
        )
        check(
            "已带码链接保留原码不重复",
            "sharecode=KEEPME" in r["kept"] and r["kept"].count("sharecode=") == 1 and "other=1" in r["kept"],
            r["kept"],
        )
        check("相对地址可补码", "sharecode=" in r["noOrigin"], r["noOrigin"])

        # ============ 2. DesignLayers 与画布渲染对齐 ============
        r = page.evaluate(
            """async () => {
                const { mountDesignLayers } = await import('/src/lib/design-layers-mount.ts')
                const { defaultPresentation } = await import('/src/lib/presentation.ts')
                const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
                const doc = {
                    id: 't', name: 't', category: 'other', style: 'modern', orientation: 'portrait',
                    canvas: { width: 1080, height: 1920, background: { type: 'color', color: '#FFFFFF', opacity: 1 } },
                    elements: [
                        { id: 'img1', type: 'image', name: 'im', x: 0, y: 0, width: 300, height: 200, rotation: 0, opacity: 1, visible: true, locked: false, src: tinyPng, borderRadius: 0, stroke: '', strokeWidth: 0, flipX: false, flipY: false },
                        { id: 'sh1', type: 'shape', name: 'shadow-shape', x: 10, y: 10, width: 200, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, shape: 'rect', fill: '#FFC100', stroke: '', strokeWidth: 0, radius: 0, shadow: { enabled: true, color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 2, offsetY: 3 } },
                        { id: 'sh2', type: 'shape', name: 'stroke-shape', x: 10, y: 100, width: 200, height: 60, rotation: 0, opacity: 1, visible: true, locked: false, shape: 'rect', fill: '#22201E', stroke: '#C9A227', strokeWidth: 4, radius: 0 },
                    ],
                    eventInfo: { eventName: '', eventType: 'other', hostName: '', guestName: '', date: '', time: '', venue: '', address: '', phone: '', note: '' },
                    presentation: defaultPresentation(),
                    createdAt: '', updatedAt: '',
                }
                const host = document.createElement('div')
                document.body.appendChild(host)
                const mounted = await mountDesignLayers(host, doc, doc.presentation, 320)
                const img = host.querySelector('img')
                const svgs = Array.from(host.querySelectorAll('svg'))
                const shadowSvg = svgs[0]
                const strokeRect = svgs[1] ? svgs[1].querySelector('rect') : null
                const out = {
                    objectFit: img ? img.style.objectFit : null,
                    shadowFilter: shadowSvg ? (shadowSvg.style.filter || '') : null,
                    strokeRectX: strokeRect ? strokeRect.getAttribute('x') : null,
                    strokeRectW: strokeRect ? strokeRect.getAttribute('width') : null,
                }
                mounted.unmount()
                host.remove()
                return out
            }"""
        )
        check("图片 objectFit=fill（与画布拉伸一致）", r["objectFit"] == "fill", str(r["objectFit"]))
        check(
            "形状阴影渲染（drop-shadow）",
            "drop-shadow" in (r["shadowFilter"] or ""),
            r["shadowFilter"],
        )
        check(
            "描边几何与画布一致（不缩进）",
            r["strokeRectX"] == "0" and r["strokeRectW"] == "200",
            f"x={r['strokeRectX']} w={r['strokeRectW']}",
        )

        # ============ 3. 导出链路（封面渲染同一链路） ============
        r = page.evaluate(
            """async () => {
                const imp = await import('/src/lib/import.ts')
                const fs = await import('/src/lib/fabric-sync.ts')
                const slide = {
                    width: 720, height: 1280,
                    background: '#FFF8F0',
                    texts: [{ text: '导出测试', x: 100, y: 100, width: 500, height: 120, fontSize: 60, fill: '#C41E1E', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center' }],
                    images: [], shapes: [],
                }
                const asset = { dataUrl: '', width: 720, height: 1280, format: 'pptx', name: '导出测试', slides: [slide] }
                const doc = imp.designFromSlide(asset, slide)
                const url = await fs.exportDesignToDataUrl(doc, { format: 'jpeg', targetWidth: 750, quality: 0.82 })
                return { isJpeg: url.startsWith('data:image/jpeg'), len: url.length }
            }"""
        )
        check(
            "exportDesignToDataUrl 可产出封面（jpeg）",
            r["isJpeg"] and r["len"] > 1000,
            f"len={r['len']}",
        )

        check("全程无页面 JS 错误", len(js_errors) == 0, "; ".join(js_errors)[:200])
        browser.close()

    print(f"\n{PASSED} passed, {len(FAILED)} failed")
    if FAILED:
        print("FAILED:", FAILED)
        sys.exit(1)


if __name__ == "__main__":
    main()
