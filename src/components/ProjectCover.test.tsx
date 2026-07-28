import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProjectCover from './ProjectCover';
import type { Project } from '../types';

const mk = (id: string, over: Partial<Project> = {}): Project => ({
  id,
  title: `项目 ${id}`,
  description: '描述',
  tags: ['C++'],
  ...over,
});

const gradientOf = (container: HTMLElement) =>
  (container.querySelector('div[aria-hidden="true"]') as HTMLElement).style.background;

describe('ProjectCover', () => {
  it('确定性：同一 id 生成同一渐变封面', () => {
    const a = render(<ProjectCover project={mk('lantu')} />);
    const b = render(<ProjectCover project={mk('lantu')} />);
    expect(gradientOf(a.container)).toContain('linear-gradient');
    expect(gradientOf(a.container)).toBe(gradientOf(b.container));
  });

  it('默认显示状态徽章，showStatus=false 时隐藏', () => {
    const { container, rerender } = render(
      <ProjectCover project={mk('x', { status: '已交付' })} />,
    );
    expect(container.textContent).toContain('已交付');
    rerender(<ProjectCover project={mk('x', { status: '已交付' })} showStatus={false} />);
    expect(container.textContent).not.toContain('已交付');
  });

  it('提供 index 时渲染补零幽灵序号', () => {
    const { container } = render(<ProjectCover project={mk('x')} index={3} />);
    expect(container.textContent).toContain('03');
  });

  it('提供 cover 真实图时优先使用图片', () => {
    const { container } = render(
      <ProjectCover project={mk('x', { cover: 'https://example.com/c.png' })} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/c.png',
    );
  });
});
