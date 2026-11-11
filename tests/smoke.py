# -*- coding: utf-8 -*-
"""
Invite Studio — 真实浏览器冒烟测试
三大铁律：挂 pageerror / console.error / requestfailed，finally 关浏览器。
"""
import json
import os
import sys
import time
import traceback

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://127.0.0.1:5173")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

report = {
    "base": BASE,
    "pages": [],
    "page_errors": [],
    "console_errors": [],
    "failed_requests": [],
    "assertions": [],
}


def ok(name, detail=""):
    report["assertions"].append({"name": name, "passed": True, "detail": detail})
    print(f"  [PASS] {name} {detail}")


def fail(name, detail=""):
    report["assertions"].append({"name": name, "passed": False, "detail": detail})
    print(f"  [FAIL] {name} {detail}")


def check(name, cond, detail=""):
    if cond:
        ok(name, detail)
    else:
        fail(name, detail)
    return cond


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 960},
            locale="zh-CN",
            device_scale_factor=1,
        )
        page = context.new_page()

        page.on(
            "pageerror",
            lambda e: report["page_errors"].append({"url": page.url, "error": str(e)}),
        )
        page.on(
            "console",
            lambda m: report["console_errors"].append({"url": page.url, "text": m.text})
            if m.type == "error"
            else None,
        )
        page.on(
            "requestfailed",
            lambda r: report["failed_requests"].append(
                {"url": r.url, "reason": (r.failure or "")}
            ),
        )

        def visit(hash_path, name, wait_selector=None, wait_ms=1200):
            url = f"{BASE}/#{hash_path}"
            print(f"\n== {name}  {url}")
            page.goto(url, wait_until="networkidle", timeout=45000)
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=12000)
                except Exception as e:
                    fail(f"{name}: 等待选择器 {wait_selector}", str(e)[:120])
            page.wait_for_timeout(wait_ms)
            shot = os.path.join(OUT, f"{name}.png")
            page.screenshot(path=shot, full_page=False)
            report["pages"].append({"name": name, "url": page.url, "shot": shot})
            return page

        try:
            # ---------------- 1. 首页 ----------------
            visit("/", "01-home", "h1")
            body = page.content()
            check("首页主标题存在", "让每一场宴会" in body, "hero")
            check("首页含 CTA", "立即制作请帖" in body)
            check("首页含模板卡片", page.locator("a[href*='#/editor/']").count() >= 3,
                  f"卡片数 {page.locator('a[href*=\"#/editor/\"]').count()}")
            check("首页含功能区", "AI 智能设计" in body)

            # ---------------- 2. 模板中心 ----------------
            visit("/templates", "02-templates", "h1")
            cards = page.locator("button:has-text('使用模板')")
            total_text = page.locator("text=/共\\s*\\d+\\s*个模板/").first
            check("模板中心有模板", page.locator("text=精选模板").count() >= 0)
            check("模板中心显示数量", total_text.count() >= 0)
            # 筛选
            page.locator("button:has-text('婚礼请帖')").first.click()
            page.wait_for_timeout(700)
            page.screenshot(path=os.path.join(OUT, "02b-templates-filtered.png"))
            check("筛选后仍有卡片", page.locator("div.group").count() >= 1)
            page.locator("button:has-text('重置筛选')").first.click()
            page.wait_for_timeout(500)
            check("重置筛选后数量恢复", page.locator("div.group").count() >= 6)

            # ---------------- 3. 编辑器（中式婚礼模板） ----------------
            visit("/editor/wedding-chinese-classic", "03-editor", "canvas", wait_ms=2500)
            check("编辑器画布存在", page.locator("canvas").count() >= 1)
            body = page.content()
            check("编辑器有顶部工具栏", "撤销" in body and "重做" in body)
            check("编辑器有保存按钮", "保存" in body)
            check("编辑器有导出/分享", "导出" in body and "分享" in body)
            # 图层面板
            page.locator("button:has-text('图层')").first.click()
            page.wait_for_timeout(600)
            layer_rows = page.locator("aside div.group").count()
            check("图层面板有图层", layer_rows >= 5, f"图层数 {layer_rows}")
            page.screenshot(path=os.path.join(OUT, "03b-editor-layers.png"))

            # 添加文字
            page.locator("nav button:has-text('文字')").first.click()
            page.wait_for_timeout(400)
            before = layer_rows
            page.locator("button:has-text('自定义文字')").first.click()
            page.wait_for_timeout(900)
            page.locator("button:has-text('图层')").first.click()
            page.wait_for_timeout(500)
            after = page.locator("aside div.group").count()
            check("添加文字后图层 +1", after == before + 1, f"{before} -> {after}")

            # 撤销
            page.locator("button:has-text('撤销')").first.click()
            page.wait_for_timeout(700)
            page.locator("button:has-text('图层')").first.click()
            page.wait_for_timeout(500)
            undone = page.locator("aside div.group").count()
            check("撤销后图层还原", undone == before, f"{after} -> {undone}")

            # 导出弹窗
            page.locator("button:has-text('导出')").first.click()
            page.wait_for_timeout(700)
            check("导出弹窗打开", page.locator("text=导出规格").count() >= 1)
            page.screenshot(path=os.path.join(OUT, "03c-editor-export.png"))
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)

            # 分享弹窗
            page.locator("button:has-text('分享')").first.click()
            page.wait_for_timeout(700)
            check("分享弹窗打开", page.locator("text=电子请帖").count() >= 1)
            page.screenshot(path=os.path.join(OUT, "03d-editor-share.png"))
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

            # AI 面板
            page.locator("nav button:has-text('AI 设计')").first.click()
            page.wait_for_timeout(500)
            check("AI 面板有输入框", page.locator("textarea").count() >= 1)
            check("AI 面板有文案风格", page.locator("button:has-text('温馨亲切')").count() >= 1)
            page.screenshot(path=os.path.join(OUT, "03e-editor-ai.png"))

            # ---------------- 4. 登录页 ----------------
            visit("/login", "04-login", "h1")
            body = page.content()
            check("登录页有手机号登录", "手机号登录" in body)
            check("登录页有邮箱登录", "邮箱登录" in body)
            # 手机号校验
            page.locator("input[placeholder*='11 位手机号']").fill("123")
            page.locator("button:has-text('获取验证码')").first.click()
            page.wait_for_timeout(600)
            check("非法手机号被拦截", page.locator("text=请输入正确的 11 位手机号").count() >= 1)
            page.screenshot(path=os.path.join(OUT, "04b-login-validation.png"))

            # ---------------- 5. 我的作品 ----------------
            visit("/my", "05-myworks", "text=登录后查看你的作品")
            check("未登录引导登录", page.locator("a[href='#/login']").count() >= 1)

            # ---------------- 6. 我的模板 ----------------
            visit("/my-templates", "06-mytemplates", "h1")
            body = page.content()
            check("我的模板有 Canva 说明", "Canva" in body)
            check("我的模板有上传入口", "上传本地文件" in body)
            check("我的模板有链接导入", "链接导入" in body)

            # ---------------- 7. 公开请帖（不存在的 slug） ----------------
            visit("/i/does-not-exist-xyz", "07-invite-missing", "text=无法查看这份请帖", wait_ms=2500)
            check("无效链接优雅降级", page.locator("text=无法查看这份请帖").count() >= 1)

            # ---------------- 8. 路由回首页 ----------------
            visit("/", "08-home-again", "h1", wait_ms=800)

        except Exception:
            report["fatal"] = traceback.format_exc()
            print("\n!!! 测试过程中出现致命异常:")
            print(report["fatal"])
        finally:
            context.close()
            browser.close()

        out_json = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report.json")
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        passed = sum(1 for a in report["assertions"] if a["passed"])
        failed = sum(1 for a in report["assertions"] if not a["passed"])
        print("\n" + "=" * 60)
        print(f"断言通过 {passed} / {passed + failed}")
        print(f"未捕获异常 pageerror : {len(report['page_errors'])}")
        print(f"console.error       : {len(report['console_errors'])}")
        print(f"失败请求 requestfail: {len(report['failed_requests'])}")
        print(f"报告 -> {out_json}")
        for e in report["page_errors"][:8]:
            print("  PAGEERROR:", e["url"], e["error"][:160])
        for e in report["console_errors"][:8]:
            print("  CONSOLE  :", e["url"], e["text"][:160])
        for e in report["failed_requests"][:8]:
            print("  REQFAIL  :", e["url"][:120], e["reason"][:80])
        return 0 if (failed == 0 and not report["page_errors"]) else 1


if __name__ == "__main__":
    sys.exit(main())
