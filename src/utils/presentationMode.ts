// 演示模式：主站以 iframe 内嵌本站时，通过 ?mode=present 透传当前为「仅公开」模式。
// 该模式下作品集项目默认全部隐藏，仅保留显式标记 visibility: 'public' 的条目
// （fail-closed：未标注视为私密，新增项目不会意外泄露）；缺省（无参数）视为完整
// 模式，以保证独立访问 / 本地编辑简历时内容不受影响。
import type { Project } from '../types';

export const isPresentationMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('mode') === 'present';
  } catch {
    return false;
  }
};

// 演示模式下仅保留显式 public 项目（其余含未标注一律隐藏）；其余情况原样返回。
export const visibleProjects = (projects: Project[]): Project[] =>
  isPresentationMode()
    ? projects.filter((p) => p.visibility === 'public')
    : projects;
