import { useResumeStore } from './useResumeStore';
import type { ResumeData } from '../types/resume';

// 全量数据备份 / 导入：换设备或清缓存前导出 JSON，之后在「我的简历」页导入即可恢复。
// 导入为合并式（按 id 覆盖同名草稿），不清空现有数据。

export interface BackupFile {
  app: 'ranpin-resume';
  version: 1;
  exportedAt: string;
  drafts: Record<string, ResumeData>;
  published: Record<string, string>;
}

export const buildBackup = (): BackupFile => {
  const { drafts, published } = useResumeStore.getState();
  return {
    app: 'ranpin-resume',
    version: 1,
    exportedAt: new Date().toISOString(),
    drafts,
    published,
  };
};

export const downloadBackup = (): void => {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `ranpin-resume-backup-${day}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** 解析备份文本并合并进草稿库，返回导入的草稿条数 */
export const restoreBackup = (text: string): number => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('不是有效的 JSON 文件');
  }
  const b = parsed as Partial<BackupFile> | null;
  if (!b || typeof b !== 'object' || !b.drafts || typeof b.drafts !== 'object') {
    throw new Error('不是简历中心备份文件（缺少 drafts 字段）');
  }
  const { setDraft, markPublished } = useResumeStore.getState();
  let count = 0;
  for (const [id, data] of Object.entries(b.drafts)) {
    if (data && typeof data === 'object') {
      setDraft(id, data as ResumeData);
      count++;
    }
  }
  if (b.published && typeof b.published === 'object') {
    for (const [id, sig] of Object.entries(b.published)) {
      if (typeof sig === 'string') markPublished(id, sig);
    }
  }
  return count;
};
