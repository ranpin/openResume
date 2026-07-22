# 简历数据（content/resumes/）

本目录下每个 `NN-slug.yaml` 是**一份简历**，会出现在主站「个人简历 → 我的简历」的横排里，点击即渲染成 A4 简历查看，可一键导出 PDF。

- **文件名**：`NN-slug.yaml`，前缀 `NN` 控制横排顺序（如 `01-`、`02-`）。文件名（去掉扩展名）即该简历的稳定 id。
- **格式**：YAML，字段见下。除 `label` 与 `basics.name` 外基本都可选，留空的分区不会渲染。

## 字段

```yaml
label: 端侧大模型工程师        # 必填，横排 tab 名
target: 大模型 / AI Agent 方向  # 可选，目标岗位说明
updated: '2026-07'             # 可选，更新日期
template: classic             # 可选，版式：classic | sidebar | compact（默认 classic）
theme: blue                   # 可选，配色：blue | emerald | violet | rose | slate（默认 blue）
settings:                      # 可选，全局排版（一处调、全局变；预览与导出 PDF 同步生效）
  fontScale: 1                 # 全局字号倍率，默认 1（约 0.8–1.25）
  lineHeight: 1.6              # 正文行距，默认 1.6（约 1.2–2）
  blockGap: 16                 # 模块/条目间距 px，默认 16
  pageMargin: 45               # A4 页边距 px，默认 45
sections:                      # 可选，模块顺序 / 改名 / 显隐；未列出的模块按默认顺序补到末尾
  - key: work                  # summary|education|work|projects|skills|awards
    title: 职业经历            # 可选，自定义模块名（缺省用内置默认名）
    hidden: false              # 可选，隐藏该模块（数据保留、不渲染）
basics:                        # 必填
  name: Ranpin                 # 必填
  title: 求职意向 / 头衔
  email: you@example.com
  phone: '138...'
  location: 杭州，中国
  website: https://...
  github: https://github.com/you
  avatar: R                    # 无证件照时的首字母兜底
  photo: 'data:image/jpeg;base64,...'  # 可选，证件照（编辑器上传后自动压缩内嵌；也可填图片 URL）
  summary: 一段个人简介 / 自我评价
education:                     # 可选，数组
  - school: 学校
    degree: 学历
    major: 专业
    period: 2019 - 2023
    gpa: '3.8/4.0'
    detail: 补充说明
work:                          # 可选，数组
  - company: 公司
    position: 职位
    period: 2025.07 - 至今
    location: 杭州
    highlights: [要点1, 要点2]
    projects:                  # 可选，同一公司下的多个子项目（结构同独立 projects 条目）
      - name: 公司内项目A
        role: 你的角色
        period: 2025.08 - 2025.12
        tech: [C++, Python]
        highlights: [要点1, 要点2]
        link: https://...
projects:                      # 可选，独立「项目经历」模块，数组
  - name: 项目名
    role: 你的角色
    period: 2026.03 - 2026.04
    tech: [C++, Python]
    highlights: [要点1, 要点2]
    link: https://...
skills:                        # 可选，数组（按类别分组）
  - category: 编程语言
    items: [C++, Python]
awards:                        # 可选，数组
  - title: 奖项
    issuer: 颁发方
    date: '2026'
```

> **富文本**：`summary` 与各 `highlights`（含 `work[].projects[].highlights`）支持 Markdown（`**粗体**`、`*斜体*`、序列号/箭头列表、引用、`[文本](链接)`）以及网页编辑器工具栏的字号、颜色、对齐（存为受限的 `<span class>`）。网页编辑器右侧为真·多页 A4 预览。
>
> **全局排版 / 证件照 / 模块管理**：网页编辑器提供「全局排版」滑块（字号/行距/间距/页边距）、「基本信息」里的证件照上传（自动压缩内嵌）、以及「模块管理」（拖拽调序、改模块名、显隐）。这些都会写进本 YAML 的 `settings` / `basics.photo` / `sections` 字段。所有新字段均可选，旧简历不填也照常渲染。

## 编辑与发布

有三种方式：

1. **网页编辑器 +「发布到线上」（最省事）**：主站「个人简历 → 我的简历」点「编辑」修改，改动实时存本地浏览器。点 **「发布到线上」**，填入一次你的 GitHub Token（需本仓库 Contents 读写权限，仅存本地浏览器），即可一键提交到 `content/resumes/` 并自动部署，约 1 分钟后线上更新——**免手动提交**。
2. **网页编辑器 + 导出**：不想用 Token，就点「导出数据」下载 YAML，覆盖/新增到本目录后自行提交。可随时「导出 PDF」。
3. **直接改文件**：编辑本目录下的 `.yaml`，提交到仓库 → 自动部署。可在 GitHub 仓库页按 `.` 进 github.dev 在线编辑。

> 网页编辑器的本地草稿只存在你自己的浏览器里，不会自动进仓库、不影响线上，直到你把导出的 YAML 提交进来。
