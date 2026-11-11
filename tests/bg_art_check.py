# -*- coding: utf-8 -*-
"""bg-art.pptx 背景/主题色/装饰形状解析验证（导入模板背景消失修复）"""
import base64
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
FIX = os.path.join(os.path.dirname(__file__), "fixtures")
PPTX = os.path.join(FIX, "bg-art.pptx")

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
        page.goto(BASE + "/#/", wait_until="networkidle", timeout=45000)
        pptx_b64 = b64(PPTX)

        r = page.evaluate(
            """async (b64) => {
                const pptx = await import('/src/lib/pptx.ts')
                const imp = await import('/src/lib/import.ts')
                const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                const slides = pptx.parsePptx(bytes.buffer)
                const s1 = slides[0], s2 = slides[1], s3 = slides[2]
                const asset = { dataUrl: '', width: s1.width, height: s1.height, format: 'pptx', name: '乔迁请帖', slides }
                const d1 = imp.designFromSlide(asset, s1)
                const d2 = imp.designFromSlide(asset, s2)
                const d3 = imp.designFromSlide(asset, s3)
                return {
                    n: slides.length,
                    s1: {
                        bg: s1.background ?? null,
                        bgImg: !!s1.backgroundImage,
                        bgImgLen: (s1.backgroundImage || '').length,
                        bgGrad: s1.backgroundGradient ?? null,
                        nImgs: s1.images.length,
                        imgName: s1.images[0]?.name ?? null,
                        nShapes: s1.shapes.length,
                        shape0: s1.shapes[0] ?? null,
                        textFills: s1.texts.map(t => t.fill),
                        texts: s1.texts.map(t => t.text),
                        bold: s1.texts.map(t => t.fontWeight),
                    },
                    s2: {
                        bg: s2.background ?? null,
                        bgImg: !!s2.backgroundImage,
                        bgGrad: s2.backgroundGradient ?? null,
                        textFills: s2.texts.map(t => t.fill),
                        texts: s2.texts.map(t => t.text),
                    },
                    s3: {
                        bg: s3.background ?? null,
                        bgImg: !!s3.backgroundImage,
                        nImgs: s3.images.length,
                        nShapes: s3.shapes.length,
                        texts: s3.texts.map(t => t.text),
                        textFills: s3.texts.map(t => t.fill),
                    },
                    d1: {
                        bgType: d1.canvas.background.type,
                        bgImg: !!d1.canvas.background.imageSrc,
                        nEls: d1.elements.length,
                        types: d1.elements.map(e => e.type),
                        shapeFills: d1.elements.filter(e => e.type === 'shape').map(e => e.fill),
                        textFills: d1.elements.filter(e => e.type === 'text').map(e => e.fill),
                    },
                    d2: {
                        bgType: d2.canvas.background.type,
                        grad: d2.canvas.background.gradient ?? null,
                        textFills: d2.elements.filter(e => e.type === 'text').map(e => e.fill),
                    },
                    d3: {
                        bgType: d3.canvas.background.type,
                        bgColor: d3.canvas.background.color ?? null,
                        types: d3.elements.map(e => e.type),
                        imgNames: d3.elements.filter(e => e.type === 'image').map(e => e.name),
                    },
                }
            }""",
            pptx_b64,
        )

        s1, s2, s3 = r["s1"], r["s2"], r["s3"]
        check("3 页解析", r["n"] == 3, str(r["n"]))
        check(
            "slide1 背景图（p:bg blipFill）",
            s1["bgImg"] and s1["bgImgLen"] > 1000 and s1["bg"] is None and s1["bgGrad"] is None,
            f"bgImg={s1['bgImg']} len={s1['bgImgLen']} bg={s1['bg']}",
        )
        check(
            "slide1 mc 解包取图 + 装饰形状",
            s1["nImgs"] == 1 and s1["nShapes"] == 1 and (s1["shape0"] or {}).get("fill", "").upper() == "#FFC100",
            f"imgs={s1['nImgs']} shapes={s1['nShapes']} shape0={s1['shape0']}",
        )
        check(
            "slide1 主题色文字（accent1=#C41E1E）+ 加粗",
            s1["textFills"] == ["#C41E1E"] and s1["bold"] == ["bold"] and "诚邀莅临" in (s1["texts"] or [""])[0],
            f"fills={s1['textFills']} bold={s1['bold']}",
        )
        check(
            "slide2 渐变背景（C41E1E→FFC100, 90°）",
            s2["bgGrad"] is not None
            and s2["bgGrad"].get("type") == "linear"
            and abs(s2["bgGrad"].get("angle", 0) - 90) < 0.5
            and len(s2["bgGrad"].get("stops", [])) == 2
            and s2["bgGrad"]["stops"][0]["color"].upper() == "#C41E1E"
            and s2["bgGrad"]["stops"][1]["color"].upper() == "#FFC100"
            and s2["bg"] is None,
            str(s2["bgGrad"]),
        )
        check(
            "slide2 主题色文字（lt1=#FFFFFF）",
            s2["textFills"] == ["#FFFFFF"] and "恭候光临" in (s2["texts"] or [""])[0],
            f"fills={s2['textFills']}",
        )
        check(
            "slide3 版式底图 + 母版背景回退",
            s3["bgImg"] or s3["nImgs"] == 1,
            f"bg={s3['bg']} bgImg={s3['bgImg']} nImgs={s3['nImgs']}",
        )
        check(
            "slide3 文字保留",
            "席设翠湖花园" in (s3["texts"] or [""])[0] and s3["textFills"] == ["#4A3728"],
            f"fills={s3['textFills']}",
        )
        check(
            "designFromSlide slide1：背景图 + 形状 + 文字",
            r["d1"]["bgType"] == "image"
            and r["d1"]["bgImg"]
            and r["d1"]["types"].count("shape") == 1
            and r["d1"]["types"].count("image") == 1
            and r["d1"]["types"].count("text") == 1
            and r["d1"]["textFills"] == ["#C41E1E"],
            str(r["d1"])[:300],
        )
        check(
            "designFromSlide slide2：渐变背景",
            r["d2"]["bgType"] == "gradient" and r["d2"]["grad"] is not None and r["d2"]["textFills"] == ["#FFFFFF"],
            str(r["d2"])[:200],
        )
        check(
            "designFromSlide slide3：底图可见",
            (r["d3"]["bgType"] == "image") or ("image" in r["d3"]["types"]),
            str(r["d3"])[:200],
        )

        browser.close()

    print(f"\n{PASSED} passed, {len(FAILED)} failed")
    if FAILED:
        print("FAILED:", FAILED)
        sys.exit(1)


if __name__ == "__main__":
    main()
