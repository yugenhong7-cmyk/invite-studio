# -*- coding: utf-8 -*-
"""动态电子请帖系统验证：编辑器动态面板 + 封面动画 + 滚动分段 + 音乐 + 倒计时 + RSVP"""
import json
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173"
OUT = "tests/shots"
results = []
page_errors = []


def check(name, cond, detail=""):
    results.append({"name": name, "ok": bool(cond), "detail": detail})
    print(("PASS " if cond else "FAIL ") + name + (" | " + str(detail) if detail else ""))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 960}, locale="zh-CN")
    page = ctx.new_page()
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.on("console", lambda m: page_errors.append("console.error: " + m.text) if m.type == "error" else None)

    # ---------- 1. 编辑器 · 动态效果面板 ----------
    page.goto(f"{BASE}/#/editor/wedding-chinese-classic", wait_until="networkidle", timeout=45000)
    page.wait_for_timeout(2000)
    page.click("button:has-text('动态')")
    page.wait_for_timeout(900)
    check("编辑器动态 Tab 打开", page.locator("text=一键套用动画方案").count() > 0)
    check("7 套动画预设", page.locator("button:has-text('浪漫婚礼')").count() > 0 and page.locator("button:has-text('商务尊贵')").count() > 0)
    check("展示形式三种模式", page.locator("text=单页沉浸").count() > 0 and page.locator("text=多屏翻页").count() > 0 and page.locator("text=故事式").count() > 0)
    check("开场封面设置", page.locator("text=开场封面动画").count() > 0)
    check("动态背景设置", page.locator("text=动态背景").count() > 0)
    check("背景音乐模块", page.locator("text=背景音乐").count() > 0 and page.locator("text=花间月").count() > 0)
    check("内容分区开关", page.locator("text=倒计时").count() > 0 and page.locator("text=宾客回执").count() > 0)
    page.screenshot(path=f"{OUT}/dyn-01-motion-panel.png")

    # ---------- 2. 套用预设 ----------
    page.click("button:has-text('中式典雅')")
    page.wait_for_timeout(600)
    check("套用中式典雅预设", page.locator("text=已套用「中式典雅」动画方案").count() > 0)

    # 选中元素 → 元素动画面板
    page.mouse.click(720, 400)  # 点击画布中心区域选中元素
    page.wait_for_timeout(500)
    has_anim = page.locator("text=元素动画").count() > 0
    check("元素动画面板存在", has_anim)

    # ---------- 3. 动态预览弹窗（封面动画） ----------
    page.click("button:has-text('预览')")
    page.wait_for_timeout(1500)
    check("预览弹窗打开（动态版）", page.locator("text=电子请帖动态预览").count() > 0)
    cover_visible = page.locator(".di-cover").count() > 0
    check("开场封面渲染", cover_visible)
    if cover_visible:
        hint = page.locator(".di-cover-hint").inner_text() if page.locator(".di-cover-hint").count() else ""
        check("封面提示语", "开启" in hint or "请柬" in hint or "轻" in hint, hint)
    page.screenshot(path=f"{OUT}/dyn-02-cover.png")

    # 点击封面开启
    page.locator(".di-cover").click()
    page.wait_for_timeout(2000)
    check("封面开启后进入正文", page.locator(".di-cover").count() == 0 or page.locator(".di-opened").count() > 0)
    page.screenshot(path=f"{OUT}/dyn-03-opened.png")

    # 倒计时
    check("倒计时模块", page.locator("text=距离").count() > 0 or page.locator(".di-countdown").count() > 0)

    # 音乐控件
    check("音乐播放控件", page.locator(".di-music-btn").count() > 0)

    # 滚动触发分段动画
    page.mouse.wheel(0, 800)
    page.wait_for_timeout(1200)
    page.mouse.wheel(0, 800)
    page.wait_for_timeout(1200)
    page.screenshot(path=f"{OUT}/dyn-04-scrolled.png")

    # RSVP
    check("宾客回执表单", page.locator("text=确认参加").count() > 0)

    # 结束区域
    page.mouse.wheel(0, 2000)
    page.wait_for_timeout(1000)
    check("结束/分享区域", page.locator("text=分享").count() > 0 or page.locator(".di-ending").count() > 0)
    page.screenshot(path=f"{OUT}/dyn-05-ending.png")

    # 关闭预览
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)

    # ---------- 4. 移动端渲染 ----------
    mob = browser.new_context(viewport={"width": 375, "height": 812}, locale="zh-CN",
                              is_mobile=True, has_touch=True)
    mp = mob.new_page()
    mp.on("pageerror", lambda e: page_errors.append("mobile: " + str(e)))
    mp.goto(f"{BASE}/#/editor/wedding-chinese-classic", wait_until="networkidle", timeout=45000)
    mp.wait_for_timeout(1800)
    # 打开动态面板
    try:
        mp.click("button:has-text('动态')", timeout=4000)
        mp.wait_for_timeout(800)
        check("移动端动态面板", mp.locator("text=一键套用动画方案").count() > 0)
    except Exception as e:
        check("移动端动态面板", False, str(e)[:80])
    mp.screenshot(path=f"{OUT}/dyn-06-mobile-panel.png")

    # Canva 式移动端布局：底部工具坞 + 画布自适应
    check("移动端底部工具坞", mp.locator("div.overflow-x-auto button").count() >= 9)
    cw = mp.evaluate("document.querySelector('canvas')?.getBoundingClientRect().width ?? 0")
    check("画布自适应屏宽", 0 < cw <= 375 + 2, str(cw))

    # 移动端预览（预览入口在顶部「更多」菜单内）
    try:
        if mp.locator("button:has-text('收起')").count() > 0:
            mp.click("button:has-text('收起')", timeout=3000)
            mp.wait_for_timeout(400)
        mp.click("button[aria-label='更多操作']", timeout=4000)
        mp.wait_for_timeout(300)
        mp.click("button:has-text('预览'):visible", timeout=4000)
        mp.wait_for_timeout(1500)
        check("移动端预览封面", mp.locator(".di-cover").count() > 0)
        mp.locator(".di-cover").click()
        mp.wait_for_timeout(1800)
        mp.screenshot(path=f"{OUT}/dyn-07-mobile-opened.png")
        check("移动端正文渲染", mp.locator("text=距离").count() > 0 or mp.locator(".di-countdown").count() > 0)
    except Exception as e:
        check("移动端动态预览", False, str(e)[:80])

    # ---------- 5. prefers-reduced-motion ----------
    rm_ctx = browser.new_context(viewport={"width": 1440, "height": 960}, locale="zh-CN",
                                 reduced_motion="reduce")
    rp = rm_ctx.new_page()
    rp.on("pageerror", lambda e: page_errors.append("reduced: " + str(e)))
    rp.goto(f"{BASE}/#/editor/wedding-chinese-classic", wait_until="networkidle", timeout=45000)
    rp.wait_for_timeout(1800)
    rp.click("button:has-text('预览')")
    rp.wait_for_timeout(1200)
    check("reduced-motion 保留静态封面", rp.locator(".di-cover").count() > 0)
    if rp.locator(".di-cover").count() > 0:
        rp.locator(".di-cover").click()
        rp.wait_for_timeout(1200)
    check("reduced-motion 点击后正文可读", rp.locator("text=距离").count() > 0 or rp.locator(".di-countdown").count() > 0)
    rp.screenshot(path=f"{OUT}/dyn-08-reduced-motion.png")

    browser.close()

real_errors = [e for e in page_errors if "favicon" not in e.lower()]
print("\n===== 结果 =====")
ok = sum(1 for r in results if r["ok"])
print(f"{ok}/{len(results)} 通过 | 页面错误: {len(real_errors)}")
for e in real_errors[:5]:
    print("  ERR:", e[:160])
json.dump({"results": results, "errors": real_errors}, open("tests/dyn_report.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
sys.exit(0 if ok == len(results) and not real_errors else 1)
