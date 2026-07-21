import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResumeDocument from './ResumeDocument';
import type { ResumeData } from '../../types/resume';

const base: ResumeData = {
  id: 'x',
  label: '测试简历',
  basics: { name: 'Ranpin', title: '工程师', summary: '一段简介' },
  work: [{ company: 'ACME', position: '开发', highlights: ['做了 X', ''] }],
  skills: [{ category: '语言', items: ['C++', ''] }],
};

describe('ResumeDocument', () => {
  it('renders name, title and section headings (classic)', () => {
    render(<ResumeDocument data={base} />);
    // 分页会同时渲染打印文档 + 屏幕分页，故内容可能出现多次
    expect(screen.getAllByText('Ranpin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('工程师').length).toBeGreaterThan(0);
    expect(screen.getAllByText('个人简介').length).toBeGreaterThan(0);
    expect(screen.getAllByText('工作经历').length).toBeGreaterThan(0);
    expect(screen.getAllByText('专业技能').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/做了 X/).length).toBeGreaterThan(0);
  });

  it('sets id on the print document (print target)', () => {
    const { container } = render(
      <ResumeDocument data={base} id="resume-print" />,
    );
    expect(container.querySelector('#resume-print')).not.toBeNull();
  });

  it('renders the sidebar template as a single sheet', () => {
    const { container } = render(
      <ResumeDocument data={{ ...base, template: 'sidebar' }} id="resume-print" />,
    );
    // 侧栏模板不分页：id 直接在单张 resume-page 上
    const el = container.querySelector('#resume-print');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('resume-page')).toBe(true);
  });
});
