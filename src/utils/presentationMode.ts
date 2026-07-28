// 演示模式：主站以 iframe 内嵌本站时，通过 ?mode=present 透传当前为「仅公开」模式。
// 该模式下隐藏标记为 private 的作品集项目；缺省（无参数）视为完整模式，
// 以保证独立访问 / 本地编辑简历时内容不受影响。
import type { Project } from '../types';

export const isPresentationMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('mode') === 'present';
  } catch {
    return false;
  }
};

// 演示模式下过滤掉 private 项目；其余情况原样返回。
export const visibleProjects = (projects: Project[]): Project[] =>
  isPresentationMode()
    ? projects.filter((p) => p.visibility !== 'private')
    : projects;
