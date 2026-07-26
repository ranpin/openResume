import { describe, it, expect } from 'vitest';
import { matchJd } from './resumeJdMatch';
import type { ResumeData } from '../../types/resume';

const resume: ResumeData = {
  id: 'x',
  label: '测试',
  basics: { name: '张三', title: '前端工程师', summary: '熟悉 React 与 TypeScript' },
  work: [
    {
      company: '某司',
      position: '前端',
      highlights: ['用 React + TypeScript 重构核心页面', '落地 Vite 构建，提速 5 倍'],
    },
  ],
  skills: '**前端**：React、TypeScript、Vite、CSS',
};

describe('matchJd', () => {
  it('matches tech keywords present in the resume', () => {
    const jd = 'Requirements: Strong React and TypeScript experience. Familiar with Vite, CSS and modern frontend tooling.';
    const r = matchJd(resume, jd);
    const matchedTerms = r.matched.map((k) => k.term);
    expect(matchedTerms).toContain('react');
    expect(matchedTerms).toContain('typescript');
    expect(matchedTerms).toContain('vite');
    expect(r.score).toBeGreaterThan(0);
  });

  it('flags keywords missing from the resume', () => {
    const jd = 'We need someone with React, GraphQL, Kubernetes and Docker experience.';
    const r = matchJd(resume, jd);
    const missingTerms = r.missing.map((k) => k.term);
    expect(missingTerms).toContain('graphql');
    expect(missingTerms).toContain('kubernetes');
    expect(missingTerms).toContain('docker');
  });

  it('returns zero for an empty JD', () => {
    const r = matchJd(resume, '   \n  ');
    expect(r.total).toBe(0);
    expect(r.score).toBe(0);
  });

  it('extracts repeated Chinese bigrams as keywords', () => {
    const jd = '负责数据分析与数据挖掘工作，需要扎实的数据分析能力，熟悉数据挖掘算法。';
    const r = matchJd(resume, jd);
    const all = [...r.matched, ...r.missing].map((k) => k.term);
    expect(all).toContain('数据');
  });

  it('score equals matched/total ratio', () => {
    const jd = 'React, Docker, Kubernetes, GraphQL, TypeScript.';
    const r = matchJd(resume, jd);
    expect(r.total).toBe(r.matched.length + r.missing.length);
    expect(r.score).toBe(Math.round((r.matched.length / r.total) * 100));
  });
});
