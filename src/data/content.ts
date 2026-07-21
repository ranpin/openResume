/// <reference types="vite/client" />
// 内容加载器 —— 简历中心的数据源在仓库根部的 `content/` 目录：
//   经历库(honors / internships / projects) 与 简历(resumes/) 都用 YAML。
// 构建时通过 import.meta.glob 读入并解析。编辑内容 = 改 content/ 下的文件。
import { load as parseYaml } from 'js-yaml';
import type { Project, Publication, Internship, Honor } from '../types';
import type { ResumeData } from '../types/resume';

// 注意：import.meta.glob 的第二个参数必须是内联对象字面量（Vite 静态分析要求）。

type RawGlob = Record<string, string>;

// 取单个 YAML 文件的内容
const loadOne = <T>(glob: RawGlob): T =>
  parseYaml(Object.values(glob)[0]) as T;

// 取一组文件，按路径（文件名）升序返回 [path, 解析结果]
const loadMany = <T>(glob: RawGlob): Array<[string, T]> =>
  Object.entries(glob)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, raw]) => [path, parseYaml(raw) as T]);

// 文件名（去扩展名），用作稳定唯一 id
const slugOf = (path: string): string =>
  path
    .split('/')
    .pop()!
    .replace(/\.(ya?ml|md)$/, '');

// --- 导出 ---

export const honors: Honor[] = loadOne<Honor[]>(
  import.meta.glob('/content/honors.yaml', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as RawGlob,
).map((h, i) => ({ ...h, id: i + 1 }));

export const internships: Internship[] = loadMany<Internship>(
  import.meta.glob('/content/internships/*.yaml', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as RawGlob,
).map(([path, v]) => ({ ...v, id: slugOf(path) }));

export const projects: Project[] = loadMany<Project>(
  import.meta.glob('/content/projects/*.yaml', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as RawGlob,
).map(([path, v]) => ({ ...v, id: slugOf(path) }));

export const publications: Publication[] = [];

// 简历文档：每个 YAML 一份简历，文件名（去扩展名）作为稳定 id，按文件名升序
export const resumes: ResumeData[] = loadMany<ResumeData>(
  import.meta.glob('/content/resumes/*.yaml', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as RawGlob,
).map(([path, v]) => ({ ...v, id: slugOf(path) }));
