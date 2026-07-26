// 简历完成度诊断：把一份简历拆成若干加权检查项，算出 0-100 的完成度，
// 并给出未完成项的改进建议。供编辑器的「完成度」面板使用。

import type { ResumeData } from '../../types/resume';

export interface CompletenessCheck {
  key: string;
  label: string; // 面板上显示的条目名
  tip: string; // 未完成时的建议
  weight: number; // 权重（所有检查项权重之和为 100）
  done: boolean;
  sectionKey?: string; // 点击后滚动到的编辑器分区 id（sec-<key>）
}

export interface CompletenessResult {
  score: number; // 0-100
  checks: CompletenessCheck[];
  missing: CompletenessCheck[]; // 未完成项（按权重降序）
}

const has = (s?: string) => !!s && s.trim().length > 0;

// 是否有一条「像样」的要点：非空且达到一定长度，鼓励写具体而非一句话带过
const solid = (s?: string) => !!s && s.trim().length >= 8;

export function computeCompleteness(d: ResumeData): CompletenessResult {
  const b = d.basics;
  const edu = d.education || [];
  const work = d.work || [];
  const projects = d.projects || [];
  const awards = d.awards || [];
  const certs = d.certificates || [];

  const goodEdu = edu.some(
    (e) => has(e.school) && (has(e.degree) || has(e.major)) && has(e.period),
  );
  const goodWork = work.some(
    (w) => has(w.company) && has(w.position) && (w.highlights || []).some(solid),
  );
  const goodProject = projects.some(
    (p) => has(p.name) && (p.highlights || []).some(solid),
  );
  const hasSkillItems = solid(d.skills);

  // 经历丰富度：工作/项目至少有一类写了 2 条以上要点
  const richHighlights =
    work.some((w) => (w.highlights || []).filter(solid).length >= 2) ||
    projects.some((p) => (p.highlights || []).filter(solid).length >= 2);

  const checks: CompletenessCheck[] = [
    {
      key: 'name',
      label: '姓名',
      tip: '填上你的姓名，这是简历最基本的信息。',
      weight: 5,
      done: has(b.name),
      sectionKey: 'basics',
    },
    {
      key: 'title',
      label: '求职意向',
      tip: '写明目标岗位/头衔，让 HR 一眼知道你的方向。',
      weight: 8,
      done: has(b.title),
      sectionKey: 'basics',
    },
    {
      key: 'contact',
      label: '联系方式',
      tip: '至少留下邮箱或手机号，否则 HR 联系不到你。',
      weight: 10,
      done: has(b.email) || has(b.phone),
      sectionKey: 'basics',
    },
    {
      key: 'summary',
      label: '个人简介',
      tip: '用 2-3 句话概括核心优势，可点「填入示例」参照写法。',
      weight: 12,
      done: solid(b.summary),
      sectionKey: 'basics',
    },
    {
      key: 'education',
      label: '教育经历',
      tip: '补全学校、学历和时间，应届/在校尤其重要。',
      weight: 15,
      done: goodEdu,
      sectionKey: 'education',
    },
    {
      key: 'work',
      label: '工作 / 实习经历',
      tip: '写出公司、职位，并用量化要点描述你的成果。',
      weight: 18,
      done: goodWork,
      sectionKey: 'work',
    },
    {
      key: 'projects',
      label: '项目经历',
      tip: '补充项目名与 1-2 条具体成果，技术岗加分项。',
      weight: 12,
      done: goodProject,
      sectionKey: 'projects',
    },
    {
      key: 'skills',
      label: '专业技能',
      tip: '列出核心技能，让 HR 快速判断匹配度。',
      weight: 10,
      done: hasSkillItems,
      sectionKey: 'skills',
    },
    {
      key: 'awards',
      label: '荣誉 / 证书',
      tip: '有奖学金、竞赛或证书的话，别漏掉这一栏。',
      weight: 5,
      done: awards.length > 0 || certs.length > 0,
      sectionKey: 'awards',
    },
    {
      key: 'richness',
      label: '要点丰富度',
      tip: '给工作/项目写 2 条以上量化要点，避免一句话带过。',
      weight: 5,
      done: richHighlights,
      sectionKey: 'work',
    },
  ];

  const score = Math.round(
    checks.reduce((acc, c) => acc + (c.done ? c.weight : 0), 0),
  );
  const missing = checks
    .filter((c) => !c.done)
    .sort((a, b2) => b2.weight - a.weight);

  return { score, checks, missing };
}

// 完成度档位与对应配色（用于进度条 / 分数徽章）
export function scoreTone(score: number): {
  bar: string;
  text: string;
  label: string;
} {
  if (score >= 85)
    return { bar: 'bg-emerald-500', text: 'text-emerald-600', label: '很完整' };
  if (score >= 60)
    return { bar: 'bg-sage-500', text: 'text-sage-600', label: '还不错' };
  if (score >= 40)
    return { bar: 'bg-amber-500', text: 'text-amber-600', label: '待完善' };
  return { bar: 'bg-rose-500', text: 'text-rose-600', label: '刚起步' };
}
