# -*- coding: utf-8 -*-
"""PPT/PPTX/GIF/SVG 导入专项回归：
1. PPTX 解析：多页 + 文字提取（sz/b/颜色/对齐）+ 图片 rels 提取 + 背景色
2. designFromSlide：文字 → 可编辑 text 元素（非锁死），图片 → image 元素
3. SVG：text 元素提取为可编辑文字，图形栅格化为图层
4. GIF：可编辑图片图层
5. 旧版 PPT（OLE）：TextCharsAtom 文字提取
6. 魔数嗅探：pptx（PK+ppt/）与 ppt（OLE 头）
7. 编辑器「上传模板」注入可编辑元素（文字可双击编辑）
8. 多页 PPTX → 逐页生成模板
"""
import base64
import os
import re
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
FIX = os.path.join(os.path.dirname(__file__), "fixtures")
OUT = os.path.join(os.path.dirname(__file__), "shots")
os.makedirs(OUT, exist_ok=True)

PPTX = os.path.join(FIX, "mini-invite.pptx")
SVG = os.path.join(FIX, "text-card.svg")
GIF = os.path.join(FIX, "dot.gif")
PPT = os.path.join(FIX, "mini.ppt")

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


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))

        page.goto(BASE + "/#/", wait_until="networkidle", timeout=45000)

        pptx_b64 = b64(PPTX)
        svg_b64 = b64(SVG)
        gif_b64 = b64(GIF)
        ppt_b64 = b64(PPT)

        # ============ 1. PPTX 解析 ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const pptx = await import('/src/lib/pptx.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const slides = pptx.parsePptx(bytes.buffer)
                return {
                    count: slides.length,
                    s1texts: slides[0].texts.map(t => t.text),
                    s1images: slides[0].images.length,
                    s1bg: slides[0].background || null,
                    s1size: [slides[0].width, slides[0].height],
                    s2texts: slides[1] ? slides[1].texts.map(t => t.text) : [],
                    boldFlag: slides[0].texts.map(t => t.fontWeight),
                    align: slides[0].texts.map(t => t.textAlign),
                    fmt: imp.sniffFormatFromBytes(bytes.slice(0, 8192)),
                }
            }""",
            pptx_b64,
        )
        check(
            "PPTX 解析：2 页 + 文字 + 图片 + 背景色",
            r.get("count") == 2
            and any("诚邀莅临" in t for t in r["s1texts"])
            and any("敬备薄酌" in t for t in r["s1texts"])
            and r.get("s1images") == 1
            and (r.get("s1bg") or "").upper() == "#FFF8F0",
            str(r)[:240],
        )
        check(
            "PPTX 样式：加粗/对齐保留",
            r.get("boldFlag", [None])[0] == "bold" and r.get("align", [None])[0] == "center",
            f"bold={r.get('boldFlag')} align={r.get('align')}",
        )
        check(
            "PPTX 第 2 页文字提取",
            any("恭候光临" in t for t in r.get("s2texts", [])),
            str(r.get("s2texts")),
        )
        check("魔数嗅探识别 PPTX（PK+ppt/）", r.get("fmt") == "pptx", str(r.get("fmt")))

        # ============ 2. designFromSlide → 可编辑元素 ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const pptx = await import('/src/lib/pptx.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const slides = pptx.parsePptx(bytes.buffer)
                const asset = { dataUrl: slides[0].images[0]?.dataUrl || '', width: slides[0].width, height: slides[0].height, format: 'pptx', name: '乔迁请帖', slides }
                const doc = imp.designFromSlide(asset, slides[0])
                return {
                    elTypes: doc.elements.map(e => e.type),
                    texts: doc.elements.filter(e => e.type === 'text').map(e => e.text),
                    anyLocked: doc.elements.some(e => e.locked),
                    textFont: doc.elements.find(e => e.type === 'text')?.fontSize || 0,
                    bg: doc.canvas.background.color,
                    n: doc.elements.length,
                }
            }""",
            pptx_b64,
        )
        check(
            "designFromSlide：文字为可编辑 text 元素",
            len(r["texts"]) == 2 and any("诚邀莅临" in t for t in r["texts"]) and r["anyLocked"] is False,
            str(r)[:220],
        )
        check(
            "designFromSlide：图片为独立 image 图层 + 背景色保留",
            "image" in r["elTypes"] and (r.get("bg") or "").upper() == "#FFF8F0" and r["n"] == 3,
            str(r)[:200],
        )

        # ============ 3. SVG 文字提取 ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const file = new File([bytes], 'text-card.svg', { type: 'image/svg+xml' })
                const asset = await imp.importFile(file)
                const slide = asset.slides ? asset.slides[0] : null
                if (!slide) return { ok: false, reason: 'no slides' }
                const doc = imp.designFromSlide(asset, slide)
                return {
                    ok: true,
                    fmt: asset.format,
                    texts: slide.texts.map(t => t.text),
                    els: doc.elements.map(e => e.type),
                    docTexts: doc.elements.filter(e => e.type === 'text').map(e => ({ text: e.text, locked: e.locked })),
                    hasImage: slide.images.length,
                }
            }""",
            svg_b64,
        )
        check(
            "SVG：文字提取为可编辑元素",
            r.get("ok")
            and any("生日快乐" in t for t in r.get("texts", []))
            and any("恭候光临" in t for t in r.get("texts", []))
            and all(not d["locked"] for d in r.get("docTexts", [])),
            str(r)[:240],
        )
        check(
            "SVG：图形栅格化为图层（文字不重复出现）",
            r.get("hasImage") == 1 and r.get("els", []).count("text") == 2,
            str(r.get("els")),
        )

        # ============ 4. GIF 导入 ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const file = new File([bytes], 'dot.gif', { type: 'image/gif' })
                const asset = await imp.importFile(file)
                const doc = imp.designFromAsset(asset)
                return {
                    fmt: asset.format,
                    elTypes: doc.elements.map(e => e.type),
                    locked: doc.elements.some(e => e.locked),
                    sniff: imp.sniffFormatFromBytes(bytes.slice(0, 32)),
                }
            }""",
            gif_b64,
        )
        check(
            "GIF：可编辑图片图层 + 嗅探识别",
            r.get("fmt") == "gif" and r.get("sniff") == "gif" and "image" in r.get("elTypes", []) and r.get("locked") is False,
            str(r),
        )

        # ============ 5. 旧版 PPT（OLE）文字提取 ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const pptx = await import('/src/lib/pptx.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const sniff = imp.sniffFormatFromBytes(bytes.slice(0, 512))
                try {
                    const slides = pptx.parsePptBinary(bytes.buffer)
                    return { sniff, texts: slides[0].texts.map(t => t.text), ok: true }
                } catch (e) {
                    return { sniff, ok: false, err: String(e && e.message || e) }
                }
            }""",
            ppt_b64,
        )
        check(
            "旧版 PPT：OLE 嗅探 + TextCharsAtom 文字提取",
            r.get("sniff") == "ppt" and r.get("ok") and any("敬备薄酌" in t for t in r.get("texts", [])),
            str(r)[:200],
        )

        # ============ 6. 编辑器上传模板 → 注入可编辑元素 ============
        page.goto(BASE + "/#/editor", wait_until="networkidle", timeout=45000)
        page.wait_for_selector("canvas", timeout=20000)
        page.wait_for_timeout(1500)
        # 直接调用 store 注入（等价 handleTemplateFile 结构化路径）
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const file = new File([bytes], 'mini-invite.pptx', {
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
                const asset = await imp.importFile(file)
                const els = imp.elementsFromSlide(asset.slides[0], 1080, 1920)
                return { n: els.length, types: els.map(e => e.type), texts: els.filter(e => e.type==='text').map(e => e.text) }
            }""",
            pptx_b64,
        )
        check(
            "编辑器：PPT 元素注入（文字+图片均独立元素）",
            r.get("n") == 3 and "text" in r.get("types", []) and "image" in r.get("types", []),
            str(r)[:200],
        )

        # UI 验证：走真实上传入口，点击文字元素后右侧出现文字属性
        set_input_files = page.wait_for_event("filechooser", timeout=15000) if False else None
        # 左侧「上传」tab
        try:
            page.click("text=上传", timeout=5000)
            page.wait_for_timeout(400)
            with page.expect_file_chooser(timeout=8000) as fc:
                page.click("text=选择文件导入")
            fc.value.set_files(PPTX)
            page.wait_for_timeout(2000)
            body = page.inner_text("body")
            check("编辑器上传入口：PPT 导入成功提示", "可编辑元素" in body, body[:120].replace("\n", " "))
            # 点击画布中部偏上（标题文字位置），右面板应出现文字属性
            page.mouse.click(540, 300)
            page.wait_for_timeout(800)
            body = page.inner_text("body")
            check("画布点选：出现文字属性（字号/颜色）", ("字号" in body or "字体" in body), "字号=%s 字体=%s" % ("字号" in body, "字体" in body))
        except Exception as e:
            check("编辑器上传入口：PPT 导入成功提示", False, str(e)[:180])
            check("画布点选：出现文字属性（字号/颜色）", False, "前置失败")

        page.screenshot(path=os.path.join(OUT, "ppt-import-editor.png"))

        # ============ 7. 多页 PPTX → 逐页生成设计（模块级） ============
        r = page.evaluate(
            """async (b64) => {
                const imp = await import('/src/lib/import.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const file = new File([bytes], 'mini-invite.pptx', {
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
                const asset = await imp.importFile(file)
                // 与 MyTemplates.handleFiles 相同的逐页逻辑
                const docs = asset.slides.map((s, i) => {
                    const doc = imp.designFromSlide(asset, s, {})
                    return { name: `${asset.name} · 第 ${i + 1} 页`, texts: doc.elements.filter(e => e.type==='text').map(e => e.text) }
                })
                return docs
            }""",
            pptx_b64,
        )
        ok = (
            len(r) == 2
            and "第 1 页" in r[0]["name"]
            and "第 2 页" in r[1]["name"]
            and any("诚邀莅临" in t for t in r[0]["texts"])
            and any("恭候光临" in t for t in r[1]["texts"])
        )
        check("多页 PPTX：逐页生成模板（第 1/2 页）", ok, str(r)[:220])

        # UI 级：MyTemplates 上传入口走通（未登录时提示导入完成但不落库）
        try:
            page.goto(BASE + "/#/my-templates", wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(800)
            with page.expect_file_chooser(timeout=10000) as fc:
                page.click("text=上传本地文件")
            fc.value.set_files(PPTX)
            page.wait_for_timeout(2500)
            body = page.inner_text("body")
            check("MyTemplates 上传入口：PPTX 导入完成", "导入完成" in body or "第 1 页" in body, body[:120].replace("\n", " "))
        except Exception as e:
            check("MyTemplates 上传入口：PPTX 导入完成", False, str(e)[:180])

        # ============ 8. 无 JS 错误 ============
        check("全程无页面 JS 错误", len(js_errors) == 0, "; ".join(js_errors[:3]))

        browser.close()

    print(f"\n== {PASSED}/{PASSED + len(FAILED)} 通过 ==")
    if FAILED:
        print("FAILED: " + " | ".join(FAILED))
        sys.exit(1)


if __name__ == "__main__":
    main()
