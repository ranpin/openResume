import { describe, it, expect } from 'vitest';
import { runChecks, issueCounts } from './resumeCheck';
import type { ResumeData } from '../../types/resume';

const base: ResumeData = {
  id: 'x',
  label: '测试',
  basics: { name: '张三' },
};

describe('runChecks', () => {
  it('flags missing contact, title, summary, edu, experience on a bare resume', () => {
    const ids = runChecks(base).map((i) => i.id);
    expect(ids).toContain('no-contact');
    expect(ids).toContain('no-title');
    expect(ids).toContain('no-summary');
    expect(ids).toContain('no-edu');
    expect(ids).toContain('no-exp');
  });

  it('flags invalid email format', () => {
    const r = runChecks({ ...base, basics: { name: 'a', email: 'not-an-email' } });
    expect(r.map((i) => i.id)).toContain('bad-email');
  });

  it('provides a fix that removes empty highlights', () => {
    const d: ResumeData = {
      ...base,
      basics: { name: 'a', email: 'a@b.com', phone: '123' },
      work: [{ company: 'C', highlights: ['做了 X 项目，提升 30%', '', '   '] }],
    };
    const issue = runChecks(d).find((i) => i.id === 'empty-highlight');
    expect(issue).toBeDefined();
    expect(issue!.fix).toBeDefined();
    issue!.fix!(d);
    expect(d.work![0].highlights).toEqual(['做了 X 项目，提升 30%']);
  });

  it('detects overlapping work periods (timeline contradiction)', () => {
    const d: ResumeData = {
      ...base,
      work: [
        { company: 'A', period: '2022.01 - 2024.06' },
        { company: 'B', period: '2023.01 - 2025.06' },
      ],
    };
    const ids = runChecks(d).map((i) => i.id);
    expect(ids.some((id) => id.startsWith('period-overlap'))).toBe(true);
  });

  it('does not false-positive on back-to-back periods', () => {
    const d: ResumeData = {
      ...base,
      work: [
        { company: 'A', period: '2022.01 - 2023.06' },
        { company: 'B', period: '2023.07 - 2025.06' },
      ],
    };
    const ids = runChecks(d).map((i) => i.id);
    expect(ids.some((id) => id.startsWith('period-overlap'))).toBe(false);
  });

  it('sorts errors before warnings before info', () => {
    const issues = runChecks(base);
    const counts = issueCounts(issues);
    expect(counts.error).toBeGreaterThan(0);
    const order = { error: 0, warn: 1, info: 2 } as const;
    for (let i = 1; i < issues.length; i++) {
      expect(order[issues[i].severity]).toBeGreaterThanOrEqual(
        order[issues[i - 1].severity],
      );
    }
  });

  it('reports no issues for a complete, clean resume', () => {
    const d: ResumeData = {
      id: 'y',
      label: '完整',
      basics: {
        name: '张三',
        title: '后端工程师',
        email: 'a@b.com',
        phone: '13800000000',
        photo: 'data:image/png;base64,xx',
        summary: '三年后端研发经验，擅长高并发与分布式架构，主导过千万级订单链路重构。',
      },
      education: [
        { school: 'S 大学', degree: '本科', major: 'CS', period: '2019.09 - 2023.06' },
      ],
      work: [
        {
          company: '某司',
          position: '开发',
          period: '2023.07 - 2025.06',
          highlights: ['重构核心链路，延迟下降 80%', '落地缓存方案，成本下降 60%'],
        },
      ],
      skills: [{ category: '语言', items: ['Go'], levels: { Go: '精通' } }],
      awards: [{ title: '奖学金' }],
    };
    const issues = runChecks(d);
    expect(issues).toHaveLength(0);
  });
});
