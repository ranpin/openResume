import { describe, it, expect, afterEach } from 'vitest';
import { isPresentationMode, visibleProjects } from './presentationMode';
import type { Project } from '../types';

// 演示模式判定完全由 URL 的 ?mode 参数驱动；用 history.replaceState 切换。

const setQuery = (search: string) =>
  window.history.replaceState(null, '', `/${search}`);

afterEach(() => {
  setQuery('');
});

const project = (id: string, visibility?: Project['visibility']): Project => ({
  id,
  title: `项目 ${id}`,
  description: '示例项目',
  tags: [],
  visibility,
});

describe('isPresentationMode', () => {
  it('缺省（无参数）视为完整模式', () => {
    setQuery('');
    expect(isPresentationMode()).toBe(false);
  });

  it('?mode=present 时为演示模式', () => {
    setQuery('?mode=present');
    expect(isPresentationMode()).toBe(true);
  });

  it('?mode=full 时不是演示模式', () => {
    setQuery('?mode=full');
    expect(isPresentationMode()).toBe(false);
  });
});

describe('visibleProjects', () => {
  const all = [project('a'), project('b', 'public'), project('c', 'private')];

  it('完整模式下原样返回全部项目', () => {
    setQuery('');
    expect(visibleProjects(all)).toEqual(all);
  });

  it('演示模式下隐藏 private，保留公开与未标注项目', () => {
    setQuery('?mode=present');
    expect(visibleProjects(all).map((p) => p.id)).toEqual(['a', 'b']);
  });
});
