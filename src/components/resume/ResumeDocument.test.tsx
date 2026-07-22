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

  it('applies global typography settings as CSS variables', () => {
    const { container } = render(
      <ResumeDocument
        data={{
          ...base,
          settings: { fontScale: 1.1, lineHeight: 1.8, blockGap: 20 },
        }}
        id="resume-print"
      />,
    );
    const root = container.querySelector('#resume-print') as HTMLElement;
    expect(root.classList.contains('resume-root')).toBe(true);
    expect(root.style.getPropertyValue('--rs-scale')).toBe('1.1');
    expect(root.style.getPropertyValue('--rs-lh')).toBe('1.8');
    expect(root.style.getPropertyValue('--rs-gap')).toBe('20px');
  });

  it('renders the ID photo when provided', () => {
    render(
      <ResumeDocument
        data={{ ...base, basics: { ...base.basics, photo: 'data:image/png;base64,AAA' } }}
      />,
    );
    const imgs = screen.getAllByAltText('证件照');
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0].getAttribute('src')).toContain('data:image/png');
  });

  it('renders sub-projects nested under a work entry', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          work: [
            {
              company: 'ACME',
              position: '开发',
              projects: [
                { name: '子项目甲', highlights: ['交付了甲'] },
                { name: '子项目乙', highlights: ['交付了乙'] },
              ],
            },
          ],
        }}
      />,
    );
    expect(screen.getAllByText('子项目甲').length).toBeGreaterThan(0);
    expect(screen.getAllByText('子项目乙').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/交付了甲/).length).toBeGreaterThan(0);
  });

  it('honors custom section titles, order and hidden flags', () => {
    const { container } = render(
      <ResumeDocument
        data={{
          ...base,
          sections: [
            { key: 'skills', title: '技能栈' },
            { key: 'work', title: '职业经历' },
            { key: 'summary', hidden: true },
          ],
        }}
        id="resume-print"
      />,
    );
    // 自定义标题生效
    expect(screen.getAllByText('技能栈').length).toBeGreaterThan(0);
    expect(screen.getAllByText('职业经历').length).toBeGreaterThan(0);
    // 隐藏的「个人简介」不渲染
    expect(screen.queryByText('个人简介')).toBeNull();
    // skills 排在 work 之前（自定义顺序）
    const root = container.querySelector('#resume-print') as HTMLElement;
    const text = root.textContent || '';
    expect(text.indexOf('技能栈')).toBeLessThan(text.indexOf('职业经历'));
  });
});
