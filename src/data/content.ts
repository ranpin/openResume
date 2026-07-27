// 内容加载器 —— 数据源为独立数据仓库（见 source.ts），运行时拉取：
//   index.json（清单）→ 并行拉取各 YAML → 解析。
// 单文件失败只跳过该文件（清单过期等）；清单本身失败则抛错，
// 由上层 useContentStore 回退 IndexedDB 离线缓存。
import { load as parseYaml } from 'js-yaml';
import { DATA_BASE_URL } from './source';
import type { Project, Publication, Internship, Honor } from '../types';
import type { ResumeData } from '../types/resume';
import { migrateResume } from '../components/resume/resumeIo';

export interface ContentBundle {
  resumes: ResumeData[];
  projects: Project[];
  publications: Publication[];
  internships: Internship[];
  honors: Honor[];
}

export const EMPTY_CONTENT: ContentBundle = {
  resumes: [],
  projects: [],
  publications: [],
  internships: [],
  honors: [],
};

// 数据仓库根部的 index.json：各集合的 YAML 相对路径清单
interface ContentIndex {
  resumes?: string[];
  projects?: string[];
  internships?: string[];
  honors?: string[];
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
  const [resumes, projects, internships, honorsFiles] = await Promise.all([
    loadMany<ResumeData>(index.resumes ?? []),
    loadMany<Project>(index.projects ?? []),
    loadMany<Internship>(index.internships ?? []),
    loadMany<Honor[]>(index.honors ?? []),
  ]);
  return {
    // 载入时经 migrateResume 迁移旧格式字段（如 skills 分组数组 → 富文本）
    resumes: resumes.map(([id, v]) => migrateResume({ ...v, id })),
    projects: projects.map(([id, v]) => ({ ...v, id })),
    publications: [] as Publication[],
    internships: internships.map(([id, v]) => ({ ...v, id })),
    honors: (honorsFiles[0]?.[1] ?? []).map((h, i) => ({ ...h, id: i + 1 })),
  };
};
