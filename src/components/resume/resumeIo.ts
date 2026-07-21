import { dump } from 'js-yaml';
import type { ResumeData } from '../../types/resume';

// 简历数据的克隆 / 清洗 / 导出（编辑器与查看页共用）。

export const cloneResume = (d: ResumeData): ResumeData =>
  JSON.parse(JSON.stringify(d));

const clean = (arr?: string[]): string[] =>
  (arr || []).map((s) => s.trim()).filter(Boolean);

// 去掉编辑过程中产生的空白数组项，得到可发布的干净数据
export const sanitizeResume = (d: ResumeData): ResumeData => {
  const c = cloneResume(d);
  if (c.work) c.work = c.work.map((w) => ({ ...w, highlights: clean(w.highlights) }));
  if (c.projects)
    c.projects = c.projects.map((p) => ({
      ...p,
      tech: clean(p.tech),
      highlights: clean(p.highlights),
    }));
  if (c.skills) c.skills = c.skills.map((s) => ({ ...s, items: clean(s.items) }));
  return c;
};

// 规范化内容指纹（忽略 id 与空白项差异），用于比较草稿/已发布/已提交是否一致
export const normalizeResume = (d: ResumeData): string => {
  const { id, ...rest } = sanitizeResume(d);
  void id;
  return JSON.stringify(rest);
};

// 两份简历内容是否等价
export const isSameResume = (a: ResumeData, b: ResumeData): boolean =>
  normalizeResume(a) === normalizeResume(b);

// 导出与 content/resumes/*.yaml 同构的 YAML（id 由文件名派生，故省略）
export const resumeToYaml = (d: ResumeData): string => {
  const { id, ...rest } = sanitizeResume(d);
  void id;
  return dump(rest, { lineWidth: 100, noRefs: true });
};

export const downloadResumeYaml = (d: ResumeData): void => {
  const blob = new Blob([resumeToYaml(d)], {
    type: 'text/yaml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.id}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
};
