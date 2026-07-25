import { describe, it, expect } from 'vitest';
import {
  resolveSections,
  sectionConfigFromData,
  DEFAULT_SECTION_ORDER,
  SECTION_META,
} from './resumeSections';

describe('resolveSections', () => {
  it('returns all sections in default order when unconfigured', () => {
    const out = resolveSections(undefined);
    expect(out.map((s) => s.key)).toEqual(DEFAULT_SECTION_ORDER);
    // 标题回落到默认名
    expect(out[0].title).toBe(SECTION_META[DEFAULT_SECTION_ORDER[0]].title);
    expect(out.every((s) => !s.hidden)).toBe(true);
  });

  it('respects custom order and appends missing sections at the end', () => {
    const out = resolveSections([
      { key: 'skills' },
      { key: 'work' },
    ]);
    expect(out[0].key).toBe('skills');
    expect(out[1].key).toBe('work');
    // 未列出的模块补到末尾，且不丢失
    expect(out.map((s) => s.key).sort()).toEqual(
      [...DEFAULT_SECTION_ORDER].sort(),
    );
  });

  it('applies custom titles and hidden flags; ignores unknown/dup keys', () => {
    const out = resolveSections([
      { key: 'work', title: '职业经历', hidden: true },
      { key: 'work', title: '重复应被忽略' },
      // @ts-expect-error 未知 key 应被忽略
      { key: 'bogus', title: 'nope' },
    ]);
    const work = out.find((s) => s.key === 'work')!;
    expect(work.title).toBe('职业经历');
    expect(work.hidden).toBe(true);
    // work 只出现一次
    expect(out.filter((s) => s.key === 'work')).toHaveLength(1);
    expect(out.find((s) => (s.key as string) === 'bogus')).toBeUndefined();
  });

  it('falls back to default title when custom title is blank', () => {
    const out = resolveSections([{ key: 'education', title: '   ' }]);
    expect(out.find((s) => s.key === 'education')!.title).toBe(
      SECTION_META.education.title,
    );
  });
});

describe('resolveSections · 自定义模块', () => {
  const custom = [
    { id: 'c1', title: '科研经历', content: 'x' },
    { id: 'c2', title: '自我评价', content: 'y' },
  ];

  it('renders a custom section referenced by customId, using its data title', () => {
    const out = resolveSections([{ key: 'custom', customId: 'c1' }], custom);
    const c = out.find((s) => s.key === 'custom');
    expect(c).toBeDefined();
    expect(c!.customId).toBe('c1');
    expect(c!.title).toBe('科研经历');
  });

  it('appends orphan custom sections (in data but not in sections config) at the end', () => {
    const out = resolveSections(undefined, custom);
    const customs = out.filter((s) => s.key === 'custom');
    expect(customs.map((s) => s.customId)).toEqual(['c1', 'c2']);
    // 排在所有内置模块之后
    expect(out[out.length - 2].customId).toBe('c1');
    expect(out[out.length - 1].customId).toBe('c2');
  });

  it('ignores custom configs whose data has been deleted', () => {
    // custom 数据为空：指向不存在 customId 的配置应被忽略，不产生幻影模块
    const out = resolveSections([{ key: 'custom', customId: 'gone' }], []);
    expect(out.find((s) => s.key === 'custom')).toBeUndefined();
  });

  it('dedupes custom sections by customId', () => {
    const out = resolveSections(
      [
        { key: 'custom', customId: 'c1' },
        { key: 'custom', customId: 'c1' },
      ],
      [custom[0]],
    );
    expect(out.filter((s) => s.key === 'custom')).toHaveLength(1);
  });

  it('sectionConfigFromData preserves customId for custom sections', () => {
    const cfg = sectionConfigFromData({
      id: 'r',
      label: 'r',
      basics: { name: 'N' },
      custom,
    });
    const customs = cfg.filter((s) => s.key === 'custom');
    expect(customs.map((s) => s.customId)).toEqual(['c1', 'c2']);
  });
});
