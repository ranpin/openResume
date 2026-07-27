// 简历体检引擎：对一份简历跑一组质量检查（对标 WonderCV「智能纠错 20 大问题」），
// 每条问题带严重级别、说明、定位分区，部分支持一键修复（安全的清理操作）。
// 与 resumeCompleteness（完成度）互补：完成度看「填没填」，体检看「写得好不好 / 有没有坑」。

import type { ResumeData } from '../../types/resume';

export type Severity = 'error' | 'warn' | 'info';

export interface CheckIssue {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  sectionKey?: string; // 定位到的编辑器分区（sec-<key>）
  fix?: (d: ResumeData) => void; // 一键修复（仅安全清理）
}

const has = (s?: string) => !!s && s.trim().length > 0;
const stripMd = (s: string) => s.replace(/[*_`~]/g, '').trim();
const hasDigit = (s: string) => /\d/.test(s);

// 把「2022.09 - 2025.06」「2023/06-至今」之类解析成可比较的 [start, end]（年*12+月）。
// 解析不出来就返回 null，宁可不报也不要误报。
function parsePeriod(p?: string): { start: number; end: number } | null {
  if (!p) return null;
  const now = new Date();
  const nowM = now.getFullYear() * 12 + (now.getMonth() + 1);
  const nums = Array.from(p.matchAll(/(\d{4})[.\-/年]?(\d{1,2})?/g)).map((m) => {
    const y = Number(m[1]);
    const mo = m[2] ? Number(m[2]) : 1;
    return y * 12 + mo;
  });
  if (nums.length === 0) return null;
  const start = nums[0];
  let end: number;
  if (/至今|今|present|now|目前|当前/i.test(p)) end = nowM;
  else end = nums.length >= 2 ? nums[nums.length - 1] : start;
  if (end < start) end = start;
  return { start, end };
}

export function runChecks(d: ResumeData): CheckIssue[] {
  const b = d.basics;
  const edu = d.education || [];
  const work = d.work || [];
  const internship = d.internship || [];
  const projects = d.projects || [];
  const skills = stripMd(d.skills || '');
  const awards = d.awards || [];
  const certs = d.certificates || [];
  const issues: CheckIssue[] = [];

  // —— 基本信息 ——
  if (!has(b.email) && !has(b.phone)) {
    issues.push({
      id: 'no-contact',
      severity: 'error',
      title: '缺少联系方式',
      detail: '邮箱和手机号至少留一个，否则 HR 无法联系你。',
      sectionKey: 'basics',
    });
  }
  if (has(b.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email!.trim())) {
    issues.push({
      id: 'bad-email',
      severity: 'error',
      title: '邮箱格式不正确',
      detail: `「${b.email}」看起来不是有效邮箱，请检查拼写。`,
      sectionKey: 'basics',
    });
  }
  if (!has(b.title)) {
    issues.push({
      id: 'no-title',
      severity: 'warn',
      title: '未填写求职意向',
      detail: '写明目标岗位/头衔，让 HR 一眼知道你的方向。',
      sectionKey: 'basics',
    });
  }
  const summary = stripMd(b.summary || '');
  if (!summary) {
    issues.push({
      id: 'no-summary',
      severity: 'warn',
      title: '缺少个人简介',
      detail: '用 2-3 句话概括核心优势，可点「填入示例」参照写法。',
      sectionKey: 'basics',
    });
  } else if (summary.length < 20) {
    issues.push({
      id: 'summary-short',
      severity: 'info',
      title: '个人简介过短',
      detail: '简介只有 ' + summary.length + ' 字，建议 40-120 字，突出亮点。',
      sectionKey: 'basics',
    });
  } else if (summary.length > 200) {
    issues.push({
      id: 'summary-long',
      severity: 'info',
      title: '个人简介过长',
      detail: '简介达 ' + summary.length + ' 字，建议精简到 200 字以内。',
      sectionKey: 'basics',
    });
  }
  if (!has(b.photo)) {
    issues.push({
      id: 'no-photo',
      severity: 'info',
      title: '未上传证件照',
      detail: '部分岗位/国企看重证件照，可按需上传一张正式照片。',
      sectionKey: 'basics',
    });
  }

  // —— 教育 ——
  if (edu.length === 0) {
    issues.push({
      id: 'no-edu',
      severity: 'warn',
      title: '缺少教育经历',
      detail: '应届/在校生尤其要写清学校、学历与时间。',
      sectionKey: 'education',
    });
  }
  edu.forEach((e, i) => {
    if (has(e.school) && !has(e.period)) {
      issues.push({
        id: `edu-period-${i}`,
        severity: 'warn',
        title: `教育经历 #${i + 1} 缺少时间`,
        detail: `「${e.school}」未填写就读时间。`,
        sectionKey: 'education',
      });
    }
  });

  // —— 工作 / 实习 / 项目 ——
  if (work.length === 0 && internship.length === 0 && projects.length === 0) {
    issues.push({
      id: 'no-exp',
      severity: 'warn',
      title: '缺少工作/项目经历',
      detail: '经历是简历的核心，至少补充一段工作或项目经历。',
      sectionKey: 'work',
    });
  }

  const collectHighlights = (): { text: string; where: string }[] => {
    const out: { text: string; where: string }[] = [];
    work.forEach((w) =>
      (w.highlights || []).forEach((h) =>
        out.push({ text: h, where: w.company || '工作经历' }),
      ),
    );
    internship.forEach((w) =>
      (w.highlights || []).forEach((h) =>
        out.push({ text: h, where: w.company || '实习经历' }),
      ),
    );
    projects.forEach((p) =>
      (p.highlights || []).forEach((h) =>
        out.push({ text: h, where: p.name || '项目经历' }),
      ),
    );
    return out;
  };
  const hl = collectHighlights();

  if (hl.some((h) => !stripMd(h.text))) {
    issues.push({
      id: 'empty-highlight',
      severity: 'error',
      title: '存在空白要点',
      detail: '有留空的要点条目，建议删除以保持整洁。',
      sectionKey: 'work',
      fix: (dd) => {
        const clean = (arr?: string[]) =>
          arr ? arr.filter((s) => stripMd(s)) : arr;
        (dd.work || []).forEach((w) => {
          w.highlights = clean(w.highlights);
          (w.projects || []).forEach((sp) => (sp.highlights = clean(sp.highlights)));
        });
        (dd.internship || []).forEach((w) => {
          w.highlights = clean(w.highlights);
          (w.projects || []).forEach((sp) => (sp.highlights = clean(sp.highlights)));
        });
        (dd.projects || []).forEach((p) => (p.highlights = clean(p.highlights)));
        (dd.activities || []).forEach((a) => (a.highlights = clean(a.highlights)));
      },
    });
  }

  const solid = hl.filter((h) => stripMd(h.text));
  if (solid.length > 0) {
    const noNum = solid.filter((h) => !hasDigit(stripMd(h.text)));
    if (noNum.length >= Math.ceil(solid.length / 2)) {
      issues.push({
        id: 'no-quant',
        severity: 'info',
        title: '要点缺少量化成果',
        detail: `超过一半的经历要点没有数字（如提升 X%、服务 N 万用户）。量化能让成果更可信。`,
        sectionKey: 'work',
      });
    }
    const tooShort = solid.filter((h) => stripMd(h.text).length < 8);
    if (tooShort.length > 0) {
      issues.push({
        id: 'short-highlight',
        severity: 'info',
        title: '部分要点过于简短',
        detail: `有 ${tooShort.length} 条要点不足 8 字，建议写清「做了什么 + 取得什么结果」。`,
        sectionKey: 'work',
      });
    }
  }

  // —— 时间线矛盾（保守：仅当两段都解析成功且明显重叠才报）——
  const workPeriods = work
    .map((w) => ({ name: w.company || '工作', p: parsePeriod(w.period) }))
    .filter((x) => x.p) as { name: string; p: { start: number; end: number } }[];
  for (let i = 0; i < workPeriods.length; i++) {
    for (let j = i + 1; j < workPeriods.length; j++) {
      const a = workPeriods[i].p;
      const b2 = workPeriods[j].p;
      const overlap = Math.min(a.end, b2.end) - Math.max(a.start, b2.start);
      if (overlap >= 3) {
        // 重叠 ≥3 个月才提示，避免「同月衔接」误报
        issues.push({
          id: `period-overlap-${i}-${j}`,
          severity: 'warn',
          title: '工作时间线可能重叠',
          detail: `「${workPeriods[i].name}」与「${workPeriods[j].name}」的时间段有重叠，若是全职请核对；并行实习可忽略。`,
          sectionKey: 'work',
        });
      }
    }
  }

  // —— 技能 ——
  if (!skills) {
    issues.push({
      id: 'no-skills',
      severity: 'warn',
      title: '缺少专业技能',
      detail: '列出核心技能，让 HR 快速判断匹配度。',
      sectionKey: 'skills',
    });
  }

  // —— 荣誉/证书 ——
  if (awards.length === 0 && certs.length === 0) {
    issues.push({
      id: 'no-awards',
      severity: 'info',
      title: '未填写荣誉/证书',
      detail: '有奖学金、竞赛或职业证书的话，别漏掉这一栏。',
      sectionKey: 'awards',
    });
  }

  // —— ATS 兼容：分区标题尽量用通用名，避免 HR/机筛认不出 ——
  const STD: Record<string, string[]> = {
    education: ['教育', '学历', 'education'],
    work: ['工作', '经历', '实习', 'work', 'experience'],
    internship: ['实习', '经历', 'internship', 'work', 'experience'],
    projects: ['项目', 'project'],
    skills: ['技能', 'skill'],
  };
  (d.sections || []).forEach((s) => {
    const std = STD[s.key];
    if (std && s.title && s.title.trim()) {
      const t = s.title.trim().toLowerCase();
      if (!std.some((k) => t.includes(k))) {
        issues.push({
          id: `ats-title-${s.key}`,
          severity: 'info',
          title: `分区标题「${s.title}」可能不利于机筛`,
          detail: `ATS/HR 通常按「${std[0]}经历」等通用名识别模块，建议保留通用关键词。`,
        });
      }
    }
  });

  const order: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  return issues.sort((a, b2) => order[a.severity] - order[b2.severity]);
}

export function issueCounts(issues: CheckIssue[]): {
  error: number;
  warn: number;
  info: number;
} {
  return {
    error: issues.filter((i) => i.severity === 'error').length,
    warn: issues.filter((i) => i.severity === 'warn').length,
    info: issues.filter((i) => i.severity === 'info').length,
  };
}
