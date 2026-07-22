import { describe, it, expect } from 'vitest';
import {
  resolveSections,
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
