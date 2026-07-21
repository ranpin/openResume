// 核心数据模型 —— 与 src/data/content.ts 的实际形状对齐。
// 字段大多为可选，以兼容不同条目提供的字段差异。

export interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  email: string;
  avatar: string;
  bio: { main: string; detail: string };
  researchInterests: string[];
  socialLinks: Record<string, string>;
}

export interface NewsItem {
  date: string;
  content: string;
  type?: string;
}

export interface TechnicalChallenge {
  challenge: string;
  solution?: string;
  impact?: string;
}

export interface ProjectResult {
  metric?: string;
  value?: string;
  baseline?: string;
  improvement?: string;
}

export interface Project {
  id: number | string;
  title: string;
  period?: string;
  description: string;
  tags: string[];
  status?: string;
  github?: string;
  demo?: string;
  businessContext?: string;
  yourRole?: string;
  architectureDetail?: string;
  abstract?: string;
  methodology?: string;
  technicalChallenges?: (TechnicalChallenge | string)[];
  results?: ProjectResult[];
  achievements?: string[];
  interviewHighlights?: string[];
  discussionTopics?: string[];
  demoImage?: string;
  architectureImage?: string;
  githubUrl?: string;
  liveUrl?: string;
}

export interface Publication {
  id: number | string;
  title: string;
  authors?: string;
  venue?: string;
  year?: string | number;
  type?: string;
  abstract?: string;
  citations?: number;
  link?: string;
  pdfUrl?: string;
  codeUrl?: string;
}

export interface SkillGained {
  name: string;
  description: string;
}

export interface Internship {
  id: number | string;
  company: string;
  position?: string;
  role?: string;
  period?: string;
  duration?: string;
  location?: string;
  type?: string;
  department?: string;
  description: string;
  responsibilities?: string | string[];
  contributions?: string | string[];
  achievements?: string[];
  skills?: string[];
  skillsGained?: SkillGained[];
  summary?: string;
  projectImage?: string;
  resultsImage?: string;
}

export interface Honor {
  id: number | string;
  year?: string | number;
  award?: string;
  organization?: string;
  title?: string;
  issuer?: string;
  date?: string;
  level?: string;
  description?: string;
}

// 探索空间「星际之门」的笔记：学习笔记(TIL) / 踩坑复盘
export interface Note {
  id: number | string;
  title: string;
  date?: string;
  type?: 'til' | 'postmortem';
  tags?: string[];
  content?: string;
  draft?: boolean;
}

// 详情弹窗可展示的任意条目
export type ContentItem = Project | Publication | Internship | Honor;
