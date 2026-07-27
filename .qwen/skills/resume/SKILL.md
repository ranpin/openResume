---
name: resume
description: 在 ranpin/openResume 仓库（简历中心 SPA）里做开发、改模板/排版、调编辑器或部署时使用。包含架构不变量、验证命令、部署流程与已踩过的坑。
---

# openResume 仓库工作指南

简历中心：Vite 5 + React 18 + TS + Tailwind 3 + Zustand 的纯静态 SPA，部署在 https://ranpin.github.io/openResume/（`base: '/openResume/'` 是项目页必需，勿改）。**代码与数据隔离**：本仓库是纯应用、不含个人数据；内容运行时从独立数据仓库 [ranpin/openResume-data](https://github.com/ranpin/openResume-data) 拉取，草稿持久化在本机 IndexedDB（见「数据架构」一节）。

## 主色（与主站一致）

应用外壳主色 = 主站的 **sage** 色板（`tailwind.config.js` 已定义）：`sage-600 #4a614a` 主动作色、`sage-500` 图标/渐变（`from-sage-500 to-sage-600`）、`sage-100/700` 标签。**外壳一律 sage，勿用回默认 blue**。刻意保留蓝色的文档层（勿改）：`resumeTheme.ts` 五套简历配色、`ResumeDocument.tsx` 文档内链接色、`resume.css` 的 `.resume-rt a` 与 `rt-c-blue` 字体色选项。经历库类别色全组件统一：项目=sage、论文=green、实习=purple、荣誉=yellow（SmartRecommendations / ResumeCatalog / ModuleRenderer 勿各搞一套）。`index.html` 启动占位与 `public/404.html` 用裸 hex（sage-500 `#5f7a5f` / sage-600 `#4a614a`）。typography 插件不会为自定义色生成 `prose-<color>`，`prose-sage` 是在 `src/styles/index.css` 手写的（只覆盖 `--tw-prose-links`），改 prose 链接色去那里。

## 验证命令（改完必跑）

```bash
npm run typecheck          # tsc --noEmit
npm run lint               # eslint --max-warnings 0 --report-unused-disable-directives
npx vitest run             # 16 个测试文件，渲染测试用 @testing-library/react
```

本地开发：`npm run dev`（http://localhost:5173/openResume/）。浏览器验证用 Playwright：
`PYTHONPATH=$HOME/.local/lib/python3.13/site-packages python3`，`p.chromium.launch(channel="chrome", headless=True)`。
注意：验证时点击编辑器会写 IndexedDB 草稿（库 `ranpin-resume`、store `kv`、key `ranpin-resume-drafts`），脚本里要重置状态须 `indexedDB.deleteDatabase('ranpin-resume')`（清 localStorage 已不够）；内容来自远程数据仓库，首屏有异步加载态，断言前等简历渲染出来。

## 数据架构（代码 / 数据隔离）

- **数据源配置 `src/data/source.ts`**：`DATA_SOURCE = { owner, repo, branch } | null`，本仓库指向 `ranpin/openResume-data`；`null` = 纯本地模式（内容恒空、发布入口隐藏、空态文案切到 AI 生成/导入引导）。`DATA_BASE_URL` 派生 raw.githubusercontent.com 根。**fork 使用者只改这一个文件**。
- **远程加载 `src/data/content.ts`**：`loadContent()` = 拉 `index.json` 清单 → 并行拉各 YAML（`cache: 'no-store'`）→ 解析。id = 文件名 slug；按 slug 排序；单文件失败跳过并 warn（容忍清单过期）；清单失败抛错。简历载入经 `migrateResume`。
- **`useContentStore`**：status `loading | ready | error` + `fromCache`。拉取成功即写 IndexedDB 缓存（key `content-cache`）；失败回退该缓存并置 `fromCache`，缓存也没有才 error。`load()` 有模块级 inflight 去重（StrictMode 双挂载安全）。
- **草稿持久化 `useResumeStore`**：zustand persist + `idbStateStorage`（`src/store/idb.ts`：IndexedDB 库 `ranpin-resume` / store `kv`，单项操作失败降级 localStorage）。`skipHydration`：`ResumeSection` 挂载后先 `migrateLegacyKeys([DRAFTS_STORAGE_KEY])`（旧 localStorage 键一次性迁入）再 `rehydrate()` → `setHydrated(true)`。全量迁移工具 `store/backup.ts`：编辑器导出 popover「备份全部数据（JSON）」下载、查看器「导入备份」合并恢复（按 id 覆盖，不清空）。
- **发布 `components/resume/github.ts`**：浏览器直连数据仓库 GitHub Contents API（BYO Token，存 localStorage `ranpin-github-token`）。`publishResume` = PUT `resumes/<id>.yaml`（更新已有文件带 sha）；新建文件后再二次提交把路径登记进 `index.json`。`publishEnabled = DATA_SOURCE !== null` 控制 UI 显隐。数据仓库提交约 1 分钟后（raw 刷新）线上可见，**不经 Actions 构建**。

## 编辑器界面结构

全局设置**只在顶部工具栏**，左侧面板只放内容模块（勿把全局设置移回左侧）：

- 工具栏从左到右：标题（编辑简历 · **简历名可点击内联改名**【悬停出铅笔图标，Enter/失焦提交、Esc 取消、空值不生效，经 `update` 走撤销栈】 + 未发布 badge）→「模板」「配色」「排版」「模块」四个下拉面板（各自独立组件 `TemplatePanel` / `ColorPanel` / `LayoutPanel` / `ModulePanel`，共享原子 `ToolbarPopover`（render-prop `children(close)`，选中即关；外点/Esc 关闭）与 `IconBtn`；排版常量集中在 `resumeSettings.ts`，数组换位在 `utils/array.ts`。面板只收最小 props（`data` / `update` / `resolved` / `onRemoveCustom`），handler 在面板内部、直接调 `update`——**保持单入口，勿回搬进 ResumeEditor**）。「排版」含密度预设排（紧凑/默认/宽松，一键联动字号/行距/间距/页边距四项，单次 `update` = 单条撤销记录；预设值在 `LAYOUT_PRESETS`，默认 = `SETTING_DEFAULTS`；高亮判定为四项数值 ε 近似）+ Word 式磅值字号**可输入 combo**（`input` + `datalist` 档位 8–16pt，正文基准 13px≈9.75pt，写回 fontScale 倍率；可直接输半数档如 10.5，越界按 6–24pt 收敛，失焦回显实际值；本地编辑态 `ptText`，null = 未在编辑）+ 行高/间距滑块、条目字段样式（headerLines/fieldSeparator）与「个人信息对齐」`settings.headerAlign`（left/center/right，缺省随证件照：有照片左、无照片中）；「模块」= 模块管理：拖拽/上下箭头调序、改名、显隐、删除模块——自定义模块真删除，内置模块 trash=隐藏、经「已隐藏」恢复）→「智能一页」（三态开关：中性/压缩中 spinner/点亮 `bg-sage-600`，`active:scale-95` 按压反馈，无浮动提示）+「共 N 页」（点亮时右侧出现 ↺ 小图标按钮，点击恢复压缩前排版）→ 撤销/重做（按钮 + 全局 ⌘Z/⌘⇧Z，焦点在 input/textarea/select/contenteditable 内时交还浏览器）→「预览」切换（隐藏左栏、预览 `md:col-span-2` 占满）→「保存」→「导出」popover（PDF=window.print / Word=懒加载 `exportWord` / YAML / 全量 JSON 备份 `store/backup.ts`；导出 popover 依赖编辑器本地函数，保留在 ResumeEditor 内联）→「翻译成英文」（懒加载 `AiTranslatePanel`，成功经 `onTranslated` 关编辑器回查看器展示英文草稿）→「发布到线上」（纯本地模式自动隐藏，见数据架构）→「重置」（dirty 时）→「关闭」。
- 查看器首页（`ResumeSection.tsx`）：顶部一行 `flex justify-between`——左为一级切换（我的简历 / 详细经历），右为创建级入口 AI 生成（primary）/ 导入简历 / 导入备份（合并恢复 IndexedDB 草稿，与切换同级，两个视图都可见）。**点简历横排卡片直接进编辑器**（`setActiveId + setEditing`），无独立「编辑」按钮。文档级操作（编辑 / 翻译成英文 / 发布 / 导出 PDF·Word·YAML·JSON 备份 / 重置）一律在编辑器工具栏内——勿移回查看器。内容来自 `useContentStore`，查看器须处理四态：loading 转圈 / error 重试卡 / 空态（本地模式文案不同）/ 离线缓存横幅（`fromCache`）。
- 撤销/重做：单一入口 `update(fn)`——600ms 时间窗合并（连续输入/拖拽/智能一页多步各算一个撤销点），undoStack/redoStack 为 ref（上限 100），按钮 disabled 直接读 ref（靠 setDraft 触发重渲染）。全局 ⌘Z/⌘⇧Z 经 window keydown（`undoRedoRef` 持最新闭包，`closest('input, textarea, select, [contenteditable="true"]')` 内跳过）。**新增任何改动数据的路径必须走 `update`**，否则破坏撤销栈。
- 预览缩放必须打印安全：`PreviewFit.tsx` 包住预览面板（编辑器 + 查看器），ResizeObserver 算 `scale = min(1, 可用宽 / 794)`，经 CSS 变量 `--preview-fit` / `--preview-fit-h` + transform 缩放；`resume.css` 里相关样式只在 `@media screen` 生效，`@media print` 下 `!important` 复位原尺寸——「导出 PDF」是 window.print()，会打印预览容器内的文档，缩放绝不能带进打印。不要把这套缩放改成内联样式或套到打印链路。

## 编辑器 ↔ 预览交互（证件照 / 点模块跳转）

`ResumeDocument` 的交互能力全部由编辑器经 props 注入（`onSectionClick` / `onPhotoUpload` / `onPhotoRemove` / `photoBusy`），查看器不传 → 纯展示，不受影响。两条铁律：交互元素一律 `print:hidden`（打印文档里不能出现按钮/占位）；交互不得改变布局占位（用 `outline` 不用 `border`，否则破坏 Paginator 测量与分页）。

- **证件照在预览里直接传**：左侧基本信息区不再有上传块（只留一行提示文案），隐藏 `input[type=file]` 在 `ResumeEditor`（`photoInputRef`，`triggerPhotoUpload` 触发）。预览头部（classic/compact/card 的 `SingleHeader`）或 sidebar 渲染 `PhotoZone`：无照片 = 虚线占位按钮（编辑器才渲染），有照片 = 点击整图更换（hover 出「点击更换」遮罩）+ 右上角 × 移除；所有点击 `stopPropagation`（避免顺带触发模块跳转）。
- **点预览模块跳左侧编辑区**：传了 `onSectionClick` 时，`buildBlocks`（block 模板）与 `SidebarLayout`（sidebar 模板）把每个板块包进 `ClickableSection`（`data-section=key`，hover 出 sage outline，title「点击编辑此模块」）。编辑器侧 `handlePreviewSectionClick` 按 key 映射到左侧分区 id（header/summary→`sec-basics`，其余 key 同名；分区 id 见 `sec-*`），`scrollIntoView` + 重放 `.sec-flash` 高亮（`index.css`，1.3s 动画，先移除类→强制 reflow→加回）。`previewMode`（全屏预览）下不传 `onSectionClick`。

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

Paginator 经 `onPages(count)` 上报页数（ref 持有回调、仅变化时上报，勿把 `onPages` 放进测量 effect 依赖）。按钮是**开关**，三态视觉：中性（白底灰边）/ 压缩中（`bg-sage-100` + spinner 图标）/ 点亮（`bg-sage-600` + `shadow-sm`），`active:scale-95` 提供按压反馈，无任何浮动提示文案（结果由「共 N 页」传达）。点亮时「共 N 页」右侧出现 ↺ 小图标按钮（`Icon name="undo"`，title「恢复压缩前的排版」，点击等价再点智能一页）作为可恢复性的可视提示。点击时先快照当前 settings（`preFitSettingsRef`）：count > 1 启动 effect 循环（依赖仅 `[autoFit]`，页数经 ref 读、设置经 `update` 函数式更新读，每步 `setTimeout 220ms` 等重排稳定），按比例缩 fontScale/lineHeight/blockGap/pageMargin 直到 1 页或触底（`FIT_MIN`）或 14 步上限；结束（含触底）置 `fitApplied` 点亮。count <= 1 时点击直接点亮（开关语义统一，不提示「已是一页」）。再次点击经 `update` 恢复快照设置（可撤销）并熄灭。

## 模板

`template: classic | compact | card | sidebar`（`types/resume.ts`），选项表在 `resumeTheme.ts`。card = `buildBlocks(data, theme, sections, true)`：整体扁平白底（打印根与屏幕 sheet 均 `bg-white`，无彩色大横幅），**板块标题留在卡片外**，只有模块内容（七个 block 组件的 `CardBox` 包裹 + `addListSection` 的逐条目）包进 `CARD_CLASS`（`rounded-xl border bg-white shadow-sm`）小卡片。sheet 恒白底（`resume-sheet bg-white`），没有页面底色 prop。

## 已踩过的坑

- 本项目 ESLint **未启用** react-hooks 插件：不要写 `// eslint-disable-next-line react-hooks/...`，`--report-unused-disable-directives` 会报 error。
- 图标用 `components/Icon.tsx`（lucide 封装，fa 风格 name）；新图标名先查 `ICON_MAP`，没有就在 map 里加。
- 测试断言 DOM 结构时注意：内容会同时出现在打印文档 + 测量层 + 可见 sheet，用 `getAllByText(...)[0]` / `closest()`。
- 富文本存受限 `<span class>`，Markdown 渲染见 RichText 组件；`exportWord` 有独立测试。
- `skills` 是 Markdown 富文本字符串（同 `summary`），不是数组：旧版分组数组数据由 `migrateResume()`（`resumeIo.ts`）在四个入口兜底转换（content.ts 加载、编辑器/查看器数据派生、AI generate/parse/translate 返回）。新写技能相关代码不要假设数组。
- 兴趣爱好与校园活动/资格证书一致：编辑框默认隐藏，点分区「添加」才出现；标签清空后自动重新隐藏（`interestsOpen` state）。兴趣标签删除有两条路：单个标签 ×（`TagField`，hover 变红，title「移除」——TagField 测试断言这个 title）与分区头部「清空」（`SectionHeader` 的 `onClear`，trash 图标，仅有内容时显示，title「删除该模块下的全部内容」）。
- `basics.hometown`（籍贯，可选）：输入框在基本信息区政治面貌之后；`ContactList` 以 `home` 图标输出，排在 location 之后，随 `headerAlign` 对齐。
- zustand persist 的 storage 是**异步** IndexedDB（`idbStateStorage`，`getItem` 返回 Promise 合法）；单测用 `fake-indexeddb/auto`（devDep）。清状态要 `indexedDB.deleteDatabase('ranpin-resume')` + `localStorage.clear()`——只清 localStorage 清不掉草稿。
- 查看器首屏是异步的（远程拉取）：`ResumeSection` 有 loading / error / 空态 / 离线横幅四分支，E2E 断言前等数据渲染，别只测 ready 路径。

## 部署

推 `main` → Actions 构建发 Pages。本机推送需：`git config http.version HTTP/1.1` + 重试循环
（`for i in 1..6; do git push origin main && break || sleep 8; done`）。提交按用户惯例带 `--no-verify`。
Pages CDN 部署后约 10 分钟可能回旧 bundle：用 dist 里的 bundle hash 对比线上 index.html 验证。
**内容更新不走这条链路**：数据仓库 openResume-data 的提交约 1 分钟刷新 raw 即线上生效，无构建。

产物结构（2026-07 审计）：主块 ~601 kB（gzip ~189 kB）= react-dom + js-yaml + markdown 链（react-markdown/parse5/micromark，查看器首屏渲染简历正文必需，**勿为此把 ResumeDocument/RichText 改懒加载**——会 suspend 简历主体）+ lucide（已 tree-shake）；重块均已懒加载：exportWord/docx ~373 kB、GlobalModals（含 highlight.js）~194 kB、ResumeEditor ~77 kB、AI 面板各 ~4–7 kB。Inter 字体只引 `@fontsource/inter/latin-{300,400,500,600}.css` + `latin-ext-*`（中文走系统回落；加回其他子集见 `main.tsx` 注释）。
