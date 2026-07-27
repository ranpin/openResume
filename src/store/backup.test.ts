import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { buildBackup, restoreBackup } from './backup';
import { useResumeStore } from './useResumeStore';
import type { ResumeData } from '../types/resume';

const draft = (name: string): ResumeData => ({
  id: name,
  label: name,
  basics: { name },
});

describe('restoreBackup', () => {
  it('非法 JSON 抛错', () => {
    expect(() => restoreBackup('not json')).toThrow('不是有效的 JSON 文件');
  });

  it('缺少 drafts 字段抛错', () => {
    expect(() => restoreBackup('{"app":"ranpin-resume"}')).toThrow(
      '不是简历中心备份文件',
    );
  });

  it('合并导入草稿与发布指纹，返回草稿条数', () => {
    const backup = JSON.stringify({
      app: 'ranpin-resume',
      version: 1,
      exportedAt: '2026-07-27T00:00:00.000Z',
      drafts: { 'b1': draft('备份一'), 'b2': draft('备份二') },
      published: { b1: 'sig-1' },
    });

    expect(restoreBackup(backup)).toBe(2);

    const s = useResumeStore.getState();
    expect(s.drafts['b1'].label).toBe('备份一');
    expect(s.drafts['b2'].label).toBe('备份二');
    expect(s.published['b1']).toBe('sig-1');
  });

  it('忽略非法草稿条目', () => {
    const backup = JSON.stringify({
      drafts: { ok: draft('有效'), bad: null, bad2: 'str' },
    });
    expect(restoreBackup(backup)).toBe(1);
  });
});

describe('buildBackup', () => {
  it('导出当前全部草稿与指纹', () => {
    useResumeStore.getState().setDraft('c1', draft('导出'));
    const file = buildBackup();
    expect(file.app).toBe('ranpin-resume');
    expect(file.version).toBe(1);
    expect(file.drafts['c1'].label).toBe('导出');
    expect(typeof file.exportedAt).toBe('string');
  });
});
