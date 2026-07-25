import { describe, it, expect } from 'vitest';
import { computeCompleteness, scoreTone } from './resumeCompleteness';
import type { ResumeData } from '../../types/resume';

const empty: ResumeData = {
  id: 'x',
  label: '空简历',
  basics: { name: '' },
};

const full: ResumeData = {
  id: 'y',
  label: '完整简历',
  basics: {
    name: '张三',
    title: '后端工程师',
    email: 'a@b.com',
    summary: '三年后端经验，擅长高并发与分布式架构设计。',
  },
  education: [
    { school: 'S 大学', degree: '本科', major: 'CS', period: '2019 - 2023' },
  ],
  work: [
    {
      company: '某司',
      position: '开发',
      highlights: ['重构核心链路，延迟下降 80%', '落地缓存方案，成本下降 60%'],
    },
  ],
  projects: [
    { name: 'P 项目', highlights: ['从 0 到 1 搭建解析服务，准确率 95%'] },
  ],
  skills: [{ category: '语言', items: ['Go', 'TS'] }],
  awards: [{ title: '奖学金' }],
};

describe('computeCompleteness', () => {
  it('scores an empty resume low and lists all checks as missing', () => {
    const r = computeCompleteness(empty);
    expect(r.score).toBeLessThan(20);
    // 姓名为空 → 所有检查项都未完成
    expect(r.missing.length).toBe(r.checks.length);
  });

  it('scores a full resume at 100 with no missing items', () => {
    const r = computeCompleteness(full);
    expect(r.score).toBe(100);
    expect(r.missing).toHaveLength(0);
  });

  it('check weights sum to 100', () => {
    const total = computeCompleteness(empty).checks.reduce(
      (a, c) => a + c.weight,
      0,
    );
    expect(total).toBe(100);
  });

  it('marks summary incomplete when too short', () => {
    const r = computeCompleteness({
      ...empty,
      basics: { name: '张三', summary: '太短' },
    });
    const summary = r.checks.find((c) => c.key === 'summary');
    expect(summary?.done).toBe(false);
  });
});

describe('scoreTone', () => {
  it('maps score bands to tones', () => {
    expect(scoreTone(90).label).toBe('很完整');
    expect(scoreTone(70).label).toBe('还不错');
    expect(scoreTone(50).label).toBe('待完善');
    expect(scoreTone(10).label).toBe('刚起步');
  });
});
