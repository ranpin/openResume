import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResumeDocument from './ResumeDocument';
import {
  EXAMPLE_ACTIVITY,
  EXAMPLE_AWARD,
  EXAMPLE_CERTIFICATE,
  EXAMPLE_EDUCATION,
  EXAMPLE_INTERESTS,
  EXAMPLE_LANGUAGE,
  EXAMPLE_PROJECT,
  EXAMPLE_SKILL,
  EXAMPLE_WORK,
} from './resumeExamples';
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

  it('aligns entry headers: name left, role center, period right', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          education: [
            {
              school: 'S1',
              college: '计算机学院',
              degree: '本科',
              major: 'CS',
              period: '2021 - 2025',
            },
          ],
          work: [{ company: 'ACME', position: '开发', period: '2025 - 至今' }],
          projects: [{ name: 'P1', role: '负责人', period: '2026' }],
        }}
        id="resume-print"
      />,
    );
    for (const [name, role, period] of [
      ['S1', '计算机学院', '2021 - 2025'],
      ['ACME', '开发', '2025 - 至今'],
      ['P1', '负责人', '2026'],
    ] as const) {
      const row = screen.getAllByText(name)[0].closest('.grid') as HTMLElement;
      expect(row.className).toContain('grid-cols-[1fr_auto_1fr]');
      const cells = Array.from(row.children) as HTMLElement[];
      expect(cells).toHaveLength(3);
      expect(cells[0].textContent).toBe(name);
      expect(cells[1].textContent).toBe(role);
      expect(cells[1].className).toContain('text-center');
      expect(cells[2].textContent).toBe(period);
      expect(cells[2].className).toContain('text-right');
    }
    // 学历·专业·GPA 仍在标题行下方
    expect(screen.getAllByText('本科 · CS').length).toBeGreaterThan(0);
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

  it('does not crash when blocks shrink between renders (hiding modules)', () => {
    // 回归：Paginator 的 pages 是 state，隐藏模块使 blocks 变少时，
    // 本次渲染会先带旧索引跑一遍，越界的 blocks[i] 曾导致 “reading 'node'” 崩溃。
    const rich: ResumeData = {
      ...base,
      projects: [{ name: 'P' }],
      awards: [{ title: 'A' }],
    };
    const { rerender } = render(<ResumeDocument data={rich} />);
    const allHidden: ResumeData = {
      ...rich,
      sections: [
        { key: 'summary', hidden: true },
        { key: 'education', hidden: true },
        { key: 'work', hidden: true },
        { key: 'projects', hidden: true },
        { key: 'skills', hidden: true },
        { key: 'awards', hidden: true },
      ],
    };
    expect(() => rerender(<ResumeDocument data={allHidden} />)).not.toThrow();
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

  it('renders new modules: certificates, languages, activities, interests', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          certificates: [{ name: 'CFA 一级', issuer: 'CFA Institute', date: '2025' }],
          languages: [{ name: '英语', level: 'CET-6' }],
          activities: [{ name: '学生会', role: '主席', period: '2023 - 2024' }],
          interests: ['篮球', '摄影'],
        }}
        id="resume-print"
      />,
    );
    expect(screen.getAllByText('资格证书').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CFA 一级/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('语言能力').length).toBeGreaterThan(0);
    expect(screen.getAllByText('英语').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CET-6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('校园活动').length).toBeGreaterThan(0);
    expect(screen.getAllByText('学生会').length).toBeGreaterThan(0);
    expect(screen.getAllByText('兴趣爱好').length).toBeGreaterThan(0);
    expect(screen.getAllByText('篮球、摄影').length).toBeGreaterThan(0);
  });

  it('renders education 主修课程 line', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          education: [
            { school: 'S1', degree: '本科', major: 'CS', courses: '高等数学、数据结构' },
          ],
        }}
        id="resume-print"
      />,
    );
    expect(screen.getAllByText(/主修课程：/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/高等数学、数据结构/).length).toBeGreaterThan(0);
  });

  it('renders skill proficiency dots when levels are set', () => {
    const { container } = render(
      <ResumeDocument
        data={{
          ...base,
          skills: [
            {
              category: '语言',
              items: ['C++', 'Python'],
              levels: { 'C++': '精通', Python: '熟悉' },
            },
          ],
        }}
        id="resume-print"
      />,
    );
    const cpp = container.querySelector('[title="精通"]');
    const py = container.querySelector('[title="熟悉"]');
    expect(cpp).not.toBeNull();
    expect(py).not.toBeNull();
    // 精通=4 实心圆点，熟悉=2
    expect(cpp!.querySelectorAll('.bg-gray-700').length).toBe(4);
    expect(py!.querySelectorAll('.bg-gray-700').length).toBe(2);
  });

  it('renders custom sections (自定义模块) with their own title and content', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          custom: [
            { id: 'c1', title: '科研经历', content: '发表了一篇论文' },
            { id: 'c2', title: '自我评价', content: '认真负责' },
          ],
        }}
        id="resume-print"
      />,
    );
    expect(screen.getAllByText('科研经历').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/发表了一篇论文/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('自我评价').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/认真负责/).length).toBeGreaterThan(0);
  });

  it('omits a custom section whose content is empty', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          custom: [{ id: 'c1', title: '空模块', content: '   ' }],
        }}
        id="resume-print"
      />,
    );
    expect(screen.queryByText('空模块')).toBeNull();
  });

  it('renders the built-in example entries (示例) correctly', () => {
    render(
      <ResumeDocument
        data={{
          ...base,
          education: [EXAMPLE_EDUCATION],
          work: [EXAMPLE_WORK],
          projects: [EXAMPLE_PROJECT],
          skills: [EXAMPLE_SKILL],
          awards: [EXAMPLE_AWARD],
          certificates: [EXAMPLE_CERTIFICATE],
          languages: [EXAMPLE_LANGUAGE],
          activities: [EXAMPLE_ACTIVITY],
          interests: EXAMPLE_INTERESTS,
        }}
        id="resume-print"
      />,
    );
    for (const s of [
      '上海交通大学',
      '字节跳动',
      '智能简历解析引擎',
      'TypeScript',
      '国家奖学金',
      '软件设计师（中级）',
      'CET-6',
      '校研究生会',
      '开源贡献',
    ]) {
      expect(screen.getAllByText(new RegExp(s)).length).toBeGreaterThan(0);
    }
  });
});
