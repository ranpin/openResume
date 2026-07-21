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
  avatar?: string; // 首字母或图片 URL（MVP 用首字母）
}

export interface ResumeEducation {
  school: string;
  degree?: string;
  major?: string;
  period?: string;
  gpa?: string;
  detail?: string;
}

export interface ResumeWork {
  company: string;
  position?: string;
  period?: string;
  location?: string;
  highlights?: string[];
}

export interface ResumeProject {
  name: string;
  role?: string;
  period?: string;
  tech?: string[];
  highlights?: string[];
  link?: string;
}

export interface ResumeSkill {
  category?: string;
  items: string[];
}

export interface ResumeAward {
  title: string;
  issuer?: string;
  date?: string;
}

// 模板（版式）与配色主题
export type ResumeTemplate = 'classic' | 'sidebar' | 'compact';
export type ResumeTheme = 'blue' | 'emerald' | 'violet' | 'rose' | 'slate';

export interface ResumeData {
  id: string; // 文件名 slug，稳定唯一
  label: string; // 横排 tab 名，如「算法岗·2026」
  target?: string; // 目标岗位 / 说明
  updated?: string; // 更新日期
  pdfUrl?: string; // 预留：混合模式挂现成 PDF（MVP 不用）
  template?: ResumeTemplate; // 版式，默认 classic
  theme?: ResumeTheme; // 配色，默认 blue
  basics: ResumeBasics;
  education?: ResumeEducation[];
  work?: ResumeWork[];
  projects?: ResumeProject[];
  skills?: ResumeSkill[];
  awards?: ResumeAward[];
}
