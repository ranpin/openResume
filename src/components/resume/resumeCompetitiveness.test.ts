import { describe, it, expect } from 'vitest';
import { computeCompetitiveness } from './resumeCompetitiveness';
import type { ResumeData } from '../../types/resume';

const bare: ResumeData = {
  id: 'x',
  label: '测试',
  basics: { name: '张三' },
};

const rich: ResumeData = {
  id: 'y',
  label: '完整',
  basics: {
    name: '张三',
    title: '后端工程师',
    email: 'a@b.com',
    phone: '13800000000',
    github: 'github.com/zs',
    photo: 'data:image/png;base64,xx',
    summary: '三年后端研发经验，擅长高并发与分布式架构，主导过千万级订单链路重构。',
  },
  education: [
    {
      school: 'S 大学',
      degree: '本科',
      major: '计算机',
      period: '2019.09 - 2023.06',
      gpa: '3.8/4.0',
      courses: '操作系统、计算机网络',
    },
  ],
  work: [
    {
      company: '某司',
      position: '开发',
      period: '2023.07 - 2025.06',
      highlights: [
        '重构核心链路，延迟下降 80%',
        '落地缓存方案，成本下降 60%',
        '主导订单系统重构，支撑 1000 万日订单',
        '推动 CI 建设，发布效率提升 3 倍',
        '优化慢查询，P99 下降 70%',
        '搭建监控告警，故障响应提速 50%',
        '沉淀公共组件库，复用率 90%',
        '带教 2 名新人，均顺利转正',
      ],
    },
  ],
  skills: [
    {
      category: '语言',
      items: ['Go', 'Java', 'Python'],
      levels: { Go: '精通', Java: '熟练', Python: '熟练' },
    },
    {
      category: '中间件',
      items: ['Redis', 'Kafka', 'MySQL'],
      levels: { Redis: '精通' },
    },
  ],
};

describe('computeCompetitiveness', () => {
  it('scores a bare resume low across all dimensions', () => {
    const r = computeCompetitiveness(bare);
    expect(r.overall).toBeLessThan(20);
    r.dims.forEach((d) => expect(d.score).toBeLessThan(40));
  });

  it('scores a rich resume high overall', () => {
    const r = computeCompetitiveness(rich);
    expect(r.overall).toBeGreaterThanOrEqual(85);
  });

  it('returns six dimensions with stable keys and labels', () => {
    const r = computeCompetitiveness(bare);
    expect(r.dims.map((d) => d.key)).toEqual([
      'depth',
      'quant',
      'skill',
      'education',
      'polish',
      'info',
    ]);
    r.dims.forEach((d) => {
      expect(d.label).toBeTruthy();
      expect(d.hint).toBeTruthy();
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    });
  });

  it('rewards quantified highlights in the quant dimension', () => {
    const withNumbers: ResumeData = {
      ...bare,
      work: [{ company: 'A', highlights: ['提升 30%', '服务 5 万用户'] }],
    };
    const withoutNumbers: ResumeData = {
      ...bare,
      work: [{ company: 'A', highlights: ['负责开发', '参与维护'] }],
    };
    expect(
      computeCompetitiveness(withNumbers).dims.find((d) => d.key === 'quant')!.score,
    ).toBeGreaterThan(
      computeCompetitiveness(withoutNumbers).dims.find((d) => d.key === 'quant')!.score,
    );
  });

  it('overall is the mean of the six dimension scores', () => {
    const r = computeCompetitiveness(rich);
    const mean = Math.round(r.dims.reduce((a, d) => a + d.score, 0) / r.dims.length);
    expect(r.overall).toBe(mean);
  });
});
