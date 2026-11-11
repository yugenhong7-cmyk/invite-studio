# Invite Studio · AI 智能宴会请帖制作平台

在线制作精美电子请帖的可视化平台：从模板一键套用到自由创作，支持多格式导入文字可编辑、动态动画音乐、社交平台分享卡片与宾客回执管理。

**在线演示：** https://invite-studio-08506.app.workbuddy.host/?sharecode=KPH4FCS6UD

---

## 功能特性

### 可视化请帖编辑器
- Fabric.js 画布，文字 / 图片 / 形状 / 贴纸素材自由排版，支持多页请帖
- 42 套精品模板（婚礼 / 寿宴 / 乔迁 / 满月 / 升学 / 商务等全类别，含横版与方形）
- 86 个内置素材（彩色 emoji 风、金色线条风、自绘装饰边框）
- 移动端自适应：画布全屏缩放 + 底部工具坞（Canva 式交互）

### 多格式导入（文字可编辑）
- **PPT / PPTX**：逐页解析文字、图片、背景图 / 渐变 / 主题色、装饰形状（含 slideLayout 母版底图与 mc 兼容包装）
- **SVG / GIF / PDF / 图片**：结构化内容转为可编辑元素，文字可直接修改
- **网页链接导入**：自动提取 og:image 封面图，CORS 三级回退
- 单文件最大 60MB

### 动态电子请帖
- 5 种封面开场动画（中式 / 西式信封、礼盒、卷轴、商务卡）
- 17 种背景粒子动效（花瓣 / 星光 / 金粉 / 樱花 / 萤火 / 飘雪等）
- 19 种元素动画（打字机 / 逐字 / 光效 / 翻转 / 弹跳 / 漂浮等）
- 43 首内置无版权背景音乐（本地合成 WAV，支持上传自有音频）
- 单页 / 翻页 / 故事式三种呈现模式，一键预设（浪漫 / 中式 / 国潮 / 花园等 7 套）
- AI 智能搭配：规则引擎 + LLM 分析请帖主题，自动推荐动画与音乐方案

### 分享与宾客管理
- 发布为公开 / 私密（访问码）链接，可设有效期
- Open Graph 分享卡片：微信 / QQ 聊天内直接显示封面海报（封面随设计自动更新）
- RSVP 回执收集（含手机号校验）、访问统计、回执列表导出查看

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vite + React 18 + TypeScript + Tailwind CSS |
| 画布 | Fabric.js 6（DesignDoc 结构化模型双向增量同步） |
| 状态 | Zustand + React Router（HashRouter） |
| 解析 | fflate（PPTX ZIP 解析）、pdfjs-dist、自研 DrawingML / OLE 解析 |
| 后端 | WorkBuddy Cloud（PostgREST 数据库 + RLS、文件存储、认证） |
| 服务端 | server.mjs（Node 静态服务 + OG 元数据注入 + 封面端点） |

## 快速开始

```bash
npm install
npm run dev        # 本地开发 http://127.0.0.1:5173
npm run build      # 类型检查 + 生产构建
npm start          # 构建并启动生产服务（含 OG 注入）
```

## 项目结构

```
├── src/
│   ├── pages/          # 页面：首页 / 模板 / 编辑器 / 我的作品 / 公开请帖
│   ├── editor/         # 编辑器：画布、左右面板、动态设置、AI 搭配、移动端工具坞
│   ├── dynamic/        # 动态请帖引擎：封面动画 / 粒子 / 滚动动画 / 音乐 / 倒计时
│   ├── lib/            # 核心库：设计模型 / Fabric 同步 / PPTX 解析 / 导入导出 / AI
│   ├── data/           # 模板库（42 套）、动画库（64 个）、音乐库（43 首）
│   └── store/          # Zustand 状态管理
├── public/
│   ├── stickers/       # 内置贴纸素材（86 个）
│   └── audio/          # 内置背景音乐（本地合成 WAV）
├── tests/              # Playwright 端到端测试（Python）
├── scripts/            # 音乐生成脚本等
└── server.mjs          # 生产服务器（OG 分享卡片注入 / 封面出图）
```

## 测试

测试基于 Python + Playwright，需先启动 dev server（`npm run dev`）：

```bash
python tests/smoke.py            # 编辑器冒烟（27 项）
python tests/import_fix_check.py # 导入链路（12 项）
python tests/ppt_import_check.py # PPT/PPTX 导入（16 项）
python tests/dynamic_check.py    # 动态请帖（24 项）
python tests/ai_match_check.py   # AI 搭配（18 项）
python tests/share_cover_check.py# 分享封面（8 项）
python tests/og_share_check.py   # OG 卡片（23 项）
python tests/e2e_public.py       # 公开请帖端到端（19 项）
```

## 说明

- 云配置在 `src/lib/cloud.ts`，其中 `wbpk_` 为可公开的 publishable key（受数据库 RLS 权限约束），不含私密凭证
- 内置音乐由 `scripts/gen_music.py` 本地合成，无版权风险
