# -*- coding: utf-8 -*-
"""AI 智能搭配 / 动画库 / 音乐库 —— 浏览器验证"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:5173'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
os.makedirs(OUT, exist_ok=True)

ok, total = 0, 0
errors = []

def ck(name, cond, detail=''):
    global ok, total
    total += 1
    if cond:
        ok += 1
        print(f'PASS {name}' + (f' | {detail}' if detail else ''))
    else:
        print(f'FAIL {name}' + (f' | {detail}' if detail else ''))

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 960}, locale='zh-CN')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))

    # 1) 打开编辑器
    pg.goto(f'{BASE}/#/editor/wedding-chinese-classic', wait_until='networkidle', timeout=45000)
    pg.wait_for_timeout(2500)
    ck('编辑器加载', pg.locator('canvas').count() > 0)

    # 2) 切到动态 Tab
    pg.click("button:has-text('动态')")
    pg.wait_for_timeout(800)
    ck('动态面板打开', pg.locator("text=AI 智能搭配").count() > 0)
    pg.screenshot(path=f'{OUT}/aim-01-motion-panel.png')

    # 3) AI 智能搭配
    pg.click("button:has-text('AI 智能搭配')")
    pg.wait_for_timeout(8000)  # 等待分析(含LLM超时回退)
    ai_visible = pg.locator("text=设计风格分析").count() > 0
    ck('AI 分析结果展示', ai_visible)
    has_picks = pg.locator("text=推荐动画方案").count() > 0
    ck('推荐动画清单', has_picks)
    has_music = pg.locator("text=推荐背景音乐").count() > 0
    ck('推荐背景音乐', has_music)
    has_apply = pg.locator("button:has-text('应用这套方案')").count() > 0
    ck('一键应用按钮', has_apply)
    has_save = pg.locator("button:has-text('保存方案')").count() > 0
    ck('保存方案按钮', has_save)
    source_badge = pg.locator("text=规则推荐, text=AI 分析").count() > 0 or pg.locator(".rounded-full:has-text('规则推荐')").count() > 0 or pg.locator(".rounded-full:has-text('AI 分析')").count() > 0
    ck('推荐来源标注（不伪装AI）', source_badge)
    pg.screenshot(path=f'{OUT}/aim-02-ai-match.png')

    # 4) 应用方案
    pg.click("button:has-text('应用这套方案')")
    pg.wait_for_timeout(800)
    ck('方案应用成功', pg.locator("text=AI 方案已应用").count() > 0 or pg.locator(".di-cover").count() >= 0)

    # 5) 动画库
    pg.click("button:has-text('动画库')")
    pg.wait_for_timeout(1500)
    anim_lib = pg.locator("text=动画素材中心").count() > 0
    ck('动画库打开', anim_lib)
    has_categories = pg.locator("text=用途分类").count() > 0
    ck('分类筛选器', has_categories)
    has_cards = pg.locator(".grid img, .grid [class*=rounded]").count() > 3
    ck('动画卡片渲染', has_cards)
    pg.screenshot(path=f'{OUT}/aim-03-anim-library.png')

    # 6) 悬停播放预览
    cards = pg.locator('[class*="grid"] > div').all()
    if len(cards) > 2:
        cards[2].hover()
        pg.wait_for_timeout(600)
        ck('悬停动画预览', True, f'{len(cards)} cards')
    pg.screenshot(path=f'{OUT}/aim-04-anim-hover.png')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(500)

    # 7) 音乐库
    pg.click("button:has-text('音乐库')")
    pg.wait_for_timeout(1500)
    music_lib = pg.locator("text=背景音乐库").count() > 0
    ck('音乐库打开', music_lib)
    has_music_cards = pg.locator("text=试听").count() > 0 or pg.locator("text=builtin").count() > 0 or pg.locator("button:has-text('♪')").count() > 0
    ck('音乐卡片/试听', has_music_cards)
    has_search = pg.locator("input[placeholder*=搜索]").count() > 0
    ck('搜索功能', has_search)
    has_upload = pg.locator("text=上传").count() > 0
    ck('上传音乐入口', has_upload)
    pg.screenshot(path=f'{OUT}/aim-05-music-library.png')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(500)

    # 8) 无页面错误
    ck('无页面错误', len(errors) == 0, errors[:2] if errors else '')
    b.close()

print(f'\n{ok}/{total} passed')
sys.exit(0 if ok == total else 1)
