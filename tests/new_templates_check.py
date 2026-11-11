# -*- coding: utf-8 -*-
"""
新增模板与素材库 —— 定向验证
"""
import json
import os

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
report = {"assertions": [], "page_errors": []}


def check(name, cond, detail=""):
    report["assertions"].append({"name": name, "passed": bool(cond), "detail": detail})
    print(f"  [{'PASS' if cond else 'FAIL'}] {name} {detail}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 1440, "height": 960}, locale="zh-CN").new_page()
        page.on("pageerror", lambda e: report["page_errors"].append(str(e)))

        # 1. 首页显示 42 套模板
        print("\n== 1. 首页模板数量")
        page.goto(f"{BASE}/#/", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("首页显示 42 套模板", "42 套精选模板" in body)

        # 2. 模板中心总数与筛选
        print("\n== 2. 模板中心")
        page.goto(f"{BASE}/#/templates", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(1500)
        cards = page.locator("main [class*='grid'] button, main [class*='grid'] a").count()
        body = page.inner_text("body")
        check("模板卡片 >= 42", cards >= 42, f"count={cards}")
        check("新模板出现在列表", ("蓝金星空" in body) and ("青花瓷" in body) and ("粽情端午" in body) and ("同学聚会" in body))
        # 筛选：横版
        try:
            page.click("button:has-text('横版')", timeout=4000)
            page.wait_for_timeout(800)
            body2 = page.inner_text("body")
            check("横版筛选生效", ("横版喜宴" in body2 or "横版峰会" in body2) and ("极简黑白" not in body2))
        except Exception as e:
            check("横版筛选生效", False, str(e)[:100])
        # 方形筛选
        try:
            page.click("button:has-text('方形')", timeout=4000)
            page.wait_for_timeout(800)
            body3 = page.inner_text("body")
            check("方形筛选生效", ("方形气球" in body3 or "方形囍印" in body3))
        except Exception as e:
            check("方形筛选生效", False, str(e)[:100])
        page.goto(f"{BASE}/#/templates", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # 3. 新模板在编辑器中渲染
        print("\n== 3. 编辑器加载新模板")
        page.goto(f"{BASE}/#/editor/wedding-blue-royal", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(2500)
        canvas_ok = page.locator("canvas").count() > 0
        check("编辑器画布存在", canvas_ok)
        body = page.inner_text("body")
        check("属性面板/图层面板可见", "图层" in body or "属性" in body)
        page.screenshot(path=os.path.join(OUT, "new-01-editor-blue-royal.png"))

        # 4. 素材面板新分组
        print("\n== 4. 素材面板")
        try:
            page.click("button:has-text('素材')", timeout=5000)
            page.wait_for_timeout(1000)
            body = page.inner_text("body")
            check("素材分组存在", ("节日庆典" in body) and ("花草自然" in body) and ("边框装饰" in body) and ("金色线条图标" in body))
            imgs = page.locator("img[src*='/stickers/']").count()
            check("素材缩略图渲染", imgs >= 60, f"imgs={imgs}")
            # 点击一个网页素材添加到画布
            page.click("button[title='生日蛋糕']", timeout=4000)
            page.wait_for_timeout(800)
            check("点击素材成功无报错", True)
        except Exception as e:
            check("素材面板", False, str(e)[:120])
        page.screenshot(path=os.path.join(OUT, "new-02-sticker-panel.png"))

        # 5. MyTemplates 页 Canva 指引
        print("\n== 5. Canva 导入指引")
        page.goto(f"{BASE}/#/my-templates", wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(1000)
        body = page.inner_text("body")
        check("Canva 合规路径文案", ("官方合规路径" in body) and ("公开链接导入" in body) and ("40+ 套可编辑模板" in body))

        browser.close()

    passed = sum(1 for a in report["assertions"] if a["passed"])
    total = len(report["assertions"])
    print(f"\n== 结果: {passed}/{total} 通过 | pageerror={len(report['page_errors'])}")
    for e in report["page_errors"]:
        print("  [pageerror]", e[:200])
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "new-templates-report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return 0 if passed == total and not report["page_errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
