// 内容加载器 —— 数据源为独立数据仓库（见 source.ts），运行时拉取：
//   index.json（清单）→ 并行拉取各简历 YAML → 解析。
// 单文件失败只跳过该文件（清单过期等）；清单本身失败则抛错，
// 由上层 useContentStore 回退 IndexedDB 离线缓存。
//
// 2026-10-19：「作品集」目录已整体移除，本站只消费简历数据。
// 数据仓库 index.json 里的 projects / internships / honors 清单条目不再读取
// （数据本身留在数据仓库，不影响其它消费方）。
import { load as parseYaml } from 'js-yaml';
import { DATA_BASE_URL } from './source';
import type { ResumeData } from '../types/resume';
import { migrateResume } from '../components/resume/resumeIo';

export interface ContentBundle {
  resumes: ResumeData[];
}

export const EMPTY_CONTENT: ContentBundle = {
  resumes: [],
};

// 数据仓库根部的 index.json：简历 YAML 的相对路径清单
interface ContentIndex {
  resumes?: string[];
}

// 文件名（去扩展名），用作稳定唯一 id
const slugOf = (path: string): string =>
  path
    .split('/')
    .pop()!
    .replace(/\.(ya?ml)$/, '');

const fetchText = async (url: string): Promise<string> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};

// 并行拉取一组 YAML 并按路径升序返回 [slug, 解析结果]；单文件失败跳过（warn）
const loadMany = async <T>(paths: string[]): Promise<Array<[string, T]>> => {
  const settled = await Promise.allSettled(
    paths.map(
      async (p) =>
        [slugOf(p), parseYaml(await fetchText(`${DATA_BASE_URL}/${p}`)) as T] as [
          string,
          T,
        ],
    ),
  );
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[content] 跳过加载失败的文件 ${paths[i]}：`, r.reason);
    }
  });
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<[string, T]> => r.status === 'fulfilled',
    )
    .map((r) => r.value)
    .sort(([a], [b]) => a.localeCompare(b));
};

export const loadContent = async (): Promise<ContentBundle> => {
  // 纯本地模式：无远程数据源，内容恒空（简历来自本地草稿）
  if (!DATA_BASE_URL) return EMPTY_CONTENT;

  const index: ContentIndex = JSON.parse(
    await fetchText(`${DATA_BASE_URL}/index.json`),
  );
  const resumes = await loadMany<ResumeData>(index.resumes ?? []);
  return {
    // 载入时经 migrateResume 迁移旧格式字段（如 skills 分组数组 → 富文本）
    resumes: resumes.map(([id, v]) => migrateResume({ ...v, id })),
  };
};
