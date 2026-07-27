# openResume · 简历中心

[![Live](https://img.shields.io/badge/Live-ranpin.github.io%2FopenResume-4a614a?logo=githubpages&logoColor=white)](https://ranpin.github.io/openResume/)
[![Deploy](https://github.com/ranpin/openResume/actions/workflows/deploy.yml/badge.svg)](https://github.com/ranpin/openResume/actions/workflows/deploy.yml)
[![CI](https://github.com/ranpin/openResume/actions/workflows/ci.yml/badge.svg)](https://github.com/ranpin/openResume/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)

Ranpin 的在线简历中心，独立部署在 **https://ranpin.github.io/openResume/**，由主站（[ranpin.github.io](https://ranpin.github.io/)）以入口卡片引用。

一个自洽的 Vite + React + TypeScript 单页应用，包含四大功能。

## 功能

### 在线简历编辑器

双栏编辑：左侧分区表单，右侧实时预览。

- **全局设置在顶部工具栏**
  - 「模板」「配色」「排版」「模块」四个下拉面板
  - 「排版」：字号（Word 式磅值，可输入半数档）/ 行距 / 间距 / 页边距 / 字体 / 标题行数 / 字段样式 / 密度预设（紧凑·默认·宽松）
  - 「模块」：模块管理——拖拽调序、改名、显隐
  - 「智能一页」：开关式，一键压缩排版塞进一页，再点恢复压缩前的排版
  - 页数显示、撤销/重做（按钮 + ⌘Z/⌘⇧Z）、预览模式（隐藏表单、预览占满）、保存、发布到线上
- **富文本工具栏**：加粗 / 斜体 / 下划线 / 删除线 / 代码、序列号 / 箭头列表 / 引用 / 链接、字号 / 颜色 / 对齐
- **多模板多配色**：经典 / 紧凑 / 卡片 / 双栏侧边四套版式，五套配色
- **文本格式**：条目标题单行 / 双行，字段分隔符 `·` `/` `|` 或分散对齐
- **真·多页 A4 预览**：随面板宽度自适应缩放，窄屏不溢出
- **统一导出**：PDF 打印 / Word / YAML 数据 / 全量 JSON 备份
- **更多**：导入简历、翻译成英文
- **本地草稿**：改动实时存浏览器 IndexedDB，可导出 JSON 备份 / 导入恢复

### 经历库

项目 / 论文 / 实习 / 荣誉的结构化目录，含详情弹窗与相关推荐。

### 大模型生成简历（BYOK）

填入自己的 Anthropic Key（仅存本地浏览器），结合岗位 JD + 经历 + 技术文档主题生成一份优化简历草稿。

### 一键发布

填入自己的 GitHub Token（仅存本地浏览器，需数据仓库 Contents 读写），把简历 YAML 提交到数据仓库 `resumes/`，站点运行时自动拉取，约 1 分钟后线上更新。

## 数据架构（代码与数据隔离）

本仓库是**纯应用**，不含任何个人数据。数据分两处：

- **数据仓库 [ranpin/resume-data](https://github.com/ranpin/resume-data)**（公开）：`resumes/`、`projects/`、`internships/`、`honors.yaml` 与清单 `index.json`。站点运行时从 raw.githubusercontent.com 拉取（`cache: no-store`，约 1 分钟刷新；网络不可用时回退本机离线缓存并提示）。改内容 = 改数据仓库的 YAML 并提交，或用网页编辑器「发布到线上」一键提交。
- **本机浏览器 IndexedDB**（库 `ranpin-resume`）：编辑草稿、发布指纹、远程内容离线缓存。配额以 GB 计，刷新 / 关浏览器不丢；旧版 localStorage 草稿首次打开自动迁入。编辑器「导出 → 备份全部数据（JSON）」与简历页「导入备份」可跨设备迁移。

## Fork 自用

1. fork 本仓库；
2. 建一个自己的数据仓库（结构照抄 resume-data：`resumes/`、`projects/`、`internships/`、`honors.yaml` + 清单 `index.json`），把 `src/data/source.ts` 的 `DATA_SOURCE` 改成 `{ owner: '你的用户名', repo: '你的数据仓库', branch: 'main' }`；
3. 「发布到线上」随即指向你的数据仓库（Token 需该仓库 Contents 读写）。

不想建数据仓库？把 `DATA_SOURCE` 置 `null` 进入**纯本地模式**：无远程数据，简历经「AI 生成 / 导入简历」创建、只存本机 IndexedDB，发布入口自动隐藏。

## 开发

```bash
npm install
npm run dev        # 本地开发（http://localhost:5173/openResume/）
npm run build      # 构建（base = /openResume/）
npm run preview
npm run lint && npm run typecheck && npx vitest run
```

## 部署

推送到 `main` → `.github/workflows/deploy.yml` 构建并发布到 GitHub Pages 项目页 `/openResume/`。`vite.config.ts` 的 `base: '/openResume/'` 是项目页必需。

> 密钥（AI / GitHub Token）只保存在使用者本地浏览器，不入库、不经服务器，仅站点所有者本人使用。
