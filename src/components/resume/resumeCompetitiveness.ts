// 多维度竞争力评估：从「经历深度 / 成果量化 / 技能画像 / 教育背景 / 表达精炼 / 信息完整」
// 六个维度给简历打分（0-100），区别于完成度（看填没填）——这里看「写得强不强」。

import type { ResumeData } from '../../types/resume';

export interface Dimension {
  key: string;
  label: string;
  score: number; // 0-100
  hint: string;
}

export interface CompetitivenessResult {
  overall: number;
  dims: Dimension[];
}

const has = (s?: string) => !!s && s.trim().length > 0;
const stripMd = (s: string) => s.replace(/[*_`~]/g, '').trim();
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeCompetitiveness(d: ResumeData): CompetitivenessResult {
  const b = d.basics;
  const edu = d.education || [];
  const work = d.work || [];
  const projects = d.projects || [];
  const skills = d.skills || [];

  const highlights: string[] = [];
  work.forEach((w) => (w.highlights || []).forEach((h) => highlights.push(h)));
  work.forEach((w) =>
    (w.projects || []).forEach((sp) =>
      (sp.highlights || []).forEach((h) => highlights.push(h)),
    ),
  );
  projects.forEach((p) => (p.highlights || []).forEach((h) => highlights.push(h)));
  const solid = highlights.map(stripMd).filter((s) => s.length > 0);

  // 1. 经历深度：有效要点数量（8 条及以上视为充实）
  const depthScore = clamp((solid.length / 8) * 100);
  const depth: Dimension = {
    key: 'depth',
    label: '经历深度',
    score: depthScore,
    hint:
      solid.length >= 8
        ? '经历充实，要点丰富。'
        : `已有 ${solid.length} 条要点，补充到 8 条以上更有说服力。`,
  };

  // 2. 成果量化：带数字的要点占比
  const quantRatio =
    solid.length > 0
      ? solid.filter((s) => /\d/.test(s)).length / solid.length
      : 0;
  const quant: Dimension = {
    key: 'quant',
    label: '成果量化',
    score: clamp(quantRatio * 100),
    hint:
      quantRatio >= 0.6
        ? '多数要点都有量化成果，很专业。'
        : '多用数字（提升 X%、服务 N 万用户）量化你的成果。',
  };

  // 3. 技能画像：技能数量 + 是否标注熟练度
  const items = skills.flatMap((s) => (s.items || []).filter(has));
  const leveled = skills.flatMap((s) => Object.keys(s.levels || {}));
  const skillBase = clamp((items.length / 8) * 80);
  const levelBonus = items.length > 0 ? clamp((leveled.length / items.length) * 20) : 0;
  const skill: Dimension = {
    key: 'skill',
    label: '技能画像',
    score: clamp(skillBase + levelBonus),
    hint:
      items.length >= 6 && leveled.length > 0
        ? '技能清晰且标注了熟练度。'
        : '补充核心技能并标注熟练度，画像更立体。',
  };

  // 4. 教育背景：条目完整度 + GPA + 课程
  let eduScore = 0;
  if (edu.length > 0) {
    const e = edu[0];
    eduScore += has(e.school) ? 30 : 0;
    eduScore += has(e.degree) ? 15 : 0;
    eduScore += has(e.major) ? 15 : 0;
    eduScore += has(e.period) ? 20 : 0;
    eduScore += has(e.gpa) ? 10 : 0;
    eduScore += has(e.courses) ? 10 : 0;
  }
  const education: Dimension = {
    key: 'education',
    label: '教育背景',
    score: clamp(eduScore),
    hint:
      eduScore >= 80
        ? '教育信息完整。'
        : '补全学历、专业、时间，可加 GPA 与主修课程。',
  };

  // 5. 表达精炼：要点长度适中（8-60 字）占比 + 简介合适
  const goodLen =
    solid.length > 0
      ? solid.filter((s) => s.length >= 8 && s.length <= 60).length / solid.length
      : 0;
  const summary = stripMd(b.summary || '');
  const summaryOk = summary.length >= 20 && summary.length <= 200 ? 1 : 0;
  const polish: Dimension = {
    key: 'polish',
    label: '表达精炼',
    score: clamp(goodLen * 70 + summaryOk * 30),
    hint:
      goodLen >= 0.7 && summaryOk
        ? '要点简洁有力，简介得当。'
        : '要点控制在 8-60 字，简介 40-120 字更佳。',
  };

  // 6. 信息完整：联系方式 + 求职意向 + 链接/照片
  let info = 0;
  info += has(b.email) || has(b.phone) ? 40 : 0;
  info += has(b.title) ? 25 : 0;
  info += has(b.website) || has(b.github) ? 20 : 0;
  info += has(b.photo) ? 15 : 0;
  const infoDim: Dimension = {
    key: 'info',
    label: '信息完整',
    score: clamp(info),
    hint:
      info >= 80
        ? '基础信息齐全。'
        : '补全联系方式、求职意向，可加个人主页/证件照。',
  };

  const dims = [depth, quant, skill, education, polish, infoDim];
  const overall = clamp(
    dims.reduce((a, x) => a + x.score, 0) / dims.length,
  );

  return { overall, dims };
}
