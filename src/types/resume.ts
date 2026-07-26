// 简历文档中心的结构化数据模型。
// 每份简历是一份 ResumeData：站点渲染为 A4 简历用于查看，
// 编辑器编辑这份数据（草稿存 localStorage），大模型未来也产出这份数据。
// 源文件在 content/resumes/*.yaml，由 src/data/content.ts 加载。

export interface ResumeBasics {
  name: string;
  title?: string; // 求职意向 / 头衔
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  github?: string;
  summary?: string; // 个人简介 / 自我评价
  avatar?: string; // 首字母或图片 URL（无证件照时的兜底）
  photo?: string; // 证件照：dataURL（上传后内嵌）或图片 URL
}

export interface ResumeEducation {
  school: string;
  college?: string; // 学院，条目标题行的次级字段（排版见 settings.headerLines / fieldSeparator）
  degree?: string;
  major?: string;
  period?: string;
  gpa?: string;
  courses?: string; // 主修课程，逗号分隔的一行
  detail?: string;
}

export interface ResumeProject {
  name: string;
  role?: string;
  period?: string;
  tech?: string[];
  highlights?: string[];
  link?: string;
}

export interface ResumeWork {
  company: string;
  position?: string;
  period?: string;
  location?: string;
  highlights?: string[];
  // 同一家公司下可承接多个项目：作为工作经历的子模块内嵌展示。
  projects?: ResumeProject[];
}

export interface ResumeAward {
  title: string;
  issuer?: string;
  date?: string;
}

// 证书：名称 + 颁发方 + 取得时间
export interface ResumeCertificate {
  name: string;
  issuer?: string;
  date?: string;
}

// 语言能力：语言名 + 熟练度（如 CET-6 / 流利 / 精通）
export interface ResumeLanguage {
  name: string;
  level?: string;
}

// 校园活动 / 课外活动 / 学生工作：组织或活动名 + 角色 + 时间 + 要点
export interface ResumeActivity {
  name: string;
  role?: string;
  period?: string;
  highlights?: string[];
}

// 模板（版式）与配色主题
export type ResumeTemplate = 'classic' | 'sidebar' | 'compact' | 'card';
export type ResumeTheme = 'blue' | 'emerald' | 'violet' | 'rose' | 'slate';

// 条目标题行的字段排列方式：
// - justify：分散对齐（无分隔符），首字段贴左、时间贴右、中间字段均分间距（两端对齐）
// - dot / slash / bar：用 · / / / | 连接成一组
export type ResumeFieldSeparator = 'justify' | 'dot' | 'slash' | 'bar';

// 全局排版设置：作用于整份简历（字号、行距、块间距、页边距）。
// 通过 CSS 变量下发到简历根节点，缺省时用文档默认值。
export interface ResumeSettings {
  fontScale?: number; // 全局字号倍率，1 = 默认，范围约 0.85–1.2
  lineHeight?: number; // 正文行距，默认 1.6，范围约 1.2–2
  blockGap?: number; // 各条目/分区之间的间距(px)，默认 16
  pageMargin?: number; // A4 页边距(px)，默认 45
  fontFamily?: string; // 正文字体 key（见 resumeFonts.FONT_OPTIONS），缺省沿用站点默认
  headerLines?: 1 | 2; // 条目标题行数：1=单行（字段同行），2=双行（主标题+时间一行、其余字段次行）；默认 2
  fieldSeparator?: ResumeFieldSeparator; // 标题行字段排列，默认 dot（·）
}

// 可编辑的模块（分区）种类。顺序、标题、显隐由 sections 配置驱动。
// 'custom' 为用户自定义模块（自由标题 + 富文本正文），可有多份，用 customId 区分。
export type ResumeSectionKey =
  | 'summary'
  | 'education'
  | 'work'
  | 'projects'
  | 'skills'
  | 'awards'
  | 'certificates'
  | 'languages'
  | 'activities'
  | 'interests'
  | 'custom';

// 单个模块的展示配置：自定义标题、是否隐藏。顺序由数组顺序决定。
export interface ResumeSectionConfig {
  key: ResumeSectionKey;
  title?: string; // 自定义模块名，缺省用内置默认名
  hidden?: boolean; // 隐藏该模块（数据保留，不渲染）
  customId?: string; // key === 'custom' 时指向 data.custom[].id
}

// 自定义模块：自由标题 + 富文本正文（Markdown，同个人简介）。id 稳定唯一。
export interface ResumeCustomSection {
  id: string;
  title: string;
  content?: string;
}

export interface ResumeData {
  id: string; // 文件名 slug，稳定唯一
  label: string; // 横排 tab 名，如「算法岗·2026」
  target?: string; // 目标岗位 / 说明
  updated?: string; // 更新日期
  pdfUrl?: string; // 预留：混合模式挂现成 PDF（MVP 不用）
  template?: ResumeTemplate; // 版式，默认 classic
  theme?: ResumeTheme; // 配色，默认 blue
  settings?: ResumeSettings; // 全局排版设置
  sections?: ResumeSectionConfig[]; // 模块顺序 / 自定义标题 / 显隐
  basics: ResumeBasics;
  education?: ResumeEducation[];
  work?: ResumeWork[];
  projects?: ResumeProject[];
  skills?: string; // 专业技能：富文本（Markdown，同个人简介）。旧版为分组数组，载入时由 migrateResume 迁移
  awards?: ResumeAward[];
  certificates?: ResumeCertificate[];
  languages?: ResumeLanguage[];
  activities?: ResumeActivity[];
  interests?: string[];
  custom?: ResumeCustomSection[]; // 自定义模块（自由标题 + 富文本正文）
}
