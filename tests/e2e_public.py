# -*- coding: utf-8 -*-
"""
Invite Studio — 线上公开链路端到端测试
验证：站点可访问 / 电子请帖渲染 / 分享链接携带站点访问码 / RSVP 提交 / 移动端展示
"""
import json
import os

from playwright.sync_api import sync_playwright

SHARECODE = os.environ.get("SHARECODE", "KPH4FCS6UD")
HOST = os.environ.get("HOST", "https://invite-studio-08506.app.workbuddy.host")
BASE = f"{HOST}/?sharecode={SHARECODE}"
SLUG = os.environ.get("INVITE_SLUG", "e2e-demo-8x1")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

report = {"base": BASE, "assertions": [], "page_errors": [], "console_errors": [], "failed_requests": []}


def check(name, cond, detail=""):
    report["assertions"].append({"name": name, "passed": bool(cond), "detail": detail})
    print(f"  [{'PASS' if cond else 'FAIL'}] {name} {detail}")
    return cond


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 960}, locale="zh-CN")
        page = ctx.new_page()
        page.on("pageerror", lambda e: report["page_errors"].append({"url": page.url, "error": str(e)}))
        page.on(
            "console",
            lambda m: report["console_errors"].append({"url": page.url, "text": m.text}) if m.type == "error" else None,
        )
        page.on("requestfailed", lambda r: report["failed_requests"].append({"url": r.url, "reason": (r.failure or "")}))

        # 1. 首页可访问
        print("\n== 1. 首页渲染")
        page.goto(BASE, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        check("首页品牌可见", "Invite Studio" in body)
        check("首页 CTA 可见", ("开始制作" in body) or ("立即" in body) or ("制作" in body))
        page.screenshot(path=os.path.join(OUT, "e2e-01-home-live.png"), full_page=False)

        # 2. 电子请帖公开页渲染
        print("\n== 2. 电子请帖渲染")
        page.goto(f"{BASE}#/i/{SLUG}", wait_until="networkidle", timeout=60000)
        page.wait_for_selector("text=出席回执", timeout=15000)
        page.wait_for_timeout(1500)
        # 动态请帖有开场封面：先点击开启再与表单交互
        cover = page.locator(".di-cover")
        if cover.count() > 0:
            cover.click(timeout=5000)
            page.wait_for_timeout(1200)
        body = page.inner_text("body")
        check("请帖标题/文案可见", "我们结婚啦" in body or "张三" in body)
        check("宴会信息可见", "金缘大酒店" in body)
        check("RSVP 表单可见", "出席回执" in body and "提交回执" in body)
        check("二维码/分享区可见", "分享" in body or "复制" in body)
        check("分享链接携带站点访问码", f"sharecode={SHARECODE}" in body)
        page.screenshot(path=os.path.join(OUT, "e2e-02-invite-live.png"), full_page=True)

        # 3. RSVP 提交（手机号必填 + 格式校验）
        print("\n== 3. RSVP 提交")
        check("手机号字段可见", "联系电话" in body)
        page.fill("input[placeholder*='王叔叔']", "E2E 测试宾客")
        # 未填手机号时提交按钮禁用
        btn_disabled = page.evaluate(
            "!!document.querySelector(\"button.di-btn-block\")?.disabled"
        )
        check("未填手机号时提交禁用", btn_disabled)
        # 非法手机号：失焦提示 + 仍不可提交
        page.fill("input[placeholder*='11 位手机号']", "12345")
        page.locator("input[placeholder*='11 位手机号']").blur()
        page.wait_for_timeout(300)
        check("非法手机号报错提示", page.locator("text=请填写正确的 11 位手机号").count() > 0)
        btn_disabled = page.evaluate(
            "!!document.querySelector(\"button.di-btn-block\")?.disabled"
        )
        check("非法手机号时提交禁用", btn_disabled)
        # 合法手机号后可提交
        page.fill("input[placeholder*='11 位手机号']", "13800138000")
        page.click("button:has-text('确认参加')")
        page.click("button:has-text('＋')")
        page.fill("textarea[placeholder*='留句话']", "自动化测试回执，请查收")
        page.click("button:has-text('提交回执')")
        page.wait_for_selector("text=回执已提交", timeout=15000)
        result_text = page.inner_text("body")
        check("回执提交成功提示", "回执已提交" in result_text)
        check("回执内容回显", "E2E 测试宾客" in result_text and "2 人" in result_text)
        check("回执手机号回显", "13800138000" in result_text)
        page.screenshot(path=os.path.join(OUT, "e2e-03-rsvp-done.png"), full_page=False)

        # 4. 无效 slug 优雅降级
        print("\n== 4. 无效 slug 降级")
        page.goto(f"{BASE}#/i/definitely-not-a-slug", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(1500)
        body = page.inner_text("body")
        check("无效 slug 优雅降级", ("不存在" in body) or ("过期" in body) or ("找不到" in body))

        # 5. 移动端展示
        print("\n== 5. 移动端渲染")
        mob = browser.new_context(viewport={"width": 375, "height": 812}, locale="zh-CN", is_mobile=True, has_touch=True)
        mp = mob.new_page()
        mp.on("pageerror", lambda e: report["page_errors"].append({"url": mp.url, "error": str(e)}))
        mp.goto(f"{BASE}#/i/{SLUG}", wait_until="networkidle", timeout=60000)
        mp.wait_for_selector("text=出席回执", timeout=15000)
        mp.wait_for_timeout(1200)
        mbody = mp.inner_text("body")
        check("移动端请帖渲染", "出席回执" in mbody and ("金缘大酒店" in mbody))
        check("移动端手机号字段可见", "联系电话" in mbody)
        overflow = mp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2")
        check("移动端无横向溢出", overflow)
        input_font = mp.evaluate(
            "getComputedStyle(document.querySelector(\"input[placeholder*='11 位手机号']\")).fontSize"
        )
        check("移动端输入框 16px 防缩放", input_font.startswith("16"), input_font)
        mp.screenshot(path=os.path.join(OUT, "e2e-04-invite-mobile.png"), full_page=True)
        mob.close()

        ctx.close()
        browser.close()

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "e2e-report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    passed = sum(1 for a in report["assertions"] if a["passed"])
    total = len(report["assertions"])
    print(f"\n== 结果: {passed}/{total} 通过 | pageerror={len(report['page_errors'])} console.error={len(report['console_errors'])} failed_requests={len(report['failed_requests'])}")
    for e in report["page_errors"]:
        print("  [pageerror]", e)
    for e in report["failed_requests"]:
        print("  [requestfailed]", e)
    for e in report["console_errors"]:
        print("  [console.error]", e["text"][:160])
    return 0 if passed == total and not report["page_errors"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
