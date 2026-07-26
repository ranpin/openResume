---
name: resume
description: 在 ranpin/resume 仓库（简历中心 SPA）里做开发、改模板/排版、调编辑器或部署时使用。包含架构不变量、验证命令、部署流程与已踩过的坑。
---

# resume 仓库工作指南

简历中心：Vite 5 + React 18 + TS + Tailwind 3 + Zustand 的纯静态 SPA，部署在 https://ranpin.github.io/resume/（`base: '/resume/'` 是项目页必需，勿改）。内容驱动：`content/` 下的 YAML（简历见 `content/resumes/README.md`）。

## 主色（与主站一致）

应用外壳主色 = 主站的 **sage** 色板（`tailwind.config.js` 已定义）：`sage-600 #4a614a` 主动作色、`sage-500` 图标/渐变（`from-sage-500 to-sage-600`）、`sage-100/700` 标签。**外壳一律 sage，勿用回默认 blue**。刻意保留蓝色的文档层（勿改）：`resumeTheme.ts` 五套简历配色、`ResumeDocument.tsx` 文档内链接色、`resume.css` 的 `.resume-rt a` 与 `rt-c-blue` 字体色选项。经历库类别色全组件统一：项目=sage、论文=green、实习=purple、荣誉=yellow（SmartRecommendations / ResumeCatalog / ModuleRenderer 勿各搞一套）。`index.html` 启动占位与 `public/404.html` 用裸 hex（sage-500 `#5f7a5f` / sage-600 `#4a614a`）。typography 插件不会为自定义色生成 `prose-<color>`，`prose-sage` 是在 `src/styles/index.css` 手写的（只覆盖 `--tw-prose-links`），改 prose 链接色去那里。

## 验证命令（改完必跑）

```bash
npm run typecheck          # tsc --noEmit
npm run lint               # eslint --max-warnings 0 --report-unused-disable-directives
npx vitest run             # 11 个测试文件，渲染测试用 @testing-library/react
```

本地开发：`npm run dev`（http://localhost:5173/resume/）。浏览器验证用 Playwright：
`PYTHONPATH=$HOME/.local/lib/python3.13/site-packages python3`，`p.chromium.launch(channel="chrome", headless=True)`。
注意：验证时点击编辑器会写 localStorage 草稿（key `ranpin-resume-drafts`），脚本里先快照、结束后恢复。

## 编辑器界面结构（超级简历式）

全局设置**只在顶部工具栏**，左侧面板只放内容模块（勿把全局设置移回左侧）：

- 工具栏从左到右：标题（编辑简历 · 名称 + 未发布 badge）→「模板」「配色」「排版」「模块」四个 `ToolbarPopover` 下拉面板（render-prop `children(close)`，选中即关；外点/Esc 关闭；「模块」= 模块管理：拖拽/上下箭头调序、改名、显隐、删除模块——自定义模块真删除，内置模块 trash=隐藏、经「已隐藏」恢复）→「智能一页」（开关：压缩塞一页 / 再点恢复）+「共 N 页」+ 压缩提示 → 撤销/重做 →「预览」切换（隐藏左栏、预览 `md:col-span-2` 占满）→「保存」→「导出」popover（PDF=window.print / Word=懒加载 `exportWord` / YAML）→「翻译成英文」（懒加载 `AiTranslatePanel`，成功经 `onTranslated` 关编辑器回查看器展示英文草稿）→「发布到线上」→「重置」（dirty 时）→「关闭」。
- 查看器首页（`ResumeSection.tsx`）：顶部一行 `flex justify-between`——左为一级切换（我的简历 / 详细经历），右为创建级入口 AI 生成（primary）/ 导入简历（与切换同级，两个视图都可见）。**点简历横排卡片直接进编辑器**（`setActiveId + setEditing`），无独立「编辑」按钮。文档级操作（编辑 / 翻译成英文 / 发布 / 导出 PDF·Word·YAML / 重置）一律在编辑器工具栏内——勿移回查看器。
- 撤销/重做：单一入口 `update(fn)`——600ms 时间窗合并（连续输入/拖拽/智能一页多步各算一个撤销点），undoStack/redoStack 为 ref（上限 100），按钮 disabled 直接读 ref（靠 setDraft 触发重渲染）。**新增任何改动数据的路径必须走 `update`**，否则破坏撤销栈。
- 预览缩放必须打印安全：`PreviewFit.tsx` 包住预览面板（编辑器 + 查看器），ResizeObserver 算 `scale = min(1, 可用宽 / 794)`，经 CSS 变量 `--preview-fit` / `--preview-fit-h` + transform 缩放；`resume.css` 里相关样式只在 `@media screen` 生效，`@media print` 下 `!important` 复位原尺寸——「导出 PDF」是 window.print()，会打印预览容器内的文档，缩放绝不能带进打印。不要把这套缩放改成内联样式或套到打印链路。

## 渲染架构（最重要的不变量）

`ResumeDocument.tsx` 对 classic/compact/card 同时渲染两份：

1. **打印用连续文档**：`.resume-print-only`（屏幕 `display:none`），承载 `id`（打印目标），块为 `.rt-pageblock`，`padding = settings.pageMargin`。始终在 DOM 里。
2. **屏幕用 `Paginator`**：在 `absolute left-[-9999px]` 测量层按 `CONTENT_W = 794 - 2*pad` 测高，贪心打包进 A4（794×1123）。`signature = JSON.stringify(data)` 变化才重排；`blocks` 每次渲染都是新数组，**不要**放进 effect 依赖。

推论：

- 改任何渲染输出必须同时影响两份（改 `buildBlocks` / 块级组件即可自动生效；不要只改 Paginator 的 sheet）。
- `sidebar` 模板提前 return（单页、无 Paginator → `onPages` 永不触发，按 1 页处理）。
- Paginator 的 `pages` 是 state：blocks 变少时本帧会带旧索引渲染，`blocks[i]` 可能越界——必须跳过（已有回归测试）。
- 排版经 CSS 变量下发：`--rs-scale` / `--rs-lh` / `--rs-gap`（见 `rootVars`）；块间距 = `.rt-pageblock { padding-bottom: var(--rs-gap) }`。打印背景色靠 `.resume-color-exact`（`print-color-adjust: exact`）。

## 条目排版（文本格式）

`EntryHeader` 统一教育/工作/项目/活动的标题行，布局经 `EntryLayoutContext` 下发（单栏与 sidebar 复用同批条目组件，故必须走 Context）：

- `settings.headerLines`：2=双行（主标题+时间一行，其余字段次行），1=单行。
- `settings.fieldSeparator`：`justify`=flex `justify-between` 分散对齐（首字段贴左、时间贴右、中间均分——这就是「多个字段一行两端对齐」的实现）；`dot`/`slash`/`bar`=分隔符连成左组 + 时间右对齐。
- 新增条目字段时：`primary` / `secondary` / `meta[]` / `period` 四个槽位，空值自动过滤。

`settings` 是数字+枚举混合：读取处一律 `{...SETTING_DEFAULTS, ...(data.settings||{})}`；`update()` 闭包持有 `data`（clone→mutate→setDraft）。排版设置的下限在编辑器 `FIT_MIN`，滑块 min 与之对应。

## 智能一页

Paginator 经 `onPages(count)` 上报页数（ref 持有回调、仅变化时上报，勿把 `onPages` 放进测量 effect 依赖）。按钮是**开关**：默认中性色，点击时若 count > 1 先快照当前 settings（`preFitSettingsRef`）再启动 effect 循环（依赖仅 `[autoFit]`，页数经 ref 读、设置经 `update` 函数式更新读，每步 `setTimeout 220ms` 等重排稳定），按比例缩 fontScale/lineHeight/blockGap/pageMargin 直到 1 页或触底（`FIT_MIN`）或 14 步上限；结束（含触底）置 `fitApplied` 点亮按钮（`bg-sage-600`）。再次点击经 `update` 恢复快照设置（可撤销）并熄灭。count <= 1 时点击只提示「当前已是一页，无需压缩」，不点亮。

## 模板

`template: classic | compact | card | sidebar`（`types/resume.ts`），选项表在 `resumeTheme.ts`。card = `buildBlocks(data, theme, sections, true)`：整体扁平白底（打印根与屏幕 sheet 均 `bg-white`，无彩色大横幅），**板块标题留在卡片外**，只有模块内容（七个 block 组件的 `CardBox` 包裹 + `addListSection` 的逐条目）包进 `CARD_CLASS`（`rounded-xl border bg-white shadow-sm`）小卡片。sheet 恒白底（`resume-sheet bg-white`），没有页面底色 prop。

## 已踩过的坑

- 本项目 ESLint **未启用** react-hooks 插件：不要写 `// eslint-disable-next-line react-hooks/...`，`--report-unused-disable-directives` 会报 error。
- 图标用 `components/Icon.tsx`（lucide 封装，fa 风格 name）；新图标名先查 `ICON_MAP`，没有就在 map 里加。
- 测试断言 DOM 结构时注意：内容会同时出现在打印文档 + 测量层 + 可见 sheet，用 `getAllByText(...)[0]` / `closest()`。
- 富文本存受限 `<span class>`，Markdown 渲染见 RichText 组件；`exportWord` 有独立测试。
- `skills` 是 Markdown 富文本字符串（同 `summary`），不是数组：旧版分组数组数据由 `migrateResume()`（`resumeIo.ts`）在四个入口兜底转换（content.ts 加载、编辑器/查看器数据派生、AI generate/parse/translate 返回）。新写技能相关代码不要假设数组。
- 兴趣爱好与校园活动/资格证书一致：编辑框默认隐藏，点分区「添加」才出现；标签清空后自动重新隐藏（`interestsOpen` state）。

## 部署

推 `main` → Actions 构建发 Pages。本机推送需：`git config http.version HTTP/1.1` + 重试循环
（`for i in 1..6; do git push origin main && break || sleep 8; done`）。提交按用户惯例带 `--no-verify`。
Pages CDN 部署后约 10 分钟可能回旧 bundle：用 dist 里的 bundle hash 对比线上 index.html 验证。
