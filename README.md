# 简历中心 · resume

[![Live](https://img.shields.io/badge/Live-ranpin.github.io%2Fresume-2563eb?logo=githubpages&logoColor=white)](https://ranpin.github.io/resume/)
[![Deploy](https://github.com/ranpin/resume/actions/workflows/deploy.yml/badge.svg)](https://github.com/ranpin/resume/actions/workflows/deploy.yml)
[![CI](https://github.com/ranpin/resume/actions/workflows/ci.yml/badge.svg)](https://github.com/ranpin/resume/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)

Ranpin 的在线简历中心，独立部署在 **https://ranpin.github.io/resume/**，由主站（[ranpin.github.io](https://ranpin.github.io/)）以入口卡片引用。

一个自洽的 Vite + React + TypeScript 单页应用，包含三大功能：

- **在线简历编辑器** —— 超级简历式双栏编辑（分区表单 + 实时预览），富文本工具栏（加粗/斜体/下划线/删除线/代码、序列号/箭头列表/引用/链接、字号/颜色/对齐）、多模板（经典/紧凑/双栏侧边）、多配色、真·多页 A4 预览、浏览器打印导出 PDF。改动实时存本地浏览器（localStorage 草稿）。
- **经历库** —— 项目 / 论文 / 实习 / 荣誉的结构化目录，含详情弹窗与相关推荐。
- **大模型生成简历（BYOK）** —— 填入自己的 Anthropic Key（仅存本地浏览器），结合岗位 JD + 经历 + 技术文档主题生成一份优化简历草稿。
- **一键发布** —— 填入自己的 GitHub Token（仅存本地浏览器，需本仓库 Contents 读写），把简历 YAML 提交到 `content/resumes/` → GitHub Actions 自动部署。

## 内容

所有内容在 `content/`：`resumes/`（简历，见 `content/resumes/README.md`）、`projects/`、`internships/`、`honors.yaml`（经历库）。改内容 = 改这些 YAML 并提交，或用网页编辑器「发布到线上」。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 构建（base = /resume/）
npm run preview
npm run lint && npm run typecheck && npx vitest run
```

## 部署

推送到 `main` → `.github/workflows/deploy.yml` 构建并发布到 GitHub Pages 项目页 `/resume/`。`vite.config.ts` 的 `base: '/resume/'` 是项目页必需。

> 密钥（AI / GitHub Token）只保存在使用者本地浏览器，不入库、不经服务器，仅站点所有者本人使用。
